import { cabinLimit, findNewLimitBreak } from "./buildingLimits";

function building(
  buildingId: string,
  datePlaced: number,
  x: number,
  overrides: Partial<IPlannedBuilding> = {},
): IPlannedBuilding {
  return { buildingId, datePlaced, x, y: 20, ...overrides };
}

const cabin = (datePlaced: number, x: number, dateDestroyed?: number) =>
  building("cabin", datePlaced, x, { dateDestroyed });

const stable = (datePlaced: number, x: number) =>
  building("stable", datePlaced, x);

function cabins(count: number, datePlaced: number) {
  return Array.from({ length: count }, (_, index) =>
    cabin(datePlaced, index * 6),
  );
}

const breakWith = (before: IPlannedBuilding[], ...added: IPlannedBuilding[]) =>
  findNewLimitBreak(before, [...before, ...added]);

describe("the cabin limit", () => {
  it("is 7 cabins, the default player limit of 8 less the host", () => {
    expect(cabinLimit).toBe(7);
  });

  it("allows a 7th cabin and refuses an 8th", () => {
    expect(breakWith(cabins(6, 0), cabin(5, 100))).toBeUndefined();
    expect(breakWith(cabins(7, 0), cabin(5, 100))).toEqual({
      buildingId: "cabin",
      limit: "cabins",
    });
  });

  it("refuses an earlier cabin that makes 8 on a later date", () => {
    expect(breakWith(cabins(7, 30), cabin(5, 100))).toEqual({
      buildingId: "cabin",
      limit: "cabins",
    });
  });

  it("counts the cabins that stand on the date, so a demolish on the same day makes room", () => {
    const [demolished, ...others] = cabins(7, 0);
    const plan = [{ ...demolished, dateDestroyed: 5 }, ...others];

    expect(breakWith(plan, cabin(5, 100))).toBeUndefined();
    expect(breakWith(plan, cabin(4, 100))).toEqual({
      buildingId: "cabin",
      limit: "cabins",
    });
  });
});

describe("the stable limit", () => {
  const firstStable = stable(0, 0);

  it("allows 1 stable with no cabins", () => {
    expect(breakWith([], firstStable)).toBeUndefined();
  });

  it("refuses a second stable with no cabin", () => {
    expect(breakWith([firstStable], stable(10, 10))).toEqual({
      buildingId: "stable",
      limit: "perCabin",
    });
  });

  it("allows 1 more stable for each cabin", () => {
    expect(
      breakWith([firstStable, cabin(5, 20)], stable(10, 10)),
    ).toBeUndefined();
    expect(
      breakWith([firstStable, cabin(5, 20), stable(10, 10)], stable(20, 30)),
    ).toEqual({ buildingId: "stable", limit: "perCabin" });
  });

  it("counts each stable on the date, also one that went down the same day", () => {
    expect(breakWith([firstStable], stable(0, 10))).toEqual({
      buildingId: "stable",
      limit: "perCabin",
    });
    expect(breakWith([firstStable], stable(1, 10))).toEqual({
      buildingId: "stable",
      limit: "perCabin",
    });
  });

  it("counts a cabin from the date it goes down", () => {
    expect(
      breakWith([firstStable, cabin(10, 20)], stable(10, 10)),
    ).toBeUndefined();
    expect(breakWith([firstStable, cabin(10, 20)], stable(9, 10))).toEqual({
      buildingId: "stable",
      limit: "perCabin",
    });
  });

  it("counts a cabin that goes on the order day, because the order can come first", () => {
    expect(
      breakWith([firstStable, cabin(5, 20, 10)], stable(10, 10)),
    ).toBeUndefined();
    expect(breakWith([firstStable, cabin(5, 20, 9)], stable(10, 10))).toEqual({
      buildingId: "stable",
      limit: "perCabin",
    });
  });

  it("finds a cabin demolish that leaves a later stable with no cabin", () => {
    const cabinForStable = cabin(5, 20);
    const before = [firstStable, cabinForStable, stable(10, 10)];
    const after = before.map((plannedBuilding) =>
      plannedBuilding === cabinForStable
        ? { ...cabinForStable, dateDestroyed: 8 }
        : plannedBuilding,
    );

    expect(findNewLimitBreak(before, after)).toEqual({
      buildingId: "stable",
      limit: "perCabin",
    });
  });

  it("does not stop a change for a stable that broke the limit before it", () => {
    const before = [firstStable, stable(10, 10)];

    expect(breakWith(before, building("coop", 20, 40))).toBeUndefined();
  });

  it("does not limit the other buildings", () => {
    expect(
      breakWith(
        Array.from({ length: 10 }, (_, index) =>
          building("well", index * 3, index * 4),
        ),
        building("well", 40, 100),
      ),
    ).toBeUndefined();
  });
});
