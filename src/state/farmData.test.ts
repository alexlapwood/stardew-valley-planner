import { readFarmData, toSavedFarmData } from "./farmData";

const validCrop = {
  cropId: "parsnip",
  dateDestroyed: 4,
  datePlanted: 0,
  type: "crop",
  x: 5,
  y: 3,
};

const validEquipment = {
  dateInstalled: 0,
  equipmentId: "sprinkler",
  skin: "iridium_sprinkler",
  type: "equipment",
  x: 7,
  y: 3,
};

const looks = { greenhouse: "repaired", house: 2, petBowl: "hay_pet_bowl" };

function farmFile(fields: Record<string, unknown> = {}) {
  return {
    crops: {},
    date: 0,
    equipment: {},
    farm: "beach",
    looks,
    version: 3,
    ...fields,
  };
}

function farmWithCrop(crop: unknown) {
  return farmFile({ crops: { 3: { 5: [crop] } } });
}

function farmWithEquipment(equipment: unknown) {
  return farmFile({ equipment: { 3: { 7: [equipment] } } });
}

function withoutField(cell: Record<string, unknown>, field: string) {
  return Object.fromEntries(
    Object.entries(cell).filter(([key]) => key !== field),
  );
}

function isGoodFarm(value: unknown) {
  return readFarmData(value)?.badItems.length === 0;
}

describe("Farm data", () => {
  describe("readFarmData", () => {
    it("accepts a valid farm", () => {
      const farm = farmFile({
        crops: {
          3: {
            5: [validCrop, { ...validCrop, dateDestroyed: undefined }],
            6: [{ ...validCrop, cropId: "cauliflower", x: 6 }],
          },
        },
        date: 12,
        equipment: {
          3: {
            7: [validEquipment],
            8: [
              {
                ...validEquipment,
                equipmentId: "fence",
                skin: "hardwood_fence",
                x: 8,
              },
            ],
          },
          4: {
            7: [
              {
                ...validEquipment,
                equipmentId: "scarecrow",
                skin: "deluxe_scarecrow",
                y: 4,
              },
            ],
          },
        },
      });

      expect(readFarmData(farm)).toEqual({
        badItems: [],
        data: {
          crops: farm.crops,
          date: 12,
          equipment: farm.equipment,
          farm: "beach",
          looks,
        },
      });
    });

    it("accepts a farm with no crops or equipment", () => {
      expect(isGoodFarm(farmFile())).toBe(true);
    });

    it("does not read a farm with an unknown version", () => {
      const theories = [2, 4, undefined, "3"];

      theories.forEach((theory) => {
        expect(readFarmData(farmFile({ version: theory }))).toBeUndefined();
      });
    });

    it("does not read a farm with no farm type or an unknown farm type", () => {
      const theories = [undefined, "", "Beach", "toString", 1];

      theories.forEach((theory) => {
        expect(readFarmData(farmFile({ farm: theory }))).toBeUndefined();
      });
    });

    it("does not read a farm with no looks", () => {
      const theories = [undefined, null, [], "repaired"];

      theories.forEach((theory) => {
        expect(readFarmData(farmFile({ looks: theory }))).toBeUndefined();
      });
    });

    it("does not read a value that is not a farm", () => {
      const theories = [null, [], farmFile({ date: "0" })];

      theories.forEach((theory) => {
        expect(readFarmData(theory)).toBeUndefined();
      });
    });

    it("uses the start look for a look it does not know, and reports it", () => {
      const result = readFarmData(
        farmFile({
          looks: { greenhouse: "fixed", house: 3, petBowl: "gold_pet_bowl" },
        }),
      );

      expect(result?.data.looks).toEqual({
        greenhouse: "broken",
        house: 0,
        petBowl: "pet_bowl",
      });
      expect(result?.badItems).toEqual([
        { path: "looks.greenhouse", value: "fixed" },
        { path: "looks.house", value: 3 },
        { path: "looks.petBowl", value: "gold_pet_bowl" },
      ]);
    });

    it("uses the pet bowl with no skin when the looks have no pet bowl, and reports it", () => {
      const result = readFarmData(
        farmFile({ looks: { greenhouse: "repaired", house: 2 } }),
      );

      expect(result?.data.looks).toEqual({
        greenhouse: "repaired",
        house: 2,
        petBowl: "pet_bowl",
      });
      expect(result?.badItems).toEqual([
        { path: "looks.petBowl", value: undefined },
      ]);
    });

    it.each(["pet_bowl", "hay_pet_bowl", "stone_pet_bowl"])(
      "reads the %s pet bowl look",
      (petBowl) => {
        const result = readFarmData(farmFile({ looks: { ...looks, petBowl } }));

        expect(result?.data.looks.petBowl).toBe(petBowl);
        expect(result?.badItems).toEqual([]);
      },
    );

    it("drops only the bad cells and keeps the good ones", () => {
      const farm = farmFile({
        crops: { 3: { 5: [validCrop, { ...validCrop, cropId: "nope" }] } },
      });

      const result = readFarmData(farm);

      expect(result?.data.crops).toEqual({ 3: { 5: [validCrop] } });
      expect(result?.badItems).toEqual([
        { path: "crops[3][5][1]", value: { ...validCrop, cropId: "nope" } },
      ]);
    });

    it("rejects a farm when a row or a tile is not the right shape", () => {
      const theories = [
        farmFile({ crops: { 3: [] } }),
        farmFile({ crops: { 3: { 5: validCrop } } }),
        farmFile({ equipment: { 3: null } }),
        farmFile({ equipment: { 3: { 7: {} } } }),
      ];

      theories.forEach((theory) => {
        expect(isGoodFarm(theory)).toBe(false);
      });
    });

    it("rejects a crop cell that is not an object", () => {
      const theories = [null, "parsnip", 5, [validCrop]];

      theories.forEach((theory) => {
        expect(isGoodFarm(farmWithCrop(theory))).toBe(false);
      });
    });

    it("rejects a crop cell with a field of the wrong type", () => {
      const theories = [
        { ...validCrop, cropId: 1 },
        { ...validCrop, dateDestroyed: "4" },
        { ...validCrop, datePlanted: "0" },
        { ...validCrop, datePlanted: null },
        { ...validCrop, type: "equipment" },
        { ...validCrop, x: "5" },
        { ...validCrop, y: 3.5 },
      ];

      theories.forEach((theory) => {
        expect(isGoodFarm(farmWithCrop(theory))).toBe(false);
      });
    });

    it("rejects a crop cell with a missing field", () => {
      const theories = ["cropId", "datePlanted", "type", "x", "y"];

      theories.forEach((theory) => {
        expect(isGoodFarm(farmWithCrop(withoutField(validCrop, theory)))).toBe(
          false,
        );
      });
    });

    it("rejects a crop cell with an unknown crop id", () => {
      const theories = ["not_a_crop", "", "toString", "__proto__", "cactus"];

      theories.forEach((theory) => {
        expect(isGoodFarm(farmWithCrop({ ...validCrop, cropId: theory }))).toBe(
          false,
        );
      });
    });

    it("keeps a crop cell with a crop that regrows in every season", () => {
      expect(
        isGoodFarm(farmWithCrop({ ...validCrop, cropId: "cactus_fruit" })),
      ).toBe(true);
    });

    it("rejects a crop cell that is not at its own tile", () => {
      const theories = [
        { ...validCrop, x: 6 },
        { ...validCrop, y: 4 },
      ];

      theories.forEach((theory) => {
        expect(isGoodFarm(farmWithCrop(theory))).toBe(false);
      });
    });

    it("rejects an equipment cell that is not an object", () => {
      const theories = [null, "sprinkler", 5, [validEquipment]];

      theories.forEach((theory) => {
        expect(isGoodFarm(farmWithEquipment(theory))).toBe(false);
      });
    });

    it("rejects an equipment cell with a field of the wrong type", () => {
      const theories = [
        { ...validEquipment, dateDestroyed: "4" },
        { ...validEquipment, dateInstalled: "0" },
        { ...validEquipment, equipmentId: 1 },
        { ...validEquipment, skin: 2 },
        { ...validEquipment, type: "crop" },
        { ...validEquipment, x: null },
        { ...validEquipment, y: "3" },
      ];

      theories.forEach((theory) => {
        expect(isGoodFarm(farmWithEquipment(theory))).toBe(false);
      });
    });

    it("rejects an equipment cell with a missing field", () => {
      const theories = [
        "dateInstalled",
        "equipmentId",
        "skin",
        "type",
        "x",
        "y",
      ];

      theories.forEach((theory) => {
        expect(
          isGoodFarm(farmWithEquipment(withoutField(validEquipment, theory))),
        ).toBe(false);
      });
    });

    it("rejects an equipment cell with an unknown equipment id", () => {
      const theories = ["not_equipment", "", "toString", "__proto__"];

      theories.forEach((theory) => {
        expect(
          isGoodFarm(
            farmWithEquipment({ ...validEquipment, equipmentId: theory }),
          ),
        ).toBe(false);
      });
    });

    it("rejects an equipment cell with a skin the equipment does not have", () => {
      const theories = [
        { ...validEquipment, equipmentId: "sprinkler", skin: "scarecrow" },
        { ...validEquipment, equipmentId: "keg", skin: "toString" },
        { ...validEquipment, equipmentId: "keg", skin: "" },
        { ...withoutField(validEquipment, "skin"), skinIndex: 2 },
      ];

      theories.forEach((theory) => {
        expect(isGoodFarm(farmWithEquipment(theory))).toBe(false);
      });
    });

    it("rejects an equipment cell that is not at its own tile", () => {
      const theories = [
        { ...validEquipment, x: 8 },
        { ...validEquipment, y: 4 },
      ];

      theories.forEach((theory) => {
        expect(isGoodFarm(farmWithEquipment(theory))).toBe(false);
      });
    });

    describe("floor variants", () => {
      const steppingStone = {
        ...validEquipment,
        equipmentId: "flooring",
        skin: "stepping_stone_path",
      };

      it("keeps a variant from 0 to 15", () => {
        [0, 7, 15].forEach((variant) => {
          const cell = { ...steppingStone, variant };

          expect(readFarmData(farmWithEquipment(cell))?.data.equipment).toEqual(
            { 3: { 7: [cell] } },
          );
        });
      });

      it("drops a variant that is not a whole number from 0 to 15, and keeps the cell", () => {
        const theories = [-1, 16, 2.5, "3", null, true];

        theories.forEach((theory) => {
          expect(
            readFarmData(
              farmWithEquipment({ ...steppingStone, variant: theory }),
            ),
          ).toEqual({
            badItems: [],
            data: {
              crops: {},
              date: 0,
              equipment: { 3: { 7: [steppingStone] } },
              farm: "beach",
              looks,
            },
          });
        });
      });

      it("does not add a variant to a cell that has none", () => {
        const cell = readFarmData(farmWithEquipment(steppingStone))?.data
          .equipment[3][7][0];

        expect(cell).toEqual(steppingStone);
        expect(cell).not.toHaveProperty("variant");
      });
    });
  });

  describe("toSavedFarmData", () => {
    it("saves the farm type, the looks and the items with version 3, and reads them back", () => {
      const farm = farmWithEquipment(validEquipment);
      const saved: unknown = JSON.parse(
        toSavedFarmData({
          crops: {},
          date: 0,
          equipment: { 3: { 7: [validEquipment] } },
          farm: "beach",
          looks: { greenhouse: "repaired", house: 2, petBowl: "hay_pet_bowl" },
        } as Parameters<typeof toSavedFarmData>[0]),
      );

      expect(saved).toEqual(farm);
      expect(isGoodFarm(saved)).toBe(true);
    });

    it("does not save the plan ID or the plan name", () => {
      const saved: unknown = JSON.parse(
        toSavedFarmData({
          crops: {},
          date: 0,
          equipment: {},
          farm: "standard",
          id: "abc",
          looks: { greenhouse: "broken", house: 0, petBowl: "pet_bowl" },
          name: "My farm",
        } as Parameters<typeof toSavedFarmData>[0]),
      );

      expect(saved).not.toHaveProperty("id");
      expect(saved).not.toHaveProperty("name");
    });
  });
});
