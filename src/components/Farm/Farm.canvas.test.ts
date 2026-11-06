import mockImages from "../../__helpers__/images";
import { makeTestFarmMapFile } from "../../__mocks__/testFarmMap";
import { atlasUrls } from "../../helpers/atlas";
import { defaultFarmLooks } from "../../helpers/defaultBuildings";
import { decodeFarmMap } from "../../helpers/farmMap";
import { getPassCanvas, type TMapPass } from "../../helpers/renderFarmMap";
import { drawMap, drawPlan } from "./Farm.canvas";

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
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      imageSmoothingEnabled: true,
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
    crops: { [plantedTree.y]: { [plantedTree.x]: [plantedTree] } },
    date,
    equipment,
    highlightedRegion,
    images: mockImages,
    looks: defaultFarmLooks,
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
      crops: {},
      date: 0,
      equipment: {
        3: { 2: [scarecrow(2, 3)] },
        4: { 2: [scarecrow(2, 4)] },
      },
      images: mockImages,
      looks: defaultFarmLooks,
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
      crops: { 4: { 2: [apple] } },
      date: 28,
      equipment: {
        3: { 4: [scarecrow(4, 3)] },
        5: { 4: [scarecrow(4, 5)] },
      },
      images: mockImages,
      looks: defaultFarmLooks,
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
      crops: { 4: { 2: [apple] } },
      date: 28,
      equipment: { 5: { 3: [{ ...scarecrow(3, 5), dateDestroyed: 7 }] } },
      images: mockImages,
      looks: defaultFarmLooks,
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
      crops: { 4: { 4: [parsnip] } },
      date: 0,
      equipment: { 6: { 6: [floor] } },
      highlightedRegion: { x1: 5, x2: 5, y1: 5, y2: 5 },
      images: mockImages,
      looks: defaultFarmLooks,
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
