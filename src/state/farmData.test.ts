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

function farmWithCrop(crop: unknown) {
  return { crops: { 3: { 5: [crop] } }, date: 0, equipment: {}, version: 2 };
}

function farmWithEquipment(equipment: unknown) {
  return {
    crops: {},
    date: 0,
    equipment: { 3: { 7: [equipment] } },
    version: 2,
  };
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
      const farm = {
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
        version: 2,
      };

      expect(readFarmData(farm)).toEqual({
        badItems: [],
        farm: { crops: farm.crops, date: 12, equipment: farm.equipment },
      });
    });

    it("accepts a farm with no crops or equipment", () => {
      expect(
        isGoodFarm({ crops: {}, date: 0, equipment: {}, version: 2 }),
      ).toBe(true);
    });

    it("does not read a farm with an unknown version", () => {
      expect(
        readFarmData({ crops: {}, date: 0, equipment: {}, version: 3 }),
      ).toBeUndefined();
    });

    it("does not read a value that is not a farm", () => {
      const theories = [null, [], { crops: {}, date: "0", equipment: {} }];

      theories.forEach((theory) => {
        expect(readFarmData(theory)).toBeUndefined();
      });
    });

    it("drops only the bad cells and keeps the good ones", () => {
      const farm = {
        crops: { 3: { 5: [validCrop, { ...validCrop, cropId: "nope" }] } },
        date: 0,
        equipment: {},
        version: 2,
      };

      const result = readFarmData(farm);

      expect(result?.farm.crops).toEqual({ 3: { 5: [validCrop] } });
      expect(result?.badItems).toEqual([
        { path: "crops[3][5][1]", value: { ...validCrop, cropId: "nope" } },
      ]);
    });

    it("rejects a farm when a row or a tile is not the right shape", () => {
      const theories = [
        { crops: { 3: [] }, date: 0, equipment: {}, version: 2 },
        { crops: { 3: { 5: validCrop } }, date: 0, equipment: {}, version: 2 },
        { crops: {}, date: 0, equipment: { 3: null }, version: 2 },
        { crops: {}, date: 0, equipment: { 3: { 7: {} } }, version: 2 },
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

    it("keeps a V1 cactus cell as cactus fruit", () => {
      const cactusV1 = { ...validCrop, cropId: "cactus" };

      expect(
        readFarmData({
          crops: { 3: { 5: [cactusV1] } },
          date: 0,
          equipment: {},
        }),
      ).toEqual({
        badItems: [],
        farm: {
          crops: { 3: { 5: [{ ...cactusV1, cropId: "cactus_fruit" }] } },
          date: 0,
          equipment: {},
        },
      });
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
  });

  describe("toSavedFarmData", () => {
    it("saves the farm with version 2, and reads it back", () => {
      const farm = farmWithEquipment(validEquipment);
      const saved: unknown = JSON.parse(
        toSavedFarmData({
          crops: {},
          date: 0,
          equipment: { 3: { 7: [validEquipment] } },
        } as Parameters<typeof toSavedFarmData>[0]),
      );

      expect(saved).toEqual(farm);
      expect(isGoodFarm(saved)).toBe(true);
    });
  });
});
