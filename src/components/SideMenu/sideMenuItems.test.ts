import { crops } from "../../data/game/crops.json";
import { items } from "../../data/game/items.json";
import type { TItemTabId } from "../../data/itemTabs";
import {
  getCropIdsInSeason,
  getItemName,
  getMatchingSkins,
  getShownSkin,
  getTabItemIds,
  matchesSearch,
  searchCropIds,
  searchItemIds,
} from "./sideMenuItems";

const spring = 0;
const summer = 28;
const winter = 28 * 3;

function cropNames(date: number) {
  return getCropIdsInSeason(date).map((cropId) => crops[cropId].name);
}

function itemNames(tabId: TItemTabId) {
  return getTabItemIds(tabId).map(getItemName);
}

describe("getCropIdsInSeason", () => {
  it("has only the crops that grow in the season of the date", () => {
    expect(
      getCropIdsInSeason(summer).every((cropId) =>
        crops[cropId].seasons.includes("summer"),
      ),
    ).toBe(true);
    expect(getCropIdsInSeason(summer)).not.toContain("parsnip");
    expect(getCropIdsInSeason(spring)).toContain("parsnip");
  });

  it("sorts the crops A-Z by the name the user sees", () => {
    expect(cropNames(summer)).toEqual(
      cropNames(summer).toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it("does not list indoor-only crops", () => {
    expect(getCropIdsInSeason(winter)).not.toContain("cactus_fruit");
  });

  it("lists the crops for the season of a later year", () => {
    expect(getCropIdsInSeason(28 * 4 + summer)).toEqual(
      getCropIdsInSeason(summer),
    );
  });
});

describe("matchesSearch", () => {
  it.each([
    ["Sweet Gem Berry", "gem"],
    ["Sweet Gem Berry", "GEM B"],
    ["Sweet Gem Berry", "  berry "],
    ["Sweet Gem Berry", ""],
  ])("finds %j with %j", (name, search) => {
    expect(matchesSearch(name, search)).toBe(true);
  });

  it("does not find a name that does not have the text", () => {
    expect(matchesSearch("Sweet Gem Berry", "gems")).toBe(false);
  });
});

describe("searchCropIds", () => {
  it("finds only the given crops, in their order", () => {
    expect(
      searchCropIds(["strawberry", "melon", "blueberry", "parsnip"], "berr"),
    ).toEqual(["strawberry", "blueberry"]);
  });

  it("finds only the crops in season when it gets the crops in season", () => {
    expect(searchCropIds(getCropIdsInSeason(summer), "melon")).toEqual([
      "melon",
    ]);
    expect(searchCropIds(getCropIdsInSeason(spring), "melon")).toEqual([]);
  });
});

describe("searchItemIds", () => {
  it("finds an item by the name of any of its skins", () => {
    expect(searchItemIds(["fence", "keg"], "iron fence")).toEqual(["fence"]);
  });

  it("keeps the order of the ids", () => {
    expect(searchItemIds(["loom", "keg", "cask", "fence"], "e")).toEqual([
      "keg",
      "fence",
    ]);
  });
});

describe("getMatchingSkins", () => {
  it("is all skins, in skin order, when there is no search", () => {
    expect(getMatchingSkins("fence", "")).toEqual(items.fence.skinOrder);
    expect(getMatchingSkins("fence", "  ")).toEqual(items.fence.skinOrder);
  });

  it("is only the skins whose name matches, in skin order", () => {
    expect(getMatchingSkins("fence", "stone")).toEqual(["stone_fence"]);
    expect(getMatchingSkins("fence", "FENCE")).toEqual([
      "wood_fence",
      "stone_fence",
      "iron_fence",
      "hardwood_fence",
    ]);
  });

  it("is empty when no skin matches", () => {
    expect(getMatchingSkins("fence", "keg")).toEqual([]);
  });
});

describe("getShownSkin", () => {
  it("is the picked skin when there is no search", () => {
    expect(getShownSkin("fence", "iron_fence", "")).toBe("iron_fence");
    expect(getShownSkin("fence", "iron_fence", "  ")).toBe("iron_fence");
  });

  it("is the picked skin when its name matches", () => {
    expect(getShownSkin("fence", "hardwood_fence", "fence")).toBe(
      "hardwood_fence",
    );
  });

  it("is the first skin in skin order that matches when the picked skin does not match", () => {
    expect(getShownSkin("fence", "gate", "fence")).toBe("wood_fence");
    expect(getShownSkin("fence", "wood_fence", "STONE")).toBe("stone_fence");
    expect(getShownSkin("scarecrow", "deluxe_scarecrow", "rarecrow")).toBe(
      "rarecrow_110",
    );
  });

  it("is the picked skin when no skin matches", () => {
    expect(getShownSkin("fence", "gate", "keg")).toBe("gate");
  });
});

describe("getItemName", () => {
  it("is the name of the first skin, which the row shows", () => {
    expect(getItemName("fence")).toBe("Wood Fence");
    expect(getItemName("keg")).toBe("Keg");
  });
});

describe("getTabItemIds", () => {
  it.each(["items", "decorations"] as const)(
    "sorts the %s A-Z by the name the user sees",
    (tabId) => {
      const names = itemNames(tabId).filter((name) => !name.startsWith("?"));

      expect(names).toEqual(names.toSorted((a, b) => a.localeCompare(b)));
    },
  );

  it('puts the names that start with "?" after all other names, A-Z without the "?"', () => {
    const names = itemNames("decorations");
    const secretNames = names.filter((name) => name.startsWith("?"));

    expect(secretNames).toEqual([
      "??Foroguemon??",
      "??HMTGF??",
      "??Pinky Lemon??",
    ]);
    expect(names.slice(-secretNames.length)).toEqual(secretNames);
  });

  it("lists only the items of the tab", () => {
    expect(getTabItemIds("items")).toContain("keg");
    expect(getTabItemIds("items")).not.toContain("wood_chair");
    expect(getTabItemIds("decorations")).toContain("wood_chair");
    expect(getTabItemIds("decorations")).not.toContain("keg");
  });

  it("lists each item in exactly 1 tab", () => {
    expect(
      [...getTabItemIds("items"), ...getTabItemIds("decorations")].toSorted(),
    ).toEqual(Object.keys(items).toSorted());
  });
});
