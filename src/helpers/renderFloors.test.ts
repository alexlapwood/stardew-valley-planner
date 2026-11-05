import { items } from "../data/game/items.json";
import { hashFloorVariant } from "./floorVariant";
import { renderFloorsToContext } from "./renderFloors";

type TSide = keyof IFloorNeighbours;

interface IDrawCall {
  alpha: number;
  args: number[];
  fillStyle?: string;
  image?: CanvasImageSource;
}

interface IFloorImages {
  flooring: HTMLCanvasElement;
  flooringWinter: HTMLCanvasElement;
}

const mapSize = { height: 65, width: 80 };
const winter = 3 * 28;
const woodBlock: TSpriteRect = [0, 0, 64, 64];
const plankBlock: TSpriteRect = [704, 0, 64, 64];
const steppingStoneBlock: TSpriteRect = [576, 0, 64, 64];

function getFloorDrawing() {
  const drawing = items.flooring.floorDrawing;

  if (drawing === undefined) {
    throw new Error("items.json has no floor drawing data");
  }

  return drawing;
}

function getFloorSkin(skin: string) {
  const floor = items.flooring.skins[skin]?.floor;

  if (floor === undefined) {
    throw new Error(`items.json has no floor for ${skin}`);
  }

  return floor;
}

function newImages(): IFloorImages {
  return {
    flooring: document.createElement("canvas"),
    flooringWinter: document.createElement("canvas"),
  };
}

const images = newImages();

function floor(
  x: number,
  y: number,
  skin = "wood_floor",
  variant?: number,
): IInstalledEquipment {
  return {
    dateInstalled: 0,
    equipmentId: "flooring",
    skin,
    type: "equipment",
    ...(variant === undefined ? {} : { variant }),
    x,
    y,
  };
}

function byTile(cells: IInstalledEquipment[]) {
  const farmEquipment: IFarmEquipment = {};

  cells.forEach((cell) => {
    farmEquipment[cell.y] = { ...farmEquipment[cell.y], [cell.x]: [cell] };
  });

  return farmEquipment;
}

const sideOffsets: Record<TSide, [number, number]> = {
  e: [1, 0],
  n: [0, -1],
  ne: [1, -1],
  nw: [-1, -1],
  s: [0, 1],
  se: [1, 1],
  sw: [-1, 1],
  w: [-1, 0],
};

function floorWithSides(x: number, y: number, sides: TSide[], skin?: string) {
  return [[0, 0] as const, ...sides.map((side) => sideOffsets[side])].map(
    ([dx, dy]) => floor(x + dx, y + dy, skin),
  );
}

function drawFloors(
  cells: IInstalledEquipment[],
  { date = 0, floorImages = images } = {},
) {
  const calls: IDrawCall[] = [];
  const savedStates: { fillStyle: string; globalAlpha: number }[] = [];
  const context = {
    drawImage: (image: CanvasImageSource, ...args: number[]) => {
      calls.push({ alpha: context.globalAlpha, args, image });
    },
    fillRect: (...args: number[]) => {
      calls.push({
        alpha: context.globalAlpha,
        args,
        fillStyle: context.fillStyle,
      });
    },
    fillStyle: "",
    globalAlpha: 1,
    restore: () => {
      Object.assign(context, savedStates.pop());
    },
    save: () => {
      savedStates.push({
        fillStyle: context.fillStyle,
        globalAlpha: context.globalAlpha,
      });
    },
  };

  renderFloorsToContext(
    context as unknown as CanvasRenderingContext2D,
    floorImages,
    byTile(cells),
    date,
    mapSize,
  );

  return calls;
}

function mockSilhouetteContext() {
  const silhouetteContext = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    globalCompositeOperation: "source-over",
  };

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    silhouetteContext as unknown as CanvasRenderingContext2D,
  );

  return silhouetteContext;
}

function isFloorSheet(image: CanvasImageSource | undefined) {
  return image === images.flooring || image === images.flooringWinter;
}

function tileDraws(calls: IDrawCall[]) {
  return calls
    .filter(({ args, image }) => isFloorSheet(image) && args[2] === 16)
    .map(({ args }) => args);
}

function patchDraws(calls: IDrawCall[]) {
  return calls
    .filter(({ args, image }) => isFloorSheet(image) && args[2] < 16)
    .map(({ args }) => args);
}

function tileRect(block: TSpriteRect, tile: number | undefined): TSpriteRect {
  const index = tile ?? -1;

  return [
    block[0] + (index % 16) * 16,
    block[1] + Math.floor(index / 16) * 16,
    16,
    16,
  ];
}

function drawn(rect: TSpriteRect, dx: number, dy: number) {
  return [...rect, dx, dy, rect[2], rect[3]];
}

beforeEach(() => {
  mockSilhouetteContext();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("renderFloorsToContext", () => {
  describe("Stepping Stone look", () => {
    it("draws the saved variant, whatever the neighbours are", () => {
      const { variants } = getFloorDrawing();

      expect(
        tileDraws(
          drawFloors([
            floor(2, 2, "stepping_stone_path", 5),
            floor(3, 2, "stepping_stone_path", 0),
          ]),
        ),
      ).toEqual([
        drawn(tileRect(steppingStoneBlock, variants[5]), 32, 32),
        drawn(tileRect(steppingStoneBlock, variants[0]), 48, 32),
      ]);
    });

    it("uses the hash of x and y for a tile with no saved variant", () => {
      const { variants } = getFloorDrawing();
      const variant = hashFloorVariant(4, 7);

      expect(
        tileDraws(drawFloors([floor(4, 7, "stepping_stone_path")])),
      ).toEqual([
        drawn(tileRect(steppingStoneBlock, variants[variant]), 64, 112),
      ]);
    });
  });

  describe("hashFloorVariant", () => {
    const tiles = Array.from({ length: mapSize.width }, (_, x) =>
      Array.from({ length: mapSize.height }, (_, y) => hashFloorVariant(x, y)),
    );

    function shareOfEqualPairs(dx: number, dy: number) {
      const pairs = tiles
        .flatMap((column, x) =>
          column.map((variant, y) => [variant, tiles[x + dx]?.[y + dy]]),
        )
        .filter(([, other]) => other !== undefined);

      return pairs.filter(([a, b]) => a === b).length / pairs.length;
    }

    it("gives the same whole number from 0 to 15 for the same tile", () => {
      tiles.forEach((column, x) => {
        column.forEach((variant, y) => {
          expect(Number.isInteger(variant)).toBe(true);
          expect(variant).toBeGreaterThanOrEqual(0);
          expect(variant).toBeLessThan(16);
          expect(hashFloorVariant(x, y)).toBe(variant);
        });
      });
    });

    it("spreads over all 16 variants about evenly", () => {
      const counts = Array.from({ length: 16 }, () => 0);
      const expected = (mapSize.width * mapSize.height) / 16;

      tiles.flat().forEach((variant) => {
        counts[variant] += 1;
      });

      counts.forEach((count) => {
        expect(count).toBeGreaterThan(expected * 0.6);
        expect(count).toBeLessThan(expected * 1.4);
      });
    });

    it("makes no stripes on rows or columns", () => {
      tiles.forEach((column) => {
        expect(new Set(column).size).toBeGreaterThanOrEqual(12);
      });

      tiles[0].forEach((_, y) => {
        const row = tiles.map((column) => column[y]);

        expect(new Set(row).size).toBeGreaterThanOrEqual(12);
      });
    });

    it.each([
      ["row", 1, 0],
      ["column", 0, 1],
      ["diagonal", 1, 1],
      ["other diagonal", -1, 1],
    ])(
      "gives two tiles side by side on a %s the same variant only about 1 time in 16",
      (_, dx, dy) => {
        expect(shareOfEqualPairs(dx, dy)).toBeLessThan(0.1);
      },
    );
  });

  describe("inner-corner patches", () => {
    const woodPatches: Record<string, number[]> = {
      ne: drawn([16, 44, 4, 4], 80 + 12, 80),
      nw: drawn([60, 44, 4, 4], 80, 80),
      se: drawn([16, 0, 4, 4], 80 + 12, 80 + 12),
      sw: drawn([60, 0, 4, 4], 80, 80 + 12),
    };

    it.each<[string, TSide[], string[]]>([
      ["the NE patch", ["n", "e"], ["ne"]],
      ["the NW patch", ["n", "w"], ["nw"]],
      ["the SE patch", ["e", "s"], ["se"]],
      ["the SW patch", ["s", "w"], ["sw"]],
      ["all 4 patches", ["n", "e", "s", "w"], ["ne", "nw", "se", "sw"]],
      ["no patch", ["n", "e", "ne"], []],
      ["no patch", ["n", "w", "nw"], []],
      ["no patch", ["e", "s", "se"], []],
      ["no patch", ["s", "w", "sw"], []],
      ["no patch", ["n"], []],
      ["no patch", ["e"], []],
      ["no patch", ["n", "e", "s", "w", "ne", "nw", "se", "sw"], []],
    ])(
      "draws %s for a floor with the same floor on its %j sides",
      (_, sides, corners) => {
        expect(patchDraws(drawFloors(floorWithSides(5, 5, sides)))).toEqual(
          corners.map((corner) => woodPatches[corner]),
        );
      },
    );

    it("draws the 6 px patches of a Stone Walkway Floor", () => {
      const cells = floorWithSides(5, 5, ["n", "e"], "stone_walkway_floor");

      expect(patchDraws(drawFloors(cells))).toEqual([
        drawn([768 + 16, 42, 6, 6], 80 + 10, 80),
      ]);
    });

    it.each(["gravel_path", "rustic_plank_floor", "stepping_stone_path"])(
      "draws no patches for %s",
      (skin) => {
        const cells = floorWithSides(5, 5, ["n", "e"], skin);

        expect(patchDraws(drawFloors(cells))).toEqual([]);
      },
    );

    it("does not join a floor to a floor of another type", () => {
      const calls = drawFloors([
        floor(5, 5),
        floor(5, 6, "stone_floor"),
        floor(6, 5, "stone_floor"),
      ]);

      expect(tileDraws(calls)[0]).toEqual(
        drawn(tileRect(woodBlock, 0), 80, 80),
      );
      expect(patchDraws(calls)).toEqual([]);
    });
  });

  describe("the map edge", () => {
    it("counts a tile off the map as a neighbour at the side of a floor", () => {
      const { drawGuide } = getFloorDrawing();

      expect(
        tileDraws(drawFloors([floor(0, 5), floor(5, 5), floor(79, 64)])),
      ).toEqual([
        drawn(tileRect(woodBlock, drawGuide["8"]), 0, 80),
        drawn(tileRect(woodBlock, drawGuide["0"]), 80, 80),
        drawn(tileRect(woodBlock, drawGuide["6"]), 79 * 16, 64 * 16),
      ]);
    });

    it("counts a tile off the map as a neighbour at the corner of a floor", () => {
      const calls = drawFloors([
        floor(0, 4),
        floor(0, 5),
        floor(5, 0),
        floor(6, 0),
      ]);

      expect(patchDraws(calls)).toEqual([]);
    });
  });

  describe("shadows", () => {
    it("draws a black square under a Square floor, 1 px left and 1 px down", () => {
      expect(drawFloors([floor(2, 3)])).toEqual([
        { alpha: 0.33, args: [31, 49, 16, 16], fillStyle: "#000000" },
        {
          alpha: 1,
          args: drawn(tileRect(woodBlock, 0), 32, 48),
          image: images.flooring,
        },
      ]);
    });

    it("draws the black silhouette of the tile under a Contoured floor", () => {
      const floorImages = newImages();
      const tile = tileRect(plankBlock, 0);
      const calls = drawFloors([floor(2, 3, "rustic_plank_floor")], {
        floorImages,
      });

      expect(calls).toEqual([
        {
          alpha: 0.33,
          args: drawn(tile, 31, 49),
          image: calls[0].image,
        },
        { alpha: 1, args: drawn(tile, 32, 48), image: floorImages.flooring },
      ]);
      expect(calls[0].image).toBeInstanceOf(HTMLCanvasElement);
      expect(calls[0].image).not.toBe(floorImages.flooring);
    });

    it("makes the silhouette from the floor sheet one time", () => {
      const silhouetteContext = mockSilhouetteContext();
      const floorImages = newImages();
      const cells = [floor(2, 3, "rustic_plank_floor")];

      const [firstShadow] = drawFloors(cells, { floorImages });
      const [secondShadow] = drawFloors(cells, { floorImages });

      expect(silhouetteContext.drawImage).toHaveBeenCalledExactlyOnceWith(
        floorImages.flooring,
        0,
        0,
      );
      expect(silhouetteContext.globalCompositeOperation).toBe("source-in");
      expect(silhouetteContext.fillStyle).toBe("#000000");
      expect(silhouetteContext.fillRect).toHaveBeenCalledExactlyOnceWith(
        0,
        0,
        floorImages.flooring.width,
        floorImages.flooring.height,
      );
      expect(secondShadow.image).toBe(firstShadow.image);
    });

    it("draws no Contoured shadow when the browser has no 2D context", () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      const floorImages = newImages();

      expect(
        drawFloors([floor(2, 3, "rustic_plank_floor")], { floorImages }),
      ).toEqual([
        {
          alpha: 1,
          args: drawn(tileRect(plankBlock, 0), 32, 48),
          image: floorImages.flooring,
        },
      ]);
    });

    it.each(["gravel_path", "stepping_stone_path"])(
      "draws no shadow under %s",
      (skin) => {
        const calls = drawFloors([floor(2, 3, skin, 0)]);

        expect(calls).toHaveLength(1);
        expect(calls[0].image).toBe(images.flooring);
      },
    );
  });

  it("draws all shadows, then all tiles, then all corner patches", () => {
    const calls = drawFloors([
      ...floorWithSides(5, 5, ["n", "e"]),
      floor(10, 10, "rustic_plank_floor"),
    ]);

    expect(
      calls.map(({ args, image }) => {
        if (!isFloorSheet(image)) {
          return "shadow";
        }

        return args[2] === 16 ? "tile" : "patch";
      }),
    ).toEqual([
      ...Array.from({ length: 4 }, () => "shadow"),
      ...Array.from({ length: 4 }, () => "tile"),
      "patch",
    ]);
  });

  it("draws tiles, patches and silhouettes from the winter block of the winter sheet in winter", () => {
    const silhouetteContext = mockSilhouetteContext();
    const wood = getFloorSkin("wood_floor");
    const plank = getFloorSkin("rustic_plank_floor");
    const { winterBlock: woodWinterBlock } = wood;
    const { winterBlock: plankWinterBlock } = plank;
    const { flooring, flooringWinter } = newImages();

    wood.winterBlock = [128, 64, 64, 64];
    plank.winterBlock = [256, 64, 64, 64];

    try {
      const calls = drawFloors(
        [
          ...floorWithSides(5, 5, ["n", "e"]),
          floor(10, 10, "rustic_plank_floor"),
        ],
        { date: winter, floorImages: { flooring, flooringWinter } },
      );

      expect(
        calls
          .filter(({ image }) => image === flooring || image === flooringWinter)
          .map(({ args, image }) => [image, args[0], args[1]]),
      ).toEqual([
        [flooringWinter, 128, 64 + 16],
        [flooringWinter, 128 + 16, 64 + 32],
        [flooringWinter, 128 + 48, 64 + 48],
        [flooringWinter, 256, 64],
        [flooringWinter, 128 + 16, 64 + 44],
      ]);
      expect(silhouetteContext.drawImage).toHaveBeenCalledExactlyOnceWith(
        flooringWinter,
        0,
        0,
      );
    } finally {
      wood.winterBlock = woodWinterBlock;
      plank.winterBlock = plankWinterBlock;
    }
  });
});
