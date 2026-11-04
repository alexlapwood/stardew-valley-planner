import { fireEvent, render, screen } from "@solidjs/testing-library";

import mockImages from "../../__helpers__/images";
import { crops, equipment, setCrops, setEquipment } from "../../state/farm";
import Farm from "./Farm";

// sdv.json has no layout for the "Test" farm. The React version of Farm
// added this one.
vi.mock("../../data/sdv.json", async (importOriginal) => {
  const sdv = await importOriginal<typeof import("../../data/sdv.json")>();
  const { default: testFarm } = await import("../../__mocks__/testFarm");

  return { ...sdv, farmLayouts: { ...sdv.farmLayouts, test: testFarm } };
});

const date = 2;

const regionTiles = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
] as const;

const tilesOutsideRegion = [
  [2, 0],
  [0, 2],
] as const;

function parsnip(
  x: number,
  y: number,
  overrides: Partial<IPlantedCrop> = {},
): IPlantedCrop {
  return {
    cropId: "parsnip",
    datePlanted: 0,
    type: "crop",
    x,
    y,
    ...overrides,
  };
}

function scarecrow(
  x: number,
  y: number,
  overrides: Partial<IInstalledEquipment> = {},
): IInstalledEquipment {
  return {
    dateInstalled: 0,
    equipmentId: "scarecrow",
    skinIndex: 0,
    type: "equipment",
    x,
    y,
    ...overrides,
  };
}

function byTile<T extends { x: number; y: number }>(items: T[]) {
  const farmItems: IFarmItems<T[]> = {};

  items.forEach((item) => {
    farmItems[item.y] = { ...farmItems[item.y], [item.x]: [item] };
  });

  return farmItems;
}

const centreOfTile = (tile: number) => tile * 16 + 8;

function dragAcrossTiles(from: [number, number], to: [number, number]) {
  const canvas = screen.getByTestId("farm-canvas");

  fireEvent.mouseDown(canvas, {
    clientX: centreOfTile(from[0]),
    clientY: centreOfTile(from[1]),
  });
  fireEvent.mouseMove(canvas, {
    clientX: centreOfTile(to[0]),
    clientY: centreOfTile(to[1]),
  });
  fireEvent.mouseUp(canvas, {
    clientX: centreOfTile(to[0]),
    clientY: centreOfTile(to[1]),
  });
}

beforeEach(() => {
  // jsdom has no 2D context and no layout, so the canvas would not draw and
  // its zero-size rect would turn every mouse position into NaN.
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(
    HTMLCanvasElement.prototype,
    "getBoundingClientRect",
  ).mockImplementation(function (this: HTMLCanvasElement) {
    return new DOMRect(0, 0, this.width, this.height);
  });

  setCrops({});
  setEquipment({});
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("renders the app without crashing", () => {
  const { container } = render(() => (
    <Farm currentFarm="Test" date={0} images={mockImages} zoom={1} />
  ));
  expect(container).toMatchSnapshot();
});

describe("doing things with a selected region", () => {
  it("won't do anything if we're not actually selecting a region of the farm", () => {
    const { container } = render(() => (
      <Farm currentFarm="Test" date={0} images={mockImages} zoom={1} />
    ));

    const canvas = screen.getByTestId("farm-canvas");

    if (canvas === undefined) {
      throw new Error();
    }

    fireEvent.mouseUp(canvas);

    expect(container).toMatchSnapshot();
  });

  it("can plant crops", () => {
    render(() => (
      <Farm
        currentFarm="Test"
        date={date}
        images={mockImages}
        selectedItem={{ id: "parsnip", type: "crop" }}
        zoom={1}
      />
    ));

    dragAcrossTiles([0, 0], [1, 1]);

    expect(crops()).toEqual(
      byTile(regionTiles.map(([x, y]) => parsnip(x, y, { datePlanted: date }))),
    );
  });

  it("can destroy crops", () => {
    setCrops(
      byTile(
        [...regionTiles, ...tilesOutsideRegion].map(([x, y]) => parsnip(x, y)),
      ),
    );

    render(() => (
      <Farm
        currentFarm="Test"
        date={date}
        images={mockImages}
        selectedItem={{ id: "pick-axe", type: "tool" }}
        zoom={1}
      />
    ));

    dragAcrossTiles([0, 0], [1, 1]);

    expect(crops()).toEqual(
      byTile([
        ...regionTiles.map(([x, y]) => parsnip(x, y, { dateDestroyed: date })),
        ...tilesOutsideRegion.map(([x, y]) => parsnip(x, y)),
      ]),
    );
  });

  it("can install equipment", () => {
    render(() => (
      <Farm
        currentFarm="Test"
        date={date}
        images={mockImages}
        selectedItem={{ id: "scarecrow", type: "equipment" }}
        zoom={1}
      />
    ));

    dragAcrossTiles([0, 0], [1, 1]);

    expect(equipment()).toEqual(
      byTile(
        regionTiles.map(([x, y]) => scarecrow(x, y, { dateInstalled: date })),
      ),
    );
  });

  it("can destroy equipment", () => {
    setEquipment(
      byTile(
        [...regionTiles, ...tilesOutsideRegion].map(([x, y]) =>
          scarecrow(x, y),
        ),
      ),
    );

    render(() => (
      <Farm
        currentFarm="Test"
        date={date}
        images={mockImages}
        selectedItem={{ id: "pick-axe", type: "tool" }}
        zoom={1}
      />
    ));

    dragAcrossTiles([0, 0], [1, 1]);

    expect(equipment()).toEqual(
      byTile([
        ...regionTiles.map(([x, y]) =>
          scarecrow(x, y, { dateDestroyed: date }),
        ),
        ...tilesOutsideRegion.map(([x, y]) => scarecrow(x, y)),
      ]),
    );
  });
});
