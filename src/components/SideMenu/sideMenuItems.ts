import { buildings } from "../../data/game/buildings.json";
import { crops } from "../../data/game/crops.json";
import { items } from "../../data/game/items.json";
import { trees } from "../../data/game/trees.json";
import { itemTabIds, type TItemTabId } from "../../data/itemTabs";
import { getSkinKeys, getSkinName } from "../../helpers/buildingSkins";
import { getBaseBuildingId } from "../../helpers/buildingTiers";
import { isInSeedMenu } from "../../helpers/crop";
import { getSeasonName } from "../../helpers/date";
import { defaultFarmLooks } from "../../helpers/defaultBuildings";
import {
  farmhouseId,
  getHouseLook,
  houseLevels,
} from "../../helpers/houseUpgrades";
import { plannableBuildingIds } from "../../helpers/plannedBuildings";

// The icon is the look of buildingId. A row with no item names the building
// of the rows under it, and cannot be selected. An indented row has the key of
// the row above it as parentKey.
export interface IBuildingRow {
  buildingId: string;
  item?: ISelectedItem;
  key: string;
  lookKey?: string;
  name: string;
  parentKey?: string;
}

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

const treeMenuIds = Object.keys(trees).toSorted((a, b) =>
  compareNames(trees[a].name, trees[b].name),
);

// The game lets a sapling be planted in any season, so the list does not change
// with the date.
export function searchTreeIds(search: string) {
  return treeMenuIds.filter((treeId) =>
    matchesSearch(trees[treeId].name, search),
  );
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

function pickShownSkin(matchingSkins: readonly string[], pickedSkin: string) {
  return matchingSkins.includes(pickedSkin)
    ? pickedSkin
    : (matchingSkins[0] ?? pickedSkin);
}

export function getShownSkin(
  itemId: string,
  pickedSkin: string,
  search: string,
) {
  return pickShownSkin(getMatchingSkins(itemId, search), pickedSkin);
}

export function getShownBuildingSkin(
  buildingId: string,
  pickedSkin: string,
  search: string,
) {
  return pickShownSkin(
    getSkinKeys(buildingId).filter((skin) =>
      matchesSearch(getSkinName(buildingId, skin), search),
    ),
    pickedSkin,
  );
}

function withUpgrades(buildingId: string): string[] {
  return [
    buildingId,
    ...plannableBuildingIds
      .filter((upgradeId) => buildings[upgradeId].upgradeFrom === buildingId)
      .flatMap(withUpgrades),
  ];
}

const buildingKey = (buildingId: string) => `building--${buildingId}`;

function toBuildingRow(buildingId: string): IBuildingRow {
  const { name, upgradeFrom } = buildings[buildingId];

  return {
    buildingId,
    item: { id: buildingId, type: "building" },
    key: buildingKey(buildingId),
    name,
    parentKey:
      upgradeFrom === undefined
        ? undefined
        : buildingKey(getBaseBuildingId(buildingId)),
  };
}

const farmhouseKey = `fixed-building--${farmhouseId}`;

const greenhouseKey = "fixed-building--greenhouse";

const farmhouseRows: IBuildingRow[] = [
  {
    buildingId: farmhouseId,
    key: farmhouseKey,
    lookKey: getHouseLook(0),
    name: buildings[farmhouseId].name,
  },
  ...houseLevels.map(({ level, look, name }): IBuildingRow => ({
    buildingId: farmhouseId,
    item: { id: String(level), type: "houseUpgrade" },
    key: `house-upgrade--${level}`,
    lookKey: look,
    name,
    parentKey: farmhouseKey,
  })),
];

const greenhouseRows: IBuildingRow[] = [
  {
    buildingId: "greenhouse",
    key: greenhouseKey,
    lookKey: defaultFarmLooks.greenhouse,
    name: buildings.greenhouse.name,
  },
  {
    buildingId: "greenhouse",
    item: { id: "greenhouse", type: "greenhouseRepair" },
    key: "greenhouse-repair",
    lookKey: "repaired",
    name: "Repair",
    parentKey: greenhouseKey,
  },
];

// An upgrade goes under the building that it upgrades, so each building stays
// beside its higher tiers.
export const buildingRows: readonly IBuildingRow[] = [
  ...plannableBuildingIds
    .filter((buildingId) => buildings[buildingId].upgradeFrom === undefined)
    .map((buildingId) => withUpgrades(buildingId).map(toBuildingRow)),
  farmhouseRows,
  greenhouseRows,
]
  .toSorted((a, b) => compareNames(a[0].name, b[0].name))
  .flat();

// A building row can show any skin of its building, as an item row can.
function getRowNames({ buildingId, item, name }: IBuildingRow) {
  return item?.type === "building"
    ? [
        name,
        ...getSkinKeys(buildingId).map((skin) => getSkinName(buildingId, skin)),
      ]
    : [name];
}

// The Paint row is a tool for the buildings on the farm, so it is first in the
// tab, before the buildings.
export const paintRow = { key: "paint", name: "Paint" };

// An indented row is under the row that it upgrades, so a match on it also
// shows that row. A match on a row that cannot be selected also shows the rows
// under it, so that the player has a row to select.
export function searchBuildingRows(search: string) {
  const matchedKeys = new Set(
    buildingRows
      .filter((row) =>
        getRowNames(row).some((name) => matchesSearch(name, search)),
      )
      .map(({ key }) => key),
  );
  const isMatchedLabel = (key: string) =>
    matchedKeys.has(key) &&
    buildingRows.some((row) => row.key === key && row.item === undefined);
  const shownKeys = new Set(
    buildingRows.flatMap(({ key, parentKey }) => {
      if (parentKey === undefined) {
        return matchedKeys.has(key) ? [key] : [];
      }

      return matchedKeys.has(key)
        ? [key, parentKey]
        : isMatchedLabel(parentKey)
          ? [key]
          : [];
    }),
  );

  return [
    ...(matchesSearch(paintRow.name, search) ? [paintRow.key] : []),
    ...buildingRows
      .filter(({ key }) => shownKeys.has(key))
      .map(({ key }) => key),
  ];
}

export function getTabItemIds(tabId: TItemTabId) {
  return Object.keys(items)
    .filter((itemId) => itemTabIds[itemId] === tabId)
    .toSorted((a, b) => compareNames(getItemName(a), getItemName(b)));
}
