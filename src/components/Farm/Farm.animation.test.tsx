import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import mockImages from "../../__helpers__/images";
import {
  makeTestFarmMapFile,
  mockFarmMapFetch,
} from "../../__mocks__/testFarmMap";
import { atlasUrls } from "../../helpers/atlas";
import { loadFarmScene, type TFarmId } from "../../helpers/farmMapLoader";
import {
  buildings,
  houseUpgrades,
  setBuildings,
  setCrops,
  setEquipment,
  setHouseUpgrades,
} from "../../state/farm";
import Farm from "./Farm";

class LoadingImage {
  onload?: () => void;
  private url = "";

  get src() {
    return this.url;
  }

  set src(url: string) {
    this.url = url;
    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

const size = 4;
const backFrameGid = 17;
const frontFrameGid = 18;

function makeFarmFile(animated: boolean) {
  const file = makeTestFarmMapFile(size, size);
  file.farm.tilesheets = [
    {
      columns: 4,
      firstGid: 1,
      id: "sheet",
      images: { fall: "f", spring: "s", summer: "s", winter: "w" },
      rows: 4,
      seasonal: true,
      tileHeight: 16,
      tileWidth: 16,
    },
  ];
  file.farm.animations = [
    { frames: [2, 3], gid: backFrameGid, interval: 500 },
    { frames: [4, 5], gid: frontFrameGid, interval: 300 },
  ];
  file.farm.layers = [
    {
      group: "Back",
      id: "Back",
      tiles: [animated ? backFrameGid : 1, ...Array<number>(15).fill(1)],
    },
    {
      group: "Front",
      id: "Front",
      tiles: [-5, animated ? frontFrameGid : 6, -10],
    },
  ];

  return file;
}

interface IMockContext {
  clearRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
}

const contexts = new Map<HTMLCanvasElement, IMockContext>();

function contextOf(canvas: HTMLCanvasElement) {
  let context = contexts.get(canvas);

  if (context === undefined) {
    context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: "#000000",
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      imageSmoothingEnabled: true,
      putImageData: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
    } as IMockContext;
    contexts.set(canvas, context);
  }

  return context;
}

function getCanvases() {
  const planCanvas = screen.getByTestId<HTMLCanvasElement>("farm-canvas");
  const mapCanvas =
    document.querySelector<HTMLCanvasElement>(".Farm--map-canvas");

  if (mapCanvas === null) {
    throw new Error("The farm has no map canvas");
  }

  return { mapCanvas, planCanvas };
}

function renderFarm(currentFarm: TFarmId, date = 0) {
  render(() => (
    <Farm currentFarm={currentFarm} date={date} images={mockImages} zoom={1} />
  ));

  const { mapCanvas, planCanvas } = getCanvases();

  return () => ({
    map: contextOf(mapCanvas).clearRect.mock.calls.length,
    plan: contextOf(planCanvas).clearRect.mock.calls.length,
  });
}

let hidden = false;

function setHidden(value: boolean) {
  hidden = value;
  document.dispatchEvent(new Event("visibilitychange"));
}

function stubReducedMotion() {
  vi.stubGlobal("matchMedia", () => ({
    addEventListener: vi.fn(),
    matches: true,
    removeEventListener: vi.fn(),
  }));
}

beforeAll(async () => {
  vi.stubGlobal("Image", LoadingImage);
  mockFarmMapFetch({
    forest: makeFarmFile(false),
    riverland: makeTestFarmMapFile(),
    standard: makeFarmFile(true),
  });
  await Promise.all([
    loadFarmScene("standard", "spring"),
    loadFarmScene("forest", "spring"),
    loadFarmScene("riverland", "spring"),
  ]);
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.useFakeTimers();
  contexts.clear();
  hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      return contextOf(this);
    } as unknown as HTMLCanvasElement["getContext"],
  );
  vi.spyOn(
    HTMLCanvasElement.prototype,
    "getBoundingClientRect",
  ).mockImplementation(function (this: HTMLCanvasElement) {
    return new DOMRect(0, 0, this.width, this.height);
  });
  setBuildings([]);
  setCrops({});
  setEquipment({});
  setHouseUpgrades([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("animating the farm map", () => {
  it("draws again only the canvas whose tiles change frame", () => {
    const countDraws = renderFarm("standard");

    expect(countDraws()).toEqual({ map: 1, plan: 1 });

    vi.advanceTimersByTime(300);

    expect(countDraws()).toEqual({ map: 1, plan: 2 });

    vi.advanceTimersByTime(200);

    expect(countDraws()).toEqual({ map: 2, plan: 2 });

    vi.advanceTimersByTime(100);

    expect(countDraws()).toEqual({ map: 2, plan: 3 });
  });

  it("sets no timer for a map with no animated tiles", () => {
    const countDraws = renderFarm("forest");

    vi.advanceTimersByTime(5000);

    expect(vi.getTimerCount()).toBe(0);
    expect(countDraws()).toEqual({ map: 1, plan: 1 });
  });

  it("draws no frames while the page is hidden", () => {
    const countDraws = renderFarm("standard");

    setHidden(true);
    vi.advanceTimersByTime(5000);

    expect(vi.getTimerCount()).toBe(0);
    expect(countDraws()).toEqual({ map: 1, plan: 1 });

    setHidden(false);
    vi.advanceTimersByTime(300);

    expect(countDraws()).toEqual({ map: 1, plan: 2 });
  });

  it("shows a still map when the device asks for reduced motion", () => {
    stubReducedMotion();

    const countDraws = renderFarm("standard");

    vi.advanceTimersByTime(5000);

    expect(vi.getTimerCount()).toBe(0);
    expect(countDraws()).toEqual({ map: 1, plan: 1 });
  });
});

describe("animating the buildings", () => {
  const millTop = 1856;
  const millFrameTop = 3303;

  function renderWithBuilding(buildingId: string) {
    setBuildings([{ buildingId, datePlaced: 0, x: 10, y: 10 }]);

    const countDraws = renderFarm("riverland", 1);
    const plan = contextOf(getCanvases().planCanvas);
    const millFrames = () =>
      plan.drawImage.mock.calls.flatMap(([image, sx, sy, width]) =>
        image instanceof HTMLImageElement &&
        image.src.includes(atlasUrls.buildings) &&
        width === 64 &&
        (sy === millTop || sy === millFrameTop)
          ? [`${sx},${sy}`]
          : [],
      );

    return { countDraws, millFrames };
  }

  it("draws the plan again at each 90 ms frame of a mill, with the frame of the time", () => {
    const { countDraws, millFrames } = renderWithBuilding("mill");

    expect(countDraws().plan).toBe(1);
    expect(millFrames()).toEqual(["0,1856"]);

    vi.advanceTimersByTime(89);

    expect(countDraws().plan).toBe(1);

    vi.advanceTimersByTime(1);

    expect(countDraws().plan).toBe(2);
    expect(millFrames().at(-1)).toBe("0,3303");

    vi.advanceTimersByTime(90);

    expect(countDraws()).toEqual({ map: 1, plan: 3 });
    expect(millFrames().at(-1)).toBe("64,3303");
  });

  it("draws the plan again when the water of a fish pond changes frame", () => {
    const { countDraws } = renderWithBuilding("fish_pond");

    vi.advanceTimersByTime(199);

    expect(countDraws().plan).toBe(1);

    vi.advanceTimersByTime(1);

    expect(countDraws().plan).toBe(2);
  });

  it("shows a still mill when the device asks for reduced motion", () => {
    stubReducedMotion();

    const { countDraws, millFrames } = renderWithBuilding("mill");

    vi.advanceTimersByTime(5000);

    expect(vi.getTimerCount()).toBe(0);
    expect(countDraws().plan).toBe(1);
    expect(millFrames()).toEqual(["0,1856"]);
  });
});

const barnItem: ISelectedItem = { id: "barn", type: "building" };
const swing = 750;

// The farmhouse of the test farm covers x 59-67 and y 12-16.
const onHouse: [number, number] = [62, 14];

function renderBuildFarm(selectedItem?: ISelectedItem, startDate = 1) {
  const [date, setDate] = createSignal(startDate);
  const [item, setItem] = createSignal(selectedItem);

  render(() => (
    <Farm
      currentFarm="riverland"
      date={date()}
      images={mockImages}
      selectedItem={item()}
      zoom={1}
    />
  ));

  const { planCanvas } = getCanvases();
  const plan = contextOf(planCanvas);

  return {
    countPlanDraws: () => plan.clearRect.mock.calls.length,
    // Robin's frames are 16 by 32, and her shadow is smaller.
    countRobins: () =>
      plan.drawImage.mock.calls.filter(
        ([image, , , width, height]) =>
          image instanceof HTMLImageElement &&
          image.src.includes(atlasUrls.robin) &&
          width === 16 &&
          height === 32,
      ).length,
    forgetDraws: () => {
      plan.drawImage.mockClear();
    },
    planCanvas,
    setDate,
    setItem,
  };
}

function clickTile(canvas: HTMLElement, [x, y]: [number, number], button = 0) {
  const point = { clientX: x * 16 + 8, clientY: y * 16 + 8 };

  fireEvent.mouseDown(canvas, { ...point, button });
  fireEvent.mouseUp(canvas, { ...point, button });
}

describe("the build animation", () => {
  it("puts the building in the plan at once, and plays the site with Robin's hammer, 1 swing for each stage", () => {
    const farm = renderBuildFarm(barnItem);

    clickTile(farm.planCanvas, [10, 10]);

    expect(buildings()).toEqual([
      { buildingId: "barn", datePlaced: 1, x: 10, y: 10 },
    ]);
    expect(farm.countRobins()).toBeGreaterThan(0);

    const draws = farm.countPlanDraws();

    vi.advanceTimersByTime(74);

    expect(farm.countPlanDraws()).toBe(draws);

    vi.advanceTimersByTime(1);

    expect(farm.countPlanDraws()).toBe(draws + 1);

    vi.advanceTimersByTime(2 * swing - 76);
    farm.forgetDraws();

    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(1);

    expect(farm.countRobins()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("draws Robin at each frame change of her swings: 24, 25, 26, 27 and again", () => {
    const farm = renderBuildFarm(barnItem);

    clickTile(farm.planCanvas, [10, 10]);

    const draws = farm.countPlanDraws();

    [75, 75, 300, 300, 75].forEach((step) => {
      vi.advanceTimersByTime(step);
    });

    expect(farm.countPlanDraws()).toBe(draws + 5);
  });

  it("plays also when the device asks for reduced motion", () => {
    stubReducedMotion();
    const farm = renderBuildFarm(barnItem);

    clickTile(farm.planCanvas, [10, 10]);

    const draws = farm.countPlanDraws();

    vi.advanceTimersByTime(75);

    expect(farm.countPlanDraws()).toBe(draws + 1);

    vi.advanceTimersByTime(2 * swing);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("plays the 2 site stages and 1 stage for each upgrade of a chain on grass", () => {
    const farm = renderBuildFarm({ id: "deluxe_barn", type: "building" });

    clickTile(farm.planCanvas, [10, 10]);
    vi.advanceTimersByTime(4 * swing - 1);

    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(1);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("plays 1 stage with no Robin for an upgrade click", () => {
    setBuildings([{ buildingId: "barn", datePlaced: 0, x: 10, y: 10 }]);
    const farm = renderBuildFarm({ id: "big_barn", type: "building" });

    clickTile(farm.planCanvas, [12, 12]);

    expect(buildings()[0].upgrades).toEqual([
      { buildingId: "big_barn", datePlaced: 1 },
    ]);
    expect(farm.countRobins()).toBe(0);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(swing);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("plays Robin at the house wall for each level of a house upgrade", () => {
    const farm = renderBuildFarm({ id: "2", type: "houseUpgrade" });

    clickTile(farm.planCanvas, onHouse);

    expect(houseUpgrades()).toEqual([
      { datePlaced: 1, level: 1 },
      { datePlaced: 1, level: 2 },
    ]);
    expect(farm.countRobins()).toBeGreaterThan(0);

    vi.advanceTimersByTime(2 * swing);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("plays no animation for a building with no site", () => {
    const farm = renderBuildFarm({ id: "junimo_hut", type: "building" });

    clickTile(farm.planCanvas, [10, 10]);

    expect(buildings()).toHaveLength(1);
    expect(farm.countRobins()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("plays many animations at the same time, each with its own Robin", () => {
    const farm = renderBuildFarm(barnItem);

    clickTile(farm.planCanvas, [10, 10]);
    vi.advanceTimersByTime(100);
    clickTile(farm.planCanvas, [40, 30]);
    farm.forgetDraws();
    vi.advanceTimersByTime(50);

    expect(buildings()).toHaveLength(2);
    expect(farm.countRobins()).toBe(2);
  });

  it("does not play when a plan opens, or when the date changes", () => {
    setBuildings([{ buildingId: "barn", datePlaced: 1, x: 10, y: 10 }]);
    setHouseUpgrades([{ datePlaced: 1, level: 1 }]);
    const farm = renderBuildFarm();

    expect(vi.getTimerCount()).toBe(0);
    expect(farm.countRobins()).toBe(0);

    farm.setDate(2);

    expect(vi.getTimerCount()).toBe(0);
    expect(farm.countRobins()).toBe(0);
  });

  it("stops at once when the date changes, and does not come back with the date", () => {
    const farm = renderBuildFarm(barnItem);

    clickTile(farm.planCanvas, [10, 10]);
    vi.advanceTimersByTime(100);
    farm.forgetDraws();
    farm.setDate(2);
    farm.setDate(1);

    expect(farm.countRobins()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops at once when the building is erased", () => {
    const farm = renderBuildFarm(barnItem);

    clickTile(farm.planCanvas, [10, 10]);
    vi.advanceTimersByTime(100);
    farm.setItem({ id: "pick-axe", type: "tool" });
    clickTile(farm.planCanvas, [12, 12]);
    farm.forgetDraws();
    fireEvent.mouseMove(farm.planCanvas, { clientX: 8, clientY: 8 });

    expect(buildings()).toEqual([]);
    expect(farm.countRobins()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
