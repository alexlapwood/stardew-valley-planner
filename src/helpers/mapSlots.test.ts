import mockImages from "../__helpers__/images";
import { makeTestFarmMapFile } from "../__mocks__/testFarmMap";
import { findAtlas } from "./atlas";
import { decodeFarmMap } from "./farmMap";
import {
  getMapSlots,
  getSlotsNextChange,
  getUnderBuildingsSlot,
} from "./mapSlots";

const animatedGid = 17;
const width = 40;

function makeScene(
  greenhousePath: IFarmPathTile[],
  firstRow?: string,
): IFarmScene {
  const file = makeTestFarmMapFile(width, 30);
  file.farm.tilesheets = [
    {
      columns: 4,
      firstGid: 1,
      id: "sheet",
      images: { spring: "sheet" },
      rows: 4,
      seasonal: true,
      tileHeight: 16,
      tileWidth: 16,
    },
  ];
  file.farm.animations = [{ frames: [3, 4], gid: animatedGid, interval: 250 }];
  file.farm.greenhousePath = greenhousePath;
  file.farm.spots.greenhouse = { height: 6, width: 7, x: 10, y: 5 };

  if (firstRow !== undefined) {
    file.farm.rules.rows[0] = firstRow.padEnd(width, "z");
  }

  return {
    map: decodeFarmMap("slots", file),
    season: "spring",
    sheets: [document.createElement("canvas")],
  };
}

function drawSlot(scene: IFarmScene, time: number) {
  const buildingsImage = document.createElement("canvas");
  const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();
  const context = { drawImage } as unknown as CanvasRenderingContext2D;

  getUnderBuildingsSlot(scene, buildingsImage).draw(context, time);

  return drawImage.mock.calls.map(([image, ...args]) => [
    image === buildingsImage ? "buildings" : "sheet",
    ...args,
  ]);
}

describe("the slot under the buildings", () => {
  it("draws the greenhouse path from the farm tilesheets in front of the greenhouse, and then the greenhouse shadow", () => {
    const scene = makeScene([
      { gid: 2, x: 2, y: 6 },
      { gid: 7, x: 3, y: 7 },
    ]);

    expect(drawSlot(scene, 0)).toEqual([
      ["sheet", 16, 0, 16, 16, 12 * 16, 11 * 16, 16, 16],
      ["sheet", 32, 16, 16, 16, 13 * 16, 12 * 16, 16, 16],
      ["buildings", 224, 1504, 128, 144, 10 * 16 - 16, 5 * 16, 128, 144],
    ]);
  });

  it("draws the frame of an animated path tile, and changes when the frame changes", () => {
    const scene = makeScene([{ gid: animatedGid, x: 0, y: 0 }]);
    const slot = getUnderBuildingsSlot(scene, document.createElement("canvas"));

    expect(drawSlot(scene, 250)[0].slice(0, 3)).toEqual(["sheet", 48, 0]);
    expect(slot.nextChange?.(0)).toBe(250);
  });

  it("does not change when the path has no animated tiles", () => {
    const scene = makeScene([{ gid: 2, x: 0, y: 0 }]);
    const slot = getUnderBuildingsSlot(scene, document.createElement("canvas"));

    expect(slot.nextChange?.(0)).toBe(Infinity);
  });
});

describe("getMapSlots", () => {
  it("has the slot under the buildings, and no water slot on a farm with no water", () => {
    const slots = getMapSlots(makeScene([]), mockImages);

    expect(slots.underBuildings).toBeDefined();
    expect(slots.water).toBeUndefined();
  });

  it("has a water slot on a farm with water, which changes with the water", () => {
    const slots = getMapSlots(makeScene([], "44"), mockImages);

    expect(slots.water).toBeDefined();
    expect(getSlotsNextChange(slots)(600)).toBe(667);
  });

  it("gives the canvas scale to the water slot", () => {
    const slots = getMapSlots(makeScene([], "44"), mockImages, 4);

    expect(getSlotsNextChange(slots)(0)).toBe(167);
  });

  it("draws the greenhouse shadow from the buildings image", () => {
    const scene = makeScene([]);
    const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();
    const context = { drawImage } as unknown as CanvasRenderingContext2D;

    getMapSlots(scene, mockImages).underBuildings?.draw(context, 0);

    expect(drawImage).toHaveBeenCalledExactlyOnceWith(
      findAtlas(mockImages, "buildings"),
      224,
      1504,
      128,
      144,
      10 * 16 - 16,
      5 * 16,
      128,
      144,
    );
  });
});
