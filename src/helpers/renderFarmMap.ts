import {
  getFrameIndex,
  getNextFrameChange,
  type TNextChange,
} from "./mapFrames";

const tileSize = 16;

export type TMapPass = "above" | "back" | "buildings" | "front";

export interface ITileSource {
  height: number;
  sheet: number;
  sx: number;
  sy: number;
  width: number;
}

interface IPassTiles {
  animatedCells: Map<IFarmAnimation, number[]>;
  layers: IFarmLayer[];
  rows: number[];
}

interface IPassCanvas {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  time: number;
}

const layerGroupsByPass: Record<TMapPass, readonly TFarmLayerGroup[]> = {
  above: ["AlwaysFront"],
  back: ["Back"],
  buildings: ["Buildings"],
  front: ["Front"],
};

function isInSheet(sheet: IFarmTilesheet, gid: number) {
  return (
    gid >= sheet.firstGid && gid < sheet.firstGid + sheet.columns * sheet.rows
  );
}

export function getTileSource(
  map: IFarmMap,
  gid: number,
  time: number,
): ITileSource | undefined {
  const animation = map.animations.get(gid);
  const tileGid =
    animation === undefined
      ? gid
      : animation.frames[getFrameIndex(animation, time)];
  const sheetIndex = map.tilesheets.findIndex((sheet) =>
    isInSheet(sheet, tileGid),
  );

  if (sheetIndex === -1) {
    return undefined;
  }

  const sheet = map.tilesheets[sheetIndex];
  const index = tileGid - sheet.firstGid;

  return {
    height: sheet.tileHeight,
    sheet: sheetIndex,
    sx: (index % sheet.columns) * sheet.tileWidth,
    sy: Math.floor(index / sheet.columns) * sheet.tileHeight,
    width: sheet.tileWidth,
  };
}

function findPassTiles(map: IFarmMap, pass: TMapPass): IPassTiles {
  const groups = layerGroupsByPass[pass];
  const layers = map.layers.filter((layer) => groups.includes(layer.group));
  const animatedCells = new Map<IFarmAnimation, number[]>();
  const rows = new Set<number>();

  layers.forEach((layer) => {
    layer.gids.forEach((gid, cell) => {
      if (gid === 0) {
        return;
      }

      rows.add(Math.floor(cell / map.width));

      const animation = map.animations.get(gid);

      if (animation === undefined || animation.frames.length < 2) {
        return;
      }

      const cells = animatedCells.get(animation);

      if (cells === undefined) {
        animatedCells.set(animation, [cell]);
      } else {
        cells.push(cell);
      }
    });
  });

  return {
    animatedCells,
    layers,
    rows: [...rows].toSorted((a, b) => a - b),
  };
}

const passTilesByMap = new WeakMap<IFarmMap, Map<TMapPass, IPassTiles>>();

function getPassTiles(map: IFarmMap, pass: TMapPass) {
  let passes = passTilesByMap.get(map);

  if (passes === undefined) {
    passes = new Map();
    passTilesByMap.set(map, passes);
  }

  let tiles = passes.get(pass);

  if (tiles === undefined) {
    tiles = findPassTiles(map, pass);
    passes.set(pass, tiles);
  }

  return tiles;
}

export function getFrontRows(map: IFarmMap) {
  return getPassTiles(map, "front").rows;
}

export function getPassesNextChange(
  map: IFarmMap,
  passes: readonly TMapPass[],
): TNextChange {
  const animations = [
    ...new Set(
      passes.flatMap((pass) => [
        ...getPassTiles(map, pass).animatedCells.keys(),
      ]),
    ),
  ];

  return (time) => getNextFrameChange(animations, time);
}

function createLayerCanvas(map: IFarmMap) {
  const canvas = document.createElement("canvas");
  canvas.width = map.width * tileSize;
  canvas.height = map.height * tileSize;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Could not get context for the farm map canvas");
  }

  context.imageSmoothingEnabled = false;

  return { canvas, context };
}

export function drawTileAt(
  context: CanvasRenderingContext2D,
  scene: IFarmScene,
  gid: number,
  x: number,
  y: number,
  time: number,
) {
  const source = getTileSource(scene.map, gid, time);

  if (source === undefined) {
    return false;
  }

  context.drawImage(
    scene.sheets[source.sheet],
    source.sx,
    source.sy,
    source.width,
    source.height,
    x * tileSize,
    y * tileSize,
    source.width,
    source.height,
  );

  return true;
}

function drawTile(
  context: CanvasRenderingContext2D,
  scene: IFarmScene,
  gid: number,
  cell: number,
  time: number,
) {
  const { width } = scene.map;

  return drawTileAt(
    context,
    scene,
    gid,
    cell % width,
    Math.floor(cell / width),
    time,
  );
}

function renderLayers(
  context: CanvasRenderingContext2D,
  scene: IFarmScene,
  layers: readonly IFarmLayer[],
  time: number,
) {
  const unknownGids = new Set<number>();

  layers.forEach((layer) => {
    layer.gids.forEach((gid, cell) => {
      if (gid !== 0 && !drawTile(context, scene, gid, cell, time)) {
        unknownGids.add(gid);
      }
    });
  });

  if (unknownGids.size > 0) {
    console.warn(
      `The ${scene.map.id} farm map has tiles with no tilesheet or animation.`,
      [...unknownGids],
    );
  }
}

function findChangedCells(tiles: IPassTiles, from: number, to: number) {
  const cells = new Set<number>();

  tiles.animatedCells.forEach((animationCells, animation) => {
    if (getFrameIndex(animation, from) !== getFrameIndex(animation, to)) {
      animationCells.forEach((cell) => cells.add(cell));
    }
  });

  return cells;
}

function tilesFitCells(map: IFarmMap) {
  return map.tilesheets.every(
    (sheet) => sheet.tileWidth === tileSize && sheet.tileHeight === tileSize,
  );
}

function redrawChangedCells(
  { canvas, context, time: drawnTime }: IPassCanvas,
  scene: IFarmScene,
  tiles: IPassTiles,
  time: number,
) {
  const { map } = scene;
  const cells = findChangedCells(tiles, drawnTime, time);

  if (cells.size === 0) {
    return;
  }

  // A tile that is bigger than a cell covers the cells next to it too, so its
  // cell cannot be cleared and drawn again by itself.
  if (!tilesFitCells(map)) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    renderLayers(context, scene, tiles.layers, time);
    return;
  }

  cells.forEach((cell) => {
    context.clearRect(
      (cell % map.width) * tileSize,
      Math.floor(cell / map.width) * tileSize,
      tileSize,
      tileSize,
    );
    tiles.layers.forEach((layer) => {
      const gid = layer.gids[cell];

      if (gid !== 0) {
        drawTile(context, scene, gid, cell, time);
      }
    });
  });
}

// Only the last scene stays drawn: four map-sized canvases for each farm and
// season would take a lot of memory.
let drawnScene:
  | { passes: Map<TMapPass, IPassCanvas>; scene: IFarmScene }
  | undefined;

export function getPassCanvas(scene: IFarmScene, pass: TMapPass, time = 0) {
  if (drawnScene?.scene !== scene) {
    drawnScene = { passes: new Map(), scene };
  }

  const tiles = getPassTiles(scene.map, pass);
  const drawn = drawnScene.passes.get(pass);

  if (drawn === undefined) {
    const { canvas, context } = createLayerCanvas(scene.map);

    renderLayers(context, scene, tiles.layers, time);
    drawnScene.passes.set(pass, { canvas, context, time });

    return canvas;
  }

  if (drawn.time !== time) {
    redrawChangedCells(drawn, scene, tiles, time);
    drawn.time = time;
  }

  return drawn.canvas;
}

export function renderFrontRowToContext(
  context: CanvasRenderingContext2D,
  front: HTMLCanvasElement,
  row: number,
) {
  const { width } = front;
  const y = row * tileSize;

  context.drawImage(front, 0, y, width, tileSize, 0, y, width, tileSize);
}
