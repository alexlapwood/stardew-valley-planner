import { render, screen } from "@solidjs/testing-library";

import mockImages from "../../__helpers__/images";
import {
  makeTestFarmMapFile,
  mockFarmMapFetch,
} from "../../__mocks__/testFarmMap";
import { loadFarmScene, type TFarmId } from "../../helpers/farmMapLoader";
import { setCrops, setEquipment } from "../../state/farm";
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
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      imageSmoothingEnabled: true,
      restore: vi.fn(),
      save: vi.fn(),
    } as IMockContext;
    contexts.set(canvas, context);
  }

  return context;
}

function renderFarm(currentFarm: TFarmId) {
  render(() => (
    <Farm currentFarm={currentFarm} date={0} images={mockImages} zoom={1} />
  ));

  const planCanvas = screen.getByTestId<HTMLCanvasElement>("farm-canvas");
  const mapCanvas =
    document.querySelector<HTMLCanvasElement>(".Farm--map-canvas");

  if (mapCanvas === null) {
    throw new Error("The farm has no map canvas");
  }

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

beforeAll(async () => {
  vi.stubGlobal("Image", LoadingImage);
  mockFarmMapFetch({
    forest: makeFarmFile(false),
    standard: makeFarmFile(true),
  });
  await Promise.all([
    loadFarmScene("standard", "spring"),
    loadFarmScene("forest", "spring"),
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
  setCrops({});
  setEquipment({});
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
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    }));

    const countDraws = renderFarm("standard");

    vi.advanceTimersByTime(5000);

    expect(vi.getTimerCount()).toBe(0);
    expect(countDraws()).toEqual({ map: 1, plan: 1 });
  });
});
