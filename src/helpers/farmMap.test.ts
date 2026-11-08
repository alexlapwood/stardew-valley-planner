import { makeTestFarmMapFile, testRuleFlags } from "../__mocks__/testFarmMap";
import { getBushTiles } from "./bushes";
import { isOnDefaultBuilding } from "./defaultBuildings";
import {
  decodeFarmMap,
  decodeLayerTiles,
  decodeRuleRows,
  flagsAt,
  isFarmMapFile,
  isOnMap,
  parseFarmMap,
  ruleAlphabet,
} from "./farmMap";
import { farmIds } from "./farmMapLoader";
import { hasSkin } from "./items";
import { isGroundBuilding } from "./plannedBuildings";
import { getTileSource } from "./renderFarmMap";

const exportedFarms = import.meta.glob<unknown>(
  "../../public/data/game/farms/*.json",
  { eager: true, import: "default" },
);

describe("decodeLayerTiles", () => {
  it("reads gids and runs of empty cells, row by row", () => {
    expect([...decodeLayerTiles([-2, 7, 8, -3, 9], 8)]).toEqual([
      0, 0, 7, 8, 0, 0, 0, 9,
    ]);
  });

  it.each([
    ["too few", [-2, 7], 4],
    ["too many", [1, 2, -3], 4],
  ])("throws when the layer has %s cells", (_, tiles, cellCount) => {
    expect(() => decodeLayerTiles(tiles, cellCount)).toThrow(
      `cells, not ${cellCount}`,
    );
  });

  it("throws on a tile value of 0", () => {
    expect(() => decodeLayerTiles([1, 0, 1], 3)).toThrow("bad tile value");
  });
});

describe("decodeRuleRows", () => {
  it("reads one alphabet digit of flags for each tile", () => {
    expect([...decodeRuleRows(["0av", "w-_"], 3, 2)]).toEqual([
      0, 10, 31, 32, 62, 63,
    ]);
  });

  it("gives each character its place in the alphabet", () => {
    expect([...decodeRuleRows([ruleAlphabet], 64, 1)]).toEqual(
      Array.from({ length: 64 }, (_, value) => value),
    );
  });

  it.each([
    ["a row too many", ["00", "00", "00"], "3 rows, not 2"],
    ["a short row", ["00", "0"], "Rules row 1 has 1 tiles, not 2"],
    ["an unknown character", ["00", "0!"], 'bad value "!" at 1, 1'],
  ])("throws on %s", (_, rows, message) => {
    expect(() => decodeRuleRows(rows, 2, 2)).toThrow(message);
  });
});

describe("flagsAt", () => {
  const file = makeTestFarmMapFile(3, 2);
  file.farm.rules.rows = ["01g", "238"];
  const map = decodeFarmMap("small", file);

  it("gives the flags of a tile on the map", () => {
    expect([
      flagsAt(map, 0, 0),
      flagsAt(map, 2, 0),
      flagsAt(map, 2, 1),
    ]).toEqual([0, 16, 8]);
  });

  it.each([
    [-1, 0],
    [0, -1],
    [3, 0],
    [0, 2],
    [0.5, 0],
  ])("gives only the blocked flag off the map at %d, %d", (x, y) => {
    expect(flagsAt(map, x, y)).toBe(map.ruleFlags.blocked);
  });
});

describe("parseFarmMap", () => {
  it("throws when the data is not a farm map", () => {
    expect(() => parseFarmMap("bad", { farm: {} })).toThrow(
      "The bad farm map is not in the farm map format.",
    );
  });

  it.each<[string, (farm: Record<string, unknown>) => void]>([
    [
      "no floorable rule flag",
      (farm) => {
        const flags: Record<string, number> = { ...testRuleFlags };
        delete flags.floorable;
        farm.rules = { flags, rows: ["z"] };
      },
    ],
    [
      "no greenhouse path",
      (farm) => {
        delete farm.greenhousePath;
      },
    ],
    [
      "no sapling rows",
      (farm) => {
        delete farm.saplingRows;
      },
    ],
    [
      "a greenhouse path tile with no gid",
      (farm) => {
        farm.greenhousePath = [{ x: 0, y: 0 }];
      },
    ],
    [
      "no water tint for a season",
      (farm) => {
        farm.water = { tints: { spring: [0, 0, 0, 0] } };
      },
    ],
    [
      "a water tint that is not 4 bytes",
      (farm) => {
        farm.water = {
          tints: {
            fall: [0, 0, 0, 0],
            spring: [0, 0, 0, 256],
            summer: [0, 0, 0, 0],
            winter: [0, 0, 0, 0],
          },
        };
      },
    ],
    [
      "no start",
      (farm) => {
        delete farm.start;
      },
    ],
    [
      "a start with no list of items",
      (farm) => {
        farm.start = { buildings: [] };
      },
    ],
    [
      "a start building with no building id",
      (farm) => {
        farm.start = { buildings: [{ x: 54, y: 9 }], items: [] };
      },
    ],
    [
      "a start building that is not on a whole tile",
      (farm) => {
        farm.start = {
          buildings: [{ building: "coop", x: 54.5, y: 9 }],
          items: [],
        };
      },
    ],
    [
      "a start item with no skin",
      (farm) => {
        farm.start = { buildings: [], items: [{ item: "fence", x: 1, y: 2 }] };
      },
    ],
    [
      "no bushes",
      (farm) => {
        delete farm.bushes;
      },
    ],
    [
      "a bush of a size that the planner does not know",
      (farm) => {
        farm.bushes = [{ destroyable: true, size: "huge", x: 0, y: 0 }];
      },
    ],
    [
      "a bush with no destroyable flag",
      (farm) => {
        farm.bushes = [{ size: "small", x: 0, y: 0 }];
      },
    ],
    [
      "a bush that is not on a whole tile",
      (farm) => {
        farm.bushes = [{ destroyable: true, size: "small", x: 0.5, y: 0 }];
      },
    ],
    [
      "a bush with a noShadow flag that is not true",
      (farm) => {
        farm.bushes = [
          { destroyable: true, noShadow: false, size: "small", x: 0, y: 0 },
        ];
      },
    ],
  ])("is not a farm map with %s", (_, breakFarm) => {
    const file = makeTestFarmMapFile(1, 1);
    const farm: Record<string, unknown> = { ...file.farm };
    breakFarm(farm);

    expect(isFarmMapFile(file)).toBe(true);
    expect(isFarmMapFile({ ...file, farm })).toBe(false);
  });

  it("is a farm map with a start, and the map keeps the start", () => {
    const file = makeTestFarmMapFile(1, 1);
    const start: IFarmStart = {
      buildings: [{ building: "coop", x: 0, y: 0 }],
      items: [{ item: "fence", skin: "gate", x: 0, y: 0 }],
    };
    const data = { ...file, farm: { ...file.farm, start } };

    expect(isFarmMapFile(data)).toBe(true);
    expect(parseFarmMap("start", data).start).toEqual(start);
  });

  it("is a farm map with bushes of each size, and the map keeps them", () => {
    const file = makeTestFarmMapFile(1, 1);
    const bushes: IFarmBush[] = [
      { destroyable: true, size: "large", x: 0, y: 0 },
      { destroyable: false, noShadow: true, size: "medium", x: 3, y: 0 },
      { destroyable: false, size: "small", x: 5, y: 0 },
      { destroyable: false, size: "walnut", x: 6, y: 0 },
    ];
    const data = { ...file, farm: { ...file.farm, bushes } };

    expect(isFarmMapFile(data)).toBe(true);
    expect(parseFarmMap("bushes", data).bushes).toEqual(bushes);
  });

  it("throws when a layer has no group", () => {
    const file = makeTestFarmMapFile(1, 1);
    const data = {
      ...file,
      farm: { ...file.farm, layers: [{ id: "Back", tiles: [1] }] },
    };

    expect(isFarmMapFile(data)).toBe(false);
  });

  it("skips the layers with a group that the planner does not draw, and warns one time", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const file = makeTestFarmMapFile(1, 1);
    const data = {
      ...file,
      farm: {
        ...file.farm,
        layers: [
          { group: "Paths", id: "Paths", tiles: [1] },
          { group: "Back", id: "Back", tiles: [1] },
          { group: "Lights", id: "Lights", tiles: [1] },
        ],
      },
    };

    const map = parseFarmMap("newer", data);

    expect(map.layers.map(({ id }) => id)).toEqual(["Back"]);
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      "The newer farm map has layers in groups that the planner does not draw.",
      ["Paths (Paths)", "Lights (Lights)"],
    );

    warn.mockRestore();
  });
});

function farmIdOf(path: string) {
  return /([^/]+)\.json$/u.exec(path)?.[1] ?? path;
}

function tilesFrom(first: number, last: number) {
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

describe("the exported farms", () => {
  const farms = Object.entries(exportedFarms);

  it("are the farms of the planner", () => {
    expect(farms.map(([path]) => farmIdOf(path)).toSorted()).toEqual(
      [...farmIds].toSorted(),
    );
  });

  it.each([
    ["standard", 80, 65],
    ["riverland", 80, 65],
    ["forest", 80, 65],
    ["hilltop", 80, 65],
    ["wilderness", 80, 65],
    ["four_corners", 80, 80],
    ["beach", 110, 110],
    ["meadowlands", 100, 75],
  ])("has the %s farm at %i by %i tiles", (id, width, height) => {
    const [path, data] =
      farms.find(([farmPath]) => farmIdOf(farmPath) === id) ?? [];
    const map = parseFarmMap(path ?? id, data);

    expect([map.width, map.height]).toEqual([width, height]);
  });

  it.each(farms)(
    "%s decodes, and each of its tiles is in a tilesheet",
    (path, data) => {
      const map = parseFarmMap(path, data);
      const cellCount = map.width * map.height;
      const unknownGids = new Set<number>();

      expect(map.flags).toHaveLength(cellCount);

      const checkGid = (gid: number) => {
        if (getTileSource(map, gid, 0) === undefined) {
          unknownGids.add(gid);
        }
      };

      map.layers.forEach((layer) => {
        expect(layer.gids).toHaveLength(cellCount);
        layer.gids.filter((gid) => gid !== 0).forEach(checkGid);
      });
      map.animations.forEach(({ frames }) => {
        frames.forEach(checkGid);
      });

      expect([...unknownGids]).toEqual([]);
    },
  );

  it("starts Meadowlands with the finished Coop and the Wood Fence with its gate of Farm.onNewGame", () => {
    const [path, data] =
      farms.find(([farmPath]) => farmIdOf(farmPath) === "meadowlands") ?? [];
    const fenceTiles = [
      ...tilesFrom(47, 62).map((x) => ({ x, y: 20 })),
      ...tilesFrom(16, 19).map((y) => ({ x: 47, y })),
      ...tilesFrom(7, 19).map((y) => ({ x: 62, y })),
    ];

    expect(parseFarmMap(path ?? "meadowlands", data).start).toEqual({
      buildings: [{ building: "coop", x: 54, y: 9 }],
      items: fenceTiles.map(({ x, y }) => ({
        item: "fence",
        skin: x === 62 && y === 13 ? "gate" : "wood_fence",
        x,
        y,
      })),
    });
  });

  it.each(farms.filter(([path]) => farmIdOf(path) !== "meadowlands"))(
    "starts %s with nothing more than the fixed buildings",
    (path, data) => {
      expect(parseFarmMap(path, data).start).toEqual({
        buildings: [],
        items: [],
      });
    },
  );

  it.each(farms)(
    "%s starts with only buildings that Robin builds and items that the planner has",
    (path, data) => {
      const { buildings, items } = parseFarmMap(path, data).start;

      expect(
        buildings.filter(({ building }) => !isGroundBuilding(building)),
      ).toEqual([]);
      expect(items.filter(({ item, skin }) => !hasSkin(item, skin))).toEqual(
        [],
      );
    },
  );

  it.each([
    ["standard", 5, 0],
    ["riverland", 14, 7],
    ["forest", 49, 19],
    ["hilltop", 54, 3],
    ["wilderness", 15, 0],
    ["four_corners", 20, 0],
    ["beach", 52, 16],
    ["meadowlands", 48, 0],
  ])(
    "has %i bushes on the %s farm, %i of them destroyable",
    (id, count, destroyable) => {
      const [path, data] =
        farms.find(([farmPath]) => farmIdOf(farmPath) === id) ?? [];
      const { bushes } = parseFarmMap(path ?? id, data);

      expect(bushes).toHaveLength(count);
      expect(bushes.filter((bush) => bush.destroyable)).toHaveLength(
        destroyable,
      );
    },
  );

  it.each(farms)(
    "%s has its bushes on the map, on no fixed building and on no other bush",
    (path, data) => {
      const map = parseFarmMap(path, data);
      const tiles = map.bushes.flatMap(getBushTiles);
      const keys = tiles.map(({ x, y }) => `${x},${y}`);

      expect(tiles.filter(({ x, y }) => !isOnMap(map, x, y))).toEqual([]);
      expect(
        tiles.filter(({ x, y }) => isOnDefaultBuilding(map, x, y)),
      ).toEqual([]);
      expect(new Set(keys).size).toBe(keys.length);
    },
  );

  it.each(farms)(
    "%s has a greenhouse path with its tiles in a tilesheet",
    (path, data) => {
      const map = parseFarmMap(path, data);

      expect(map.greenhousePath).not.toEqual([]);
      expect(
        map.greenhousePath.filter(
          ({ gid }) => getTileSource(map, gid, 0) === undefined,
        ),
      ).toEqual([]);
    },
  );
});
