import { hasDevFarmSwitch, parseDevFarmSwitch } from "./devFarmSwitch";
import { farmIds } from "./farmMapLoader";

describe("hasDevFarmSwitch", () => {
  it.each(["?farm=beach", "?zoom=1&farm", "?farm=unknown"])(
    "finds the farm switch in %s",
    (search) => {
      expect(hasDevFarmSwitch(search)).toBe(true);
    },
  );

  it.each(["", "?house=2&greenhouse=repaired", "?farms=beach"])(
    "finds no farm switch in %s",
    (search) => {
      expect(hasDevFarmSwitch(search)).toBe(false);
    },
  );
});

describe("parseDevFarmSwitch", () => {
  it("gives the standard farm with no URL switch", () => {
    expect(parseDevFarmSwitch("")).toBe("standard");
  });

  it.each(farmIds)("reads the %s farm", (farm) => {
    expect(parseDevFarmSwitch(`?farm=${farm}`)).toBe(farm);
  });

  it("reads only the farm, because the plan dates the looks", () => {
    expect(
      parseDevFarmSwitch("?farm=four_corners&house=2&greenhouse=repaired"),
    ).toBe("four_corners");
  });

  it.each([
    ["an unknown farm", "?farm=Standard"],
    ["a farm with no value", "?farm"],
    ["a name from the object prototype", "?farm=toString"],
    ["an unknown parameter", "?zoom=2"],
  ])("ignores %s", (_, search) => {
    expect(parseDevFarmSwitch(search)).toBe("standard");
  });
});
