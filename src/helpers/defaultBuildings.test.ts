import { testFarmMap } from "../__mocks__/testFarmMap";
import { buildings } from "../data/game/buildings.json";
import {
  defaultFarmLooks,
  drawDefaultBuildingShadows,
  getBuildingSprite,
  getDefaultBuildingDraws,
  getDefaultBuildings,
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
  it("are the start looks of the farmhouse and the greenhouse in buildings.json", () => {
    const [farmhouse, greenhouse] = getDefaultBuildings(testFarmMap);

    expect([farmhouse.lookKey, greenhouse.lookKey]).toEqual([
      buildings.farmhouse.startLook,
      buildings.greenhouse.startLook,
    ]);
    expect(defaultFarmLooks).toEqual({ greenhouse: "broken", house: 0 });
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

  it("gives the start house and the broken greenhouse when no looks are given", () => {
    expect(
      getDefaultBuildings(testFarmMap).map(({ lookKey }) => lookKey),
    ).toEqual(["upgrade_0", "broken", undefined, undefined]);
  });

  it("gives the look key of the farmhouse and the greenhouse from the farm looks", () => {
    expect(
      getDefaultBuildings(testFarmMap, {
        greenhouse: "repaired",
        house: 2,
      }).map(({ lookKey }) => lookKey),
    ).toEqual(["upgrade_2", "repaired", undefined, undefined]);
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
      greenhouse: "repaired",
      house: 2,
    });

    expect(calls.slice(2)).toEqual([
      [0, 1504, 112, 160, 25 * 16, 10 * 16 - 64, 112, 160],
      [356, 1168, 178, 144, 59 * 16 - 16, 12 * 16 - 62, 178, 144],
    ]);
  });
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
