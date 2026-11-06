import { items } from "./game/items.json";
import { itemTabIds, type TItemTabId } from "./itemTabs";

const tabIds: readonly TItemTabId[] = ["items", "decorations"];

const tabbedItemIds = tabIds.flatMap((tabId) =>
  Object.keys(itemTabIds).filter((itemId) => itemTabIds[itemId] === tabId),
);

describe("itemTabIds", () => {
  it("puts every item in a tab", () => {
    expect(
      Object.keys(items).filter((itemId) => !tabbedItemIds.includes(itemId)),
    ).toEqual([]);
  });

  it("puts each item in only 1 tab", () => {
    expect(
      tabbedItemIds.filter(
        (itemId, index) => tabbedItemIds.indexOf(itemId) !== index,
      ),
    ).toEqual([]);
  });

  it("has only items from the game data", () => {
    expect(
      Object.keys(itemTabIds).filter((itemId) => !Object.hasOwn(items, itemId)),
    ).toEqual([]);
  });

  it("puts Flooring and the Jack-O-Lantern in Items, and the Mini-Jukebox and the Mini-Obelisk in Decorations", () => {
    expect({
      flooring: itemTabIds.flooring,
      jack_o_lantern: itemTabIds.jack_o_lantern,
      mini_jukebox: itemTabIds.mini_jukebox,
      mini_obelisk: itemTabIds.mini_obelisk,
    }).toEqual({
      flooring: "items",
      jack_o_lantern: "items",
      mini_jukebox: "decorations",
      mini_obelisk: "decorations",
    });
  });
});
