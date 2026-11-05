type Cell = Record<string, unknown>;

export const cropIdsV1: Record<string, string> = {
  cactus: "cactus_fruit",
  cranberry: "cranberries",
};

export const equipmentIdsV1: Record<string, string> = {
  gravestone: "grave_stone",
  mixed_canes: "mixed_cane",
  recycling_achine: "recycling_machine",
  skeleton_statue: "skeleton_model",
  solid_gold_luis: "solid_gold_lewis",
  stone_owl_statue: "stone_owl",
  suite_of_armor: "suit_of_armor",
};

// The index in each list is the V1 skinIndex. V1 slugs that are not here had
// one skin, and its key is the new slug.
export const skinsV1: Record<string, string[]> = {
  arcade_system: ["junimo_kart_arcade_system", "prairie_king_arcade_system"],
  brazier: [
    "wooden_brazier",
    "stone_brazier",
    "gold_brazier",
    "carved_brazier",
    "stump_brazier",
    "barrel_brazier",
    "skull_brazier",
    "marble_brazier",
  ],
  campfire: ["campfire_146"],
  fence: ["wood_fence", "stone_fence", "iron_fence", "hardwood_fence"],
  flooring: [
    "wood_floor",
    "stone_floor",
    "weathered_floor",
    "crystal_floor",
    "straw_floor",
    "gravel_path",
    "wood_path",
    "crystal_path",
    "cobblestone_path",
    "stepping_stone_path",
  ],
  // V1 house plants 8 to 14 are not game items.
  house_plant: [
    "house_plant_0",
    "house_plant_1",
    "house_plant_2",
    "house_plant_3",
    "house_plant_4",
    "house_plant_5",
    "house_plant_6",
    "house_plant_7",
    "house_plant_0",
    "house_plant_0",
    "house_plant_0",
    "house_plant_0",
    "house_plant_0",
    "house_plant_0",
    "house_plant_0",
  ],
  lamp_post: ["wood_lamp_post", "iron_lamp_post"],
  scarecrow: [
    "scarecrow",
    "rarecrow_110",
    "rarecrow_113",
    "rarecrow_126",
    "rarecrow_136",
    "rarecrow_137",
    "rarecrow_138",
    "rarecrow_139",
    "rarecrow_140",
  ],
  seasonal_plant: [
    "seasonal_plant_184",
    "seasonal_plant_188",
    "seasonal_plant_192",
    "seasonal_plant_196",
    "seasonal_plant_200",
    "seasonal_plant_204",
  ],
  sign: ["wood_sign", "stone_sign"],
  sloth_skeleton: ["sloth_skeleton_l", "sloth_skeleton_m", "sloth_skeleton_r"],
  sprinkler: ["sprinkler", "quality_sprinkler", "iridium_sprinkler"],
  stone_owl: ["stone_owl_54"],
  stone_owl_statue: ["stone_owl_95"],
  wicked_statue: ["wicked_statue_83"],
};

export function migrateCropCellV1(cell: Cell): Cell {
  if (
    typeof cell.cropId !== "string" ||
    !Object.hasOwn(cropIdsV1, cell.cropId)
  ) {
    return cell;
  }

  return { ...cell, cropId: cropIdsV1[cell.cropId] };
}

export function migrateEquipmentCellV1(cell: Cell): Cell | undefined {
  const { equipmentId, skinIndex, ...rest } = cell;

  if (typeof equipmentId !== "string" || typeof skinIndex !== "number") {
    return undefined;
  }

  const newId = Object.hasOwn(equipmentIdsV1, equipmentId)
    ? equipmentIdsV1[equipmentId]
    : equipmentId;
  const skins = Object.hasOwn(skinsV1, equipmentId)
    ? skinsV1[equipmentId]
    : [newId];
  const skin =
    Number.isInteger(skinIndex) && skinIndex >= 0
      ? skins.at(skinIndex)
      : undefined;

  return skin === undefined ? undefined : { ...rest, equipmentId: newId, skin };
}
