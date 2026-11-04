import { isFarmData } from "./farm";

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
  skinIndex: 2,
  type: "equipment",
  x: 7,
  y: 3,
};

function farmWithCrop(crop: unknown) {
  return { crops: { 3: { 5: [crop] } }, date: 0, equipment: {} };
}

function farmWithEquipment(equipment: unknown) {
  return { crops: {}, date: 0, equipment: { 3: { 7: [equipment] } } };
}

function withoutField(cell: Record<string, unknown>, field: string) {
  return Object.fromEntries(
    Object.entries(cell).filter(([key]) => key !== field),
  );
}

describe("Farm state", () => {
  describe("isFarmData", () => {
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
              { ...validEquipment, equipmentId: "fence", skinIndex: 3, x: 8 },
            ],
          },
          4: {
            7: [{ ...validEquipment, equipmentId: "scarecrow", y: 4 }],
          },
        },
      };

      expect(isFarmData(farm)).toBe(true);
    });

    it("accepts a farm with no crops or equipment", () => {
      expect(isFarmData({ crops: {}, date: 0, equipment: {} })).toBe(true);
    });

    it("rejects a farm when a row or a tile is not the right shape", () => {
      const theories = [
        { crops: { 3: [] }, date: 0, equipment: {} },
        { crops: { 3: { 5: validCrop } }, date: 0, equipment: {} },
        { crops: {}, date: 0, equipment: { 3: null } },
        { crops: {}, date: 0, equipment: { 3: { 7: {} } } },
      ];

      theories.forEach((theory) => {
        expect(isFarmData(theory)).toBe(false);
      });
    });

    it("rejects a crop cell that is not an object", () => {
      const theories = [null, "parsnip", 5, [validCrop]];

      theories.forEach((theory) => {
        expect(isFarmData(farmWithCrop(theory))).toBe(false);
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
        expect(isFarmData(farmWithCrop(theory))).toBe(false);
      });
    });

    it("rejects a crop cell with a missing field", () => {
      const theories = ["cropId", "datePlanted", "type", "x", "y"];

      theories.forEach((theory) => {
        expect(isFarmData(farmWithCrop(withoutField(validCrop, theory)))).toBe(
          false,
        );
      });
    });

    it("rejects a crop cell with an unknown crop id", () => {
      const theories = ["not_a_crop", "", "toString", "__proto__"];

      theories.forEach((theory) => {
        expect(isFarmData(farmWithCrop({ ...validCrop, cropId: theory }))).toBe(
          false,
        );
      });
    });

    it("rejects a crop cell that is not at its own tile", () => {
      const theories = [
        { ...validCrop, x: 6 },
        { ...validCrop, y: 4 },
      ];

      theories.forEach((theory) => {
        expect(isFarmData(farmWithCrop(theory))).toBe(false);
      });
    });

    it("rejects an equipment cell that is not an object", () => {
      const theories = [null, "sprinkler", 5, [validEquipment]];

      theories.forEach((theory) => {
        expect(isFarmData(farmWithEquipment(theory))).toBe(false);
      });
    });

    it("rejects an equipment cell with a field of the wrong type", () => {
      const theories = [
        { ...validEquipment, dateDestroyed: "4" },
        { ...validEquipment, dateInstalled: "0" },
        { ...validEquipment, equipmentId: 1 },
        { ...validEquipment, skinIndex: "0" },
        { ...validEquipment, skinIndex: 0.5 },
        { ...validEquipment, skinIndex: -1 },
        { ...validEquipment, type: "crop" },
        { ...validEquipment, x: null },
        { ...validEquipment, y: "3" },
      ];

      theories.forEach((theory) => {
        expect(isFarmData(farmWithEquipment(theory))).toBe(false);
      });
    });

    it("rejects an equipment cell with a missing field", () => {
      const theories = [
        "dateInstalled",
        "equipmentId",
        "skinIndex",
        "type",
        "x",
        "y",
      ];

      theories.forEach((theory) => {
        expect(
          isFarmData(farmWithEquipment(withoutField(validEquipment, theory))),
        ).toBe(false);
      });
    });

    it("rejects an equipment cell with an unknown equipment id", () => {
      const theories = ["not_equipment", "", "toString", "__proto__"];

      theories.forEach((theory) => {
        expect(
          isFarmData(
            farmWithEquipment({ ...validEquipment, equipmentId: theory }),
          ),
        ).toBe(false);
      });
    });

    it("rejects an equipment cell with a skin the equipment does not have", () => {
      const theories = [
        { ...validEquipment, equipmentId: "sprinkler", skinIndex: 3 },
        { ...validEquipment, equipmentId: "keg", skinIndex: 1 },
      ];

      theories.forEach((theory) => {
        expect(isFarmData(farmWithEquipment(theory))).toBe(false);
      });
    });

    it("rejects an equipment cell that is not at its own tile", () => {
      const theories = [
        { ...validEquipment, x: 8 },
        { ...validEquipment, y: 4 },
      ];

      theories.forEach((theory) => {
        expect(isFarmData(farmWithEquipment(theory))).toBe(false);
      });
    });
  });
});
