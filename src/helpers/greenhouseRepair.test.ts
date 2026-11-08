import {
  eraseRepairOn,
  isGreenhouseRepairedOn,
  orderRepair,
} from "./greenhouseRepair";

const repair = { datePlaced: 10 };

describe("isGreenhouseRepairedOn", () => {
  it("shows the greenhouse repaired from the repair date, as a building", () => {
    expect(
      [9, 10, 11, 50].map((date) => isGreenhouseRepairedOn(repair, date)),
    ).toEqual([false, true, true, true]);
  });

  it("keeps the greenhouse broken with no repair", () => {
    expect(isGreenhouseRepairedOn(undefined, 50)).toBe(false);
  });
});

describe("orderRepair", () => {
  it("repairs on the date", () => {
    expect(orderRepair(undefined, 4)).toEqual({ repair: { datePlaced: 4 } });
  });

  it("moves a planned repair to an earlier date", () => {
    expect(orderRepair(repair, 4)).toEqual({ repair: { datePlaced: 4 } });
  });

  it("refuses a repair on the repair day or later", () => {
    expect(orderRepair(repair, 10)).toEqual({ refusal: "repaired" });
    expect(orderRepair(repair, 30)).toEqual({ refusal: "repaired" });
  });
});

describe("eraseRepairOn", () => {
  it("takes the repair out of the plan on the repair day or later", () => {
    expect(eraseRepairOn(repair, 10)).toBeUndefined();
    expect(eraseRepairOn(repair, 30)).toBeUndefined();
  });

  it("keeps a repair that comes after the date", () => {
    expect(eraseRepairOn(repair, 9)).toBe(repair);
  });
});
