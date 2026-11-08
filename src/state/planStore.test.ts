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

const barn: IPlannedBuilding = {
  buildingId: "barn",
  datePlaced: 3,
  x: 10,
  y: 12,
};

const petBowlPaints: IPlannedPaint[] = [
  { datePainted: 5, skin: "hay_pet_bowl" },
];

const houseUpgrades: IPlannedHouseUpgrade[] = [{ datePlaced: 4, level: 1 }];

const greenhouseRepair: IPlannedRepair = { datePlaced: 9 };

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
        ...newFarmData("beach"),
        buildings: [barn],
        date: 50,
        equipment: { 1: { 1: [scarecrow] } },
        greenhouseRepair,
        houseUpgrades,
        petBowlPaints,
      });
      await storage.putPlan(makePlan("a", { crops: { 3: { 5: [parsnip] } } }));
      await storage.putPlan(beach);

      const store = createPlanStore(storage);
      await store.start();
      const isOpen = await store.openPlan("beach");

      expect(isOpen).toBe(true);
      expect(store.currentPlan()).toEqual(beach);
      expect(store.buildings()).toEqual([barn]);
      expect(store.crops()).toEqual({});
      expect(store.houseUpgrades()).toEqual(houseUpgrades);
      expect(store.greenhouseRepair()).toEqual(greenhouseRepair);
      expect(store.petBowlPaints()).toEqual(petBowlPaints);
      expect(store.planInfo()).toEqual({
        farm: "beach",
        id: "beach",
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
      store.setBuildings([barn]);
      store.setCrops({ 3: { 5: [parsnip] } });
      store.setDate(7);
      store.setEquipment({ 1: { 1: [scarecrow] } });
      await store.openPlan("b");

      expect(store.buildings()).toEqual([]);
      expect(store.crops()).toEqual({});
      expect(await storage.getPlan("a")).toEqual(
        toStoredPlan(
          makePlan("a", {
            buildings: [barn],
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

  describe("addNewPlan", () => {
    const meadowlandsStart: IFarmStart = {
      buildings: [{ building: "coop", x: 54, y: 9 }],
      items: [{ item: "fence", skin: "gate", x: 62, y: 13 }],
    };

    function loadStart(farm: string) {
      return Promise.resolve(
        farm === "meadowlands"
          ? meadowlandsStart
          : { buildings: [], items: [] },
      );
    }

    it("makes a new plan with the start of its farm, saves it and opens it", async () => {
      const store = createPlanStore(storage, undefined, loadStart);
      await store.start();

      const plan = await store.addNewPlan("meadowlands", "Cows");

      expect(plan).toEqual({
        ...newFarmData("meadowlands", meadowlandsStart),
        id: plan?.id,
        name: "Cows",
      });
      expect(store.buildings()).toEqual([
        { buildingId: "coop", datePlaced: 0, starter: true, x: 54, y: 9 },
      ]);
      expect(store.equipment()).toEqual({
        13: {
          62: [
            {
              dateInstalled: 0,
              equipmentId: "fence",
              skin: "gate",
              type: "equipment",
              x: 62,
              y: 13,
            },
          ],
        },
      });
      expect(await storage.getPlan(plan?.id ?? "")).toEqual(
        toStoredPlan(store.currentPlan() ?? makePlan("none")),
      );
    });

    it("makes an empty new plan on a farm with nothing in its start", async () => {
      const store = createPlanStore(storage, undefined, loadStart);
      await store.start();

      await store.addNewPlan("standard", "Home");

      expect(store.buildings()).toEqual([]);
      expect(store.equipment()).toEqual({});
    });

    it("makes no plan when the start of the farm does not load", async () => {
      const error = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const store = createPlanStore(storage, undefined, () =>
        Promise.reject(new Error("No map")),
      );
      await store.start();

      expect(await store.addNewPlan("meadowlands", "Cows")).toBeUndefined();
      expect(store.plans()).toEqual([]);
      expect(store.planInfo()).toBeUndefined();
      expect(error).toHaveBeenCalledWith(
        "Could not load the start of the meadowlands farm.",
        new Error("No map"),
      );
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

  describe("setPetBowlPaints", () => {
    const stonePaints = [{ datePainted: 8, skin: "stone_pet_bowl" }];

    it("changes the pet bowl paints of the open plan and saves them, with its items", async () => {
      await storage.putPlan(makePlan("a", { crops: { 3: { 5: [parsnip] } } }));

      const store = createPlanStore(storage);
      await store.start();
      store.setPetBowlPaints(petBowlPaints);

      expect(store.petBowlPaints()).toEqual(petBowlPaints);
      expect(await storage.getPlan("a")).toEqual(
        toStoredPlan(
          makePlan("a", { crops: { 3: { 5: [parsnip] } }, petBowlPaints }),
        ),
      );
    });

    it("keeps the pet bowl paints of each plan when the plan changes", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b"));

      const store = createPlanStore(storage);
      await store.start();
      store.setPetBowlPaints(petBowlPaints);
      await store.openPlan("b");

      expect(store.petBowlPaints()).toEqual([]);

      store.setPetBowlPaints(stonePaints);
      await store.openPlan("a");

      expect(store.petBowlPaints()).toEqual(petBowlPaints);
      expect(await storage.getPlan("b")).toMatchObject({
        petBowlPaints: stonePaints,
      });
    });
  });

  describe("setHouseColorPaints", () => {
    const houseColorPaints: IPlannedColorPaint[] = [
      {
        colors: { Roof: { hue: 200, lightness: -12, saturation: 50 } },
        datePainted: 9,
      },
    ];

    it("changes the house paint of the open plan and saves it, and each plan keeps its own", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b"));

      const store = createPlanStore(storage);
      await store.start();
      store.setHouseColorPaints(houseColorPaints);

      expect(store.houseColorPaints()).toEqual(houseColorPaints);
      expect(await storage.getPlan("a")).toEqual(
        toStoredPlan(makePlan("a", { houseColorPaints })),
      );

      await store.openPlan("b");

      expect(store.houseColorPaints()).toEqual([]);

      await store.openPlan("a");

      expect(store.houseColorPaints()).toEqual(houseColorPaints);
    });
  });

  describe("cutBushes", () => {
    const destroyable: IFarmBush = {
      destroyable: true,
      size: "large",
      x: 4,
      y: 6,
    };
    const fixedBush: IFarmBush = {
      destroyable: false,
      size: "small",
      x: 9,
      y: 6,
    };
    const goodCut: ICutBush = { dateCut: 7, x: 4, y: 6 };
    const fixedCut: ICutBush = { dateCut: 7, x: 9, y: 6 };

    it("changes the cuts of the open plan and saves them, and each plan keeps its own", async () => {
      await storage.putPlan(makePlan("a"));
      await storage.putPlan(makePlan("b"));

      const store = createPlanStore(storage);
      await store.start();
      store.setCutBushes([goodCut]);

      expect(store.cutBushes()).toEqual([goodCut]);
      expect(await storage.getPlan("a")).toEqual(
        toStoredPlan(makePlan("a", { cutBushes: [goodCut] })),
      );

      await store.openPlan("b");

      expect(store.cutBushes()).toEqual([]);
    });

    it("opens a saved plan with only the cuts of the destroyable bushes of its farm, and reports the others", async () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);
      const loadBushes = vi.fn(() => Promise.resolve([destroyable, fixedBush]));
      await storage.putPlan(makePlan("a", { cutBushes: [goodCut, fixedCut] }));

      const store = createPlanStore(storage, undefined, undefined, loadBushes);
      await store.start();

      expect(loadBushes).toHaveBeenCalledWith("standard");
      expect(store.cutBushes()).toEqual([goodCut]);
      expect(warn).toHaveBeenCalledWith(
        "Removed 1 bad items from the saved plan.",
        [{ path: "cutBushes[1]", value: fixedCut }],
      );
    });

    it("keeps the cuts of a saved plan when the bushes of its farm do not load", async () => {
      const error = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      await storage.putPlan(makePlan("a", { cutBushes: [fixedCut] }));

      const store = createPlanStore(storage, undefined, undefined, () =>
        Promise.reject(new Error("offline")),
      );
      await store.start();

      expect(store.cutBushes()).toEqual([fixedCut]);
      expect(error).toHaveBeenCalledWith(
        "Could not load the bushes of the standard farm.",
        expect.any(Error),
      );
    });
  });

  describe("setHouseUpgrades and setGreenhouseRepair", () => {
    it("change the dated upgrades of the open plan and save them", async () => {
      await storage.putPlan(makePlan("a"));

      const store = createPlanStore(storage);
      await store.start();
      store.setHouseUpgrades(houseUpgrades);
      store.setGreenhouseRepair(greenhouseRepair);

      expect(await storage.getPlan("a")).toEqual(
        toStoredPlan(makePlan("a", { greenhouseRepair, houseUpgrades })),
      );

      store.setGreenhouseRepair(undefined);

      expect(await storage.getPlan("a")).not.toHaveProperty("greenhouseRepair");
    });

    it("keep the dated upgrades of each plan when the plan changes", async () => {
      await storage.putPlan(makePlan("a", { greenhouseRepair, houseUpgrades }));
      await storage.putPlan(makePlan("b"));
      await storage.setLastPlanId("a");

      const store = createPlanStore(storage);
      await store.start();
      await store.openPlan("b");

      expect(store.houseUpgrades()).toEqual([]);
      expect(store.greenhouseRepair()).toBeUndefined();

      await store.openPlan("a");

      expect(store.houseUpgrades()).toEqual(houseUpgrades);
      expect(store.greenhouseRepair()).toEqual(greenhouseRepair);
    });
  });

  describe("addPlanFromFile", () => {
    const fileData = {
      ...newFarmData("beach"),
      crops: { 3: { 5: [parsnip] } },
      date: 12,
      greenhouseRepair,
      houseUpgrades,
      petBowlPaints,
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
