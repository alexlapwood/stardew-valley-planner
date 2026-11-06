import {
  defaultPlanName,
  groupPlansByFarm,
  type IPlan,
  makePlanId,
  newFarmData,
  planFileName,
  planNameFromFileName,
  readStoredPlan,
  toStoredPlan,
} from "./plan";

const parsnip: IPlantedCrop = {
  cropId: "parsnip",
  datePlanted: 0,
  type: "crop",
  x: 5,
  y: 3,
};

const plan: IPlan = {
  ...newFarmData("beach", {
    greenhouse: "repaired",
    house: 1,
    petBowl: "stone_pet_bowl",
  }),
  crops: { 3: { 5: [parsnip] } },
  date: 30,
  id: "plan-1",
  name: "My farm",
};

describe("Plan", () => {
  describe("makePlanId", () => {
    it("makes a different ID each time", () => {
      const ids = new Set(Array.from({ length: 50 }, makePlanId));

      expect(ids.size).toBe(50);
    });

    it("makes an ID of 32 hex digits", () => {
      expect(makePlanId()).toMatch(/^[\da-f]{32}$/u);
    });
  });

  describe("newFarmData", () => {
    it("starts an empty plan on day 0 with the start looks", () => {
      expect(newFarmData("hilltop")).toEqual({
        crops: {},
        date: 0,
        equipment: {},
        farm: "hilltop",
        looks: { greenhouse: "broken", house: 0, petBowl: "pet_bowl" },
      });
    });
  });

  describe("defaultPlanName", () => {
    it("names the plan after the farm", () => {
      expect(
        defaultPlanName("beach", [{ name: "Standard Farm" }, { name: "Mine" }]),
      ).toBe("Beach Farm");
    });

    it("adds the next free number when a plan has the farm name", () => {
      expect(
        defaultPlanName("beach", [
          { name: "Beach Farm" },
          { name: "Beach Farm 2" },
          { name: "Beach Farm 4" },
        ]),
      ).toBe("Beach Farm 3");
    });
  });

  describe("planFileName", () => {
    it("names the file after the plan", () => {
      expect(planFileName({ name: "My farm" })).toBe("My farm.layout.json");
    });
  });

  describe("planNameFromFileName", () => {
    it.each([
      ["My farm.layout.json", "My farm"],
      ["My farm.LAYOUT.JSON", "My farm"],
      ["My farm.json", "My farm"],
      [" Spaced out .layout.json", "Spaced out"],
      ["My farm (1).layout.json", "My farm (1)"],
      ["notes.txt", "notes.txt"],
    ])("names the plan from %s as %s", (fileName, name) => {
      expect(planNameFromFileName(fileName, "standard")).toBe(name);
    });

    it("uses the farm name when the file name has no name", () => {
      expect(planNameFromFileName(".layout.json", "four_corners")).toBe(
        "Four Corners Farm",
      );
    });
  });

  describe("stored plans", () => {
    it("reads back a stored plan", () => {
      const stored: unknown = JSON.parse(JSON.stringify(toStoredPlan(plan)));

      expect(readStoredPlan(stored)).toEqual({ badItems: [], plan });
    });

    it("keeps the ID, the name, the farm type and the looks", () => {
      expect(toStoredPlan(plan)).toMatchObject({
        farm: "beach",
        id: "plan-1",
        looks: { greenhouse: "repaired", house: 1, petBowl: "stone_pet_bowl" },
        name: "My farm",
      });
    });

    it("does not read a stored plan with no ID or name", () => {
      const stored = toStoredPlan(plan);
      const theories = [
        { ...stored, id: undefined },
        { ...stored, id: 1 },
        { ...stored, name: undefined },
        { ...stored, name: null },
      ];

      theories.forEach((theory) => {
        expect(readStoredPlan(theory)).toBeUndefined();
      });
    });

    it("does not read a stored plan with no farm type", () => {
      expect(
        readStoredPlan({ ...toStoredPlan(plan), farm: undefined }),
      ).toBeUndefined();
    });
  });

  describe("groupPlansByFarm", () => {
    it("lists only the farms that have plans, in the game's farm order", () => {
      const plans = [
        { farm: "beach", id: "1", name: "Beach Farm" },
        { farm: "standard", id: "2", name: "Standard Farm" },
        { farm: "beach", id: "3", name: "Beach Farm" },
        { farm: "forest", id: "4", name: "Woods" },
      ] as const;

      expect(groupPlansByFarm(plans)).toEqual([
        { farm: "standard", plans: [plans[1]] },
        { farm: "forest", plans: [plans[3]] },
        { farm: "beach", plans: [plans[0], plans[2]] },
      ]);
    });

    it("lists nothing when there are no plans", () => {
      expect(groupPlansByFarm([])).toEqual([]);
    });
  });
});
