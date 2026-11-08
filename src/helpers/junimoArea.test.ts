import { makeTestFarmMapFile, testFarmMap } from "../__mocks__/testFarmMap";
import { decodeFarmMap } from "./farmMap";
import { getJunimoAreaMap, getJunimoAreaTiles } from "./junimoArea";
import { getPlacedBuildingsOn, toPlacedBuilding } from "./plannedBuildings";

const hut: IPlannedBuilding = {
  buildingId: "junimo_hut",
  datePlaced: 0,
  x: 20,
  y: 40,
};

const tileKey = ({ x, y }: IFarmTile) => `${x},${y}`;

function tilesOf(areaMap: (number | undefined)[][]) {
  return areaMap.flatMap((column, x) =>
    column.flatMap((value, y) => (value === undefined ? [] : [`${x},${y}`])),
  );
}

function areaOn(
  date: number,
  plannedBuildings: IPlannedBuilding[],
  farmMap = testFarmMap,
) {
  return tilesOf(
    getJunimoAreaMap(
      getPlacedBuildingsOn(plannedBuildings, date),
      farmMap,
      date,
      plannedBuildings,
    ),
  );
}

function setTile(file: IFarmMapFile, x: number, y: number, rule: string) {
  const row = file.farm.rules.rows[y];
  file.farm.rules.rows[y] = row.slice(0, x) + rule + row.slice(x + 1);
}

function setSapling(file: IFarmMapFile, x: number, y: number, rule: string) {
  const row = file.farm.saplingRows[y];
  file.farm.saplingRows[y] = row.slice(0, x) + rule + row.slice(x + 1);
}

// The hut covers x 20-22 and y 40-41, and its centre tile is 21, 41.
describe("getJunimoAreaTiles", () => {
  it("gives the 17 × 17 tiles from 7 tiles above and left of the hut to 9 tiles below and right of it", () => {
    const tiles = getJunimoAreaTiles(toPlacedBuilding(hut));
    const xs = tiles.map(({ x }) => x);
    const ys = tiles.map(({ y }) => y);

    expect(tiles).toHaveLength(17 * 17);
    expect(new Set(tiles.map(tileKey)).size).toBe(17 * 17);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([13, 29]);
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([33, 49]);
  });

  it("gives no tiles for a building with no harvest area", () => {
    expect(
      getJunimoAreaTiles(toPlacedBuilding({ ...hut, buildingId: "coop" })),
    ).toEqual([]);
  });
});

describe("getJunimoAreaMap", () => {
  it("covers each tile of the area but the hut", () => {
    const tiles = areaOn(0, [hut]);

    expect(tiles).toHaveLength(17 * 17 - 3 * 2);
    expect(tiles).toEqual(expect.arrayContaining(["13,33", "29,49"]));
    expect(tiles).not.toContain("21,41");
  });

  it("covers the area of a hut in the preview, which is not in the plan, but not the hut", () => {
    const tiles = tilesOf(
      getJunimoAreaMap([toPlacedBuilding(hut)], testFarmMap, 0, []),
    );

    expect(tiles).toHaveLength(17 * 17 - 3 * 2);
    expect(tiles).not.toContain("20,40");
  });

  it("covers each tile of 2 areas 1 time", () => {
    const tiles = areaOn(0, [hut, { ...hut, x: 25 }]);

    expect(new Set(tiles).size).toBe(tiles.length);
    expect(tiles).toHaveLength((17 + 5) * 17 - 3 * 2 * 2);
  });

  it("shows the area from the date the hut goes down to the day before it is demolished", () => {
    const demolished = { ...hut, dateDestroyed: 9, datePlaced: 3 };

    expect(
      [2, 3, 8, 9].map((date) => areaOn(date, [demolished]).length),
    ).toEqual([0, 283, 283, 0]);
  });

  it("covers only the tiles where a crop or a tea bush can grow", () => {
    const file = makeTestFarmMapFile();
    // g: blocked, w: floorable, 1: tillable
    setTile(file, 14, 34, "g");
    setTile(file, 15, 34, "w");
    setTile(file, 16, 34, "w");
    setSapling(file, 16, 34, "0");
    setTile(file, 17, 34, "1");
    const map = decodeFarmMap("ground", file);
    const tiles = areaOn(0, [hut], map);

    expect(
      ["13,34", "14,34", "15,34", "16,34", "17,34"].map((tile) =>
        tiles.includes(tile),
      ),
    ).toEqual([true, false, true, false, false]);
  });

  it("does not cover another building on the days when it stands", () => {
    const coop: IPlannedBuilding = {
      buildingId: "coop",
      dateDestroyed: 9,
      datePlaced: 5,
      x: 14,
      y: 44,
    };
    const coversCoop = (date: number) =>
      areaOn(date, [hut, coop]).includes("15,45");

    expect([4, 5, 8, 9].map(coversCoop)).toEqual([true, false, false, true]);
  });
});
