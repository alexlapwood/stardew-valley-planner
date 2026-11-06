import { testFarmMap } from "../__mocks__/testFarmMap";
import { trees } from "../data/game/trees.json";
import {
  getFruitPositions,
  getPlantedTreeLook,
  getTreeFruit,
  getTreeGrowthOn,
  getTreeSprite,
  isTreeHarvestDay,
  isTreeHereToday,
} from "./tree";
import { getTreeSchedule } from "./treeGrowth";

const spring = 0;
const summer = 28;
const fall = 56;
const winter = 84;
const nextSpring = 112;

const emptyPlan = {
  currentCrops: {},
  currentEquipment: {},
  farmMap: testFarmMap,
};

function plantedTree(
  treeId: string,
  datePlanted: number,
  dateDestroyed?: number,
): IPlantedTree {
  return { dateDestroyed, datePlanted, treeId, type: "tree", x: 4, y: 6 };
}

function lookOn(tree: IPlantedTree, date: number) {
  return getPlantedTreeLook(tree, getTreeSchedule(emptyPlan, tree), date);
}

function spriteOn(tree: IPlantedTree, date: number) {
  return lookOn(tree, date)?.sprite;
}

const mature = { isMature: true, stage: 3 };
const young = { isMature: false, stage: 3 };

function appleHarvestDays(seasonStart: number) {
  return Array.from({ length: 28 }, (_, day) =>
    isTreeHarvestDay(trees.apple, seasonStart + day),
  );
}

describe("Tree helper", () => {
  describe("isTreeHereToday", () => {
    it("shows a tree from the day it is planted, with no last day", () => {
      const apple = plantedTree("apple", 10);

      expect(isTreeHereToday(apple, 9)).toBe(false);
      expect(isTreeHereToday(apple, 10)).toBe(true);
      expect(isTreeHereToday(apple, 10 + 112 * 5)).toBe(true);
    });

    it("shows a tree until the day before it is destroyed", () => {
      const apple = plantedTree("apple", 10, 20);

      expect(isTreeHereToday(apple, 19)).toBe(true);
      expect(isTreeHereToday(apple, 20)).toBe(false);
    });
  });

  describe("getTreeGrowthOn", () => {
    const schedule = { matureDate: 30, stageDates: [2, 9, 16, 23] };

    it.each([
      [2, 0, false],
      [8, 0, false],
      [9, 1, false],
      [22, 2, false],
      [23, 3, false],
      [29, 3, false],
      [30, 3, true],
    ])("on day %i, is at stage %i, mature: %s", (date, stage, isMature) => {
      expect(getTreeGrowthOn(schedule, date)).toEqual({ isMature, stage });
    });

    it("stays at the last stage it gets to when a stage or maturity never comes", () => {
      const stopped = { stageDates: [2, 9, undefined, undefined] };

      expect(getTreeGrowthOn(stopped, 500)).toEqual({
        isMature: false,
        stage: 1,
      });
    });
  });

  describe("getPlantedTreeSprite", () => {
    it("shows the growing sprite of each stage with the growing offset", () => {
      expect(
        [0, 7, 14, 21, 27].map((date) =>
          spriteOn(plantedTree("apple", spring), date),
        ),
      ).toEqual([
        { offset: { x: -16, y: -68 }, rect: [32, 0, 48, 80] },
        { offset: { x: -16, y: -68 }, rect: [80, 0, 48, 80] },
        { offset: { x: -16, y: -68 }, rect: [128, 0, 48, 80] },
        { offset: { x: -16, y: -68 }, rect: [176, 0, 48, 80] },
        { offset: { x: -16, y: -68 }, rect: [176, 0, 48, 80] },
      ]);
    });

    it("shows the mature sprite of the season with the mature offset from the day the tree is mature", () => {
      const apple = plantedTree("apple", spring);

      expect(spriteOn(apple, summer)).toEqual({
        offset: { x: -16, y: -64 },
        rect: [272, 0, 48, 80],
      });
      expect(spriteOn(apple, fall + 3)?.rect).toEqual(
        trees.apple.sprites.seasons.fall?.mature,
      );
    });

    it("counts the growth from the planting day, not from the start of the season", () => {
      const cherry = plantedTree("cherry", spring + 10);

      expect(spriteOn(cherry, summer + 9)?.rect).toEqual(
        trees.cherry.sprites.seasons.summer?.growing[3],
      );
      expect(spriteOn(cherry, summer + 10)?.rect).toEqual(
        trees.cherry.sprites.seasons.summer?.mature,
      );
    });

    it("shows the tea bush with its own sprites and offsets for the season", () => {
      const teaBush = plantedTree("tea_bush", summer);

      expect(
        [summer, summer + 10, summer + 20, fall].map((date) =>
          spriteOn(teaBush, date),
        ),
      ).toEqual([
        { offset: { x: 0, y: -16 }, rect: [96, 640, 16, 32] },
        { offset: { x: 0, y: -16 }, rect: [112, 640, 16, 32] },
        { offset: { x: 0, y: -16 }, rect: [128, 640, 16, 32] },
        { offset: { x: 0, y: -16 }, rect: [192, 640, 16, 32] },
      ]);
    });
  });

  describe("getTreeSprite", () => {
    it("uses the first season that has sprites when the season has none", () => {
      const { fall: fallSprites } = trees.apple.sprites.seasons;
      const fallOnlyApple = {
        ...trees.apple,
        sprites: { ...trees.apple.sprites, seasons: { fall: fallSprites } },
      };

      expect(
        getTreeSprite(fallOnlyApple, { isMature: false, stage: 0 }, spring)
          ?.rect,
      ).toEqual(fallSprites?.growing[0]);
      expect(getTreeSprite(fallOnlyApple, mature, spring)?.rect).toEqual(
        fallSprites?.mature,
      );
    });

    it("shows nothing for a tree with no sprites", () => {
      const noSprites = {
        ...trees.apple,
        sprites: { ...trees.apple.sprites, seasons: {} },
      };

      expect(
        getTreeSprite(noSprites, { isMature: false, stage: 0 }, spring),
      ).toBeUndefined();
    });

    it.each([
      ["spring", spring + 5, [224, 0, 48, 80]],
      ["summer", summer + 5, [272, 0, 48, 80]],
      ["fall", fall + 5, [320, 0, 48, 80]],
      ["winter", winter + 5, [368, 0, 48, 80]],
    ])(
      "shows the %s sprite of a mature fruit tree, and its bare sprite in winter",
      (season, date, rect) => {
        expect(trees.apple.sprites.seasons[season]?.mature).toEqual(rect);
        expect(getTreeSprite(trees.apple, mature, date)).toEqual({
          offset: trees.apple.sprites.matureOffset,
          rect,
        });
      },
    );

    it("shows the growing sprite of a young fruit tree in winter", () => {
      expect(getTreeSprite(trees.apple, young, winter + 5)).toEqual({
        offset: trees.apple.sprites.growingOffset,
        rect: trees.apple.sprites.seasons.winter?.growing[3],
      });
    });
  });

  describe("the tea bush ready sprite", () => {
    const teaBush = trees.tea_bush;
    const sprites = teaBush.sprites.seasons;

    it.each([
      ["spring", spring],
      ["summer", summer],
      ["fall", fall],
    ])(
      "shows the %s ready sprite on days 22 to 28, and the mature sprite before",
      (season, seasonStart) => {
        const rects = [20, 21, 27].map(
          (day) => getTreeSprite(teaBush, mature, seasonStart + day)?.rect,
        );

        expect(rects).toEqual([
          sprites[season]?.mature,
          sprites[season]?.ready,
          sprites[season]?.ready,
        ]);
      },
    );

    it("shows the mature sprite again on day 1 of the next season", () => {
      expect(getTreeSprite(teaBush, mature, summer)?.rect).toEqual(
        sprites.summer?.mature,
      );
    });

    it("shows the winter sprite on days 22 to 28 of winter, with no ready sprite", () => {
      expect(sprites.winter?.ready).toBeUndefined();
      expect(
        [winter + 21, winter + 27].map(
          (date) => getTreeSprite(teaBush, mature, date)?.rect,
        ),
      ).toEqual([sprites.winter?.mature, sprites.winter?.mature]);
    });

    it("shows the growing sprite of a young tea bush on days 22 to 28", () => {
      const youngBush = { isMature: false, stage: 1 };

      expect(getTreeSprite(teaBush, youngBush, spring + 25)?.rect).toEqual(
        sprites.spring?.growing[1],
      );
    });

    it("is ready from the first day 22 after it is mature", () => {
      const bush = plantedTree("tea_bush", spring + 5);

      expect(
        [spring + 24, spring + 25, summer + 21].map(
          (date) => spriteOn(bush, date)?.rect,
        ),
      ).toEqual([
        sprites.spring?.growing[1],
        sprites.spring?.ready,
        sprites.summer?.ready,
      ]);
    });
  });

  describe("isTreeHarvestDay", () => {
    it("is each day of a fruit tree season, and no day of the other seasons", () => {
      expect(appleHarvestDays(fall).every(Boolean)).toBe(true);
      expect(
        [spring, summer, winter].some((start) =>
          appleHarvestDays(start).some(Boolean),
        ),
      ).toBe(false);
    });
  });

  describe("getFruitPositions", () => {
    it("puts the 3 fruit at the spots of the export on tile x 0, the third one flipped", () => {
      expect(getFruitPositions(trees.apple, 0)).toEqual([
        { flipped: false, x: -16, y: -48 },
        { flipped: false, x: 8, y: -64 },
        { flipped: true, x: 0, y: -40 },
      ]);
    });

    it("shifts each spot by its tile x formula", () => {
      // x 5: 5 × 200 mod 64 = 40, 5 × 1 mod 64 = 5, 5 × 232 mod 64 = 8
      const [first, second, third] = getFruitPositions(trees.apple, 5);

      expect(first.x).toBeCloseTo(-16 + 40 / 8);
      expect(first.y).toBeCloseTo(-48 - 5 / 12);
      expect(second.x).toBe(8);
      expect(second.y).toBeCloseTo(-64 + 8 / 12);
      expect(third.x).toBeCloseTo(40 / 12);
      expect(third.y).toBeCloseTo(-40 + 40 / 12);
      expect([first, second, third].map(({ flipped }) => flipped)).toEqual([
        false,
        false,
        true,
      ]);
    });

    it("uses the shift modulo, so tile x 64 has the same spots as tile x 0", () => {
      expect(getFruitPositions(trees.apple, 64)).toEqual(
        getFruitPositions(trees.apple, 0),
      );
    });

    it("has no fruit spots for the tea bush", () => {
      expect(getFruitPositions(trees.tea_bush, 3)).toEqual([]);
    });
  });

  describe("getTreeFruit", () => {
    it.each([
      ["spring", spring + 3, 3],
      ["summer", summer + 3, 0],
      ["winter", winter + 3, 0],
    ])(
      "in %s (date %i), shows %i fruit on a mature cherry tree",
      (_, date, count) => {
        expect(getTreeFruit(trees.cherry, mature, date, 4)).toHaveLength(count);
      },
    );

    it("shows no fruit on a young tree in its season", () => {
      expect(getTreeFruit(trees.cherry, young, spring + 3, 4)).toEqual([]);
    });

    it("shows 3 fruit from the first mature day of the season, on each day of it", () => {
      const cherry = plantedTree("cherry", spring);
      const fruitCounts = [nextSpring - 1, nextSpring, nextSpring + 27].map(
        (date) => lookOn(cherry, date)?.fruit.length,
      );

      expect(lookOn(cherry, spring + 27)?.fruit).toEqual([]);
      expect(lookOn(cherry, summer)?.fruit).toEqual([]);
      expect(fruitCounts).toEqual([0, 3, 3]);
    });

    it("shows the fruit at the spots of the tree tile, with the fruit sprite", () => {
      const look = lookOn(plantedTree("apple", spring), fall);

      expect(look?.fruit).toEqual(getFruitPositions(trees.apple, 4));
      expect(look?.fruitRect).toEqual(trees.apple.sprites.fruit);
    });
  });
});
