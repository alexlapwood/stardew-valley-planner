import { makeTestFarmMapFile } from "../__mocks__/testFarmMap";
import { bushes as bushKinds } from "../data/game/bushes.json";
import {
  findBushAt,
  findBushOver,
  getBushDays,
  getBushesOn,
  getBushFootprint,
  getBushSprite,
  getBushTiles,
  isBushFlipped,
  isBushHereOn,
} from "./bushes";
import { decodeFarmMap } from "./farmMap";

const exportedFarms = import.meta.glob<IFarmMapFile>(
  "../../public/data/game/farms/*.json",
  { eager: true, import: "default" },
);

const medium: IFarmBush = { destroyable: true, size: "medium", x: 10, y: 30 };
const small: IFarmBush = { destroyable: false, size: "small", x: 20, y: 30 };

function mapWithBushes(bushes: IFarmBush[]) {
  const file = makeTestFarmMapFile();
  file.farm.bushes = bushes;

  return decodeFarmMap("bushes", file);
}

describe("bush footprints", () => {
  it.each<[TBushSize, number]>([
    ["small", 1],
    ["medium", 2],
    ["large", 3],
    ["walnut", 2],
  ])("gives a %s bush 1 row of %i tiles from its first tile", (size, width) => {
    const bush: IFarmBush = { destroyable: true, size, x: 4, y: 9 };

    expect(getBushFootprint(bush)).toEqual({ height: 1, width, x: 4, y: 9 });
    expect(getBushTiles(bush)).toEqual(
      Array.from({ length: width }, (_, dx) => ({ x: 4 + dx, y: 9 })),
    );
  });

  it("finds the bush on each tile of its footprint, and not on the rows that its sprite covers", () => {
    const map = mapWithBushes([medium, small]);

    expect(findBushAt(map, 10, 30)).toBe(medium);
    expect(findBushAt(map, 11, 30)).toBe(medium);
    expect(findBushAt(map, 20, 30)).toBe(small);
    expect(
      [
        [12, 30],
        [10, 29],
        [10, 28],
        [10, 31],
        [-1, 30],
      ].map(([x, y]) => findBushAt(map, x, y)),
    ).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });
});

describe("bush days", () => {
  const cut: ICutBush = { dateCut: 12, x: 10, y: 30 };

  it("keeps a bush with no cut on the farm on every day", () => {
    expect(getBushDays(medium)).toEqual({
      firstDay: Number.NEGATIVE_INFINITY,
      lastDay: undefined,
    });
    expect(isBushHereOn(medium, [], 400)).toBe(true);
  });

  it("takes a cut bush off the farm from the date of the cut", () => {
    expect(getBushDays(medium, [cut])).toEqual({
      firstDay: Number.NEGATIVE_INFINITY,
      lastDay: 11,
    });
    expect(
      [11, 12, 13].map((date) => isBushHereOn(medium, [cut], date)),
    ).toEqual([true, false, false]);
    expect(getBushesOn(mapWithBushes([medium, small]), [cut], 12)).toEqual([
      small,
    ]);
  });

  it("finds the bush over some of the days of a thing", () => {
    const map = mapWithBushes([medium]);
    const tile = { x: 11, y: 30 };

    expect(findBushOver(map, tile, { firstDay: 5 }, [cut])).toBe(medium);
    expect(findBushOver(map, tile, { firstDay: 12 }, [cut])).toBeUndefined();
    expect(findBushOver(map, tile, { firstDay: 400 })).toBe(medium);
  });
});

describe("getBushSprite", () => {
  it.each(["spring", "summer", "fall", "winter"])(
    "draws a medium bush with its %s look, with no berries",
    (season) => {
      expect(getBushSprite(medium, season)).toEqual({
        offset: { x: 0, y: -32 },
        rect: bushKinds.medium.sprite.seasons?.[season],
      });
    },
  );

  it("draws a large bush in summer with its spring look, as the game does", () => {
    expect(getBushSprite({ ...medium, size: "large" }, "summer").rect).toEqual(
      bushKinds.large.sprite.seasons?.spring,
    );
  });

  it("draws a walnut bush with its one look in every season", () => {
    expect(getBushSprite({ ...medium, size: "walnut" }, "winter")).toEqual({
      offset: { x: 0, y: -16 },
      rect: bushKinds.walnut.sprite.sprite,
    });
  });
});

describe("isBushFlipped", () => {
  it("gives the same flip to a tile each time", () => {
    const tiles = Array.from({ length: 50 }, (_, index) => ({
      x: index % 10,
      y: Math.floor(index / 10),
    }));

    expect(tiles.map(isBushFlipped)).toEqual(tiles.map(isBushFlipped));
  });

  it("flips about half of the bushes of the exported farms", () => {
    const bushes = Object.values(exportedFarms).flatMap(
      ({ farm }) => farm.bushes,
    );
    const flipped = bushes.filter(isBushFlipped).length;

    expect(bushes.length).toBeGreaterThan(200);
    expect(flipped / bushes.length).toBeGreaterThan(0.35);
    expect(flipped / bushes.length).toBeLessThan(0.65);
  });
});
