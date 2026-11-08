import { testFarmMap } from "../__mocks__/testFarmMap";
import { buildings } from "../data/game/buildings.json";
import {
  defaultFarmLooks,
  drawDefaultBuildingShadows,
  findDefaultBuildingAt,
  getBuildingDraws,
  getBuildingSprite,
  getBuildingsNextChange,
  getDefaultBuildingDraws,
  getDefaultBuildings,
  type IBuildingMotion,
  type IPlacedBuilding,
  type TShadowLayer,
} from "./defaultBuildings";
import { renderSortedDraws } from "./renderSorted";

const buildingsImage = document.createElement("canvas");

function mockContext() {
  const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();
  const context = { drawImage } as unknown as CanvasRenderingContext2D;
  const calls = () => drawImage.mock.calls.map(([, ...args]) => args);

  return { calls, context };
}

function drawBuildings(season: string, looks = defaultFarmLooks) {
  const { calls, context } = mockContext();
  const draws = getDefaultBuildingDraws(
    context,
    buildingsImage,
    testFarmMap,
    season,
    looks,
  );

  renderSortedDraws(draws);

  return {
    calls: calls(),
    rows: draws.map(({ layer, row }) => [layer, row]),
  };
}

function drawShadows(layer: TShadowLayer) {
  const { calls, context } = mockContext();

  drawDefaultBuildingShadows(context, buildingsImage, testFarmMap, layer);

  return calls();
}

describe("defaultFarmLooks", () => {
  it("are the start looks of the farmhouse and the greenhouse in buildings.json, and the pet bowl with no skin", () => {
    const [farmhouse, greenhouse] = getDefaultBuildings(testFarmMap);

    expect([farmhouse.lookKey, greenhouse.lookKey]).toEqual([
      buildings.farmhouse.startLook,
      buildings.greenhouse.startLook,
    ]);
    expect(defaultFarmLooks).toEqual({
      greenhouse: "broken",
      house: "upgrade_0",
      petBowl: "pet_bowl",
    });
  });
});

describe("getDefaultBuildings", () => {
  it("puts each default building at its spot", () => {
    expect(
      getDefaultBuildings(testFarmMap).map(({ buildingId, spot }) => [
        buildingId,
        spot,
      ]),
    ).toEqual([
      ["farmhouse", testFarmMap.spots.farmhouse],
      ["greenhouse", testFarmMap.spots.greenhouse],
      ["pet_bowl", testFarmMap.spots.petBowl],
      ["shipping_bin", testFarmMap.spots.shippingBin],
    ]);
  });

  it("gives the start house, the broken greenhouse and the pet bowl with no skin when no looks are given", () => {
    expect(
      getDefaultBuildings(testFarmMap).map(({ lookKey }) => lookKey),
    ).toEqual(["upgrade_0", "broken", "pet_bowl", undefined]);
  });

  it("gives the look key of the farmhouse, the greenhouse and the pet bowl from the farm looks", () => {
    expect(
      getDefaultBuildings(testFarmMap, {
        greenhouse: "repaired",
        house: "upgrade_2",
        petBowl: "stone_pet_bowl",
      }).map(({ lookKey }) => lookKey),
    ).toEqual(["upgrade_2", "repaired", "stone_pet_bowl", undefined]);
  });

  it("gives the farmhouse the colours of the house paint", () => {
    const houseColors = { Trim: { hue: 40, lightness: -16, saturation: 75 } };

    expect(
      getDefaultBuildings(testFarmMap, {
        ...defaultFarmLooks,
        house: "upgrade_2",
        houseColors,
      }).map(({ colors }) => colors),
    ).toEqual([houseColors, undefined, undefined, undefined]);
  });
});

describe("findDefaultBuildingAt", () => {
  it("finds the fixed building whose spot has the tile", () => {
    const { farmhouse, petBowl } = testFarmMap.spots;

    expect(
      findDefaultBuildingAt(testFarmMap, farmhouse.x + 8, farmhouse.y + 4),
    ).toEqual({ buildingId: "farmhouse", spot: farmhouse });
    expect(findDefaultBuildingAt(testFarmMap, petBowl.x, petBowl.y)).toEqual({
      buildingId: "pet_bowl",
      spot: petBowl,
    });
    expect(
      findDefaultBuildingAt(testFarmMap, farmhouse.x + 9, farmhouse.y),
    ).toBeUndefined();
  });
});

describe("getBuildingSprite", () => {
  const brokenSprite: IBuildingSprite = {
    offset: { x: 0, y: -48 },
    sprite: [112, 1504, 112, 144],
  };

  const greenhouse: IBuilding = {
    ...buildings.greenhouse,
    looks: { broken: { name: "Broken Greenhouse", sprite: brokenSprite } },
    startLook: "broken",
  };

  it("uses the sprite of the look", () => {
    expect(getBuildingSprite(greenhouse, "spring", "broken")).toEqual({
      offset: brokenSprite.offset,
      rect: brokenSprite.sprite,
    });
  });

  it.each([
    ["the building has no look with the key", greenhouse, "repaired"],
    ["there is no look key", greenhouse, undefined],
    [
      "the building has no looks",
      { ...buildings.greenhouse, looks: undefined },
      "broken",
    ],
  ])("uses the sprite of the building when %s", (_, building, lookKey) => {
    expect(getBuildingSprite(building, "spring", lookKey)).toEqual({
      offset: buildings.greenhouse.sprite.offset,
      rect: buildings.greenhouse.sprite.sprite,
    });
  });

  it("uses the season sprite of the look", () => {
    const winterRect: TSpriteRect = [0, 0, 32, 32];
    const bowl: IBuilding = {
      ...buildings.pet_bowl,
      looks: {
        full: {
          name: "Full Pet Bowl",
          sprite: { ...brokenSprite, seasons: { winter: winterRect } },
        },
      },
    };

    expect(getBuildingSprite(bowl, "winter", "full").rect).toEqual(winterRect);
    expect(getBuildingSprite(bowl, "spring", "full").rect).toEqual(
      brokenSprite.sprite,
    );
  });

  it("uses the sprite of the skin, in the season", () => {
    const hay = buildings.pet_bowl.skins?.hay_pet_bowl?.sprite;

    expect(
      getBuildingSprite(buildings.pet_bowl, "fall", "hay_pet_bowl"),
    ).toEqual({ offset: hay?.offset, rect: hay?.seasons?.fall });
  });

  it("uses the sprite of the building for the pet bowl with no skin", () => {
    expect(getBuildingSprite(buildings.pet_bowl, "fall", "pet_bowl")).toEqual({
      offset: buildings.pet_bowl.sprite.offset,
      rect: buildings.pet_bowl.sprite.seasons?.fall,
    });
  });

  it("gives the animation of the sprite with the still sprite", () => {
    expect(getBuildingSprite(buildings.mill, "spring")).toEqual({
      animation: buildings.mill.sprite.animation,
      offset: { x: 0, y: -96 },
      rect: [0, 1856, 64, 128],
    });
  });

  const animation: ISpriteAnimation = {
    frameDuration: 100,
    frames: [
      [0, 0, 16, 16],
      [16, 0, 16, 16],
    ],
  };

  it("gives the animation of the sprite of a look or a skin", () => {
    const bowl: IBuilding = {
      ...buildings.pet_bowl,
      looks: {
        full: { name: "Full", sprite: { ...brokenSprite, animation } },
      },
    };

    expect(getBuildingSprite(bowl, "spring", "full").animation).toBe(animation);
  });

  it("gives no animation with a season sprite, whose frames are not in the animation", () => {
    const winterRect: TSpriteRect = [0, 0, 32, 32];
    const bowl: IBuilding = {
      ...buildings.pet_bowl,
      looks: {
        full: {
          name: "Full",
          sprite: {
            ...brokenSprite,
            animation,
            seasons: { winter: winterRect },
          },
        },
      },
    };

    expect(getBuildingSprite(bowl, "winter", "full")).toEqual({
      offset: brokenSprite.offset,
      rect: winterRect,
    });
    expect(getBuildingSprite(bowl, "spring", "full").animation).toBe(animation);
  });
});

const mill: IPlacedBuilding = {
  building: buildings.mill,
  buildingId: "mill",
  spot: { height: 2, width: 4, x: 10, y: 20 },
};

const fishPond: IPlacedBuilding = {
  building: buildings.fish_pond,
  buildingId: "fish_pond",
  spot: { height: 5, width: 5, x: 10, y: 20 },
};

function getMillFrames() {
  const frames = buildings.mill.sprite.animation?.frames;

  if (frames === undefined) {
    throw new Error("The mill in buildings.json has no animation");
  }

  return frames;
}

function drawMill(motion?: IBuildingMotion) {
  const { calls, context } = mockContext();
  const draws = getBuildingDraws(
    context,
    buildingsImage,
    [mill],
    "spring",
    motion,
  );

  renderSortedDraws(draws);

  return { calls: calls(), draws };
}

function drawStable(placedBuilding: IPlacedBuilding) {
  const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();
  const context = { drawImage } as unknown as CanvasRenderingContext2D;

  renderSortedDraws(
    getBuildingDraws(context, buildingsImage, [placedBuilding], "spring"),
  );

  return drawImage.mock.calls[0];
}

describe("getBuildingDraws", () => {
  const millFrames = getMillFrames();

  it.each([
    [0, 0],
    [90, 1],
    [935, 0],
    [1000, 1],
  ])(
    "draws the mill at %i ms with frame %i of its animation",
    (time, frame) => {
      expect(drawMill({ time }).calls).toEqual([
        [...millFrames[frame], 160, 320 - 96, 64, 128],
      ]);
    },
  );

  it("draws the still mill with no time", () => {
    expect(drawMill().calls).toEqual([
      [0, 1856, 64, 128, 160, 320 - 96, 64, 128],
    ]);
  });

  it("sorts and fades the mill by its still sprite at each frame", () => {
    const { draws } = drawMill({ time: 450 });

    expect(draws.map(({ row, tall }) => [row, tall])).toEqual([
      [
        21,
        {
          base: mill.spot,
          drawn: { height: 128, width: 64, x: 160, y: 320 - 96 },
        },
      ],
    ]);
  });

  it("draws a fish pond from its pieces, sorted in its top row, and fades it by its still sprite", () => {
    const { calls, context } = mockContext();
    const draws = getBuildingDraws(
      context,
      buildingsImage,
      [fishPond],
      "spring",
      { time: 0 },
    );

    renderSortedDraws(draws);

    expect(draws.map(({ layer, row, tall }) => [layer, row, tall])).toEqual([
      [
        "building",
        20,
        {
          base: fishPond.spot,
          drawn: { height: 112, width: 80, x: 160, y: 320 - 32 },
        },
      ],
    ]);
    expect(calls().map((call) => call.slice(0, 4))).toEqual([
      [160, 3223, 80, 80],
      [0, 3223, 80, 80],
      [240, 3223, 80, 48],
    ]);
  });

  it("gives a fish pond its own faded draw, and no other building", () => {
    const { context } = mockContext();
    const [pondDraw, millDraw] = getBuildingDraws(
      context,
      buildingsImage,
      [fishPond, mill],
      "spring",
    );

    expect(pondDraw.fadedDraw).toBeInstanceOf(Function);
    expect(millDraw.fadedDraw).toBeUndefined();
  });

  describe("a painted building", () => {
    const stable: IPlacedBuilding = {
      building: buildings.stable,
      buildingId: "stable",
      colors: { Roof: { hue: 120, lightness: -12, saturation: 60 } },
      spot: { height: 2, width: 4, x: 10, y: 20 },
    };

    beforeEach(() => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
        (() => ({
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          getImageData: () => ({ data: new Uint8ClampedArray(4) }),
          putImageData: vi.fn(),
        })) as unknown as HTMLCanvasElement["getContext"],
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("draws its painted sprite where the sprite goes", () => {
      const [image, ...args] = drawStable(stable);

      expect(image).toBeInstanceOf(HTMLCanvasElement);
      expect(image).not.toBe(buildingsImage);
      expect(args).toEqual([0, 0, 64, 96, 160, 320 - 64, 64, 96]);
    });

    it("draws the sprite of the atlas when the look has no mask", () => {
      const [image, ...args] = drawStable({
        ...stable,
        building: buildings.cabin,
        buildingId: "cabin",
      });

      expect(image).toBe(buildingsImage);
      expect(args.slice(0, 4)).toEqual(buildings.cabin.sprite.sprite);
    });
  });
});

describe("getBuildingsNextChange", () => {
  it("never changes with no animated buildings", () => {
    const coop: IPlacedBuilding = {
      building: buildings.coop,
      buildingId: "coop",
      spot: { height: 3, width: 6, x: 1, y: 1 },
    };

    expect(getBuildingsNextChange([coop], "spring")(0)).toBe(Infinity);
    expect(getBuildingsNextChange([], "spring")(0)).toBe(Infinity);
  });

  it.each([
    [0, 90],
    [90, 180],
    [935, 990],
  ])("changes for a mill after %i ms at %i ms", (time, next) => {
    expect(getBuildingsNextChange([mill, mill], "spring")(time)).toBe(next);
  });

  it.each([
    ["the next water frame", 0, 200],
    ["the next whole-pixel slide", 600, 667],
    ["the next float frame", 1240, 1250],
  ])("changes for a fish pond at %s: after %i ms at %i ms", (_, time, next) => {
    expect(getBuildingsNextChange([fishPond], "spring")(time)).toBe(next);
  });

  it("changes at the earliest change of all the buildings", () => {
    expect(getBuildingsNextChange([fishPond, mill], "spring")(100)).toBe(180);
  });
});

describe("getDefaultBuildingDraws", () => {
  it("draws each sprite with its offset from the top-left of the spot, sorted by its bottom row", () => {
    const { calls, rows } = drawBuildings("spring");

    expect(rows).toEqual([
      ["building", 16],
      ["building", 15],
      ["building", 8],
      ["building", 14],
    ]);
    expect(calls).toEqual([
      [0, 1984, 32, 32, 53 * 16, 7 * 16, 32, 32],
      [0, 2144, 32, 39, 71 * 16, 14 * 16 - 23, 32, 39],
      [112, 1504, 112, 160, 25 * 16, 10 * 16 - 64, 112, 160],
      [0, 1168, 178, 144, 59 * 16 - 16, 12 * 16 - 62, 178, 144],
    ]);
  });

  it("draws the pet bowl of the season", () => {
    const { calls } = drawBuildings("winter");

    expect(calls[0]).toEqual([96, 1984, 32, 32, 53 * 16, 7 * 16, 32, 32]);
  });

  it("draws the farmhouse and the greenhouse with the sprites of the farm looks", () => {
    const { calls } = drawBuildings("spring", {
      ...defaultFarmLooks,
      greenhouse: "repaired",
      house: "upgrade_2",
    });

    expect(calls.slice(2)).toEqual([
      [0, 1504, 112, 160, 25 * 16, 10 * 16 - 64, 112, 160],
      [356, 1168, 178, 144, 59 * 16 - 16, 12 * 16 - 62, 178, 144],
    ]);
  });

  it.each([
    ["hay_pet_bowl", "spring", 256],
    ["hay_pet_bowl", "winter", 352],
    ["stone_pet_bowl", "summer", 160],
    ["pet_bowl", "fall", 64],
  ] as const)(
    "draws the %s skin of the pet bowl in %s, at the same spot",
    (petBowl, season, x) => {
      const { calls } = drawBuildings(season, {
        ...defaultFarmLooks,
        petBowl,
      });

      expect(calls[0]).toEqual([x, 1984, 32, 32, 53 * 16, 7 * 16, 32, 32]);
    },
  );
});

describe("drawDefaultBuildingShadows", () => {
  it("draws the shadow pieces over the floors from the top-left of each spot, in the order of the game", () => {
    const farmhouseRow = 12 * 16 + 80;
    const shippingBinRow = 14 * 16 + 16;
    const middle: TSpriteRect = [128, 0, 16, 16];

    expect(drawShadows("overFloors")).toEqual([
      [112, 0, 16, 16, 59 * 16, farmhouseRow, 16, 16],
      ...Array.from({ length: 7 }, (_, index) => [
        ...middle,
        59 * 16 + 16 * (index + 1),
        farmhouseRow,
        16,
        16,
      ]),
      [144, 0, 16, 16, 59 * 16 + 128, farmhouseRow, 16, 16],
      [112, 0, 16, 16, 71 * 16, shippingBinRow, 16, 16],
      [144, 0, 16, 16, 71 * 16 + 16, shippingBinRow, 16, 16],
    ]);
  });

  it("draws only the greenhouse shadow under the floors", () => {
    expect(drawShadows("underFloors")).toEqual([
      [224, 1504, 128, 144, 25 * 16 - 16, 10 * 16, 128, 144],
    ]);
  });
});
