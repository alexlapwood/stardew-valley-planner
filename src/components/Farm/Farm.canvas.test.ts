import mockImages from "../../__helpers__/images";
import { makeTestFarmMapFile } from "../../__mocks__/testFarmMap";
import { buildings as buildingData } from "../../data/game/buildings.json";
import { robin } from "../../data/game/robin.json";
import { atlasUrls } from "../../helpers/atlas";
import {
  getHouseBuild,
  getNewBuildingBuild,
  getUpgradeBuild,
  type IBuild,
  type IBuildAnimation,
} from "../../helpers/buildAnimation";
import { checkBuildingToPlace } from "../../helpers/buildingPlacement";
import { decodeFarmMap } from "../../helpers/farmMap";
import { getPassCanvas, type TMapPass } from "../../helpers/renderFarmMap";
import { drawMap, drawPlan } from "./Farm.canvas";

vi.mock("../../helpers/buildingPlacement", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../helpers/buildingPlacement")>();

  return {
    ...original,
    checkBuildingToPlace: vi.fn(original.checkBuildingToPlace),
  };
});

type TDrawImage = CanvasRenderingContext2D["drawImage"];

interface IMockContext {
  drawImage: ReturnType<typeof vi.fn<TDrawImage>>;
  globalAlpha: number;
  restore: ReturnType<typeof vi.fn<() => void>>;
  save: ReturnType<typeof vi.fn<() => void>>;
  scale: ReturnType<typeof vi.fn<(x: number, y: number) => void>>;
  translate: ReturnType<typeof vi.fn<(x: number, y: number) => void>>;
}

const contexts = new Map<HTMLCanvasElement, IMockContext>();

function contextOf(canvas: HTMLCanvasElement) {
  let context = contexts.get(canvas);

  if (context === undefined) {
    context = {
      clearRect: vi.fn(),
      drawImage: vi.fn<TDrawImage>(),
      fillRect: vi.fn(),
      fillStyle: "#000000",
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      imageSmoothingEnabled: true,
      putImageData: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
    } as IMockContext;
    contexts.set(canvas, context);
  }

  return context;
}

const width = 20;
const height = 20;

function tileAt(x: number, y: number) {
  const cell = y * width + x;

  return [-cell, 1, -(width * height - cell - 1)].filter(
    (value) => value !== 0,
  );
}

function makeScene(): IFarmScene {
  const file = makeTestFarmMapFile(width, height);
  file.farm.tilesheets = [
    {
      columns: 1,
      firstGid: 1,
      id: "sheet",
      images: { spring: "sheet" },
      rows: 1,
      seasonal: false,
      tileHeight: 16,
      tileWidth: 16,
    },
  ];
  file.farm.layers = [
    { group: "Back", id: "Back", tiles: [-(width * height)] },
    { group: "Front", id: "Front", tiles: tileAt(5, 3) },
    { group: "AlwaysFront", id: "AlwaysFront", tiles: tileAt(0, 0) },
  ];
  file.farm.spots = {
    farmhouse: { height: 5, width: 9, x: 0, y: 8 },
    greenhouse: { height: 6, width: 7, x: 10, y: 10 },
    petBowl: { height: 2, width: 2, x: 14, y: 4 },
    shippingBin: { height: 1, width: 2, x: 10, y: 3 },
  };

  return {
    map: decodeFarmMap("order", file),
    season: "spring",
    sheets: [document.createElement("canvas")],
  };
}

function scarecrow(x: number, y: number): IInstalledEquipment {
  return {
    dateInstalled: 0,
    equipmentId: "scarecrow",
    skin: "scarecrow",
    type: "equipment",
    x,
    y,
  };
}

const buildingNamesByRectTop: Record<number, string> = {
  1168: "farmhouse",
  1504: "greenhouse",
  1984: "pet bowl",
  2144: "shipping bin",
};

function drawKindOf(image: CanvasImageSource, sy: number) {
  if (!(image instanceof HTMLImageElement)) {
    return undefined;
  }

  if (image.src.includes(atlasUrls.buildings)) {
    return sy === 0 ? "shadow" : "building";
  }

  return [
    ["floor", atlasUrls.flooring],
    ["soil", "/images/hoeDirt.png"],
    ["highlight", "/images/highlight-green.png"],
    ["crop", atlasUrls.crops],
  ].find(([, path]) => image.src.includes(path))?.[0];
}

function getTreeAndItemDraws(canvas: HTMLCanvasElement) {
  return contextOf(canvas).drawImage.mock.calls.flatMap(([image, ...args]) => {
    if (!(image instanceof HTMLImageElement)) {
      return [];
    }

    if (image.src.includes(atlasUrls.trees)) {
      return [`tree ${args.join(",")}`];
    }

    if (image.src.includes(atlasUrls.items)) {
      return [`item row ${(args[5] + args[3]) / 16 - 1}`];
    }

    return image.src.includes("/images/hoeDirt.png") ? ["soil"] : [];
  });
}

function appleFromDay0(x: number, y: number): IPlantedTree {
  return { datePlanted: 0, treeId: "apple", type: "tree", x, y };
}

const fall = 56;

const cursorOn = (x: number, y: number) => ({ x1: x, x2: x, y1: y, y2: y });

function drawWithTree(
  plantedTree: IPlantedTree,
  date: number,
  highlightedRegion?: { x1: number; x2: number; y1: number; y2: number },
  equipment: IFarmEquipment = {},
) {
  const canvas = document.createElement("canvas");
  const context = contextOf(canvas);
  const alphas: [string, number][] = [];
  const savedAlphas: number[] = [];

  context.save.mockImplementation(() => {
    savedAlphas.push(context.globalAlpha);
  });
  context.restore.mockImplementation(() => {
    context.globalAlpha = savedAlphas.pop() ?? 1;
  });
  context.drawImage.mockImplementation((image, sx, sy) => {
    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    if (image.src.includes(atlasUrls.trees)) {
      alphas.push([`tree ${sx},${sy}`, context.globalAlpha]);
    }

    if (image.src.includes(atlasUrls.buildings) && sy !== 0) {
      alphas.push([buildingNamesByRectTop[sy], context.globalAlpha]);
    }
  });

  drawPlan(canvas, {
    buildings: [],
    crops: { [plantedTree.y]: { [plantedTree.x]: [plantedTree] } },
    date,
    equipment,
    highlightedRegion,
    images: mockImages,
    pickFloorVariant: () => 0,
    scene: makeScene(),
  });

  return { alphas, canvas, context };
}

beforeEach(() => {
  contexts.clear();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      return contextOf(this);
    } as unknown as HTMLCanvasElement["getContext"],
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("drawMap", () => {
  it("draws the Back layers, the water, the things under the buildings and then the Buildings layers, all at the same time", () => {
    const scene = makeScene();
    const canvas = document.createElement("canvas");
    const order: string[] = [];
    const context = contextOf(canvas);
    context.drawImage.mockImplementation((image) => {
      order.push(
        image === getPassCanvas(scene, "back", 700) ? "Back" : "Buildings",
      );
    });
    const slot = (name: string) => ({
      draw: (target: CanvasRenderingContext2D, time: number) => {
        expect(target).toBe(context);
        order.push(`${name} at ${time} ms`);
      },
    });

    drawMap(canvas, scene, 700, {
      underBuildings: slot("under buildings"),
      water: slot("water"),
    });

    expect(order).toEqual([
      "Back",
      "water at 700 ms",
      "under buildings at 700 ms",
      "Buildings",
    ]);
  });
});

describe("drawPlan", () => {
  it("sorts the Front rows with the items and buildings, and draws AlwaysFront over everything", () => {
    const scene = makeScene();
    const canvas = document.createElement("canvas");

    drawPlan(canvas, {
      buildings: [],
      crops: {},
      date: 0,
      equipment: {
        3: { 2: [scarecrow(2, 3)] },
        4: { 2: [scarecrow(2, 4)] },
      },
      images: mockImages,
      pickFloorVariant: () => 0,
      scene,
    });

    const passes = new Map<CanvasImageSource, TMapPass>(
      (["above", "back", "buildings", "front"] as const).map((pass) => [
        getPassCanvas(scene, pass),
        pass,
      ]),
    );
    const names = contextOf(canvas)
      .drawImage.mock.calls.map(([image, ...args]) => {
        const pass = passes.get(image);

        if (pass === "front") {
          return `front row ${args[1] / 16}`;
        }

        if (pass !== undefined) {
          return pass;
        }

        if (image instanceof HTMLImageElement) {
          if (image.src.includes(atlasUrls.items)) {
            return `item row ${(args[5] + args[3]) / 16 - 1}`;
          }

          if (image.src.includes(atlasUrls.buildings)) {
            return buildingNamesByRectTop[args[1]];
          }
        }

        return undefined;
      })
      .filter((name) => name !== undefined);

    expect(names).toEqual([
      "item row 3",
      "shipping bin",
      "front row 3",
      "item row 4",
      "pet bowl",
      "farmhouse",
      "greenhouse",
      "above",
    ]);
  });

  it("draws a tree at its trunk row with the mature offset, over the rows above it, and with no soil under it", () => {
    const scene = makeScene();
    const canvas = document.createElement("canvas");
    const apple: IPlantedTree = {
      datePlanted: 0,
      treeId: "apple",
      type: "tree",
      x: 2,
      y: 4,
    };

    drawPlan(canvas, {
      buildings: [],
      crops: { 4: { 2: [apple] } },
      date: 28,
      equipment: {
        3: { 4: [scarecrow(4, 3)] },
        5: { 4: [scarecrow(4, 5)] },
      },
      images: mockImages,
      pickFloorVariant: () => 0,
      scene,
    });

    expect(getTreeAndItemDraws(canvas)).toEqual([
      "item row 3",
      "tree 272,0,48,80,16,0,48,80",
      "item row 5",
    ]);
  });

  it("draws a young tree while a scarecrow beside it stops its growth", () => {
    const scene = makeScene();
    const canvas = document.createElement("canvas");
    const apple: IPlantedTree = {
      datePlanted: 0,
      treeId: "apple",
      type: "tree",
      x: 2,
      y: 4,
    };

    drawPlan(canvas, {
      buildings: [],
      crops: { 4: { 2: [apple] } },
      date: 28,
      equipment: { 5: { 3: [{ ...scarecrow(3, 5), dateDestroyed: 7 }] } },
      images: mockImages,
      pickFloorVariant: () => 0,
      scene,
    });

    expect(getTreeAndItemDraws(canvas)).toEqual([
      "tree 176,0,48,80,16,-4,48,80",
    ]);
  });

  it("draws 3 fruit just after the crown of a mature fruit tree in its season, at the shifted spots, the third one flipped", () => {
    const { canvas, context } = drawWithTree(
      appleFromDay0(2, 4),
      fall,
      undefined,
      {
        3: { 4: [scarecrow(4, 3)] },
        5: { 4: [scarecrow(4, 5)] },
      },
    );

    // Tile x 2: 2 × 200 mod 64 = 16 and 2 × 232 mod 64 = 16, so the spots are
    // (32 − 16 + 16 / 8, 64 − 48 − 2 / 12), (32 + 8, 64 − 64 + 16 / 12) and
    // (32 + 16 / 12, 64 − 40 + 16 / 12), rounded to whole pixels.
    expect(getTreeAndItemDraws(canvas)).toEqual([
      "item row 3",
      "tree 320,0,48,80,16,0,48,80",
      "tree 16,0,16,16,18,16,16,16",
      "tree 16,0,16,16,40,1,16,16",
      "tree 16,0,16,16,0,0,16,16",
      "item row 5",
    ]);
    expect(context.translate).toHaveBeenCalledWith(33 + 16, 25);
    expect(context.scale).toHaveBeenCalledWith(-1, 1);
  });

  it("draws no fruit on a mature fruit tree out of its season or in winter", () => {
    const summerDraws = getTreeAndItemDraws(
      drawWithTree(appleFromDay0(2, 4), fall - 1).canvas,
    );
    const winterDraws = getTreeAndItemDraws(
      drawWithTree(appleFromDay0(2, 4), fall + 28).canvas,
    );

    expect(summerDraws).toEqual(["tree 272,0,48,80,16,0,48,80"]);
    expect(winterDraws).toEqual(["tree 368,0,48,80,16,0,48,80"]);
  });

  it("draws a mature tree and its fruit faded while the cursor is on its leaves, and not while it is on the trunk row", () => {
    const onLeaves = drawWithTree(appleFromDay0(2, 4), fall, cursorOn(2, 2));
    const onTrunk = drawWithTree(appleFromDay0(2, 4), fall, cursorOn(2, 4));
    const besideTrunk = drawWithTree(appleFromDay0(2, 4), fall, cursorOn(3, 4));

    expect(onLeaves.alphas.filter(([name]) => name.startsWith("tree"))).toEqual(
      [
        ["tree 320,0", 0.4],
        ["tree 16,0", 0.4],
        ["tree 16,0", 0.4],
        ["tree 16,0", 0.4],
      ],
    );
    expect(onLeaves.context.globalAlpha).toBe(1);
    expect(
      [onTrunk, besideTrunk].map(({ alphas }) =>
        alphas
          .filter(([name]) => name.startsWith("tree"))
          .map(([, alpha]) => alpha),
      ),
    ).toEqual([
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ]);
  });

  it("does not fade a young tree, whose frame is mostly empty", () => {
    const { alphas } = drawWithTree(appleFromDay0(2, 4), 22, cursorOn(2, 2));

    expect(alphas.filter(([name]) => name.startsWith("tree"))).toEqual([
      ["tree 176,0", 1],
    ]);
  });

  it("fades the farmhouse while the cursor is on its roof, and no other building", () => {
    const { alphas } = drawWithTree(appleFromDay0(2, 4), fall, cursorOn(4, 6));

    expect(alphas.filter(([name]) => !name.startsWith("tree"))).toEqual([
      ["shipping bin", 1],
      ["pet bowl", 1],
      ["farmhouse", 0.4],
      ["greenhouse", 1],
    ]);
  });

  it("draws no hoe dirt and no watered soil on a tree tile in a sprinkler range", () => {
    const { canvas } = drawWithTree(appleFromDay0(2, 4), fall, undefined, {
      4: {
        3: [
          {
            dateInstalled: 0,
            equipmentId: "sprinkler",
            skin: "quality_sprinkler",
            type: "equipment",
            x: 3,
            y: 4,
          },
        ],
      },
    });
    const soilTiles = (watered: boolean) =>
      contextOf(canvas)
        .drawImage.mock.calls.filter(
          ([image, sx]) =>
            image instanceof HTMLImageElement &&
            image.src.includes("/images/hoeDirt.png") &&
            sx >= 64 === watered,
        )
        .map(([, , , , , dx, dy]) => `${dx / 16},${dy / 16}`);
    const rangeWithNoTree = ["2,3", "2,5", "3,3", "3,5", "4,3", "4,4", "4,5"];

    expect(soilTiles(false).toSorted()).toEqual(rangeWithNoTree);
    expect(soilTiles(true).toSorted()).toEqual(rangeWithNoTree);
  });

  it("draws the building shadows over the floors and the soil, and under the highlight and all sprites", () => {
    const scene = makeScene();
    const canvas = document.createElement("canvas");
    const floor: IInstalledEquipment = {
      dateInstalled: 0,
      equipmentId: "flooring",
      skin: "wood_floor",
      type: "equipment",
      x: 6,
      y: 6,
    };
    const parsnip: IPlantedCrop = {
      cropId: "parsnip",
      datePlanted: 0,
      type: "crop",
      x: 4,
      y: 4,
    };

    drawPlan(canvas, {
      buildings: [],
      crops: { 4: { 4: [parsnip] } },
      date: 0,
      equipment: { 6: { 6: [floor] } },
      highlightedRegion: { x1: 5, x2: 5, y1: 5, y2: 5 },
      images: mockImages,
      pickFloorVariant: () => 0,
      scene,
      selectedItem: { id: "parsnip", type: "crop" },
    });

    const kinds = contextOf(canvas)
      .drawImage.mock.calls.map(([image, , sy]) => drawKindOf(image, sy))
      .filter((kind) => kind !== undefined);
    const runs = kinds.filter((kind, index) => kind !== kinds[index - 1]);

    expect(runs).toEqual([
      "floor",
      "soil",
      "shadow",
      "highlight",
      "building",
      "crop",
      "building",
    ]);
  });
});

const coopTop = 576;

// The coop is whole from day 2, the day it goes down.
function coop(overrides: Partial<IPlannedBuilding> = {}): IPlannedBuilding {
  return { buildingId: "coop", datePlaced: 2, x: 1, y: 1, ...overrides };
}

function drawWithBuildings(
  buildings: IPlannedBuilding[],
  date: number,
  {
    equipment = {},
    highlightedRegion,
    selectedItem,
  }: {
    equipment?: IFarmEquipment;
    highlightedRegion?: { x1: number; x2: number; y1: number; y2: number };
    selectedItem?: ISelectedItem;
  } = {},
) {
  const canvas = document.createElement("canvas");
  const context = contextOf(canvas);
  const draws: string[] = [];
  const coopAlphas: number[] = [];
  const savedAlphas: number[] = [];

  context.save.mockImplementation(() => {
    savedAlphas.push(context.globalAlpha);
  });
  context.restore.mockImplementation(() => {
    context.globalAlpha = savedAlphas.pop() ?? 1;
  });
  context.drawImage.mockImplementation((image, _sx, sy, ...rest) => {
    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    if (image.src.includes(atlasUrls.items)) {
      draws.push(`item row ${(rest[3] + rest[1]) / 16 - 1}`);
    }

    if (image.src.includes(atlasUrls.buildings) && sy === coopTop) {
      draws.push(`coop at ${rest[2]},${rest[3]}`);
      coopAlphas.push(context.globalAlpha);
    }

    if (image.src.includes(atlasUrls.buildings) && sy === 0) {
      draws.push(`shadow at ${rest[2]},${rest[3]}`);
    }

    const highlight = /highlight-(\w+)\.png/u.exec(image.src)?.[1];

    if (highlight !== undefined) {
      draws.push(`${highlight} tile`);
    }
  });

  drawPlan(canvas, {
    buildings,
    crops: {},
    date,
    equipment,
    highlightedRegion,
    images: mockImages,
    pickFloorVariant: () => 0,
    scene: makeScene(),
    selectedItem,
  });

  return { coopAlphas, draws };
}

describe("drawPlan with planned buildings", () => {
  it("draws a planned building with its shadow from the date it goes down to the day before it is demolished", () => {
    const demolished = coop({ dateDestroyed: 9 });

    expect(
      [1, 2, 4, 5, 8, 9].map((date) => {
        const { draws } = drawWithBuildings([demolished], date);

        return [
          draws.includes("coop at 16,-48"),
          draws.includes("shadow at 16,64"),
        ];
      }),
    ).toEqual([
      [false, false],
      [true, true],
      [true, true],
      [true, true],
      [true, true],
      [false, false],
    ]);
  });

  it("draws the shadow of a planned building under its bottom row, before all sprites", () => {
    const { draws } = drawWithBuildings([coop()], 5);
    const shadows = draws.filter((draw) => draw.startsWith("shadow"));

    expect(shadows).toEqual(
      expect.arrayContaining([
        "shadow at 16,64",
        "shadow at 32,64",
        "shadow at 48,64",
        "shadow at 64,64",
        "shadow at 80,64",
        "shadow at 96,64",
      ]),
    );
    expect(draws.indexOf("coop at 16,-48")).toBeGreaterThan(
      draws.lastIndexOf("shadow at 96,64"),
    );
  });

  it("sorts a planned building by its bottom row, over the items of that row", () => {
    const { draws } = drawWithBuildings([coop()], 5, {
      equipment: {
        3: { 8: [scarecrow(8, 3)] },
        4: { 8: [scarecrow(8, 4)] },
      },
    });

    expect(
      draws.filter(
        (draw) => draw.startsWith("item") || draw.startsWith("coop"),
      ),
    ).toEqual(["item row 3", "coop at 16,-48", "item row 4"]);
  });

  it("fades a planned building while the cursor is on its roof, and not on its footprint", () => {
    expect(
      drawWithBuildings([coop()], 5, { highlightedRegion: cursorOn(3, 0) })
        .coopAlphas,
    ).toEqual([0.4]);
    expect(
      drawWithBuildings([coop()], 5, { highlightedRegion: cursorOn(3, 2) })
        .coopAlphas,
    ).toEqual([1]);
  });

  it("previews the selected building at the cursor only where it fits", () => {
    const selectedItem: ISelectedItem = { id: "coop", type: "building" };

    expect(
      drawWithBuildings([], 5, {
        highlightedRegion: cursorOn(1, 1),
        selectedItem,
      }).draws,
    ).toContain("coop at 16,-48");
    expect(
      drawWithBuildings([], 5, {
        equipment: { 2: { 2: [scarecrow(2, 2)] } },
        highlightedRegion: cursorOn(1, 1),
        selectedItem,
      }).draws,
    ).not.toContain("coop at 16,-48");
  });

  it("draws the tiles of the selected building over all the sprites, green where the building fits and red where it does not", () => {
    const { draws } = drawWithBuildings([], 5, {
      equipment: { 2: { 2: [scarecrow(2, 2)] } },
      highlightedRegion: cursorOn(1, 1),
      selectedItem: { id: "coop", type: "building" },
    });
    const lastSprite = Math.max(
      draws.lastIndexOf("item row 2"),
      draws.findLastIndex((draw) => draw.startsWith("shadow")),
    );
    const tiles = draws.slice(lastSprite + 1);

    expect(tiles.filter((tile) => tile === "green tile")).toHaveLength(17);
    expect(tiles.filter((tile) => tile === "red tile")).toHaveLength(1);
  });

  it("checks the selected building 1 time for its sprite and its tiles", () => {
    vi.mocked(checkBuildingToPlace).mockClear();

    drawWithBuildings([], 5, {
      highlightedRegion: cursorOn(1, 1),
      selectedItem: { id: "coop", type: "building" },
    });

    expect(checkBuildingToPlace).toHaveBeenCalledOnce();
  });

  it("draws the red tiles of a building to erase over its sprite", () => {
    const { draws } = drawWithBuildings([coop()], 5, {
      highlightedRegion: cursorOn(3, 2),
      selectedItem: { id: "pick-axe", type: "tool" },
    });
    const tiles = draws.slice(draws.indexOf("coop at 16,-48") + 1);

    expect(tiles).toEqual(Array.from({ length: 6 * 3 }, () => "red tile"));
  });
});

const rectKey = (rect: readonly number[]) => rect.join(",");

const upgradePieceNames = new Map<string, string>([
  [rectKey(buildingData.coop.sprite.sprite), "coop"],
  [rectKey(buildingData.big_coop.sprite.sprite), "big coop"],
  [rectKey(buildingData.deluxe_coop.sprite.sprite), "deluxe coop"],
  [rectKey(buildingData.coop.upgradeSign?.sprite ?? []), "sign"],
]);

interface IAnimationOptions {
  buildAnimations?: IBuildAnimation[];
  buildTime?: number;
}

function animate(
  build: IBuild | undefined,
  date: number,
  start = 0,
): IBuildAnimation {
  if (build === undefined) {
    throw new Error("The test builds nothing to animate");
  }

  return { ...build, date, start };
}

function drawUpgrade(
  buildings: IPlannedBuilding[],
  date: number,
  {
    buildAnimations,
    buildTime,
    highlightedRegion,
    selectedItem,
  }: IAnimationOptions & {
    highlightedRegion?: { x1: number; x2: number; y1: number; y2: number };
    selectedItem?: ISelectedItem;
  } = {},
) {
  const canvas = document.createElement("canvas");
  const context = contextOf(canvas);
  const draws: string[] = [];
  const savedAlphas: number[] = [];

  context.save.mockImplementation(() => {
    savedAlphas.push(context.globalAlpha);
  });
  context.restore.mockImplementation(() => {
    context.globalAlpha = savedAlphas.pop() ?? 1;
  });
  context.drawImage.mockImplementation(
    (image, sx, sy, width, height, dx, dy) => {
      if (!(image instanceof HTMLImageElement)) {
        return;
      }

      const highlight = /highlight-(\w+)\.png/u.exec(image.src)?.[1];
      const name = image.src.includes(atlasUrls.buildings)
        ? upgradePieceNames.get(rectKey([sx, sy, width ?? 0, height ?? 0]))
        : image.src.includes(atlasUrls.robin)
          ? "robin"
          : highlight === undefined
            ? undefined
            : `${highlight} tile`;

      if (name !== undefined) {
        draws.push(
          name.endsWith("tile")
            ? name
            : `${name} at ${dx},${dy} alpha ${context.globalAlpha}`,
        );
      }
    },
  );

  drawPlan(canvas, {
    buildAnimations,
    buildings,
    buildTime,
    crops: {},
    date,
    equipment: {},
    highlightedRegion,
    images: mockImages,
    pickFloorVariant: () => 0,
    scene: makeScene(),
    selectedItem,
    time: 0,
  });

  return draws;
}

const upgradingCoop = coop({
  upgrades: [{ buildingId: "big_coop", datePlaced: 6 }],
});

describe("drawPlan with building upgrades", () => {
  it("draws the new tier from the date of the upgrade, with no sign", () => {
    expect([5, 6, 8].map((date) => drawUpgrade([upgradingCoop], date))).toEqual(
      [
        ["coop at 16,-48 alpha 1"],
        ["big coop at 16,-48 alpha 1"],
        ["big coop at 16,-48 alpha 1"],
      ],
    );
  });

  // The sign is at UpgradeSignTile (2, 2) of the coop, 18 px up, so at 16 +
  // 32, 16 + 32 - 18 (SV › Building.getUpgradeSignLocation).
  it("draws the old tier with the upgrade sign and no Robin while the animation of an upgrade plays", () => {
    const animation = animate(getUpgradeBuild(coop(), upgradingCoop, 6), 6);
    const options = { buildAnimations: [animation] };

    expect(
      drawUpgrade([upgradingCoop], 6, { ...options, buildTime: 749 }),
    ).toEqual(["coop at 16,-48 alpha 1", "sign at 48,30 alpha 1"]);
    expect(
      drawUpgrade([upgradingCoop], 6, { ...options, buildTime: 750 }),
    ).toEqual(["big coop at 16,-48 alpha 1"]);
  });

  it("fades the sign with the building", () => {
    const animation = animate(getUpgradeBuild(coop(), upgradingCoop, 6), 6);

    expect(
      drawUpgrade([upgradingCoop], 6, {
        buildAnimations: [animation],
        highlightedRegion: cursorOn(3, 0),
      }),
    ).toEqual(["coop at 16,-48 alpha 0.4", "sign at 48,30 alpha 0.4"]);
  });

  it("shows the new tier and green tiles on a building that can take the selected upgrade", () => {
    const draws = drawUpgrade([coop()], 6, {
      highlightedRegion: cursorOn(3, 2),
      selectedItem: { id: "big_coop", type: "building" },
    });

    expect(draws).toContain("big coop at 16,-48 alpha 1");
    expect(draws.filter((draw) => draw === "green tile")).toHaveLength(6 * 3);
    expect(draws).not.toContain("red tile");
  });

  it("shows red tiles and keeps the look on a building that has the tier already", () => {
    const draws = drawUpgrade([upgradingCoop], 7, {
      highlightedRegion: cursorOn(3, 2),
      selectedItem: { id: "big_coop", type: "building" },
    });

    expect(draws.filter((draw) => draw === "red tile")).toHaveLength(6 * 3);
    expect(draws).not.toContain("green tile");
    expect(draws).toContain("big coop at 16,-48 alpha 1");
  });

  it("previews the selected tier at the cursor on empty ground", () => {
    expect(
      drawUpgrade([], 6, {
        highlightedRegion: cursorOn(1, 1),
        selectedItem: { id: "deluxe_coop", type: "building" },
      }),
    ).toContain("deluxe coop at 16,-48 alpha 1");
  });
});

function getSitePieceNames(site: IBuildingSite | undefined) {
  if (site === undefined) {
    throw new Error("The coop in buildings.json has no building site");
  }

  return new Map<string, string>([
    ...site.frame.map(({ sprite }, index): [string, string] => [
      rectKey(sprite),
      `frame ${index}`,
    ]),
    [rectKey(site.lastDayFloor.sprite), "floor"],
    [rectKey(site.prop.sprite), "prop"],
    [rectKey(site.prop.lastDaySprite), "last-day prop"],
    ...(buildingData.coop.shadowPieces ?? []).map(
      ({ sprite }): [string, string] => [rectKey(sprite), "coop shadow"],
    ),
    [rectKey(buildingData.coop.sprite.sprite), "coop"],
  ]);
}

const sitePieceNames = getSitePieceNames(buildingData.coop.site);

const robinPieceNames = new Map<string, string>([
  [rectKey(robin.shadow.sprite), "robin shadow"],
  ...Object.entries(robin.frames).flatMap(([frame, robinFrame]) =>
    robinFrame === undefined
      ? []
      : [
          [rectKey(robinFrame.sprite), `robin ${frame} spring`] as const,
          [
            rectKey(robinFrame.seasons?.winter ?? []),
            `robin ${frame} winter`,
          ] as const,
        ],
  ),
]);

// The fixed buildings of the test map use the same shadow pieces, and they are
// all out of this area.
const coopArea = { bottom: 8 * 16, right: 8 * 16 };

function drawSite(
  buildings: IPlannedBuilding[],
  date: number,
  { buildAnimations, buildTime }: IAnimationOptions = {},
  withPositions = false,
) {
  const canvas = document.createElement("canvas");

  drawPlan(canvas, {
    buildAnimations,
    buildings,
    buildTime,
    crops: {},
    date,
    equipment: {},
    images: mockImages,
    pickFloorVariant: () => 0,
    scene: makeScene(),
    time: 0,
  });

  return contextOf(canvas).drawImage.mock.calls.flatMap(
    ([image, sx, sy, width, height, dx, dy]) => {
      if (!(image instanceof HTMLImageElement)) {
        return [];
      }

      if (dx >= coopArea.right || dy >= coopArea.bottom) {
        return [];
      }

      const rect = [sx, sy, width, height] as number[];
      const name = image.src.includes(atlasUrls.robin)
        ? robinPieceNames.get(rectKey(rect))
        : image.src.includes(atlasUrls.buildings)
          ? sitePieceNames.get(rectKey(rect))
          : undefined;

      if (name === undefined) {
        return [];
      }

      return [withPositions ? `${name} at ${dx},${dy}` : name];
    },
  );
}

describe("drawPlan with the build animation of a new building", () => {
  const newCoop = coop();
  const building = animate(getNewBuildingBuild(newCoop), 2);
  const drawAt = (buildTime: number, withPositions = false) =>
    drawSite(
      [newCoop],
      2,
      { buildAnimations: [building], buildTime },
      withPositions,
    );

  it("draws the building and its shadow, and no site, with no animation", () => {
    expect(new Set(drawSite([newCoop], 2))).toEqual(
      new Set(["coop shadow", "coop"]),
    );
  });

  it("draws the frame, the prop and Robin with her shadow in the first swing, with no building and no shadow, in the game's depth order", () => {
    expect(drawAt(0)).toEqual([
      "frame 0",
      "frame 1",
      "robin shadow",
      "robin 24 spring",
      "prop",
      "frame 2",
      "frame 3",
    ]);
  });

  it("draws the floor under all the sprites and the wider prop in the second swing", () => {
    expect(drawAt(750)).toEqual([
      "floor",
      "frame 0",
      "frame 1",
      "robin shadow",
      "robin 24 spring",
      "last-day prop",
      "frame 2",
      "frame 3",
    ]);
  });

  it("draws the building and its shadow, and no site, after the last swing", () => {
    expect(new Set(drawAt(1500))).toEqual(new Set(["coop shadow", "coop"]));
  });

  // The footprint starts at pixel 16,16. Robin stands on tile (3, 1) of the
  // coop, 4 px right and 8 px up from its middle, at 16 + 60, 16 + 16
  // (SV › NPC.updateConstructionAnimation).
  it("puts each piece at its offset from the top-left of the footprint", () => {
    expect(drawAt(750, true)).toEqual([
      "floor at 16,20",
      "frame 0 at 16,16",
      "frame 1 at 16,32",
      "robin shadow at 70,32",
      "robin 24 spring at 68,4",
      "last-day prop at 60,-4",
      "frame 2 at 16,48",
      "frame 3 at 64,48",
    ]);
  });

  it("draws Robin's winter sprite when the date on view is in winter", () => {
    const winterCoop = coop({ datePlaced: 86 });

    expect(
      drawSite([winterCoop], 86, {
        buildAnimations: [animate(getNewBuildingBuild(winterCoop), 86)],
        buildTime: 0,
      }),
    ).toContain("robin 24 winter");
  });

  it("swings Robin's hammer with the build time, from frame 24 with no long pause", () => {
    const robinFrames = [0, 74, 75, 150, 449, 450, 750].map(
      (buildTime) =>
        drawAt(buildTime).find((name) => /^robin \d/u.test(name)) ?? "",
    );

    expect(robinFrames).toEqual([
      "robin 24 spring",
      "robin 24 spring",
      "robin 25 spring",
      "robin 26 spring",
      "robin 26 spring",
      "robin 27 spring",
      "robin 24 spring",
    ]);
  });

  it("draws the building as it is when the animation is for another date or for a building that is not on the plan", () => {
    const options = { buildAnimations: [building], buildTime: 0 };

    expect(new Set(drawSite([newCoop], 3, options))).toEqual(
      new Set(["coop shadow", "coop"]),
    );
    expect(new Set(drawSite([coop()], 2, options))).toEqual(
      new Set(["coop shadow", "coop"]),
    );
  });

  it("plays the site and then each upgrade of a chain on grass", () => {
    const chain = coop({
      upgrades: [
        { buildingId: "big_coop", datePlaced: 2 },
        { buildingId: "deluxe_coop", datePlaced: 2 },
      ],
    });
    const options = {
      buildAnimations: [animate(getNewBuildingBuild(chain), 2)],
    };

    expect(
      [0, 750, 1500, 2250, 3000].map((buildTime) =>
        drawUpgrade([chain], 2, { ...options, buildTime }),
      ),
    ).toEqual([
      ["robin at 70,32 alpha 1", "robin at 68,4 alpha 1"],
      ["robin at 70,32 alpha 1", "robin at 68,4 alpha 1"],
      ["coop at 16,-48 alpha 1", "sign at 48,30 alpha 1"],
      ["big coop at 16,-48 alpha 1", "sign at 48,30 alpha 1"],
      ["deluxe coop at 16,-48 alpha 1"],
    ]);
  });
});

const lookRect = (building: IBuilding, lookKey: string) =>
  rectKey(building.looks?.[lookKey]?.sprite.sprite ?? []);

const fixedPieceNames = new Map<string, string>([
  [lookRect(buildingData.farmhouse, "upgrade_0"), "house 0"],
  [lookRect(buildingData.farmhouse, "upgrade_1"), "house 1"],
  [lookRect(buildingData.farmhouse, "upgrade_2"), "house 2"],
  [lookRect(buildingData.greenhouse, "broken"), "broken greenhouse"],
  [lookRect(buildingData.greenhouse, "repaired"), "repaired greenhouse"],
  [rectKey(buildingData.coop.upgradeSign?.sprite ?? []), "sign"],
]);

function drawFixed(
  houseUpgrades: IPlannedHouseUpgrade[],
  date: number,
  greenhouseRepair?: IPlannedRepair,
  { buildAnimations, buildTime }: IAnimationOptions = {},
) {
  const canvas = document.createElement("canvas");

  drawPlan(canvas, {
    buildAnimations,
    buildings: [],
    buildTime,
    crops: {},
    date,
    equipment: {},
    greenhouseRepair,
    houseUpgrades,
    images: mockImages,
    pickFloorVariant: () => 0,
    scene: makeScene(),
    time: 0,
  });

  return contextOf(canvas).drawImage.mock.calls.flatMap(
    ([image, sx, sy, width, height, dx, dy]) => {
      if (!(image instanceof HTMLImageElement)) {
        return [];
      }

      const rect = rectKey([sx, sy, width ?? 0, height ?? 0]);
      const name = image.src.includes(atlasUrls.robin)
        ? robinPieceNames.get(rect)
        : fixedPieceNames.get(rect);

      return name === undefined ? [] : [`${name} at ${dx},${dy}`];
    },
  );
}

const names = (draws: string[]) => draws.map((draw) => draw.split(" at ")[0]);

// The farmhouse of the test scene is at 0, 8, so its sprite is at -16, 128 -
// 62 = 66.
describe("drawPlan with house upgrades", () => {
  const kitchen = { datePlaced: 2, level: 1 };

  it("draws the new look from the date of the upgrade, with no sign and no Robin", () => {
    expect(
      [1, 2, 5].map((date) =>
        names(drawFixed([kitchen], date)).filter(
          (name) =>
            name.startsWith("house") ||
            name === "sign" ||
            name.startsWith("robin"),
        ),
      ),
    ).toEqual([["house 0"], ["house 1"], ["house 1"]]);
    expect(drawFixed([kitchen], 2)).toContain("house 1 at -16,66");
  });

  it("draws level 3 with the look of level 2", () => {
    const upgrades = [
      kitchen,
      { datePlaced: 5, level: 2 },
      { datePlaced: 9, level: 3 },
    ];

    expect(names(drawFixed(upgrades, 12))).toContain("house 2");
    expect(names(drawFixed(upgrades, 8))).toContain("house 2");
  });

  // Robin stands on house tile (9, 2), at the middle of the tile: 152, 128 +
  // 40 (SV › NPC.updateConstructionAnimation, Farm.GetMainFarmHouseEntry).
  it("draws the old house with Robin east of its wall, under the house sprite, while the animation plays", () => {
    const upgrades = [kitchen];
    const animation = animate(getHouseBuild([], upgrades, 2), 2);

    expect(
      drawFixed(upgrades, 2, undefined, {
        buildAnimations: [animation],
        buildTime: 0,
      }),
    ).toEqual([
      "robin shadow at 146,168",
      "robin 24 spring at 144,140",
      "house 0 at -16,66",
      "broken greenhouse at 160,96",
    ]);
  });

  it("draws each level of a chain with Robin for 1 swing, and then the new look", () => {
    const upgrades = [
      { datePlaced: 2, level: 1 },
      { datePlaced: 2, level: 2 },
    ];
    const options = {
      buildAnimations: [animate(getHouseBuild([], upgrades, 2), 2)],
    };

    expect(
      [0, 750, 1500].map((buildTime) =>
        names(drawFixed(upgrades, 2, undefined, { ...options, buildTime })),
      ),
    ).toEqual([
      ["robin shadow", "robin 24 spring", "house 0", "broken greenhouse"],
      ["robin shadow", "robin 24 spring", "house 1", "broken greenhouse"],
      ["house 2", "broken greenhouse"],
    ]);
  });

  it("draws Robin's winter sprite when the date on view is in winter", () => {
    const winterKitchen = [{ datePlaced: 86, level: 1 }];

    expect(
      names(
        drawFixed(winterKitchen, 86, undefined, {
          buildAnimations: [animate(getHouseBuild([], winterKitchen, 86), 86)],
          buildTime: 0,
        }),
      ),
    ).toContain("robin 24 winter");
  });

  it("draws the house as it is when the house upgrades of the animation are not on the plan", () => {
    const animation = animate(getHouseBuild([], [kitchen], 2), 2);

    expect(
      names(
        drawFixed([{ ...kitchen }], 2, undefined, {
          buildAnimations: [animation],
          buildTime: 0,
        }),
      ),
    ).toEqual(["house 1", "broken greenhouse"]);
  });
});

describe("drawPlan with the greenhouse repair", () => {
  it("draws the greenhouse repaired from the repair date, at once", () => {
    const repair = { datePlaced: 4 };

    expect(
      [3, 4, 5, 30].map((date) =>
        names(drawFixed([], date, repair)).filter((name) =>
          name.endsWith("greenhouse"),
        ),
      ),
    ).toEqual([
      ["broken greenhouse"],
      ["repaired greenhouse"],
      ["repaired greenhouse"],
      ["repaired greenhouse"],
    ]);
  });
});

const skinRect = (building: IBuilding, skin: string) =>
  rectKey(
    building.skins?.[skin]?.sprite.seasons?.spring ??
      building.skins?.[skin]?.sprite.sprite ??
      building.sprite.seasons?.spring ??
      building.sprite.sprite,
  );

const skinPieceNames = new Map<string, string>(
  (["cabin", "pet_bowl"] as const).flatMap((buildingId) => {
    const building = buildingData[buildingId];

    return [buildingId, ...Object.keys(building.skins ?? {})].map(
      (skin): [string, string] => [skinRect(building, skin), skin],
    );
  }),
);

interface ISkinDrawOptions {
  highlightedRegion?: { x1: number; x2: number; y1: number; y2: number };
  petBowlPaints?: IPlannedPaint[];
  selectedItem?: ISelectedItem;
}

function drawSkins(
  buildings: IPlannedBuilding[],
  date: number,
  { highlightedRegion, petBowlPaints, selectedItem }: ISkinDrawOptions = {},
) {
  const canvas = document.createElement("canvas");

  drawPlan(canvas, {
    buildings,
    crops: {},
    date,
    equipment: {},
    highlightedRegion,
    images: mockImages,
    petBowlPaints,
    pickFloorVariant: () => 0,
    scene: makeScene(),
    selectedItem,
    time: 0,
  });

  const calls = contextOf(canvas).drawImage.mock.calls;

  return {
    names: calls.flatMap(([image, sx, sy, width, height, dx, dy]) => {
      if (!(image instanceof HTMLImageElement)) {
        return [];
      }

      const highlight = /highlight-(\w+)\.png/u.exec(image.src)?.[1];
      const name = image.src.includes(atlasUrls.buildings)
        ? skinPieceNames.get(rectKey([sx, sy, width ?? 0, height ?? 0]))
        : highlight === undefined
          ? undefined
          : `${highlight} tile`;

      return name === undefined
        ? []
        : [name.endsWith("tile") ? name : `${name} at ${dx},${dy}`];
    }),
    shadows: calls.filter(
      ([image, , sy]) =>
        image instanceof HTMLImageElement &&
        image.src.includes(atlasUrls.buildings) &&
        sy === 0,
    ),
  };
}

// The cabin covers x 1-5 and y 1-3, so its sprite is at 16, 16 - 64. The pet
// bowl of the test scene is at 14, 4.
describe("drawPlan with skins and paints", () => {
  const cabin: IPlannedBuilding = {
    buildingId: "cabin",
    datePlaced: 2,
    paints: [{ datePainted: 6, skin: "plank_cabin" }],
    skin: "log_cabin",
    x: 1,
    y: 1,
  };

  it("draws the skin of the order until the paint day, and the painted skin from that day, with the same shadow", () => {
    const beforePaint = drawSkins([cabin], 5);
    const onPaintDay = drawSkins([cabin], 6);

    expect(beforePaint.names).toContain("log_cabin at 16,-48");
    expect(onPaintDay.names).toContain("plank_cabin at 16,-48");
    expect(onPaintDay.names).not.toContain("log_cabin at 16,-48");
    expect(onPaintDay.shadows).toEqual(beforePaint.shadows);
  });

  it("draws the fixed pet bowl with the skin of its last paint on the date", () => {
    const petBowlPaints = [
      { datePainted: 3, skin: "hay_pet_bowl" },
      { datePainted: 9, skin: "pet_bowl" },
    ];

    expect(
      [2, 3, 8, 9].map(
        (date) =>
          drawSkins([], date, { petBowlPaints }).names.find((name) =>
            name.includes("pet_bowl"),
          ) ?? "",
      ),
    ).toEqual([
      "pet_bowl at 224,64",
      "hay_pet_bowl at 224,64",
      "hay_pet_bowl at 224,64",
      "pet_bowl at 224,64",
    ]);
  });

  it("previews a new building with the picked skin at the cursor", () => {
    expect(
      drawSkins([], 2, {
        highlightedRegion: cursorOn(1, 1),
        selectedItem: { id: "cabin", skin: "trailer_cabin", type: "building" },
      }).names,
    ).toContain("trailer_cabin at 16,-48");
  });

  it("previews a paint on a building of the same type with the new look and green tiles", () => {
    const { names } = drawSkins([cabin], 7, {
      highlightedRegion: cursorOn(3, 2),
      selectedItem: { id: "cabin", skin: "rustic_cabin", type: "building" },
    });

    expect(names).toContain("rustic_cabin at 16,-48");
    expect(names).not.toContain("plank_cabin at 16,-48");
    expect(names.filter((name) => name === "green tile")).toHaveLength(5 * 3);
  });

  it("previews a paint on the fixed pet bowl with the new look and green tiles", () => {
    const { names } = drawSkins([], 2, {
      highlightedRegion: cursorOn(14, 4),
      selectedItem: {
        id: "pet_bowl",
        skin: "stone_pet_bowl",
        type: "building",
      },
    });

    expect(names).toContain("stone_pet_bowl at 224,64");
    expect(names).not.toContain("pet_bowl at 224,64");
    expect(names.filter((name) => name === "green tile")).toHaveLength(2 * 2);
  });

  it("shows red tiles and keeps the look when the building has the picked look", () => {
    const { names } = drawSkins([cabin], 7, {
      highlightedRegion: cursorOn(3, 2),
      selectedItem: { id: "cabin", skin: "plank_cabin", type: "building" },
    });

    expect(names).toContain("plank_cabin at 16,-48");
    expect(names.filter((name) => name === "red tile")).toHaveLength(5 * 3);
  });
});

interface IColorDrawOptions {
  highlightedRegion?: { x1: number; x2: number; y1: number; y2: number };
  houseColorPaints?: IPlannedColorPaint[];
  houseUpgrades?: IPlannedHouseUpgrade[];
  selectedItem?: ISelectedItem;
}

// A painted sprite is a canvas of the size of the sprite, which the plan
// draws in the place of the atlas sprite.
function drawColors(
  buildings: IPlannedBuilding[],
  date: number,
  options: IColorDrawOptions = {},
) {
  const canvas = document.createElement("canvas");

  drawPlan(canvas, {
    buildings,
    crops: {},
    date,
    equipment: {},
    images: mockImages,
    pickFloorVariant: () => 0,
    scene: makeScene(),
    time: 0,
    ...options,
  });

  return contextOf(canvas).drawImage.mock.calls.flatMap(
    ([image, sx, sy, width, height, dx, dy]) => {
      if (
        image instanceof HTMLCanvasElement &&
        sx === 0 &&
        sy === 0 &&
        width === image.width &&
        height === image.height
      ) {
        return [`painted ${width}x${height} at ${dx},${dy}`];
      }

      const highlight =
        image instanceof HTMLImageElement
          ? /highlight-(\w+)\.png/u.exec(image.src)?.[1]
          : undefined;

      return highlight === undefined ? [] : [`${highlight} tile`];
    },
  );
}

// The stable covers x 1-4 and y 1-2, so its sprite is at 16, 16 - 64. The
// farmhouse of the test scene is at 0, 8.
describe("drawPlan with colour paints", () => {
  const roof = { hue: 120, lightness: -12, saturation: 60 };
  const stable: IPlannedBuilding = {
    buildingId: "stable",
    datePlaced: 2,
    x: 1,
    y: 1,
  };
  const paintItem: ISelectedItem = {
    colors: { Roof: { hue: 120, lightness: 50, saturation: 60 } },
    id: "paint",
    type: "paint",
  };
  const nursery: IPlannedHouseUpgrade[] = [
    { datePlaced: 0, level: 1 },
    { datePlaced: 0, level: 2 },
  ];
  const houseColorPaints = [{ colors: { Roof: roof }, datePainted: 4 }];

  beforeEach(() => {
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(
      1024,
    );
  });

  it("draws a building with its colours from the date of the paint", () => {
    const painted = {
      ...stable,
      colorPaints: [{ colors: { Roof: roof }, datePainted: 6 }],
    };

    expect(drawColors([painted], 5)).toEqual([]);
    expect(drawColors([painted], 6)).toEqual(["painted 64x96 at 16,-48"]);
  });

  it("previews the new colours on the building under the cursor, with green tiles", () => {
    const names = drawColors([stable], 5, {
      highlightedRegion: cursorOn(2, 2),
      selectedItem: paintItem,
    });

    expect(names).toContain("painted 64x96 at 16,-48");
    expect(names.filter((name) => name === "green tile")).toHaveLength(4 * 2);
  });

  it("shows red tiles and no colours on a building that cannot take paint", () => {
    const names = drawColors([], 5, {
      highlightedRegion: cursorOn(12, 12),
      selectedItem: paintItem,
    });

    expect(names.filter((name) => name.startsWith("painted"))).toEqual([]);
    expect(names.filter((name) => name === "red tile")).toHaveLength(7 * 6);
  });

  it("draws the house with its colours only while it has the Nursery", () => {
    expect(
      drawColors([], 5, { houseColorPaints, houseUpgrades: nursery }),
    ).toEqual(["painted 178x144 at -16,66"]);
    expect(
      drawColors([], 5, {
        houseColorPaints,
        houseUpgrades: nursery.slice(0, 1),
      }),
    ).toEqual([]);
  });

  it("previews the house paint on the house", () => {
    expect(
      drawColors([], 5, {
        highlightedRegion: cursorOn(4, 10),
        houseUpgrades: nursery,
        selectedItem: paintItem,
      }),
    ).toContain("painted 178x144 at -16,66");
  });
});

// The default buildings are far from the hut, so each tile of its area is
// open ground.
function makeOpenScene(): IFarmScene {
  const file = makeTestFarmMapFile(40, 40);
  file.farm.spots = {
    farmhouse: { height: 5, width: 9, x: 30, y: 33 },
    greenhouse: { height: 6, width: 7, x: 30, y: 20 },
    petBowl: { height: 2, width: 2, x: 36, y: 2 },
    shippingBin: { height: 1, width: 2, x: 36, y: 10 },
  };

  return {
    map: decodeFarmMap("open", file),
    season: "spring",
    sheets: [document.createElement("canvas")],
  };
}

interface IAreaDrawOptions {
  equipment?: IFarmEquipment;
  highlightedRegion?: { x1: number; x2: number; y1: number; y2: number };
  selectedItem?: ISelectedItem;
}

// The area tiles are the highlight draws with a source rectangle. The tiles
// of a selection have none.
function drawAreas(
  buildings: IPlannedBuilding[],
  date: number,
  { equipment = {}, highlightedRegion, selectedItem }: IAreaDrawOptions = {},
) {
  const canvas = document.createElement("canvas");

  drawPlan(canvas, {
    buildings,
    crops: {},
    date,
    equipment,
    highlightedRegion,
    images: mockImages,
    pickFloorVariant: () => 0,
    scene: makeOpenScene(),
    selectedItem,
  });

  const colours = new Map<string, string[]>();

  contextOf(canvas).drawImage.mock.calls.forEach(([image, ...args]) => {
    const colour =
      image instanceof HTMLImageElement
        ? /highlight-(\w+)\.png/u.exec(image.src)?.[1]
        : undefined;

    if (colour === undefined || args.length !== 8) {
      return;
    }

    const tile = `${args[4] / 16},${args[5] / 16}`;
    colours.set(tile, [...(colours.get(tile) ?? []), colour]);
  });

  return colours;
}

const tilesIn = (colours: Map<string, string[]>, colour: string) =>
  [...colours].filter(([, drawn]) => drawn.includes(colour));

const scarecrowAt = (x: number, y: number): IFarmEquipment => ({
  [y]: { [x]: [scarecrow(x, y)] },
});

// The hut covers x 8-10 and y 8-9, so its area is x 1-17 and y 1-17.
describe("drawPlan with the Junimo Hut and scarecrow areas", () => {
  const hut: IPlannedBuilding = {
    buildingId: "junimo_hut",
    dateDestroyed: 9,
    datePlaced: 3,
    x: 8,
    y: 8,
  };

  it("draws the Junimo Hut area green from the date the hut goes down to the day before it is demolished", () => {
    expect(
      [2, 3, 8, 9].map(
        (date) => tilesIn(drawAreas([hut], date), "green").length,
      ),
    ).toEqual([0, 17 * 17 - 3 * 2, 17 * 17 - 3 * 2, 0]);

    const colours = drawAreas([hut], 3);

    expect(colours.get("1,1")).toEqual(["green"]);
    expect(colours.get("17,17")).toEqual(["green"]);
    expect(colours.get("18,17")).toBeUndefined();
    expect(colours.get("9,9")).toBeUndefined();
  });

  it("draws the scarecrow area yellow", () => {
    const colours = drawAreas([], 3, { equipment: scarecrowAt(20, 9) });

    expect(colours.get("20,9")).toEqual(["yellow"]);
    expect(colours.get("16,9")).toEqual(["yellow"]);
    expect(tilesIn(colours, "green")).toEqual([]);
  });

  it("draws 1 lime tile on each tile in both areas", () => {
    const colours = drawAreas([hut], 3, { equipment: scarecrowAt(20, 9) });

    expect(colours.get("20,9")).toEqual(["yellow"]);
    expect(colours.get("16,9")).toEqual(["lime"]);
    expect(colours.get("5,9")).toEqual(["green"]);
    expect([...colours.values()].every((drawn) => drawn.length === 1)).toBe(
      true,
    );
  });

  it("draws the area of a Junimo Hut in hand where it can go, and not where it cannot", () => {
    const selectedItem: ISelectedItem = { id: "junimo_hut", type: "building" };
    const free = drawAreas([], 3, {
      highlightedRegion: cursorOn(8, 8),
      selectedItem,
    });
    const onGreenhouse = drawAreas([], 3, {
      highlightedRegion: cursorOn(30, 20),
      selectedItem,
    });

    expect(tilesIn(free, "green")).toHaveLength(17 * 17 - 3 * 2);
    expect(free.get("9,9")).toBeUndefined();
    expect(tilesIn(onGreenhouse, "green")).toEqual([]);
  });
});

function getFishPond() {
  const { fishPond } = buildingData.fish_pond;

  if (fishPond === undefined) {
    throw new Error("The fish pond in buildings.json has no pieces");
  }

  return fishPond;
}

const fishPond = getFishPond();

const animatedPieceNames = new Map<string, string>([
  ...(buildingData.mill.sprite.animation?.frames ?? []).map(
    (frame, index): [string, string] => [rectKey(frame), `mill ${index}`],
  ),
  [rectKey(fishPond.floor.sprite), "floor"],
  ...(fishPond.edge.animation?.frames ?? []).map(
    (frame, index): [string, string] => [rectKey(frame), `edge ${index}`],
  ),
  ...fishPond.nettings.map(({ sprite }, style): [string, string] => [
    rectKey(sprite),
    `netting ${style}`,
  ]),
]);

interface IAnimatedDrawOptions extends IAreaDrawOptions {
  time?: number;
}

// The water is the 16 px tiles of the tinted farm water strip, which is a
// canvas.
function drawAnimated(
  buildings: IPlannedBuilding[],
  {
    equipment = {},
    highlightedRegion,
    selectedItem,
    time,
  }: IAnimatedDrawOptions = {},
) {
  const canvas = document.createElement("canvas");
  const context = contextOf(canvas);
  const draws: string[] = [];
  const savedAlphas: number[] = [];

  context.save.mockImplementation(() => {
    savedAlphas.push(context.globalAlpha);
  });
  context.restore.mockImplementation(() => {
    context.globalAlpha = savedAlphas.pop() ?? 1;
  });
  context.drawImage.mockImplementation((image, sx, sy, width, height) => {
    const alpha =
      context.globalAlpha === 1 ? "" : ` alpha ${context.globalAlpha}`;

    if (image instanceof HTMLCanvasElement && width === 16) {
      draws.push(`water${alpha}`);
      return;
    }

    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    if (image.src.includes(atlasUrls.items)) {
      draws.push(`item at ${sx},${sy}`);
      return;
    }

    const name = animatedPieceNames.get(
      rectKey([sx, sy, width ?? 0, height ?? 0]),
    );

    if (image.src.includes(atlasUrls.buildings) && name !== undefined) {
      draws.push(`${name}${alpha}`);
    }
  });

  drawPlan(canvas, {
    buildings,
    crops: {},
    date: 5,
    equipment,
    highlightedRegion,
    images: mockImages,
    pickFloorVariant: () => 0,
    scene: makeOpenScene(),
    selectedItem,
    time,
  });

  return draws;
}

const millAt = (x: number, y: number): IPlannedBuilding => ({
  buildingId: "mill",
  datePlaced: 0,
  x,
  y,
});

const pondAt = (x: number, y: number): IPlannedBuilding => ({
  buildingId: "fish_pond",
  datePlaced: 0,
  x,
  y,
});

// The game does not fade the water of a pond (SV › FishPond.draw).
const pondPieces = (netting: number, alpha = "") => [
  `floor${alpha}`,
  ...Array.from({ length: 20 }, () => "water"),
  `edge 0${alpha}`,
  `netting ${netting}${alpha}`,
];

describe("drawPlan with animated buildings", () => {
  it.each([
    [0, "mill 0"],
    [90, "mill 1"],
    [899, "mill 9"],
    [900, "mill 0"],
  ])("draws at %i ms the %s frame of the mill", (time, frame) => {
    expect(drawAnimated([millAt(3, 3)], { time })).toEqual([frame]);
  });

  it("draws the still mill when the map does not animate", () => {
    expect(drawAnimated([millAt(3, 3)])).toEqual(["mill 0"]);
  });

  it("fades the mill frame while the cursor is on its roof", () => {
    expect(
      drawAnimated([millAt(3, 3)], {
        highlightedRegion: cursorOn(4, 0),
        time: 90,
      }),
    ).toEqual(["mill 1 alpha 0.4"]);
  });

  it("previews the mill at the cursor with the frame of the plan time", () => {
    expect(
      drawAnimated([], {
        highlightedRegion: cursorOn(3, 3),
        selectedItem: { id: "mill", type: "building" },
        time: 180,
      }),
    ).toEqual(["mill 2"]);
  });

  // The pond at 3, 3 has the netting style 3 / 3 + 3 / 3 = 2.
  it("draws the fish pond floor, the farm water, the edge with the float and the netting, from the bottom up", () => {
    expect(drawAnimated([pondAt(3, 3)], { time: 0 })).toEqual(pondPieces(2));
  });

  it("bobs the float of the fish pond", () => {
    expect(drawAnimated([pondAt(3, 3)], { time: 1250 })).toContain("edge 1");
  });

  it("sorts the fish pond in its top row: over the row above it, under the rows of its footprint", () => {
    const equipment = { ...scarecrowAt(2, 2), ...scarecrowAt(2, 4) };
    const draws = drawAnimated([pondAt(3, 3)], { equipment, time: 0 });
    const [scarecrowIcon] = draws;

    expect(draws).toEqual([scarecrowIcon, ...pondPieces(2), scarecrowIcon]);
  });

  it("fades the fish pond pieces but not its water while the cursor is on its netting, and none on its footprint", () => {
    expect(
      drawAnimated([pondAt(3, 3)], {
        highlightedRegion: cursorOn(4, 1),
        time: 0,
      }),
    ).toEqual(pondPieces(2, " alpha 0.4"));
    expect(
      drawAnimated([pondAt(3, 3)], {
        highlightedRegion: cursorOn(4, 4),
        time: 0,
      }),
    ).toEqual(pondPieces(2));
  });

  it.each([
    [3, 3, 2],
    [6, 3, 0],
    [9, 3, 1],
  ])(
    "previews the fish pond at the cursor on %i, %i with the netting style %i of that tile",
    (x, y, netting) => {
      expect(
        drawAnimated([], {
          highlightedRegion: cursorOn(x, y),
          selectedItem: { id: "fish_pond", type: "building" },
          time: 0,
        }),
      ).toEqual(pondPieces(netting));
    },
  );
});
