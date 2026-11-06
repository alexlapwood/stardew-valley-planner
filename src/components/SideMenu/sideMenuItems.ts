import { crops } from "../../data/game/crops.json";
import { items } from "../../data/game/items.json";
import { itemTabIds, type TItemTabId } from "../../data/itemTabs";
import { isInSeedMenu } from "../../helpers/crop";
import { getSeasonName } from "../../helpers/date";

// The game gives secret items names like "??HMTGF??", which would sort before
// "A", so they go last to keep the real names at the top of the list.
function compareNames(a: string, b: string) {
  const isASecret = a.startsWith("?");
  const isBSecret = b.startsWith("?");

  if (isASecret !== isBSecret) {
    return isASecret ? 1 : -1;
  }

  return a.replaceAll("?", "").localeCompare(b.replaceAll("?", ""));
}

const seedMenuCropIds = Object.keys(crops)
  .filter((cropId) => isInSeedMenu(crops[cropId]))
  .toSorted((a, b) => compareNames(crops[a].name, crops[b].name));

export function matchesSearch(name: string, search: string) {
  return name.toLowerCase().includes(search.trim().toLowerCase());
}

export function getCropIdsInSeason(date: number) {
  const season = getSeasonName(date);

  return seedMenuCropIds.filter((cropId) =>
    crops[cropId].seasons.includes(season),
  );
}

export function searchCropIds(cropIds: readonly string[], search: string) {
  return cropIds.filter((cropId) => matchesSearch(crops[cropId].name, search));
}

export function getItemName(itemId: string) {
  const item = items[itemId];

  return item.skins[item.skinOrder[0]]?.name ?? item.name;
}

// A row can show any skin of its item, so a search for the name of a skin
// finds the row.
function getSkinNames(itemId: string) {
  const item = items[itemId];

  return item.skinOrder.flatMap((skinKey) => item.skins[skinKey]?.name ?? []);
}

export function searchItemIds(itemIds: readonly string[], search: string) {
  return itemIds.filter((itemId) =>
    [getItemName(itemId), ...getSkinNames(itemId)].some((name) =>
      matchesSearch(name, search),
    ),
  );
}

export function getMatchingSkins(itemId: string, search: string) {
  const item = items[itemId];

  return item.skinOrder.filter((skinKey) => {
    const name = item.skins[skinKey]?.name;

    return name !== undefined && matchesSearch(name, search);
  });
}

export function getShownSkin(
  itemId: string,
  pickedSkin: string,
  search: string,
) {
  const matchingSkins = getMatchingSkins(itemId, search);

  return matchingSkins.includes(pickedSkin)
    ? pickedSkin
    : (matchingSkins[0] ?? pickedSkin);
}

export function getTabItemIds(tabId: TItemTabId) {
  return Object.keys(items)
    .filter((itemId) => itemTabIds[itemId] === tabId)
    .toSorted((a, b) => compareNames(getItemName(a), getItemName(b)));
}
