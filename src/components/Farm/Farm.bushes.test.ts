import mockImages from "../../__helpers__/images";
import { makeTestFarmMapFile } from "../../__mocks__/testFarmMap";
import { bushes as bushKinds } from "../../data/game/bushes.json";
import { atlasUrls } from "../../helpers/atlas";
import { decodeFarmMap } from "../../helpers/farmMap";
import { drawPlan } from "./Farm.canvas";
import { pickAxe } from "./Farm.drag";

type TDrawImage = CanvasRenderingContext2D["drawImage"];

const drawImage = vi.fn<TDrawImage>();

const mockContext = {
  clearRect: vi.fn(),
  drawImage,
  fillRect: vi.fn(),
  globalAlpha: 1,
  imageSmoothingEnabled: true,
  restore: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
};

// The medium bush covers 10, 20 and 11, 20.
const medium: IFarmBush = { destroyable: true, size: "medium", x: 10, y: 20 };
const fixedSmall: IFarmBush = {
  destroyable: false,
  size: "small",
  x: 15,
  y: 20,
};

function makeScene(): IFarmScene {
  const file = makeTestFarmMapFile(40, 40);
  file.farm.spots = {
    farmhouse: { height: 5, width: 9, x: 30, y: 33 },
    greenhouse: { height: 6, width: 7, x: 30, y: 20 },
    petBowl: { height: 2, width: 2, x: 36, y: 2 },
    shippingBin: { height: 1, width: 2, x: 36, y: 10 },
  };
  file.farm.bushes = [medium, fixedSmall];

  return {
    map: decodeFarmMap("bushes", file),
    season: "spring",
    sheets: [document.createElement("canvas")],
  };
}

function chest(x: number, y: number): IInstalledEquipment {
  return {
    dateInstalled: 0,
    equipmentId: "chest",
    skin: "chest",
    type: "equipment",
    x,
    y,
  };
}

interface IDrawOptions {
  crops?: IFarmCrops;
  cutBushes?: ICutBush[];
  date?: number;
  equipment?: IInstalledEquipment[];
  highlightedRegion?: { x1: number; x2: number; y1: number; y2: number };
  selectedItem?: ISelectedItem;
}

const shadowRects = new Set(
  Object.values(bushKinds).map(({ shadow }) => shadow.sprite.join(",")),
);

// args are the numbers after the image, and a highlight tile has only its
// place.
function nameOf(image: CanvasImageSource, args: number[]) {
  if (!(image instanceof HTMLImageElement)) {
    return undefined;
  }

  if (image.src.includes(atlasUrls.bushes)) {
    return shadowRects.has(args.slice(0, 4).join(",")) ? "shadow" : "bush";
  }

  if (image.src.includes(atlasUrls.items)) {
    return `item ${(args[5] + args[3]) / 16 - 1}`;
  }

  const colour = /highlight-(\w+)\.png/u.exec(image.src)?.[1];

  return colour === undefined || args.length !== 2
    ? undefined
    : `${colour} ${args[0] / 16},${args[1] / 16}`;
}

function draw({
  crops = {},
  cutBushes,
  date = 0,
  equipment = [],
  highlightedRegion,
  selectedItem,
}: IDrawOptions = {}) {
  const equipmentByTile: IFarmEquipment = {};

  drawImage.mockClear();
  equipment.forEach((installed) => {
    equipmentByTile[installed.y] = {
      ...equipmentByTile[installed.y],
      [installed.x]: [installed],
    };
  });
  drawPlan(document.createElement("canvas"), {
    buildings: [],
    crops,
    cutBushes,
    date,
    equipment: equipmentByTile,
    highlightedRegion,
    images: mockImages,
    pickFloorVariant: () => 0,
    scene: makeScene(),
    selectedItem,
  });

  return drawImage.mock.calls.flatMap(([image, ...args]) => {
    const name = nameOf(image, args.map(Number));

    return name === undefined ? [] : [name];
  });
}

beforeEach(() => {
  drawImage.mockReset();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => mockContext as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("drawPlan with the bushes of the farm map", () => {
  it("draws the shadow and the sprite of each bush, the shadows first", () => {
    const names = draw();

    expect(names.filter((name) => name === "shadow")).toHaveLength(2);
    expect(names.filter((name) => name === "bush")).toHaveLength(2);
    expect(names.lastIndexOf("shadow")).toBeLessThan(names.indexOf("bush"));
  });

  it("draws a bush over the items of its row and under the items of the next row", () => {
    const names = draw({ equipment: [chest(12, 20), chest(12, 21)] });

    expect(names.indexOf("item 20")).toBeLessThan(names.indexOf("bush"));
    expect(names.lastIndexOf("bush")).toBeLessThan(names.indexOf("item 21"));
  });

  it("does not draw a cut bush or its shadow on and after the date of the cut", () => {
    const cutBushes = [{ dateCut: 5, x: 10, y: 20 }];

    expect(
      draw({ cutBushes, date: 4 }).filter((name) => name === "bush"),
    ).toHaveLength(2);
    expect(
      draw({ cutBushes, date: 5 }).filter((name) => name === "bush"),
    ).toHaveLength(1);
    expect(
      draw({ cutBushes, date: 5 }).filter((name) => name === "shadow"),
    ).toHaveLength(1);
  });

  it("shows the whole bush red over its sprite when an erase cuts it", () => {
    const names = draw({
      highlightedRegion: { x1: 11, x2: 11, y1: 20, y2: 20 },
      selectedItem: pickAxe,
    });

    expect(names.filter((name) => name.startsWith("red"))).toEqual([
      "red 10,20",
      "red 11,20",
    ]);
    expect(names.indexOf("red 10,20")).toBeGreaterThan(
      names.lastIndexOf("bush"),
    );
    expect(names).not.toContain("grey 11,20");
  });

  it("shows the whole bush green when an erase on the date of its cut gives it back", () => {
    const names = draw({
      cutBushes: [{ dateCut: 5, x: 10, y: 20 }],
      date: 5,
      highlightedRegion: { x1: 10, x2: 10, y1: 20, y2: 20 },
      selectedItem: pickAxe,
    });

    expect(names.filter((name) => name.startsWith("green"))).toEqual([
      "green 10,20",
      "green 11,20",
    ]);
  });

  it("shows the whole bush green when the same erase takes off the crop that was planted on its tile on the date of its cut", () => {
    const parsnip: IPlantedCrop = {
      cropId: "parsnip",
      datePlanted: 5,
      type: "crop",
      x: 11,
      y: 20,
    };
    const names = draw({
      crops: { 20: { 11: [parsnip] } },
      cutBushes: [{ dateCut: 5, x: 10, y: 20 }],
      date: 5,
      highlightedRegion: { x1: 9, x2: 12, y1: 20, y2: 20 },
      selectedItem: pickAxe,
    });

    expect(names.filter((name) => name.startsWith("green"))).toEqual([
      "green 10,20",
      "green 11,20",
    ]);
    expect(names.filter((name) => name.startsWith("red"))).toEqual([]);
    expect(names.filter((name) => name.startsWith("grey"))).toEqual([
      "grey 9,20",
      "grey 12,20",
    ]);
  });

  it("shows a bush that the game cannot cut as ground that the erase does not change", () => {
    const names = draw({
      highlightedRegion: { x1: 15, x2: 15, y1: 20, y2: 20 },
      selectedItem: pickAxe,
    });

    expect(names).toContain("grey 15,20");
    expect(names.filter((name) => name.startsWith("red"))).toEqual([]);
  });
});
