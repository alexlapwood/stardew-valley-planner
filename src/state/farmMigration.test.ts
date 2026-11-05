import { crops } from "../data/game/crops.json";
import { items } from "../data/game/items.json";
import {
  cropIdsV1,
  equipmentIdsV1,
  migrateCropCellV1,
  migrateEquipmentCellV1,
  skinsV1,
} from "./farmMigration";

const equipmentIdsInV1 = [
  "scarecrow",
  "sprinkler",
  "fence",
  "mayonnaise_machine",
  "bee_house",
  "preserves_jar",
  "cheese_press",
  "loom",
  "keg",
  "cask",
  "oil_maker",
  "campfire",
  "brazier",
  "lamp_post",
  "charcoal_kiln",
  "crystalarium",
  "furnace",
  "lightning_rod",
  "recycling_achine",
  "seed_maker",
  "slime_incubator",
  "slime_egg_press",
  "worm_bin",
  "flooring",
  "tub_o_flowers",
  "wicked_statue",
  "chest",
  "sign",
  "house_plant",
  "seasonal_plant",
  "basic_log",
  "log_section",
  "big_green_cane",
  "big_red_cane",
  "green_canes",
  "red_canes",
  "mixed_canes",
  "lawn_flamingo",
  "gravestone",
  "ornamental_hay_bale",
  "plush_bunny",
  "statue_of_endless_fortune",
  "standing_geode",
  "singing_stone",
  "obsidian_vase",
  "skeleton_statue",
  "seasonal_decor",
  "arcade_system",
  "sign_of_the_vessel",
  "stone_cairn",
  "stone_frog",
  "stone_junimo",
  "stone_owl",
  "stone_parrot",
  "suite_of_armor",
  "sloth_skeleton",
  "stardew_hero_trophy",
  "statue_of_perfection",
  "foroguemon",
  "hmtgf",
  "pinky_lemon",
  "solid_gold_luis",
  "stone_owl_statue",
  "soda_machine",
];

const skinCountsInV1: Record<string, number> = {
  arcade_system: 2,
  brazier: 8,
  fence: 4,
  flooring: 10,
  house_plant: 15,
  lamp_post: 2,
  scarecrow: 9,
  seasonal_plant: 6,
  sign: 2,
  sloth_skeleton: 3,
  sprinkler: 3,
};

function equipmentV1(equipmentId: string, skinIndex: number) {
  return {
    dateInstalled: 0,
    equipmentId,
    skinIndex,
    type: "equipment",
    x: 1,
    y: 2,
  };
}

describe("V1 farm migration", () => {
  it("maps every V1 crop to a crop in the game data", () => {
    Object.values(cropIdsV1).forEach((cropId) => {
      expect(Object.hasOwn(crops, cropId)).toBe(true);
    });
  });

  it("maps every V1 equipment skin to an item skin in the game data", () => {
    equipmentIdsInV1.forEach((equipmentId) => {
      const skinCount = skinCountsInV1[equipmentId] ?? 1;

      for (let skinIndex = 0; skinIndex < skinCount; skinIndex += 1) {
        const cell = migrateEquipmentCellV1(
          equipmentV1(equipmentId, skinIndex),
        );

        expect(cell, `${equipmentId} ${skinIndex}`).toBeDefined();

        const { equipmentId: newId, skin } = cell ?? {};

        expect(typeof newId === "string" && Object.hasOwn(items, newId)).toBe(
          true,
        );
        expect(
          typeof newId === "string" &&
            typeof skin === "string" &&
            items[newId].skinOrder.includes(skin),
          `${equipmentId} ${skinIndex} → ${String(newId)}/${String(skin)}`,
        ).toBe(true);
      }
    });
  });

  it("has a table entry only for V1 slugs", () => {
    [...Object.keys(equipmentIdsV1), ...Object.keys(skinsV1)].forEach(
      (equipmentId) => {
        expect(equipmentIdsInV1).toContain(equipmentId);
      },
    );
  });

  it.each([
    ["scarecrow", 0, "scarecrow", "scarecrow"],
    ["scarecrow", 8, "scarecrow", "rarecrow_140"],
    ["sprinkler", 2, "sprinkler", "iridium_sprinkler"],
    ["fence", 3, "fence", "hardwood_fence"],
    ["flooring", 9, "flooring", "stepping_stone_path"],
    ["house_plant", 7, "house_plant", "house_plant_7"],
    ["house_plant", 14, "house_plant", "house_plant_0"],
    ["arcade_system", 1, "arcade_system", "prairie_king_arcade_system"],
    ["sloth_skeleton", 2, "sloth_skeleton", "sloth_skeleton_r"],
    ["stone_owl", 0, "stone_owl", "stone_owl_54"],
    ["stone_owl_statue", 0, "stone_owl", "stone_owl_95"],
    ["recycling_achine", 0, "recycling_machine", "recycling_machine"],
    ["suite_of_armor", 0, "suit_of_armor", "suit_of_armor"],
    ["keg", 0, "keg", "keg"],
  ])("maps %s skin %i to %s/%s", (oldId, skinIndex, newId, skin) => {
    expect(migrateEquipmentCellV1(equipmentV1(oldId, skinIndex))).toEqual({
      dateInstalled: 0,
      equipmentId: newId,
      skin,
      type: "equipment",
      x: 1,
      y: 2,
    });
  });

  it("does not map a skin that V1 did not have", () => {
    const theories = [
      equipmentV1("sprinkler", 3),
      equipmentV1("keg", 1),
      equipmentV1("keg", -1),
      equipmentV1("keg", 0.5),
      { ...equipmentV1("keg", 0), skinIndex: "0" },
    ];

    theories.forEach((theory) => {
      expect(migrateEquipmentCellV1(theory)).toBeUndefined();
    });
  });

  it("renames the V1 crops that have a new slug", () => {
    expect(migrateCropCellV1({ cropId: "cactus" })).toEqual({
      cropId: "cactus_fruit",
    });
    expect(migrateCropCellV1({ cropId: "cranberry" })).toEqual({
      cropId: "cranberries",
    });
    expect(migrateCropCellV1({ cropId: "parsnip" })).toEqual({
      cropId: "parsnip",
    });
  });
});
