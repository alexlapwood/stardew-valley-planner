import mockImages from "../../__helpers__/images";
import { makeTestFarmMapFile } from "../../__mocks__/testFarmMap";
import { atlasUrls } from "../../helpers/atlas";
import { defaultFarmLooks } from "../../helpers/defaultBuildings";
import { decodeFarmMap } from "../../helpers/farmMap";
import { getPassCanvas, type TMapPass } from "../../helpers/renderFarmMap";
import { drawMap, drawPlan } from "./Farm.canvas";

type TDrawImage = CanvasRenderingContext2D["drawImage"];

const contexts = new Map<
  HTMLCanvasElement,
  { drawImage: ReturnType<typeof vi.fn<TDrawImage>> }
>();

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
    } as unknown as { drawImage: ReturnType<typeof vi.fn<TDrawImage>> };
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
