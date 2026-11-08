import { materials } from "../data/game/materials.json";
import { atlasSprite } from "./atlas";

// The export has icons only for the items that a building or a shop trade
// costs, so other items have no icon.
export function getMaterialSprite(itemId: string) {
  const material = materials[itemId];

  return material === undefined
    ? undefined
    : atlasSprite("materials", material.icon);
}
