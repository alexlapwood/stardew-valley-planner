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
  ...newFarmData("beach"),
  crops: { 3: { 5: [parsnip] } },
  cutBushes: [{ dateCut: 9, x: 40, y: 20 }],
  date: 30,
  greenhouseRepair: { datePlaced: 12 },
  houseUpgrades: [{ datePlaced: 4, level: 1 }],
  id: "plan-1",
  name: "My farm",
  petBowlPaints: [{ datePainted: 6, skin: "stone_pet_bowl" }],
};

function fence(skin: string, x: number, y: number): IInstalledEquipment {
  return {
    dateInstalled: 0,
    equipmentId: "fence",
    skin,
    type: "equipment",
    x,
    y,
  };
}

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
    it("starts an empty plan on day 0 with no buildings, no house upgrades, no greenhouse repair and no pet bowl paints", () => {
      expect(newFarmData("hilltop")).toStrictEqual({
        buildings: [],
        crops: {},
        cutBushes: [],
        date: 0,
        equipment: {},
        farm: "hilltop",
        houseUpgrades: [],
        petBowlPaints: [],
      });
    });

    it("puts the start of the farm on the plan from day 0: a finished starter building and the items", () => {
      const start: IFarmStart = {
        buildings: [{ building: "coop", x: 54, y: 9 }],
        items: [
          { item: "fence", skin: "wood_fence", x: 62, y: 12 },
          { item: "fence", skin: "gate", x: 62, y: 13 },
          { item: "fence", skin: "wood_fence", x: 61, y: 20 },
        ],
      };

      expect(newFarmData("meadowlands", start)).toStrictEqual({
        buildings: [
          { buildingId: "coop", datePlaced: 0, starter: true, x: 54, y: 9 },
        ],
        crops: {},
        cutBushes: [],
        date: 0,
        equipment: {
          12: { 62: [fence("wood_fence", 62, 12)] },
          13: { 62: [fence("gate", 62, 13)] },
          20: { 61: [fence("wood_fence", 61, 20)] },
        },
        farm: "meadowlands",
        houseUpgrades: [],
        petBowlPaints: [],
      });
    });

    it("reads back a plan with a starter building as it was saved", () => {
      const starterPlan: IPlan = {
        ...newFarmData("meadowlands", {
          buildings: [{ building: "coop", x: 54, y: 9 }],
          items: [{ item: "fence", skin: "gate", x: 62, y: 13 }],
        }),
        id: "plan-2",
        name: "Cows",
      };
      const stored: unknown = JSON.parse(
        JSON.stringify(toStoredPlan(starterPlan)),
      );

      expect(readStoredPlan(stored)).toEqual({
        badItems: [],
        plan: starterPlan,
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

    it("keeps the ID, the name, the farm type, the dated upgrades and the pet bowl paints", () => {
      expect(toStoredPlan(plan)).toMatchObject({
        farm: "beach",
        greenhouseRepair: { datePlaced: 12 },
        houseUpgrades: [{ datePlaced: 4, level: 1 }],
        id: "plan-1",
        name: "My farm",
        petBowlPaints: [{ datePainted: 6, skin: "stone_pet_bowl" }],
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
