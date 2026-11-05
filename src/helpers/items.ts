import { items } from "../data/game/items.json";

export function isItem(itemId: string) {
  return Object.hasOwn(items, itemId);
}

export function getItem(itemId: string): IItem | undefined {
  return isItem(itemId) ? items[itemId] : undefined;
}

export function isFloorItem(itemId: string) {
  return getItem(itemId)?.kind === "floor";
}

export function isFenceItem(itemId: string) {
  return getItem(itemId)?.kind === "fence";
}

export function getDefaultSkin(itemId: string) {
  return getItem(itemId)?.skinOrder[0] ?? "";
}

export function hasSkin(itemId: string, skin: string) {
  const item = getItem(itemId);

  return item !== undefined && item.skinOrder.includes(skin);
}

export function getItemSkin(itemId: string, skin: string) {
  return hasSkin(itemId, skin) ? getItem(itemId)?.skins[skin] : undefined;
}

export function getSkinSprite(skin: IItemSkin, season: string) {
  return skin.spritesBySeason?.[season] ?? skin.sprite;
}

export function getRangeOffsets(range: IItemRange): TTileOffset[] {
  if (range.shape === "tiles") {
    return range.tiles ?? [];
  }

  const offsets: TTileOffset[] = [];

  for (let dy = -range.radius; dy <= range.radius; dy += 1) {
    for (let dx = -range.radius; dx <= range.radius; dx += 1) {
      const isInRange =
        range.shape === "circle"
          ? dx * dx + dy * dy < range.radius * range.radius
          : Math.abs(dx) + Math.abs(dy) <= range.radius;

      if (isInRange) {
        offsets.push([dx, dy]);
      }
    }
  }

  return offsets;
}
