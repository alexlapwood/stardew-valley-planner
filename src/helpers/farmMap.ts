import { seasonNames } from "./date";

export const ruleAlphabet =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

const ruleValues = new Map<string, number>(
  Array.from(ruleAlphabet, (character, value) => [character, value]),
);

const layerGroups: ReadonlySet<string> = new Set<TFarmLayerGroup>([
  "AlwaysFront",
  "Back",
  "Buildings",
  "Front",
]);

const spotNames = ["farmhouse", "greenhouse", "petBowl", "shippingBin"];

const requiredRuleFlags = [
  "blocked",
  "buildable",
  "floorable",
  "noSprinklers",
  "tillable",
  "water",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSize(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isLayerGroup(group: string): group is TFarmLayerGroup {
  return layerGroups.has(group);
}

function isLayerData(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.group === "string" &&
    Array.isArray(value.tiles)
  );
}

function isTilesheet(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isSize(value.firstGid) &&
    isSize(value.columns) &&
    isSize(value.rows) &&
    isSize(value.tileWidth) &&
    isSize(value.tileHeight) &&
    isRecord(value.images)
  );
}

function isAnimation(value: unknown) {
  return (
    isRecord(value) &&
    isSize(value.gid) &&
    isSize(value.interval) &&
    Array.isArray(value.frames) &&
    value.frames.length > 0
  );
}

function isSpot(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    isSize(value.width) &&
    isSize(value.height)
  );
}

function isSpots(value: unknown) {
  return isRecord(value) && spotNames.every((name) => isSpot(value[name]));
}

function isRules(value: unknown) {
  return (
    isRecord(value) &&
    Array.isArray(value.rows) &&
    isRecord(value.flags) &&
    requiredRuleFlags.every(
      (flag) => isRecord(value.flags) && isSize(value.flags[flag]),
    )
  );
}

function isTile(value: unknown) {
  return (
    isRecord(value) && Number.isInteger(value.x) && Number.isInteger(value.y)
  );
}

function isPathTile(value: unknown) {
  return isRecord(value) && isTile(value) && isSize(value.gid);
}

function isByte(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 255
  );
}

function isTint(value: unknown) {
  return Array.isArray(value) && value.length === 4 && value.every(isByte);
}

function isWater(value: unknown) {
  return (
    isRecord(value) &&
    isRecord(value.tints) &&
    seasonNames.every(
      (season) => isRecord(value.tints) && isTint(value.tints[season]),
    ) &&
    (value.hidden === undefined ||
      (Array.isArray(value.hidden) && value.hidden.every(isTile)))
  );
}

function isFarmMapData(farm: unknown): farm is IFarmMapData {
  return (
    isRecord(farm) &&
    typeof farm.name === "string" &&
    isSize(farm.width) &&
    isSize(farm.height) &&
    Array.isArray(farm.layers) &&
    farm.layers.every(isLayerData) &&
    Array.isArray(farm.tilesheets) &&
    farm.tilesheets.every(isTilesheet) &&
    Array.isArray(farm.animations) &&
    farm.animations.every(isAnimation) &&
    isSpots(farm.spots) &&
    isRules(farm.rules) &&
    Array.isArray(farm.greenhousePath) &&
    farm.greenhousePath.every(isPathTile) &&
    isWater(farm.water)
  );
}

export function isFarmMapFile(data: unknown): data is IFarmMapFile {
  return (
    isRecord(data) &&
    typeof data.gameVersion === "string" &&
    isFarmMapData(data.farm)
  );
}

export function decodeLayerTiles(tiles: readonly number[], cellCount: number) {
  const gids = new Uint32Array(cellCount);
  let cell = 0;

  tiles.forEach((value) => {
    if (!Number.isInteger(value) || value === 0) {
      throw new Error(`The layer has a bad tile value: ${value}`);
    }

    if (value < 0) {
      cell -= value;
      return;
    }

    if (cell < cellCount) {
      gids[cell] = value;
    }

    cell += 1;
  });

  if (cell !== cellCount) {
    throw new Error(`The layer has ${cell} cells, not ${cellCount}.`);
  }

  return gids;
}

export function decodeRuleRows(
  rows: readonly string[],
  width: number,
  height: number,
) {
  if (rows.length !== height) {
    throw new Error(`The rules have ${rows.length} rows, not ${height}.`);
  }

  const flags = new Uint8Array(width * height);

  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`Rules row ${y} has ${row.length} tiles, not ${width}.`);
    }

    Array.from(row).forEach((character, x) => {
      const value = ruleValues.get(character);

      if (value === undefined) {
        throw new Error(
          `The rules have a bad value "${character}" at ${x}, ${y}.`,
        );
      }

      flags[y * width + x] = value;
    });
  });

  return flags;
}

// A newer export can add a layer group that the planner does not know yet. The
// farm still loads without it.
function decodeLayers(id: string, farm: IFarmMapData) {
  const cellCount = farm.width * farm.height;
  const skipped = farm.layers.filter((layer) => !isLayerGroup(layer.group));

  if (skipped.length > 0) {
    console.warn(
      `The ${id} farm map has layers in groups that the planner does not draw.`,
      skipped.map((layer) => `${layer.id} (${layer.group})`),
    );
  }

  return farm.layers.flatMap((layer): IFarmLayer[] =>
    isLayerGroup(layer.group)
      ? [
          {
            gids: decodeLayerTiles(layer.tiles, cellCount),
            group: layer.group,
            id: layer.id,
          },
        ]
      : [],
  );
}

export function decodeFarmMap(id: string, { farm }: IFarmMapFile): IFarmMap {
  const { height, width } = farm;

  return {
    animations: new Map<number, IFarmAnimation>(
      farm.animations.map((animation) => [animation.gid, animation]),
    ),
    flags: decodeRuleRows(farm.rules.rows, width, height),
    greenhousePath: farm.greenhousePath,
    height,
    id,
    layers: decodeLayers(id, farm),
    name: farm.name,
    ruleFlags: farm.rules.flags,
    spots: farm.spots,
    tilesheets: farm.tilesheets.toSorted((a, b) => a.firstGid - b.firstGid),
    water: farm.water,
    width,
  };
}

export function parseFarmMap(id: string, data: unknown) {
  if (!isFarmMapFile(data)) {
    throw new Error(`The ${id} farm map is not in the farm map format.`);
  }

  return decodeFarmMap(id, data);
}

export function isOnMap(map: IFarmMap, x: number, y: number) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < map.width &&
    y < map.height
  );
}

export function flagsAt(map: IFarmMap, x: number, y: number) {
  return isOnMap(map, x, y)
    ? map.flags[y * map.width + x]
    : map.ruleFlags.blocked;
}
