import { parseDevFarmSwitch } from "./devFarmSwitch";
import { farmIds } from "./farmMapLoader";

const defaultChoice = {
  farm: "standard",
  looks: { greenhouse: "broken", house: 0 },
};

describe("parseDevFarmSwitch", () => {
  it("gives the standard farm, the start house and the broken greenhouse with no URL switch", () => {
    expect(parseDevFarmSwitch("")).toEqual(defaultChoice);
  });

  it("reads the farm, the house and the greenhouse", () => {
    expect(
      parseDevFarmSwitch("?farm=four_corners&house=2&greenhouse=repaired"),
    ).toEqual({
      farm: "four_corners",
      looks: { greenhouse: "repaired", house: 2 },
    });
  });

  it.each(farmIds)("reads the %s farm", (farm) => {
    expect(parseDevFarmSwitch(`?farm=${farm}`).farm).toBe(farm);
  });

  it.each(["0", "1", "2"])("reads house %s", (house) => {
    expect(parseDevFarmSwitch(`?house=${house}`).looks.house).toBe(
      Number(house),
    );
  });

  it.each([
    ["an unknown farm", "?farm=Standard"],
    ["a farm with no value", "?farm"],
    ["an unknown house", "?house=3"],
    ["a house that is not a whole number", "?house=1.0"],
    ["a house that is empty", "?house="],
    ["an unknown greenhouse", "?greenhouse=fixed"],
    [
      "a name from the object prototype",
      "?farm=toString&house=constructor&greenhouse=__proto__",
    ],
    ["an unknown parameter", "?zoom=2"],
  ])("ignores %s", (_, search) => {
    expect(parseDevFarmSwitch(search)).toEqual(defaultChoice);
  });

  it("keeps the good values next to a bad one", () => {
    expect(
      parseDevFarmSwitch("?farm=beach&house=9&greenhouse=repaired"),
    ).toEqual({
      farm: "beach",
      looks: { greenhouse: "repaired", house: 0 },
    });
  });
});
