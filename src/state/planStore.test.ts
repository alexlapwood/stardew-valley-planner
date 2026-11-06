import {
  createMemoryPlanStorage,
  type IMemoryPlanStorage,
} from "../__mocks__/memoryPlanStorage";
import { toSavedFarmData } from "./farmData";
import { type IPlan, newFarmData, toStoredPlan } from "./plan";
import { createPlanStore } from "./planStore";

const parsnip: IPlantedCrop = {
  cropId: "parsnip",
  datePlanted: 0,
  type: "crop",
  x: 5,
  y: 3,
};

const scarecrow: IInstalledEquipment = {
  dateInstalled: 0,
  equipmentId: "scarecrow",
  skin: "scarecrow",
  type: "equipment",
  x: 1,
  y: 1,
};

const repairedLooks: IFarmLooks = {
  greenhouse: "repaired",
  house: 2,
  petBowl: "hay_pet_bowl",
};

function makePlan(id: string, fields: Partial<IPlan> = {}): IPlan {
  return { ...newFarmData("standard"), id, name: `Plan ${id}`, ...fields };
}

function planFile(name: string, data: unknown) {
  return new File([JSON.stringify(data)], name, { type: "application/json" });
}

let storage: IMemoryPlanStorage;

beforeEach(() => {
  storage = createMemoryPlanStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Plan store", () => {
  describe("start", () => {
    it("opens no plan and makes none when there are no plans", async () => {
      const store = createPlanStore(storage);

      await store.start();

      expect(store.planInfo()).toBeUndefined();
      expect(store.currentPlan()).toBeUndefined();
      expect(store.plans()).toEqual([]);
      expect(await storage.listPlans()).toEqual([]);
      expect(await storage.getLastPlanId()).toBeUndefined();
    });

    it("opens no plan when no saved plan can be read", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      await storage.putPlan(makePlan("a"));
      storage.records.set("a", { ...toStoredPlan(makePlan("a")), farm: 1 });

      const store = createPlanStore(storage);
      await store.start();

      expect(store.planInfo()).toBeUndefined();
      expect(store.plans().map(({ id }) => id)).toEqual(["a"]);
    });

    it("opens the last plan used", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b", { crops: { 3: { 5: [parsnip] } } }));
      await storage.setLastPlanId("b");

      const store = createPlanStore(storage);
      await store.start();

      expect(store.currentPlan()).toEqual(
        makePlan("b", { crops: { 3: { 5: [parsnip] } } }),
      );
      expect(store.plans().map(({ id }) => id)).toEqual(["a", "b"]);
    });

    it("opens another plan when the last plan used cannot be read", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b"));
      await storage.setLastPlanId("b");
      storage.records.set("b", { ...toStoredPlan(makePlan("b")), farm: 1 });

      const store = createPlanStore(storage);
      await store.start();

      expect(store.planInfo()?.id).toBe("a");
      expect(await storage.getLastPlanId()).toBe("a");
    });
  });

  describe("openPlan", () => {
    it("changes to the plan, with its farm and its own items", async () => {
      const beach = makePlan("beach", {
        ...newFarmData("beach", repairedLooks),
        date: 50,
        equipment: { 1: { 1: [scarecrow] } },
      });
      await storage.putPlan(makePlan("a", { crops: { 3: { 5: [parsnip] } } }));
      await storage.putPlan(beach);

      const store = createPlanStore(storage);
      await store.start();
      const isOpen = await store.openPlan("beach");

      expect(isOpen).toBe(true);
      expect(store.currentPlan()).toEqual(beach);
      expect(store.crops()).toEqual({});
      expect(store.planInfo()).toEqual({
        farm: "beach",
        id: "beach",
        looks: repairedLooks,
        name: "Plan beach",
      });
      expect(await storage.getLastPlanId()).toBe("beach");
    });

    it("stays on the open plan when the plan cannot be read", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      await storage.putPlan(makePlan("a"));

      const store = createPlanStore(storage);
      await store.start();

      expect(await store.openPlan("nope")).toBe(false);
      expect(store.planInfo()?.id).toBe("a");
    });

    it("saves a change only to the open plan", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b"));

      const store = createPlanStore(storage);
      await store.start();
      store.setCrops({ 3: { 5: [parsnip] } });
      store.setDate(7);
      store.setEquipment({ 1: { 1: [scarecrow] } });
      await store.openPlan("b");

      expect(store.crops()).toEqual({});
      expect(await storage.getPlan("a")).toEqual(
        toStoredPlan(
          makePlan("a", {
            crops: { 3: { 5: [parsnip] } },
            date: 7,
            equipment: { 1: { 1: [scarecrow] } },
          }),
        ),
      );
      expect(await storage.getPlan("b")).toEqual(toStoredPlan(makePlan("b")));
    });

    it("shows the plan only when its farm is ready", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b", { farm: "forest" }));
      const { promise: forestReady, resolve } =
        Promise.withResolvers<undefined>();
      const store = createPlanStore(storage, (plan) =>
        plan.farm === "forest" ? forestReady : Promise.resolve(),
      );
      await store.start();

      const opening = store.openPlan("b");
      await new Promise((done) => {
        setTimeout(done, 0);
      });

      expect(store.planInfo()?.id).toBe("a");

      resolve(undefined);
      await opening;

      expect(store.planInfo()?.id).toBe("b");
    });

    it("shows the last plan asked for when 2 changes overlap", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b", { farm: "forest" }));
      await storage.putPlan(makePlan("c"));
      const { promise: forestReady, resolve } =
        Promise.withResolvers<undefined>();
      const store = createPlanStore(storage, (plan) =>
        plan.farm === "forest" ? forestReady : Promise.resolve(),
      );
      await store.start();

      const openingB = store.openPlan("b");
      await store.openPlan("c");
      resolve(undefined);
      await openingB;

      expect(store.planInfo()?.id).toBe("c");
      expect(await storage.getLastPlanId()).toBe("c");
    });

    it("shows the plan when its farm cannot get ready", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      await storage.putPlan(makePlan("a"));
      const store = createPlanStore(storage, () =>
        Promise.reject(new Error("No map")),
      );

      await store.start();

      expect(store.planInfo()?.id).toBe("a");
    });
  });

  describe("renamePlan", () => {
    it("renames the open plan, and keeps its items", async () => {
      await storage.putPlan(makePlan("a", { crops: { 3: { 5: [parsnip] } } }));
      await storage.putPlan(makePlan("b"));

      const store = createPlanStore(storage);
      await store.start();
      await store.renamePlan("a", "Parsnips");

      expect(store.planInfo()?.name).toBe("Parsnips");
      expect(store.plans().map(({ name }) => name)).toEqual([
        "Parsnips",
        "Plan b",
      ]);
      expect(await storage.getPlan("a")).toEqual(
        toStoredPlan(
          makePlan("a", { crops: { 3: { 5: [parsnip] } }, name: "Parsnips" }),
        ),
      );
      expect(await storage.listPlans()).toEqual(store.plans());
    });

    it("renames a plan that is not open, and stays on the open plan", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b", { crops: { 3: { 5: [parsnip] } } }));

      const store = createPlanStore(storage);
      await store.start();
      await store.renamePlan("b", "Parsnips");

      expect(store.planInfo()).toMatchObject({ id: "a", name: "Plan a" });
      expect(await storage.getPlan("b")).toEqual(
        toStoredPlan(
          makePlan("b", { crops: { 3: { 5: [parsnip] } }, name: "Parsnips" }),
        ),
      );
      expect(await storage.listPlans()).toEqual(store.plans());
    });

    it("lets 2 plans have the same name", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b"));

      const store = createPlanStore(storage);
      await store.start();
      await store.renamePlan("b", "Plan a");

      expect(store.plans()).toEqual([
        { farm: "standard", id: "a", name: "Plan a" },
        { farm: "standard", id: "b", name: "Plan a" },
      ]);
    });
  });

  describe("deletePlan", () => {
    it("deletes a plan that is not open, and stays on the open plan", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b"));

      const store = createPlanStore(storage);
      await store.start();
      await store.deletePlan("b");

      expect(store.planInfo()?.id).toBe("a");
      expect(store.plans().map(({ id }) => id)).toEqual(["a"]);
      expect(await storage.listPlans()).toEqual(store.plans());
      expect(await storage.getPlan("b")).toBeUndefined();
    });

    it("opens the last plan used of the plans that are left when the open plan is deleted", async () => {
      for (const id of ["a", "b", "c"]) {
        await storage.putPlan(makePlan(id));
      }

      const store = createPlanStore(storage);
      await store.start();
      await store.openPlan("c");
      await store.openPlan("b");
      await store.deletePlan("b");

      expect(store.planInfo()?.id).toBe("c");
      expect(store.plans().map(({ id }) => id)).toEqual(["a", "c"]);
      expect(await storage.getPlan("b")).toBeUndefined();
      expect(await storage.getLastPlanId()).toBe("c");
    });

    it("opens no plan when the last plan is deleted", async () => {
      await storage.putPlan(makePlan("a"));

      const store = createPlanStore(storage);
      await store.start();
      await store.deletePlan("a");

      expect(store.planInfo()).toBeUndefined();
      expect(store.currentPlan()).toBeUndefined();
      expect(store.plans()).toEqual([]);
      expect(await storage.listPlans()).toEqual([]);
      expect(await storage.getLastPlanId()).toBeUndefined();
    });

    it("does not save the deleted plan again after an edit while the next plan gets ready", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b", { farm: "forest" }));
      await storage.setLastPlanId("b");
      await storage.setLastPlanId("a");
      const { promise: forestReady, resolve } =
        Promise.withResolvers<undefined>();
      const store = createPlanStore(storage, (plan) =>
        plan.farm === "forest" ? forestReady : Promise.resolve(),
      );
      await store.start();

      const deleting = store.deletePlan("a");
      store.setCrops({ 3: { 5: [parsnip] } });
      resolve(undefined);
      await deleting;

      expect(store.planInfo()?.id).toBe("b");
      expect(await storage.getPlan("a")).toBeUndefined();
      expect(await storage.listPlans()).toEqual([
        { farm: "forest", id: "b", name: "Plan b" },
      ]);
    });
  });

  describe("setLooks", () => {
    it("changes the looks of the open plan and saves them, with its items", async () => {
      await storage.putPlan(makePlan("a", { crops: { 3: { 5: [parsnip] } } }));

      const store = createPlanStore(storage);
      await store.start();
      store.setLooks(repairedLooks);

      expect(store.planInfo()?.looks).toEqual(repairedLooks);
      expect(await storage.getPlan("a")).toEqual(
        toStoredPlan(
          makePlan("a", {
            crops: { 3: { 5: [parsnip] } },
            looks: repairedLooks,
          }),
        ),
      );
    });

    it("keeps the looks of each plan when the plan changes", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b"));

      const store = createPlanStore(storage);
      await store.start();
      store.setLooks(repairedLooks);
      await store.openPlan("b");

      expect(store.planInfo()?.looks).toEqual(newFarmData("standard").looks);

      store.setLooks({ ...repairedLooks, petBowl: "stone_pet_bowl" });
      await store.openPlan("a");

      expect(store.planInfo()?.looks).toEqual(repairedLooks);
      expect(await storage.getPlan("b")).toMatchObject({
        looks: { ...repairedLooks, petBowl: "stone_pet_bowl" },
      });
    });

    it("does nothing when no plan is open", async () => {
      const store = createPlanStore(storage);
      await store.start();

      store.setLooks(repairedLooks);

      expect(store.planInfo()).toBeUndefined();
      expect(await storage.listPlans()).toEqual([]);
    });
  });

  describe("addPlanFromFile", () => {
    const fileData = {
      ...newFarmData("beach", { ...repairedLooks, house: 1 }),
      crops: { 3: { 5: [parsnip] } },
      date: 12,
    };

    it("adds the file as a new plan and opens it", async () => {
      await storage.putPlan(makePlan("a", { crops: { 3: { 5: [parsnip] } } }));

      const store = createPlanStore(storage);
      await store.start();
      const plan = await store.addPlanFromFile(
        planFile(
          "Beach run.layout.json",
          JSON.parse(toSavedFarmData(fileData)),
        ),
      );

      expect(plan).toEqual({ ...fileData, id: plan?.id, name: "Beach run" });
      expect(plan?.id).not.toBe("a");
      expect(store.currentPlan()).toEqual(plan);
      expect(store.plans()).toEqual([
        { farm: "standard", id: "a", name: "Plan a" },
        { farm: "beach", id: plan?.id, name: "Beach run" },
      ]);
      expect(await storage.getPlan("a")).toEqual(
        toStoredPlan(makePlan("a", { crops: { 3: { 5: [parsnip] } } })),
      );
      expect(await storage.listPlans()).toEqual(store.plans());
      expect(await storage.getLastPlanId()).toBe(plan?.id);
    });

    it("adds the same file twice as 2 plans with the same name", async () => {
      const store = createPlanStore(storage);
      await store.start();
      const data: unknown = JSON.parse(toSavedFarmData(fileData));

      const first = await store.addPlanFromFile(planFile("Twin.json", data));
      const second = await store.addPlanFromFile(planFile("Twin.json", data));

      expect(first?.id).not.toBe(second?.id);
      expect(store.plans().filter(({ name }) => name === "Twin")).toHaveLength(
        2,
      );
    });

    it("does not add a file with no farm type", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      await storage.putPlan(makePlan("a"));
      const store = createPlanStore(storage);
      await store.start();
      const plansBefore = store.plans();
      const oldFile = { crops: {}, date: 3, equipment: {}, version: 2 };

      expect(
        await store.addPlanFromFile(planFile("old.layout.json", oldFile)),
      ).toBeUndefined();
      expect(store.plans()).toEqual(plansBefore);
      expect(store.planInfo()?.id).toBe("a");
    });

    it("does not add a file that is not JSON", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      await storage.putPlan(makePlan("a"));
      const store = createPlanStore(storage);
      await store.start();

      expect(
        await store.addPlanFromFile(
          new File(["{"], "broken.layout.json", { type: "application/json" }),
        ),
      ).toBeUndefined();
      expect(store.plans()).toHaveLength(1);
    });
  });
});
