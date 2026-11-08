import type { IBuildingCheck } from "./buildingPlacement";
import type { TBuildingRefusal } from "./buildingRules";
import { isInSpot } from "./defaultBuildings";
import type { IDragRegion } from "./dragPlacement";
import { orderRepair } from "./greenhouseRepair";
import { orderHouseUpgrade } from "./houseUpgrades";
import type { ICurrentItems } from "./itemPlacement";
import { getFootprintTiles } from "./plannedBuildings";

export type TFixedUpgradeType = "greenhouseRepair" | "houseUpgrade";

export interface IFixedUpgradeItem extends ISelectedItem {
  type: TFixedUpgradeType;
}

export interface IFixedOrderRequest {
  currentItems: ICurrentItems;
  date: number;
  farmMap: IFarmMap;
  item: IFixedUpgradeItem;
  region: IDragRegion;
}

export type TFixedChange =
  | { greenhouseRepair: IPlannedRepair; type: "greenhouseRepair" }
  | { houseUpgrades: IPlannedHouseUpgrade[]; type: "houseUpgrade" };

// change is undefined when the order is refused.
export interface IFixedOrder {
  change?: TFixedChange;
  check: IBuildingCheck;
  refusal?: TBuildingRefusal;
}

interface IFixedSpot {
  buildingId: string;
  spotName: keyof IFarmSpots;
}

const fixedSpots: Record<TFixedUpgradeType, IFixedSpot> = {
  greenhouseRepair: { buildingId: "greenhouse", spotName: "greenhouse" },
  houseUpgrade: { buildingId: "farmhouse", spotName: "farmhouse" },
};

export function isFixedUpgradeItem(
  item: ISelectedItem | undefined,
): item is IFixedUpgradeItem {
  return item?.type === "greenhouseRepair" || item?.type === "houseUpgrade";
}

function getFixedSpot(farmMap: IFarmMap, { type }: IFixedUpgradeItem) {
  return farmMap.spots[fixedSpots[type].spotName];
}

// As for a building upgrade, the order goes on the building under the cursor
// (SV › CarpenterMenu.receiveLeftClick).
export function isOnFixedBuilding({
  farmMap,
  item,
  region,
}: Pick<IFixedOrderRequest, "farmMap" | "item" | "region">) {
  return isInSpot(getFixedSpot(farmMap, item), region.x1, region.y1);
}

function spotCheck(
  farmMap: IFarmMap,
  item: IFixedUpgradeItem,
  fits: boolean,
): IBuildingCheck {
  const { x, y } = getFixedSpot(farmMap, item);
  const tiles = getFootprintTiles({
    buildingId: fixedSpots[item.type].buildingId,
    x,
    y,
  });

  return {
    blockedTiles: fits ? [] : tiles,
    fits,
    freeTiles: fits ? tiles : [],
    removedFloors: [],
  };
}

type TChange = Pick<IFixedOrder, "change" | "refusal">;

function planHouseOrder(
  { currentHouseUpgrades = [] }: ICurrentItems,
  level: number,
  date: number,
): TChange {
  const order = orderHouseUpgrade(currentHouseUpgrades, level, date);

  return order.upgraded === undefined
    ? { refusal: { level, type: "houseBuilt" } }
    : { change: { houseUpgrades: order.upgraded, type: "houseUpgrade" } };
}

function planRepair(
  { currentGreenhouseRepair }: ICurrentItems,
  date: number,
): TChange {
  const order = orderRepair(currentGreenhouseRepair, date);

  return order.repair === undefined
    ? { refusal: { type: "repaired" } }
    : { change: { greenhouseRepair: order.repair, type: "greenhouseRepair" } };
}

// Undefined: the cursor is not on the building that the item upgrades.
export function checkFixedOrder(
  request: IFixedOrderRequest,
): IFixedOrder | undefined {
  if (!isOnFixedBuilding(request)) {
    return undefined;
  }

  const { currentItems, date, farmMap, item } = request;
  const { change, refusal } =
    item.type === "houseUpgrade"
      ? planHouseOrder(currentItems, Number(item.id), date)
      : planRepair(currentItems, date);

  return {
    change,
    check: spotCheck(farmMap, item, refusal === undefined),
    refusal,
  };
}
