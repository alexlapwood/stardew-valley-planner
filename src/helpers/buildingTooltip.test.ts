import { buildings } from "../data/game/buildings.json";
import { atlasSprite } from "./atlas";
import { getBuildingTooltip } from "./buildingTooltip";
import { getTooltipText } from "./tooltip";

const building = (id: string, skin?: string): ISelectedItem =>
  skin === undefined
    ? { id, type: "building" }
    : { id, skin, type: "building" };

const tooltipText = (item: ISelectedItem) =>
  getTooltipText(getBuildingTooltip(item));

const wizardUnlock =
  "✨ Needs the Magic Ink (the Wizard's 'Goblin Problem' quest)";

describe("getBuildingTooltip", () => {
  it("shows the cost, each material on its own line and Robin's build days of a building, with no name line", () => {
    expect(tooltipText(building("barn"))).toBe(
      ["💰 6000g", "Wood ×350", "Stone ×150", "🔨 Robin · ⏱️ 3 days"].join(
        "\n",
      ),
    );
  });

  it("draws each material line with the game icon of the item, in the place of the brick", () => {
    expect(
      getBuildingTooltip(building("barn")).filter((line) => line.icon === "🧱"),
    ).toEqual([
      {
        icon: "🧱",
        sprite: atlasSprite("materials", [176, 0, 16, 16]),
        text: "Wood ×350",
      },
      {
        icon: "🧱",
        sprite: atlasSprite("materials", [192, 0, 16, 16]),
        text: "Stone ×150",
      },
    ]);
  });

  it("draws the game icon of each material of a house level", () => {
    expect(
      getBuildingTooltip({ id: "2", type: "houseUpgrade" }).find(
        (line) => line.icon === "🧱",
      )?.sprite,
    ).toEqual(atlasSprite("materials", [240, 0, 16, 16]));
  });

  it("shows no builder line for a building with no build days", () => {
    expect(tooltipText(building("shipping_bin"))).toBe(
      ["💰 250g", "Wood ×150"].join("\n"),
    );
  });

  it("shows the building that an upgrade tier upgrades", () => {
    expect(tooltipText(building("big_barn"))).toBe(
      [
        "💰 12000g",
        "Wood ×450",
        "Stone ×200",
        "🔨 Robin · ⏱️ 2 days",
        "⬆️ Upgrade from: Barn",
      ].join("\n"),
    );
    expect(tooltipText(building("deluxe_barn"))).toContain(
      "⬆️ Upgrade from: Big Barn",
    );
  });

  it("shows that a Wizard building needs the Magic Ink", () => {
    expect(tooltipText(building("earth_obelisk"))).toBe(
      ["💰 500000g", "Iridium Bar ×10", "Earth Crystal ×10", wizardUnlock].join(
        "\n",
      ),
    );
  });

  it("shows no material line for a building with gold only", () => {
    expect(tooltipText(building("gold_clock"))).toBe(
      ["💰 10000000g", wizardUnlock].join("\n"),
    );
  });

  it("shows that the Island Obelisk needs a visit to Ginger Island, from its build condition", () => {
    expect(buildings.island_obelisk.buildCondition).toBe(
      "PLAYER_HAS_MAIL Any Visited_Island",
    );
    expect(tooltipText(building("island_obelisk"))).toBe(
      [
        "💰 1000000g",
        "Iridium Bar ×10",
        "Dragon Tooth ×10",
        "Banana ×10",
        wizardUnlock,
        "🏝️ Needs a visit to Ginger Island",
      ].join("\n"),
    );
  });

  it("shows the count limits of the cabin and the stable", () => {
    expect(tooltipText(building("cabin"))).toBe(
      ["💰 100g", "🔢 max 7"].join("\n"),
    );
    expect(tooltipText(building("stable"))).toBe(
      [
        "💰 10000g",
        "Hardwood ×100",
        "Iron Bar ×5",
        "🔨 Robin · ⏱️ 2 days",
        "🔢 max cabins + 1",
      ].join("\n"),
    );
  });

  it("shows the count limit of the cabin with each skin", () => {
    expect(tooltipText(building("cabin", "beach_cabin"))).toContain("🔢 max 7");
  });

  describe("a skin with its own cost, days and condition", () => {
    const skins = buildings.cabin.skins ?? {};
    const logCabin = skins.log_cabin;

    beforeEach(() => {
      if (logCabin !== undefined) {
        skins.log_cabin = {
          ...logCabin,
          buildCost: 500,
          buildDays: 1,
          buildMaterials: [{ count: 10, itemId: "(O)388", name: "Wood" }],
          condition: "PLAYER_HAS_MAIL Any Visited_Island",
        };
      }
    });

    afterEach(() => {
      skins.log_cabin = logCabin;
    });

    it("uses them in place of the building's, as the game does", () => {
      expect(tooltipText(building("cabin", "log_cabin"))).toBe(
        [
          "💰 500g",
          "Wood ×10",
          "🔨 Robin · ⏱️ 1 day",
          "🔢 max 7",
          "🏝️ Needs a visit to Ginger Island",
        ].join("\n"),
      );
    });
  });

  describe("a material that the export has no icon for", () => {
    const skins = buildings.cabin.skins ?? {};
    const logCabin = skins.log_cabin;

    beforeEach(() => {
      if (logCabin !== undefined) {
        skins.log_cabin = {
          ...logCabin,
          buildMaterials: [{ count: 1, itemId: "(O)0", name: "Weeds" }],
        };
      }
    });

    afterEach(() => {
      skins.log_cabin = logCabin;
    });

    it("keeps the brick icon, with no sprite", () => {
      expect(
        getBuildingTooltip(building("cabin", "log_cabin")).find(
          (line) => line.icon === "🧱",
        ),
      ).toEqual({ icon: "🧱", sprite: undefined, text: "Weeds ×1" });
    });
  });

  it("shows the cost and days of a house level from the export, and the level that it upgrades, with no name line", () => {
    expect(tooltipText({ id: "1", type: "houseUpgrade" })).toBe(
      [
        "💰 10000g",
        "Wood ×450",
        "🔨 Robin · ⏱️ 3 days",
        "⬆️ Upgrade from: Farmhouse",
      ].join("\n"),
    );
    expect(tooltipText({ id: "2", type: "houseUpgrade" })).toBe(
      [
        "💰 65000g",
        "Hardwood ×100",
        "🔨 Robin · ⏱️ 3 days",
        "⬆️ Upgrade from: Kitchen",
      ].join("\n"),
    );
    expect(tooltipText({ id: "3", type: "houseUpgrade" })).toBe(
      ["💰 100000g", "🔨 Robin · ⏱️ 3 days", "⬆️ Upgrade from: Nursery"].join(
        "\n",
      ),
    );
  });

  it("shows the 2 ways to repair the greenhouse, with no name line", () => {
    expect(tooltipText({ id: "greenhouse", type: "greenhouseRepair" })).toBe(
      [
        "🏛️ Community Center: Pantry bundles",
        "🛒 Or Joja: 35000g (+5000g membership)",
        "⏱️ 1 day",
      ].join("\n"),
    );
  });

  it("has no tooltip for a house level that the game does not have, or for an item that is not a building", () => {
    expect(getBuildingTooltip({ id: "4", type: "houseUpgrade" })).toEqual([]);
    expect(getBuildingTooltip({ id: "parsnip", type: "crop" })).toEqual([]);
  });
});
