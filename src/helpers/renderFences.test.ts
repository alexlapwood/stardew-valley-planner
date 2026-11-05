import { renderFenceToContext } from "./renderFences";

const image = document.createElement("canvas");

function fence(x: number, y: number, skin: string): IInstalledEquipment {
  return {
    dateInstalled: 0,
    equipmentId: "fence",
    skin,
    type: "equipment",
    x,
    y,
  };
}

function drawFence(fenceMap: string[][], installedFence: IInstalledEquipment) {
  const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();
  const context = { drawImage } as unknown as CanvasRenderingContext2D;

  renderFenceToContext(context, image, installedFence, fenceMap);

  return drawImage.mock.calls.map(([, ...args]) => args);
}

function mapOf(tiles: [number, number, string][]) {
  const fenceMap: string[][] = [];

  tiles.forEach(([x, y, skin]) => {
    fenceMap[x] = fenceMap[x] ?? [];
    fenceMap[x][y] = skin;
  });

  return fenceMap;
}

const neighbourTiles = {
  e: [3, 2],
  n: [2, 1],
  s: [2, 3],
  w: [1, 2],
} as const;

function cellAt(cell: number, blockX = 0): TSpriteRect {
  return [blockX + (cell % 3) * 16, Math.floor(cell / 3) * 32, 16, 32];
}

function drawn(rect: TSpriteRect, dx: number, dy: number) {
  return [...rect, dx, dy, rect[2], rect[3]];
}

describe("renderFenceToContext", () => {
  it.each([
    ["W", ["w"], 9],
    ["E", ["e"], 10],
    ["N + S + W", ["n", "s", "w"], 2],
    ["N + S + E", ["n", "s", "e"], 0],
    ["S + E + W", ["s", "e", "w"], 4],
    ["N + E + S + W", ["n", "e", "s", "w"], 4],
    ["no", [], 5],
  ] as const)(
    "draws the game cell for a fence with %s neighbours",
    (_, sides, cell) => {
      const fenceMap = mapOf([
        [2, 2, "stone_fence"],
        ...sides.map((side): [number, number, string] => [
          ...neighbourTiles[side],
          "stone_fence",
        ]),
      ]);

      expect(drawFence(fenceMap, fence(2, 2, "stone_fence"))).toEqual([
        drawn(cellAt(cell, 48), 32, 16),
      ]);
    },
  );

  it("does not join a fence to a fence of another type or to a gate", () => {
    const fenceMap = mapOf([
      [1, 2, "wood_fence"],
      [2, 2, "stone_fence"],
      [3, 2, "gate"],
    ]);

    expect(drawFence(fenceMap, fence(2, 2, "stone_fence"))).toEqual([
      drawn(cellAt(5, 48), 32, 16),
    ]);
  });

  it("draws a closed gate between two fences", () => {
    const fenceMap = mapOf([
      [1, 2, "iron_fence"],
      [2, 2, "gate"],
      [3, 2, "iron_fence"],
    ]);

    expect(drawFence(fenceMap, fence(2, 2, "gate"))).toEqual([
      drawn([0, 128, 24, 32], 28, 16),
    ]);
  });

  it("draws a gate with no fences beside it as a post", () => {
    const fenceMap = mapOf([[2, 2, "gate"]]);

    expect(drawFence(fenceMap, fence(2, 2, "gate"))).toEqual([
      drawn(cellAt(17), 32, 16),
    ]);
  });
});
