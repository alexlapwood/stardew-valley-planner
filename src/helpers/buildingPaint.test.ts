import { testFarmMap, testSpots } from "../__mocks__/testFarmMap";
import { checkPaint, type IPaintRequest } from "./buildingPaint";
import { getFootprintTiles } from "./plannedBuildings";

const spring = 0;

const cabin: IPlannedBuilding = {
  buildingId: "cabin",
  datePlaced: spring + 2,
  x: 40,
  y: 30,
};

const extraBowl: IPlannedBuilding = {
  buildingId: "pet_bowl",
  datePlaced: spring,
  x: 20,
  y: 20,
};

interface IRequestOptions {
  buildings?: IPlannedBuilding[];
  petBowlPaints?: IPlannedPaint[];
  skin?: string;
  tile?: IFarmTile;
}

function request(
  buildingId: string,
  date: number,
  {
    buildings = [cabin, extraBowl],
    petBowlPaints = [],
    skin,
    tile = { x: 41, y: 31 },
  }: IRequestOptions = {},
): IPaintRequest {
  return {
    buildingId,
    currentItems: {
      currentBuildings: buildings,
      currentCrops: {},
      currentEquipment: {},
      currentPetBowlPaints: petBowlPaints,
    },
    date,
    farmMap: testFarmMap,
    region: { x1: tile.x, x2: tile.x, y1: tile.y, y2: tile.y },
    ...(skin === undefined ? {} : { skin }),
  };
}

const fixedBowlTile = { x: testSpots.petBowl.x + 1, y: testSpots.petBowl.y };

const fixedBowlTiles = getFootprintTiles({
  buildingId: "pet_bowl",
  x: testSpots.petBowl.x,
  y: testSpots.petBowl.y,
});

describe("checkPaint on a planned building", () => {
  it("paints the building under the cursor from the date, with its footprint green", () => {
    const paint = checkPaint(
      request("cabin", spring + 9, { skin: "log_cabin" }),
    );

    expect(paint).toEqual({
      change: {
        buildings: [
          {
            ...cabin,
            paints: [{ datePainted: spring + 9, skin: "log_cabin" }],
          },
          extraBowl,
        ],
        type: "building",
      },
      check: {
        blockedTiles: [],
        fits: true,
        freeTiles: getFootprintTiles(cabin),
        removedFloors: [],
      },
    });
  });

  it("paints on a Tuesday and on a festival day, because a paint is free and at once", () => {
    const tuesday = spring + 1;
    const eggFestival = spring + 12;

    expect(
      checkPaint(request("cabin", eggFestival, { skin: "log_cabin" }))?.refusal,
    ).toBeUndefined();
    expect(
      checkPaint(
        request("cabin", tuesday, {
          buildings: [{ ...cabin, datePlaced: spring }],
          skin: "log_cabin",
        }),
      )?.refusal,
    ).toBeUndefined();
  });

  it("paints back to the look with no skin when the row has no skin", () => {
    const logCabin = { ...cabin, skin: "log_cabin" };
    const paint = checkPaint(
      request("cabin", spring + 9, { buildings: [logCabin] }),
    );

    expect(paint?.change).toEqual({
      buildings: [
        { ...logCabin, paints: [{ datePainted: spring + 9, skin: "cabin" }] },
      ],
      type: "building",
    });
  });

  it("takes off the colour paint of its day, because a skin change takes the paint off (SV › BuildingSkinMenu.SetSkin)", () => {
    const sameDay: IPlannedColorPaint = {
      colors: { Roof: { hue: 120, lightness: -5, saturation: 60 } },
      datePainted: spring + 9,
    };
    const later: IPlannedColorPaint = { ...sameDay, datePainted: spring + 12 };
    const paint = checkPaint(
      request("cabin", spring + 9, {
        buildings: [{ ...cabin, colorPaints: [sameDay, later] }],
        skin: "log_cabin",
      }),
    );

    expect(paint?.change).toEqual({
      buildings: [
        {
          ...cabin,
          colorPaints: [later],
          paints: [{ datePainted: spring + 9, skin: "log_cabin" }],
        },
      ],
      type: "building",
    });
  });

  it("refuses a building that has the look already, with its footprint red", () => {
    const paint = checkPaint(
      request("cabin", spring + 9, {
        buildings: [{ ...cabin, skin: "log_cabin" }],
        skin: "log_cabin",
      }),
    );

    expect(paint).toEqual({
      check: {
        blockedTiles: getFootprintTiles(cabin),
        fits: false,
        freeTiles: [],
        removedFloors: [],
      },
      refusal: { buildingId: "cabin", type: "painted" },
    });
  });

  it("paints an extra pet bowl with the Pet Bowl row", () => {
    const paint = checkPaint(
      request("pet_bowl", spring + 3, {
        skin: "hay_pet_bowl",
        tile: { x: 21, y: 21 },
      }),
    );

    expect(paint?.change).toEqual({
      buildings: [
        cabin,
        {
          ...extraBowl,
          paints: [{ datePainted: spring + 3, skin: "hay_pet_bowl" }],
        },
      ],
      type: "building",
    });
  });

  it.each([
    ["a building of another type", "pet_bowl", { x: 41, y: 31 }, spring + 9],
    ["empty ground", "cabin", { x: 10, y: 10 }, spring + 9],
    [
      "a building that is not on the farm on the date",
      "cabin",
      { x: 41, y: 31 },
      spring + 1,
    ],
    ["a building that has no skins", "barn", { x: 61, y: 31 }, spring + 9],
  ])(
    "is no paint on %s, so the click is an order",
    (_, buildingId, tile, date) => {
      expect(
        checkPaint(
          request(buildingId, date, {
            buildings: [cabin, { ...cabin, buildingId: "barn", x: 60 }],
            skin: buildingId === "barn" ? undefined : "hay_pet_bowl",
            tile,
          }),
        ),
      ).toBeUndefined();
    },
  );

  it("is no paint on a building that is demolished before the date", () => {
    expect(
      checkPaint(
        request("cabin", spring + 9, {
          buildings: [{ ...cabin, dateDestroyed: spring + 9 }],
          skin: "log_cabin",
        }),
      ),
    ).toBeUndefined();
  });
});

describe("checkPaint on the fixed pet bowl", () => {
  it("paints the pet bowl of the farm from the date, with its footprint green", () => {
    const paint = checkPaint(
      request("pet_bowl", spring + 4, {
        skin: "stone_pet_bowl",
        tile: fixedBowlTile,
      }),
    );

    expect(paint).toEqual({
      change: {
        petBowlPaints: [{ datePainted: spring + 4, skin: "stone_pet_bowl" }],
        type: "petBowl",
      },
      check: {
        blockedTiles: [],
        fits: true,
        freeTiles: fixedBowlTiles,
        removedFloors: [],
      },
    });
  });

  it("paints it on the first day, and keeps a later paint", () => {
    const later = { datePainted: spring + 20, skin: "hay_pet_bowl" };
    const paint = checkPaint(
      request("pet_bowl", spring, {
        petBowlPaints: [later],
        skin: "stone_pet_bowl",
        tile: fixedBowlTile,
      }),
    );

    expect(paint?.change).toEqual({
      petBowlPaints: [{ datePainted: spring, skin: "stone_pet_bowl" }, later],
      type: "petBowl",
    });
  });

  it("refuses the look that it has on the date, with its footprint red", () => {
    const paint = checkPaint(
      request("pet_bowl", spring + 9, {
        petBowlPaints: [{ datePainted: spring + 4, skin: "stone_pet_bowl" }],
        skin: "stone_pet_bowl",
        tile: fixedBowlTile,
      }),
    );

    expect(paint).toEqual({
      check: {
        blockedTiles: fixedBowlTiles,
        fits: false,
        freeTiles: [],
        removedFloors: [],
      },
      refusal: { buildingId: "pet_bowl", type: "painted" },
    });
  });

  it("refuses the look with no skin when it has no paint", () => {
    expect(
      checkPaint(request("pet_bowl", spring + 9, { tile: fixedBowlTile }))
        ?.refusal,
    ).toEqual({ buildingId: "pet_bowl", type: "painted" });
  });

  it("is no paint with the Cabin row", () => {
    expect(
      checkPaint(request("cabin", spring + 9, { tile: fixedBowlTile })),
    ).toBeUndefined();
  });
});
