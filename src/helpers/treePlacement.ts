import { trees } from "../data/game/trees.json";
import { isOverlapping } from "./daySpan";
import {
  getDragTiles,
  type IDragRegion,
  type IPlacedInDrag,
  placeAlongDrag,
  squareAround,
} from "./dragPlacement";
import {
  forEachTileInRegion,
  getCropsAtLocation,
  getEquipmentAtLocation,
  getFarmItemDays,
} from "./farm";
import type { ICurrentItems } from "./itemPlacement";
import { canPlantSaplingAt } from "./placementRules";
import { getGrowthBlockersOn } from "./treeGrowth";

interface ITreeCheck {
  currentItems: ICurrentItems;
  farmMap: IFarmMap;
  placedInDrag: IPlacedInDrag<IPlantedTree>;
  tree: ITree;
  treeToPlant: IPlantedTree;
}

type TTreeRule = (check: ITreeCheck) => boolean;

// A tree stays until it is destroyed, so a thing on the tile on the planting
// day or on any later day is in its way.
function isOnTileFrom(date: number, farmItem: TFarmItem) {
  return isOverlapping({ firstDay: date }, getFarmItemDays(farmItem));
}

function isTileFree({ currentItems, treeToPlant }: ITreeCheck) {
  const { currentCrops, currentEquipment } = currentItems;
  const { datePlanted, x, y } = treeToPlant;

  return ![
    ...getCropsAtLocation(currentCrops, x, y),
    ...getEquipmentAtLocation(currentEquipment, x, y),
  ].some((farmItem) => isOnTileFrom(datePlanted, farmItem));
}

function canPlantTreeAt({ currentItems, farmMap, treeToPlant }: ITreeCheck) {
  return canPlantSaplingAt(farmMap, treeToPlant.x, treeToPlant.y, {
    buildings: currentItems.currentBuildings ?? [],
    cutBushes: currentItems.currentCutBushes,
    firstDay: treeToPlant.datePlanted,
  });
}

function hasTreeSpacing({
  currentItems,
  placedInDrag,
  tree,
  treeToPlant,
}: ITreeCheck) {
  const { spacingTrees, treeSpacing } = tree.placement;

  if (spacingTrees === undefined || treeSpacing === undefined) {
    return true;
  }

  const spacingKinds: readonly string[] = spacingTrees;
  const nearbyItems: TPlantedItem[] = [];

  forEachTileInRegion(squareAround(treeToPlant, treeSpacing), (x, y) => {
    const placedTree = placedInDrag.at(x, y);

    nearbyItems.push(...getCropsAtLocation(currentItems.currentCrops, x, y));

    if (placedTree !== undefined) {
      nearbyItems.push(placedTree);
    }
  });

  return !nearbyItems.some(
    (plantedItem) =>
      plantedItem.type === "tree" &&
      spacingKinds.includes(trees[plantedItem.treeId].type) &&
      isOnTileFrom(treeToPlant.datePlanted, plantedItem),
  );
}

const treeRules: readonly TTreeRule[] = [
  isTileFree,
  canPlantTreeAt,
  hasTreeSpacing,
];

export function treesForRegion(
  treeId: string,
  highlightedRegion: IDragRegion,
  date: number,
) {
  return getDragTiles(highlightedRegion).map(({ x, y }): IPlantedTree => ({
    datePlanted: date,
    treeId,
    type: "tree",
    x,
    y,
  }));
}

export function checkTreesToPlant(
  treesToPlant: readonly IPlantedTree[],
  currentItems: ICurrentItems,
  farmMap: IFarmMap,
) {
  const { placed, refused } = placeAlongDrag(
    treesToPlant,
    (treeToPlant, placedInDrag) => {
      const check: ITreeCheck = {
        currentItems,
        farmMap,
        placedInDrag,
        tree: trees[treeToPlant.treeId],
        treeToPlant,
      };

      return treeRules.every((rule) => rule(check));
    },
  );

  return { plantableTrees: placed, unplantableTrees: refused };
}

function addTiles(tiles: Map<string, IFarmTile>, more: readonly IFarmTile[]) {
  more.forEach(({ x, y }) => {
    tiles.set(`${x},${y}`, { x, y });
  });
}

// A tree with a growth blocker beside it on the planting day still goes down,
// because the plan can take the blocker away later.
export function previewTreesToPlant(
  treesToPlant: readonly IPlantedTree[],
  currentItems: ICurrentItems,
  farmMap: IFarmMap,
) {
  const { plantableTrees, unplantableTrees } = checkTreesToPlant(
    treesToPlant,
    currentItems,
    farmMap,
  );
  const plan = { ...currentItems, farmMap };
  const freeTrees: IPlantedTree[] = [];
  const blockedTrees: IPlantedTree[] = [];
  const blockerTiles = new Map<string, IFarmTile>();

  plantableTrees.forEach((plantableTree) => {
    const blockers = getGrowthBlockersOn(
      plan,
      plantableTree,
      plantableTree.datePlanted,
    );

    if (blockers.length === 0) {
      freeTrees.push(plantableTree);
    } else {
      blockedTrees.push(plantableTree);
      addTiles(blockerTiles, blockers);
    }
  });

  return {
    blockedTrees,
    blockerTiles: [...blockerTiles.values()],
    freeTrees,
    unplantableTrees,
  };
}
