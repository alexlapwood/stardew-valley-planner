import { trees } from "../data/game/trees.json";
import { getDay, getSeasonName } from "./date";

export interface ITreeSprite {
  offset: IPixelOffset;
  rect: TSpriteRect;
}

// Sprite pixels from the top-left of the tree tile.
export interface IFruitPosition {
  flipped: boolean;
  x: number;
  y: number;
}

export interface ITreeLook {
  fruit: IFruitPosition[];
  fruitRect: TSpriteRect;
  isMature: boolean;
  sprite: ITreeSprite;
}

// The first date of each growth stage and of maturity. A date is undefined
// when a growth blocker never goes away before the tree gets there.
export interface ITreeSchedule {
  matureDate?: number;
  stageDates: (number | undefined)[];
}

export interface ITreeGrowth {
  isMature: boolean;
  stage: number;
}

const daysInASeason = 28;

export function getTreesLastDay(plantedTree: IPlantedTree) {
  return plantedTree.dateDestroyed === undefined
    ? undefined
    : plantedTree.dateDestroyed - 1;
}

export function isTreeHereToday(plantedTree: IPlantedTree, date: number) {
  const lastDay = getTreesLastDay(plantedTree);

  return (
    date >= plantedTree.datePlanted &&
    (lastDay === undefined || date <= lastDay)
  );
}

export function isTreeHarvestDay(
  tree: Pick<ITree, "harvest" | "seasons">,
  date: number,
) {
  const dayOfSeason = getDay(date) + 1;

  return (
    tree.seasons.includes(getSeasonName(date)) &&
    dayOfSeason >= (tree.harvest.firstDay ?? 1) &&
    dayOfSeason <= (tree.harvest.lastDay ?? daysInASeason)
  );
}

function isReachedBy(firstDate: number | undefined, date: number) {
  return firstDate !== undefined && firstDate <= date;
}

export function getTreeGrowthOn(
  schedule: ITreeSchedule,
  date: number,
): ITreeGrowth {
  return {
    isMature: isReachedBy(schedule.matureDate, date),
    stage: Math.max(
      0,
      schedule.stageDates.findLastIndex((firstDate) =>
        isReachedBy(firstDate, date),
      ),
    ),
  };
}

// Every tree in the export has sprites for all 4 seasons, so this only keeps a
// tree on the map if a later export leaves a season out.
function getSeasonSprites(tree: ITree, season: string) {
  return tree.sprites.seasons[season] ?? Object.values(tree.sprites.seasons)[0];
}

// Only the tea bush has a ready sprite. It blooms on its harvest days, and
// winter is not one of its seasons, so it is never ready in winter.
export function getTreeSprite(
  tree: ITree,
  { isMature, stage }: ITreeGrowth,
  date: number,
): ITreeSprite | undefined {
  const seasonSprites = getSeasonSprites(tree, getSeasonName(date));

  if (seasonSprites === undefined) {
    return undefined;
  }

  if (isMature) {
    const readySprite = isTreeHarvestDay(tree, date)
      ? seasonSprites.ready
      : undefined;

    return {
      offset: tree.sprites.matureOffset,
      rect: readySprite ?? seasonSprites.mature,
    };
  }

  return {
    offset: tree.sprites.growingOffset,
    rect: seasonSprites.growing[stage],
  };
}

function getSpotShift(shift: ITreeSpotShift | undefined, tileX: number) {
  return shift === undefined
    ? 0
    : ((tileX * shift.times) % shift.modulo) / shift.divisor;
}

export function getFruitPositions(tree: ITree, tileX: number) {
  return (tree.sprites.fruitSpots ?? [])
    .slice(0, tree.harvest.maxFruit)
    .map(({ flipped, shiftX, shiftY, x, y }): IFruitPosition => ({
      flipped,
      x: x + getSpotShift(shiftX, tileX),
      y: y + getSpotShift(shiftY, tileX),
    }));
}

// The game adds 1 fruit each morning until the tree is full. The plan shows a
// full tree on each day of its seasons, so that a tree with fruit looks the
// same on all of those days.
export function getTreeFruit(
  tree: ITree,
  { isMature }: ITreeGrowth,
  date: number,
  tileX: number,
) {
  return isMature && isTreeHarvestDay(tree, date)
    ? getFruitPositions(tree, tileX)
    : [];
}

export function getPlantedTreeLook(
  plantedTree: IPlantedTree,
  schedule: ITreeSchedule,
  date: number,
): ITreeLook | undefined {
  const tree = trees[plantedTree.treeId];
  const growth = getTreeGrowthOn(schedule, date);
  const sprite = getTreeSprite(tree, growth, date);

  if (sprite === undefined) {
    return undefined;
  }

  return {
    fruit: getTreeFruit(tree, growth, date, plantedTree.x),
    fruitRect: tree.sprites.fruit,
    isMature: growth.isMature,
    sprite,
  };
}
