import { createMemoryPlanStorage } from "../__mocks__/memoryPlanStorage";
import { type IPlan, newFarmData, toStoredPlan } from "./plan";
import {
  createLocalPlanStorage,
  type IPlanStorage,
  planIndexKey,
  planKey,
} from "./planStorage";

function makePlan(id: string, fields: Partial<IPlan> = {}): IPlan {
  return { ...newFarmData("standard"), id, name: `Plan ${id}`, ...fields };
}

const storages: [string, () => IPlanStorage][] = [
  ["localStorage", () => createLocalPlanStorage(localStorage)],
  ["memory", createMemoryPlanStorage],
];

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(storages)("%s plan storage", (_, createStorage) => {
  it("has no plans and no last plan at first", async () => {
    const storage = createStorage();

    expect(await storage.listPlans()).toEqual([]);
    expect(await storage.getLastPlanId()).toBeUndefined();
    expect(await storage.getPlan("nope")).toBeUndefined();
  });

  it("gives back a saved plan by its ID", async () => {
    const storage = createStorage();
    const plan = makePlan("a", {
      ...newFarmData("beach"),
      date: 40,
      petBowlPaints: [{ datePainted: 3, skin: "hay_pet_bowl" }],
    });

    await storage.putPlan(plan);

    expect(await storage.getPlan("a")).toEqual(toStoredPlan(plan));
  });

  it("lists the plans in the order they were added", async () => {
    const storage = createStorage();

    await storage.putPlan(makePlan("a"));
    await storage.putPlan(makePlan("b", { farm: "forest", name: "Woods" }));
    await storage.putPlan(makePlan("c", { name: "Plan a" }));

    expect(await storage.listPlans()).toEqual([
      { farm: "standard", id: "a", name: "Plan a" },
      { farm: "forest", id: "b", name: "Woods" },
      { farm: "standard", id: "c", name: "Plan a" },
    ]);
  });

  it("saves a plan again in its own place", async () => {
    const storage = createStorage();
    const plan = makePlan("a");

    await storage.putPlan(plan);
    await storage.putPlan(makePlan("b"));
    await storage.putPlan({ ...plan, date: 9, name: "New name" });

    expect(await storage.listPlans()).toEqual([
      { farm: "standard", id: "a", name: "New name" },
      { farm: "standard", id: "b", name: "Plan b" },
    ]);
    expect(await storage.getPlan("a")).toMatchObject({ date: 9 });
  });

  it("keeps the last plan used", async () => {
    const storage = createStorage();

    await storage.putPlan(makePlan("a"));
    await storage.putPlan(makePlan("b"));
    await storage.setLastPlanId("b");

    expect(await storage.getLastPlanId()).toBe("b");
  });

  it("deletes a plan", async () => {
    const storage = createStorage();

    await storage.putPlan(makePlan("a"));
    await storage.putPlan(makePlan("b"));
    await storage.deletePlan("a");

    expect(await storage.listPlans()).toEqual([
      { farm: "standard", id: "b", name: "Plan b" },
    ]);
    expect(await storage.getPlan("a")).toBeUndefined();
    expect(await storage.getPlan("b")).toEqual(toStoredPlan(makePlan("b")));
  });

  it("gives the last plan used of the plans that are left after a delete", async () => {
    const storage = createStorage();

    for (const id of ["a", "b", "c"]) {
      await storage.putPlan(makePlan(id));
    }
    for (const id of ["b", "a", "c", "a"]) {
      await storage.setLastPlanId(id);
    }

    await storage.deletePlan("a");

    expect(await storage.getLastPlanId()).toBe("c");

    await storage.deletePlan("c");

    expect(await storage.getLastPlanId()).toBe("b");

    await storage.deletePlan("b");

    expect(await storage.getLastPlanId()).toBeUndefined();
  });
});

describe("localStorage plan storage", () => {
  it("keeps an index key and one key for each plan", async () => {
    const storage = createLocalPlanStorage(localStorage);

    await storage.putPlan(makePlan("a"));
    await storage.putPlan(makePlan("b"));
    await storage.setLastPlanId("a");

    expect(Object.keys(localStorage).toSorted()).toEqual(
      [planIndexKey, planKey("a"), planKey("b")].toSorted(),
    );
    expect(JSON.parse(localStorage.getItem(planIndexKey) ?? "")).toEqual({
      plans: [
        { farm: "standard", id: "a", name: "Plan a" },
        { farm: "standard", id: "b", name: "Plan b" },
      ],
      recentPlanIds: ["a"],
    });
  });

  it("removes the key of a deleted plan and its place in the index", async () => {
    const storage = createLocalPlanStorage(localStorage);

    await storage.putPlan(makePlan("a"));
    await storage.putPlan(makePlan("b"));
    await storage.setLastPlanId("b");
    await storage.setLastPlanId("a");
    await storage.deletePlan("a");

    expect(Object.keys(localStorage).toSorted()).toEqual(
      [planIndexKey, planKey("b")].toSorted(),
    );
    expect(JSON.parse(localStorage.getItem(planIndexKey) ?? "")).toEqual({
      plans: [{ farm: "standard", id: "b", name: "Plan b" }],
      recentPlanIds: ["b"],
    });
  });

  it("skips a recent plan ID in the index that is not valid", async () => {
    localStorage.setItem(
      planIndexKey,
      JSON.stringify({ plans: [], recentPlanIds: [3, "b"] }),
    );

    expect(await createLocalPlanStorage(localStorage).getLastPlanId()).toBe(
      "b",
    );
  });

  it("keeps the plans after a reload", async () => {
    await createLocalPlanStorage(localStorage).putPlan(makePlan("a"));

    expect(await createLocalPlanStorage(localStorage).listPlans()).toEqual([
      { farm: "standard", id: "a", name: "Plan a" },
    ]);
  });

  it("does not read the old single plan", async () => {
    localStorage.setItem(
      "stardewValleySeasonalPlannerV2",
      JSON.stringify({ crops: {}, date: 3, equipment: {}, version: 2 }),
    );

    expect(await createLocalPlanStorage(localStorage).listPlans()).toEqual([]);
  });

  it("lists no plans when the index is not valid", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const theories = ["{", "[]", JSON.stringify({ plans: {} })];

    for (const theory of theories) {
      localStorage.setItem(planIndexKey, theory);

      expect(await createLocalPlanStorage(localStorage).listPlans()).toEqual(
        [],
      );
    }

    expect(console.error).toHaveBeenCalledTimes(theories.length);
  });

  it("skips a summary in the index that is not valid", async () => {
    localStorage.setItem(
      planIndexKey,
      JSON.stringify({
        plans: [
          { farm: "standard", id: "a", name: "Plan a" },
          { farm: "nowhere", id: "b", name: "Plan b" },
          { farm: "beach", id: 3, name: "Plan c" },
        ],
      }),
    );

    expect(await createLocalPlanStorage(localStorage).listPlans()).toEqual([
      { farm: "standard", id: "a", name: "Plan a" },
    ]);
  });

  it("fails to get a plan that is not valid JSON", async () => {
    localStorage.setItem(planKey("a"), "{");

    await expect(
      createLocalPlanStorage(localStorage).getPlan("a"),
    ).rejects.toThrow(SyntaxError);
  });
});
