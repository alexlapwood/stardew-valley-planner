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

const petBowlPaints: IPlannedPaint[] = [
  { datePainted: 4, skin: "hay_pet_bowl" },
];

function farmFile(fields: Record<string, unknown> = {}) {
  return {
    buildings: [],
    crops: {},
    cutBushes: [],
    date: 0,
    equipment: {},
    farm: "beach",
    houseUpgrades: [],
    petBowlPaints,
    version: 4,
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
          buildings: [],
          crops: farm.crops,
          cutBushes: [],
          date: 12,
          equipment: farm.equipment,
          farm: "beach",
          houseUpgrades: [],
          petBowlPaints,
        },
      });
    });

    it("accepts a farm with no crops or equipment", () => {
      expect(isGoodFarm(farmFile())).toBe(true);
    });

    it("does not read a farm with an unknown version", () => {
      const theories = [3, 5, undefined, "4"];

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

    it("does not read a value that is not a farm", () => {
      const theories = [null, [], farmFile({ date: "0" })];

      theories.forEach((theory) => {
        expect(readFarmData(theory)).toBeUndefined();
      });
    });

    describe("pet bowl paints", () => {
      const hay = { datePainted: 0, skin: "hay_pet_bowl" };
      const stone = { datePainted: 9, skin: "stone_pet_bowl" };
      const noSkin = { datePainted: 20, skin: "pet_bowl" };

      it("keeps the paints of the fixed pet bowl in date order, from the first day", () => {
        const result = readFarmData(
          farmFile({ petBowlPaints: [hay, stone, noSkin] }),
        );

        expect(result?.data.petBowlPaints).toEqual([hay, stone, noSkin]);
        expect(result?.badItems).toEqual([]);
      });

      it("has no paints when the file has none, and does not read old looks", () => {
        const result = readFarmData(
          farmFile({
            looks: { petBowl: "stone_pet_bowl" },
            petBowlPaints: undefined,
          }),
        );

        expect(result?.data.petBowlPaints).toEqual([]);
        expect(result?.data).not.toHaveProperty("looks");
        expect(result?.badItems).toEqual([]);
      });

      it.each([
        ["a skin of another building", { ...stone, skin: "log_cabin" }],
        ["a skin that is not known", { ...stone, skin: "gold_pet_bowl" }],
        ["a day before the paint before it", { ...stone, datePainted: 0 }],
        ["a day before the first day", { ...hay, datePainted: -1 }],
        ["a day that is not whole", { ...stone, datePainted: 9.5 }],
        ["a date that is not a number", { ...stone, datePainted: "9" }],
        ["no skin", { datePainted: 9 }],
        ["not a record", "stone_pet_bowl"],
      ])("drops %s, keeps the other paints, and reports it", (_, bad) => {
        const result = readFarmData(
          farmFile({ petBowlPaints: [hay, bad, noSkin] }),
        );

        expect(result?.data.petBowlPaints).toEqual([hay, noSkin]);
        expect(result?.badItems).toEqual([
          { path: "petBowlPaints[1]", value: bad },
        ]);
      });

      it("drops paints that are not a list, and reports them", () => {
        const result = readFarmData(farmFile({ petBowlPaints: hay }));

        expect(result?.data.petBowlPaints).toEqual([]);
        expect(result?.badItems).toEqual([
          { path: "petBowlPaints", value: hay },
        ]);
      });
    });

    describe("house upgrades", () => {
      const kitchen = { datePlaced: 3, level: 1 };
      const nursery = { datePlaced: 6, level: 2 };

      it("has no house upgrades when the file has none", () => {
        expect(
          readFarmData(farmFile({ houseUpgrades: undefined }))?.data
            .houseUpgrades,
        ).toEqual([]);
      });

      it("keeps each level in order, on or after the date of the level before it", () => {
        const sameDay = { ...nursery, datePlaced: 3 };
        const result = readFarmData(
          farmFile({ houseUpgrades: [kitchen, nursery] }),
        );

        expect(result?.data.houseUpgrades).toEqual([kitchen, nursery]);
        expect(result?.badItems).toEqual([]);
        expect(
          readFarmData(farmFile({ houseUpgrades: [kitchen, sameDay] }))?.data
            .houseUpgrades,
        ).toEqual([kitchen, sameDay]);
      });

      it.each([
        ["a level that skips one", [{ ...nursery, datePlaced: 3 }]],
        [
          "a level before the level below it",
          [kitchen, { ...nursery, datePlaced: 2 }],
        ],
        [
          "a level the game does not have",
          [
            kitchen,
            nursery,
            { datePlaced: 9, level: 3 },
            { datePlaced: 12, level: 4 },
          ],
        ],
        [
          "a date that is not a number",
          [kitchen, { ...nursery, datePlaced: "6" }],
        ],
        ["no level", [kitchen, { datePlaced: 6 }]],
      ])(
        "drops %s and the levels after it, and reports them",
        (_, houseUpgrades) => {
          const result = readFarmData(farmFile({ houseUpgrades }));
          const goodCount = result?.data.houseUpgrades.length ?? 0;

          expect(result?.data.houseUpgrades).toEqual(
            houseUpgrades.slice(0, goodCount),
          );
          expect(result?.badItems.map(({ path }) => path)).toEqual(
            houseUpgrades
              .slice(goodCount)
              .map((__, index) => `houseUpgrades[${goodCount + index}]`),
          );
          expect(goodCount).toBeLessThan(houseUpgrades.length);
        },
      );

      it("drops house upgrades that are not a list, and reports them", () => {
        const result = readFarmData(farmFile({ houseUpgrades: kitchen }));

        expect(result?.data.houseUpgrades).toEqual([]);
        expect(result?.badItems).toEqual([
          { path: "houseUpgrades", value: kitchen },
        ]);
      });
    });

    describe("greenhouse repair", () => {
      it("keeps the repair day", () => {
        const result = readFarmData(
          farmFile({ greenhouseRepair: { datePlaced: 20 } }),
        );

        expect(result?.data.greenhouseRepair).toEqual({ datePlaced: 20 });
        expect(result?.badItems).toEqual([]);
      });

      it("has no repair when the file has none", () => {
        expect(readFarmData(farmFile())?.data).not.toHaveProperty(
          "greenhouseRepair",
        );
      });

      it.each([[20], [{ datePlaced: "20" }], [null]])(
        "drops a bad repair %j, and reports it",
        (greenhouseRepair) => {
          const result = readFarmData(farmFile({ greenhouseRepair }));

          expect(result?.data).not.toHaveProperty("greenhouseRepair");
          expect(result?.badItems).toEqual([
            { path: "greenhouseRepair", value: greenhouseRepair },
          ]);
        },
      );
    });

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

    describe("tree cells", () => {
      const validTree = {
        dateDestroyed: 40,
        datePlanted: 2,
        treeId: "apple",
        type: "tree",
        x: 5,
        y: 3,
      };

      it("keeps a tree cell of each tree in the game data, with or without a destroyed date", () => {
        const theories = [
          "apple",
          "apricot",
          "banana",
          "cherry",
          "mango",
          "orange",
          "peach",
          "pomegranate",
          "tea_bush",
        ];

        theories.forEach((theory) => {
          expect(
            isGoodFarm(farmWithCrop({ ...validTree, treeId: theory })),
          ).toBe(true);
        });
        expect(
          isGoodFarm(farmWithCrop(withoutField(validTree, "dateDestroyed"))),
        ).toBe(true);
      });

      it("keeps crops and trees on the same tile in plan order", () => {
        const farm = farmFile({ crops: { 3: { 5: [validCrop, validTree] } } });

        expect(readFarmData(farm)).toEqual({
          badItems: [],
          data: {
            buildings: [],
            crops: { 3: { 5: [validCrop, validTree] } },
            cutBushes: [],
            date: 0,
            equipment: {},
            farm: "beach",
            houseUpgrades: [],
            petBowlPaints,
          },
        });
      });

      it("drops a tree cell with an unknown tree id, and reports it", () => {
        const theories = ["not_a_tree", "", "toString", "__proto__", "parsnip"];

        theories.forEach((theory) => {
          const badTree = { ...validTree, treeId: theory };
          const result = readFarmData(farmWithCrop(badTree));

          expect(result?.data.crops).toEqual({ 3: { 5: [] } });
          expect(result?.badItems).toEqual([
            { path: "crops[3][5][0]", value: badTree },
          ]);
        });
      });

      it("rejects a tree cell with a field of the wrong type", () => {
        const theories = [
          { ...validTree, treeId: 1 },
          { ...validTree, dateDestroyed: "40" },
          { ...validTree, datePlanted: "2" },
          { ...validTree, datePlanted: null },
          { ...validTree, type: "crop" },
          { ...validTree, x: "5" },
          { ...validTree, y: 3.5 },
        ];

        theories.forEach((theory) => {
          expect(isGoodFarm(farmWithCrop(theory))).toBe(false);
        });
      });

      it("rejects a tree cell with a missing field", () => {
        const theories = ["treeId", "datePlanted", "type", "x", "y"];

        theories.forEach((theory) => {
          expect(
            isGoodFarm(farmWithCrop(withoutField(validTree, theory))),
          ).toBe(false);
        });
      });

      it("rejects a tree cell that is not at its own tile", () => {
        const theories = [
          { ...validTree, x: 6 },
          { ...validTree, y: 4 },
        ];

        theories.forEach((theory) => {
          expect(isGoodFarm(farmWithCrop(theory))).toBe(false);
        });
      });
    });

    describe("buildings", () => {
      const barn = { buildingId: "barn", datePlaced: 3, x: 10, y: 12 };

      it("keeps the buildings in plan order, with or without a destroyed date", () => {
        const buildings = [
          barn,
          { ...barn, buildingId: "coop", dateDestroyed: 40, x: 20 },
          { ...barn, buildingId: "shipping_bin", y: 0 },
        ];

        expect(readFarmData(farmFile({ buildings }))).toEqual({
          badItems: [],
          data: {
            buildings,
            crops: {},
            cutBushes: [],
            date: 0,
            equipment: {},
            farm: "beach",
            houseUpgrades: [],
            petBowlPaints,
          },
        });
      });

      it("keeps each building that the game can build from the ground", () => {
        const theories = [
          "shed",
          "cabin",
          "gold_clock",
          "island_obelisk",
          "junimo_hut",
          "pet_bowl",
          "stable",
          "well",
        ];

        theories.forEach((theory) => {
          expect(
            isGoodFarm(
              farmFile({ buildings: [{ ...barn, buildingId: theory }] }),
            ),
          ).toBe(true);
        });
      });

      it("keeps a starter building on day 0, with its upgrades from day 0", () => {
        const starterCoop = {
          buildingId: "coop",
          datePlaced: 0,
          starter: true,
          upgrades: [{ buildingId: "big_coop", datePlaced: 0 }],
          x: 54,
          y: 9,
        };

        expect(
          readFarmData(farmFile({ buildings: [starterCoop] }))?.data.buildings,
        ).toEqual([starterCoop]);
        expect(isGoodFarm(farmFile({ buildings: [starterCoop] }))).toBe(true);
      });

      it("does not read a farm with no list of buildings", () => {
        const theories = [undefined, null, {}, "barn"];

        theories.forEach((theory) => {
          expect(readFarmData(farmFile({ buildings: theory }))).toBeUndefined();
        });
      });

      it("drops only the bad buildings and reports them", () => {
        const theories = [
          null,
          "barn",
          [barn],
          { ...barn, buildingId: "farmhouse" },
          { ...barn, buildingId: "greenhouse" },
          { ...barn, buildingId: "not_a_building" },
          { ...barn, buildingId: "toString" },
          { ...barn, buildingId: "big_barn" },
          { ...barn, buildingId: 1 },
          withoutField(barn, "buildingId"),
          withoutField(barn, "datePlaced"),
          withoutField(barn, "x"),
          { ...barn, datePlaced: "3" },
          { ...barn, dateDestroyed: "40" },
          { ...barn, x: -1 },
          { ...barn, y: 2.5 },
          { ...barn, datePlaced: 0, starter: false },
          { ...barn, datePlaced: 0, starter: "true" },
          { ...barn, starter: true },
        ];

        const result = readFarmData(
          farmFile({ buildings: [barn, ...theories] }),
        );

        expect(result?.data.buildings).toEqual([barn]);
        expect(result?.badItems).toEqual(
          theories.map((value, index) => ({
            path: `buildings[${index + 1}]`,
            value,
          })),
        );
      });

      const bigBarn = { buildingId: "big_barn", datePlaced: 6 };
      const deluxeBarn = { buildingId: "deluxe_barn", datePlaced: 8 };

      it("keeps the upgrades of a building in order, also on the same date, and a demolish after the last one", () => {
        const buildings = [
          { ...barn, upgrades: [bigBarn, deluxeBarn] },
          {
            ...barn,
            dateDestroyed: 9,
            upgrades: [bigBarn, deluxeBarn],
            x: 20,
          },
          {
            ...barn,
            upgrades: [
              { ...bigBarn, datePlaced: 3 },
              { ...deluxeBarn, datePlaced: 3 },
            ],
            x: 30,
          },
        ];

        const result = readFarmData(farmFile({ buildings }));

        expect(result?.data.buildings).toEqual(buildings);
        expect(result?.badItems).toEqual([]);
      });

      it("drops a bad upgrade and the upgrades after it, keeps the building and reports each one", () => {
        const theories: [string, unknown[], unknown[]][] = [
          ["not a record", [bigBarn, "deluxe_barn"], [bigBarn]],
          ["with no date", [{ buildingId: "big_barn" }, deluxeBarn], []],
          [
            "of a building that is not known",
            [{ ...bigBarn, buildingId: "nope" }],
            [],
          ],
          ["that skips a tier", [{ ...deluxeBarn, datePlaced: 6 }], []],
          ["of another building", [{ ...bigBarn, buildingId: "big_coop" }], []],
          [
            "before the building",
            [{ ...bigBarn, datePlaced: 2 }, deluxeBarn],
            [],
          ],
          [
            "before the upgrade below it",
            [bigBarn, { ...deluxeBarn, datePlaced: 5 }],
            [bigBarn],
          ],
        ];

        theories.forEach(([, upgrades, kept]) => {
          const result = readFarmData(
            farmFile({ buildings: [{ ...barn, upgrades }] }),
          );
          const badItems = upgrades.slice(kept.length).map((value, index) => ({
            path: `buildings[0].upgrades[${index + kept.length}]`,
            value,
          }));

          expect(result?.data.buildings).toEqual([
            kept.length === 0 ? barn : { ...barn, upgrades: kept },
          ]);
          expect(result?.badItems).toEqual(badItems);
        });
      });

      it("drops an upgrade on or after the day the building is demolished", () => {
        const result = readFarmData(
          farmFile({
            buildings: [
              { ...barn, dateDestroyed: 8, upgrades: [bigBarn, deluxeBarn] },
            ],
          }),
        );

        expect(result?.data.buildings).toEqual([
          { ...barn, dateDestroyed: 8, upgrades: [bigBarn] },
        ]);
        expect(result?.badItems).toEqual([
          { path: "buildings[0].upgrades[1]", value: deluxeBarn },
        ]);
      });

      it("keeps the building and reports upgrades that are not a list", () => {
        const result = readFarmData(
          farmFile({ buildings: [{ ...barn, upgrades: "big_barn" }] }),
        );

        expect(result?.data.buildings).toEqual([barn]);
        expect(result?.badItems).toEqual([
          { path: "buildings[0].upgrades", value: "big_barn" },
        ]);
      });

      describe("skins and paints", () => {
        const cabin = { buildingId: "cabin", datePlaced: 3, x: 10, y: 12 };
        const plank = { datePainted: 4, skin: "plank_cabin" };
        const noSkin = { datePainted: 9, skin: "cabin" };

        it("keeps the skin of the order and the paints after the order day, in date order", () => {
          const buildings = [
            { ...cabin, paints: [plank, noSkin], skin: "log_cabin" },
            { ...cabin, dateDestroyed: 10, paints: [plank, noSkin], x: 20 },
          ];

          const result = readFarmData(farmFile({ buildings }));

          expect(result?.data.buildings).toEqual(buildings);
          expect(result?.badItems).toEqual([]);
        });

        it("keeps no skin for the look with no skin", () => {
          const result = readFarmData(
            farmFile({ buildings: [{ ...cabin, skin: "cabin" }] }),
          );

          expect(result?.data.buildings).toStrictEqual([cabin]);
          expect(result?.badItems).toEqual([]);
        });

        it.each([
          ["a skin of another building", "hay_pet_bowl"],
          ["a skin that is not known", "gold_cabin"],
          ["a skin that is not a string", 2],
        ])(
          "drops %s, keeps the building with no skin, and reports it",
          (_, skin) => {
            const result = readFarmData(
              farmFile({ buildings: [{ ...cabin, skin }] }),
            );

            expect(result?.data.buildings).toStrictEqual([cabin]);
            expect(result?.badItems).toEqual([
              { path: "buildings[0].skin", value: skin },
            ]);
          },
        );

        it("drops the skin and the paints of a building that has no skins", () => {
          const result = readFarmData(
            farmFile({
              buildings: [{ ...barn, paints: [plank], skin: "plank_cabin" }],
            }),
          );

          expect(result?.data.buildings).toStrictEqual([barn]);
          expect(result?.badItems).toEqual([
            { path: "buildings[0].skin", value: "plank_cabin" },
            { path: "buildings[0].paints[0]", value: plank },
          ]);
        });

        it.each([
          ["a paint on the order day", { ...plank, datePainted: 3 }],
          ["a paint before the order day", { ...plank, datePainted: 2 }],
          ["a paint before the paint before it", { ...noSkin, datePainted: 4 }],
          [
            "a paint with a skin of another building",
            { ...noSkin, skin: "hay_pet_bowl" },
          ],
          ["a paint with no date", { skin: "cabin" }],
        ])("drops %s, keeps the other paints, and reports it", (_, bad) => {
          const result = readFarmData(
            farmFile({ buildings: [{ ...cabin, paints: [plank, bad] }] }),
          );

          expect(result?.data.buildings).toEqual([
            { ...cabin, paints: [plank] },
          ]);
          expect(result?.badItems).toEqual([
            { path: "buildings[0].paints[1]", value: bad },
          ]);
        });

        it("drops a paint on or after the demolish day", () => {
          const result = readFarmData(
            farmFile({
              buildings: [
                { ...cabin, dateDestroyed: 9, paints: [plank, noSkin] },
              ],
            }),
          );

          expect(result?.data.buildings).toEqual([
            { ...cabin, dateDestroyed: 9, paints: [plank] },
          ]);
          expect(result?.badItems).toEqual([
            { path: "buildings[0].paints[1]", value: noSkin },
          ]);
        });

        it("keeps the building and reports paints that are not a list", () => {
          const result = readFarmData(
            farmFile({ buildings: [{ ...cabin, paints: plank }] }),
          );

          expect(result?.data.buildings).toStrictEqual([cabin]);
          expect(result?.badItems).toEqual([
            { path: "buildings[0].paints", value: plank },
          ]);
        });
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
              buildings: [],
              crops: {},
              cutBushes: [],
              date: 0,
              equipment: { 3: { 7: [steppingStone] } },
              farm: "beach",
              houseUpgrades: [],
              petBowlPaints,
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
    it("saves the farm type, the pet bowl paints and the items with version 4, and reads them back", () => {
      const farm = farmWithEquipment(validEquipment);
      const saved: unknown = JSON.parse(
        toSavedFarmData({
          buildings: [],
          crops: {},
          cutBushes: [],
          date: 0,
          equipment: { 3: { 7: [validEquipment] } },
          farm: "beach",
          houseUpgrades: [],
          petBowlPaints,
        } as Parameters<typeof toSavedFarmData>[0]),
      );

      expect(saved).toEqual(farm);
      expect(isGoodFarm(saved)).toBe(true);
    });

    it("saves a tree with the crops with version 4, and reads it back", () => {
      const apple: IPlantedTree = {
        datePlanted: 2,
        treeId: "apple",
        type: "tree",
        x: 5,
        y: 3,
      };
      const saved: unknown = JSON.parse(
        toSavedFarmData({
          buildings: [],
          crops: { 3: { 5: [apple] } },
          cutBushes: [],
          date: 0,
          equipment: {},
          farm: "beach",
          houseUpgrades: [],
          petBowlPaints,
        }),
      );

      expect(saved).toEqual(farmWithCrop(apple));
      expect(readFarmData(saved)?.data.crops).toEqual({ 3: { 5: [apple] } });
    });

    it("saves the house upgrades and the greenhouse repair with version 4, and reads them back", () => {
      const houseUpgrades = [{ datePlaced: 3, level: 1 }];
      const greenhouseRepair = { datePlaced: 20 };
      const saved: unknown = JSON.parse(
        toSavedFarmData({
          buildings: [],
          crops: {},
          cutBushes: [],
          date: 0,
          equipment: {},
          farm: "beach",
          greenhouseRepair,
          houseUpgrades,
          petBowlPaints,
        }),
      );

      expect(saved).toEqual(farmFile({ greenhouseRepair, houseUpgrades }));
      expect(readFarmData(saved)?.data).toMatchObject({
        greenhouseRepair,
        houseUpgrades,
      });
    });

    it("saves the buildings with their skins and paints with version 4, and reads them back", () => {
      const buildings: IPlannedBuilding[] = [
        { buildingId: "barn", dateDestroyed: 30, datePlaced: 3, x: 10, y: 12 },
        { buildingId: "silo", datePlaced: 5, x: 18, y: 12 },
        {
          buildingId: "cabin",
          datePlaced: 5,
          paints: [{ datePainted: 8, skin: "trailer_cabin" }],
          skin: "beach_cabin",
          x: 30,
          y: 12,
        },
      ];
      const saved: unknown = JSON.parse(
        toSavedFarmData({
          buildings,
          crops: {},
          cutBushes: [],
          date: 0,
          equipment: {},
          farm: "beach",
          houseUpgrades: [],
          petBowlPaints,
        }),
      );

      expect(saved).toEqual(farmFile({ buildings }));
      expect(readFarmData(saved)?.data.buildings).toEqual(buildings);
    });

    it("does not save the plan ID or the plan name", () => {
      const saved: unknown = JSON.parse(
        toSavedFarmData({
          buildings: [],
          crops: {},
          cutBushes: [],
          date: 0,
          equipment: {},
          farm: "standard",
          houseUpgrades: [],
          id: "abc",
          name: "My farm",
          petBowlPaints: [],
        } as Parameters<typeof toSavedFarmData>[0]),
      );

      expect(saved).not.toHaveProperty("id");
      expect(saved).not.toHaveProperty("name");
    });
  });
});
