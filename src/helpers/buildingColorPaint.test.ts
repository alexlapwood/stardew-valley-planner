import { testFarmMap, testSpots } from "../__mocks__/testFarmMap";
import { checkColorPaint, type IColorPaintRequest } from "./buildingColorPaint";
import { getFootprintTiles } from "./plannedBuildings";

const spring = 0;

const green: IBrushColor = { hue: 120, lightness: 50, saturation: 60 };

const greenRoof: TBrushColors = { Roof: green };

const stable: IPlannedBuilding = {
  buildingId: "stable",
  datePlaced: spring + 2,
  x: 40,
  y: 30,
};

const barn: IPlannedBuilding = {
  buildingId: "barn",
  datePlaced: spring,
  upgrades: [
    { buildingId: "big_barn", datePlaced: spring + 4 },
    { buildingId: "deluxe_barn", datePlaced: spring + 8 },
  ],
  x: 20,
  y: 30,
};

const cabin: IPlannedBuilding = {
  buildingId: "cabin",
  datePlaced: spring,
  x: 10,
  y: 30,
};

const stableRoof = { hue: 120, lightness: -12, saturation: 60 };

interface IRequestOptions {
  buildings?: IPlannedBuilding[];
  colors?: TBrushColors;
  houseColorPaints?: IPlannedColorPaint[];
  houseUpgrades?: IPlannedHouseUpgrade[];
  tile?: IFarmTile;
}

function request(
  date: number,
  {
    buildings = [stable, barn, cabin],
    colors = greenRoof,
    houseColorPaints = [],
    houseUpgrades = [],
    tile = { x: 41, y: 31 },
  }: IRequestOptions = {},
): IColorPaintRequest {
  return {
    colors,
    currentItems: {
      currentBuildings: buildings,
      currentCrops: {},
      currentEquipment: {},
      currentHouseColorPaints: houseColorPaints,
      currentHouseUpgrades: houseUpgrades,
    },
    date,
    farmMap: testFarmMap,
    region: { x1: tile.x, x2: tile.x, y1: tile.y, y2: tile.y },
  };
}

const fits = (footprint: Pick<IPlannedBuilding, "buildingId" | "x" | "y">) => ({
  blockedTiles: [],
  fits: true,
  freeTiles: getFootprintTiles(footprint),
  removedFloors: [],
});

const blocked = (
  footprint: Pick<IPlannedBuilding, "buildingId" | "x" | "y">,
) => ({
  blockedTiles: getFootprintTiles(footprint),
  fits: false,
  freeTiles: [],
  removedFloors: [],
});

const houseTile = {
  x: testSpots.farmhouse.x + 4,
  y: testSpots.farmhouse.y + 2,
};

const houseFootprint = {
  buildingId: "farmhouse",
  x: testSpots.farmhouse.x,
  y: testSpots.farmhouse.y,
};

const nurseryOnDay = (date: number): IPlannedHouseUpgrade[] => [
  { datePlaced: date, level: 1 },
  { datePlaced: date, level: 2 },
];

describe("checkColorPaint on a planned building", () => {
  it("paints the building under the cursor from the date, in its own lightness range, with its footprint green", () => {
    expect(checkColorPaint(request(spring + 9))).toEqual({
      change: {
        buildings: [
          {
            ...stable,
            colorPaints: [
              { colors: { Roof: stableRoof }, datePainted: spring + 9 },
            ],
          },
          barn,
          cabin,
        ],
        type: "building",
      },
      check: fits(stable),
    });
  });

  it("keeps a later colour paint, which wins after its own date", () => {
    const later: IPlannedColorPaint = {
      colors: { Building: { hue: 30, lightness: 0, saturation: 20 } },
      datePainted: spring + 20,
    };
    const paint = checkColorPaint(
      request(spring + 9, { buildings: [{ ...stable, colorPaints: [later] }] }),
    );

    expect(paint?.change).toEqual({
      buildings: [
        {
          ...stable,
          colorPaints: [
            { colors: { Roof: stableRoof }, datePainted: spring + 9 },
            later,
          ],
        },
      ],
      type: "building",
    });
  });

  it("refuses the colours that the building has on the date, with its footprint red", () => {
    const painted = {
      ...stable,
      colorPaints: [{ colors: { Roof: stableRoof }, datePainted: spring + 5 }],
    };

    expect(
      checkColorPaint(request(spring + 9, { buildings: [painted] })),
    ).toEqual({
      check: blocked(stable),
      refusal: { buildingId: "stable", hasPaint: true, type: "colored" },
    });
    expect(
      checkColorPaint(request(spring + 9, { colors: {} }))?.refusal,
    ).toEqual({ buildingId: "stable", hasPaint: false, type: "colored" });
  });

  it("takes the paint off with no colours in the brush", () => {
    const painted = {
      ...stable,
      colorPaints: [{ colors: { Roof: stableRoof }, datePainted: spring + 5 }],
    };

    expect(
      checkColorPaint(request(spring + 9, { buildings: [painted], colors: {} }))
        ?.change,
    ).toEqual({
      buildings: [
        {
          ...painted,
          colorPaints: [
            ...painted.colorPaints,
            { colors: {}, datePainted: spring + 9 },
          ],
        },
      ],
      type: "building",
    });
  });

  it("paints a barn only on the days that it is a Deluxe Barn, and names that tier on the other days", () => {
    const at = { tile: { x: 21, y: 31 } };

    expect(checkColorPaint(request(spring + 5, at))).toEqual({
      check: blocked(barn),
      refusal: {
        block: { type: "none", upgradeId: "deluxe_barn" },
        buildingId: "big_barn",
        type: "unpaintable",
      },
    });
    expect(checkColorPaint(request(spring + 8, at))?.refusal).toBeUndefined();
  });

  it("refuses a cabin, which needs a cabin upgrade that the plan does not have", () => {
    expect(
      checkColorPaint(request(spring + 9, { tile: { x: 11, y: 31 } }))?.refusal,
    ).toEqual({
      block: { level: 2, type: "level" },
      buildingId: "cabin",
      type: "unpaintable",
    });
  });

  it("is no paint on empty ground, or on a building that is not on the farm on the date", () => {
    expect(
      checkColorPaint(request(spring + 9, { tile: { x: 5, y: 5 } })),
    ).toBeUndefined();
    expect(checkColorPaint(request(spring + 1))).toBeUndefined();
  });
});

describe("checkColorPaint on the fixed buildings", () => {
  it("refuses the house before the Nursery", () => {
    expect(
      checkColorPaint(
        request(spring + 9, {
          houseUpgrades: [{ datePlaced: spring, level: 1 }],
          tile: houseTile,
        }),
      ),
    ).toEqual({
      check: blocked(houseFootprint),
      refusal: {
        block: { level: 2, type: "level" },
        buildingId: "farmhouse",
        type: "unpaintable",
      },
    });
  });

  it("paints the house from the Nursery, in the house paints of the plan", () => {
    expect(
      checkColorPaint(
        request(spring + 9, {
          houseUpgrades: nurseryOnDay(spring + 3),
          tile: houseTile,
        }),
      ),
    ).toEqual({
      change: {
        houseColorPaints: [
          {
            colors: { Roof: { hue: 120, lightness: -12, saturation: 60 } },
            datePainted: spring + 9,
          },
        ],
        type: "house",
      },
      check: fits(houseFootprint),
    });
  });

  it.each([
    ["greenhouse", testSpots.greenhouse],
    ["pet_bowl", testSpots.petBowl],
    ["shipping_bin", testSpots.shippingBin],
  ])("refuses the %s, which cannot take paint", (buildingId, spot) => {
    expect(
      checkColorPaint(request(spring + 9, { tile: { x: spot.x, y: spot.y } })),
    ).toEqual({
      check: blocked({ buildingId, x: spot.x, y: spot.y }),
      refusal: { block: { type: "none" }, buildingId, type: "unpaintable" },
    });
  });
});
