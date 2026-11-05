import { items } from "../data/game/items.json";
import {
  getDefaultSkin,
  getItemSkin,
  getRangeOffsets,
  getSkinSprite,
  hasSkin,
} from "./items";

describe("Item helper", () => {
  describe("getRangeOffsets", () => {
    it("returns the listed tiles for a tiles range", () => {
      const tiles: TTileOffset[] = [
        [0, -1],
        [1, 0],
      ];

      expect(getRangeOffsets({ radius: 0, shape: "tiles", tiles })).toEqual(
        tiles,
      );
    });

    it("returns the tiles with dx² + dy² < r² for a circle range", () => {
      const offsets = getRangeOffsets({ radius: 9, shape: "circle" });

      expect(offsets).toContainEqual([0, 8]);
      expect(offsets).toContainEqual([4, 8]);
      expect(offsets).not.toContainEqual([5, 8]);
      expect(offsets).not.toContainEqual([0, 9]);
      expect(offsets).toContainEqual([8, 4]);
      expect(offsets).not.toContainEqual([8, 5]);
    });

    it("returns the tiles with |dx| + |dy| ≤ r for a diamond range", () => {
      const offsets = getRangeOffsets({ radius: 5, shape: "diamond" });

      expect(offsets).toHaveLength(61);
      expect(offsets).toContainEqual([2, -3]);
      expect(offsets).not.toContainEqual([3, -3]);
    });
  });

  describe("skins", () => {
    it("uses the first skin in skinOrder as the default skin", () => {
      expect(getDefaultSkin("sprinkler")).toBe(items.sprinkler.skinOrder[0]);
    });

    it("finds only the skins of the item", () => {
      expect(hasSkin("sprinkler", "iridium_sprinkler")).toBe(true);
      expect(hasSkin("sprinkler", "scarecrow")).toBe(false);
      expect(hasSkin("sprinkler", "toString")).toBe(false);
      expect(hasSkin("not_an_item", "sprinkler")).toBe(false);
      expect(getItemSkin("not_an_item", "sprinkler")).toBeUndefined();
    });

    it("uses the sprite of the season when the skin has one", () => {
      const skin = getItemSkin("seasonal_plant", "seasonal_plant_184");

      expect(skin).toBeDefined();

      if (skin !== undefined) {
        expect(getSkinSprite(skin, "fall")).toEqual(skin.spritesBySeason?.fall);
      }

      const keg = getItemSkin("keg", "keg");

      if (keg !== undefined) {
        expect(getSkinSprite(keg, "fall")).toEqual(keg.sprite);
      }
    });
  });
});
