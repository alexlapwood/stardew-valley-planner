import { keepCutsOfBushes, readCutBushes } from "./bushCutsData";
import { readFarmData, toSavedFarmData } from "./farmData";
import { newFarmData } from "./plan";

const cut: ICutBush = { dateCut: 12, x: 40, y: 20 };

const bushes: IFarmBush[] = [
  { destroyable: true, size: "medium", x: 40, y: 20 },
  { destroyable: false, size: "small", x: 50, y: 20 },
];

describe("readCutBushes", () => {
  it("reads no cuts when the file has none", () => {
    expect(readCutBushes(undefined)).toEqual({ badItems: [], cutBushes: [] });
  });

  it("reads each cut with its date and the first tile of its bush", () => {
    expect(readCutBushes([cut, { dateCut: 3, x: 50, y: 20 }])).toEqual({
      badItems: [],
      cutBushes: [cut, { dateCut: 3, x: 50, y: 20 }],
    });
  });

  it("drops a cut that is not a cut, and a second cut of the same bush", () => {
    const theories = [
      { x: 1, y: 2 },
      { dateCut: "3", x: 1, y: 2 },
      { dateCut: 3, x: 1.5, y: 2 },
      { dateCut: 3, x: 1, y: "2" },
      null,
      { ...cut, dateCut: 30 },
    ];

    expect(readCutBushes([cut, ...theories])).toEqual({
      badItems: theories.map((value, index) => ({
        path: `cutBushes[${index + 1}]`,
        value,
      })),
      cutBushes: [cut],
    });
  });

  it("reads no cuts from a value that is not a list", () => {
    expect(readCutBushes(cut)).toEqual({
      badItems: [{ path: "cutBushes", value: cut }],
      cutBushes: [],
    });
  });

  it("reads the cuts of a plan file, and saves them back", () => {
    const data = { ...newFarmData("forest"), cutBushes: [cut] };
    const saved: unknown = JSON.parse(toSavedFarmData(data));

    expect(saved).toMatchObject({ cutBushes: [cut] });
    expect(readFarmData(saved)).toEqual({ badItems: [], data });
  });
});

describe("keepCutsOfBushes", () => {
  it("keeps a cut of a destroyable bush of the farm", () => {
    expect(keepCutsOfBushes([cut], bushes)).toEqual({
      badItems: [],
      cutBushes: [cut],
    });
  });

  it.each([
    ["a bush that the game cannot cut", { dateCut: 4, x: 50, y: 20 }],
    [
      "a tile that is not the first tile of a bush",
      { dateCut: 4, x: 41, y: 20 },
    ],
    ["a tile with no bush", { dateCut: 4, x: 3, y: 3 }],
  ])("drops and reports a cut of %s", (_, badCut) => {
    expect(keepCutsOfBushes([cut, badCut], bushes)).toEqual({
      badItems: [{ path: "cutBushes[1]", value: badCut }],
      cutBushes: [cut],
    });
  });
});
