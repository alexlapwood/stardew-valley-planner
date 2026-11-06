import { farmIds } from "./farmMapLoader";
import { farmTypes } from "./farmTypes";

const exportedFarms = import.meta.glob<IFarmMapFile>(
  "../../public/data/game/farms/*.json",
  { eager: true, import: "default" },
);

describe("farmTypes", () => {
  it.each(farmIds)("names the %s farm as the exported farm map does", (id) => {
    const file = exportedFarms[`../../public/data/game/farms/${id}.json`];

    expect(farmTypes[id].name).toBe(file.farm.name);
  });

  it("has an emoji for each farm", () => {
    farmIds.forEach((id) => {
      expect(farmTypes[id].emoji).not.toBe("");
    });
  });
});
