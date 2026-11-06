import { fireEvent, render, screen, within } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import { crops } from "../../data/game/crops.json";
import { items } from "../../data/game/items.json";
import SideMenu from "./SideMenu";

const spring = 0;
const summer = 28;

const winter = 84;

function renderSideMenu(date = spring) {
  return render(() => (
    <SideMenu
      date={date}
      selectCrop={vitest.fn()}
      selectEquipment={vitest.fn()}
      selectTree={vitest.fn()}
    />
  ));
}

function list(tabId: string) {
  return screen.getByTestId(`side-menu--list-${tabId}`);
}

function shownCropIds() {
  return Array.from(
    list("crops").querySelectorAll<HTMLElement>("[data-testid^='seed--']"),
    (row) => row.dataset.testid?.replace("seed--", "") ?? "",
  );
}

function shownTreeIds() {
  return Array.from(
    list("crops").querySelectorAll<HTMLElement>("[data-testid^='tree--']"),
    (row) => row.dataset.testid?.replace("tree--", "") ?? "",
  );
}

function headings(element: HTMLElement) {
  return within(element).queryAllByRole("heading", { hidden: true });
}

function shownRows(tabId: string) {
  return Array.from(
    list(tabId).querySelectorAll<HTMLElement>(
      ".EquipmentMenu > div > .sdv-list-item",
    ),
  );
}

function shownSkins(tabId: string) {
  return shownRows(tabId).map((row) => {
    const [itemId = "", skinKey = ""] =
      row.dataset.testid?.replace("equipment-", "").split("--") ?? [];

    return { itemId, skinKey };
  });
}

function shownItemIds(tabId: string) {
  return shownSkins(tabId).map(({ itemId }) => itemId);
}

// BigText draws the name as sprites, so the name on a row comes from its skin.
function shownItemNames(tabId: string) {
  return shownSkins(tabId).map(
    ({ itemId, skinKey }) => items[itemId].skins[skinKey]?.name,
  );
}

function visibleRows(tabId: string) {
  return shownRows(tabId)
    .filter((row) => row.parentElement?.classList.contains("hidden") !== true)
    .map((row) => row.dataset.testid);
}

function visibleItemIds(tabId: string) {
  return visibleRows(tabId).map(
    (testId) => testId?.replace("equipment-", "").split("--")[0],
  );
}

function searchBox() {
  return screen.getByTestId<HTMLInputElement>("side-menu--search");
}

function search(text: string) {
  fireEvent.input(searchBox(), { target: { value: text } });
}

function fadedTabIds() {
  return ["crops", "items", "decorations"].filter((tabId) =>
    screen.getByTestId(`${tabId}-tab`).classList.contains("no-matches"),
  );
}

function shownRow(itemId: string, tabId = "items") {
  const row = shownRows(tabId).find(
    (candidate) =>
      candidate.dataset.testid?.startsWith(`equipment-${itemId}--`) === true,
  );

  if (row === undefined) {
    throw new Error(`The ${itemId} row is not in the ${tabId} tab.`);
  }

  return row;
}

function openDropdown(itemId: string, tabId = "items") {
  fireEvent.click(
    within(shownRow(itemId, tabId)).getByTestId("equipment-dropdown--trigger"),
  );
}

function dropdownOptions(itemId: string, tabId = "items") {
  return Array.from(
    shownRow(itemId, tabId).parentElement?.querySelectorAll<HTMLElement>(
      ".margin-left > .sdv-list-item",
    ) ?? [],
  );
}

function dropdownSkins(itemId: string, tabId = "items") {
  return dropdownOptions(itemId, tabId).map(
    (option) => option.dataset.testid?.split("--")[1],
  );
}

function clickAt(element: Element) {
  fireEvent.mouseDown(element);
  fireEvent.mouseUp(element);
  fireEvent.click(element);
}

function pickSkin(itemId: string, skinKey: string) {
  openDropdown(itemId);

  const option = dropdownOptions(itemId).find(
    (candidate) =>
      candidate.dataset.testid === `equipment-${itemId}--${skinKey}`,
  );

  if (option === undefined) {
    throw new Error(`The ${itemId} dropdown does not have ${skinKey}.`);
  }

  fireEvent.click(option);
}

describe("<SideMenu />", () => {
  it("renders correctly", () => {
    const { container } = renderSideMenu();

    expect(container).toMatchSnapshot();
  });

  it("opens on the Crops tab", () => {
    renderSideMenu();

    expect(screen.getByTestId("crops-tab").classList).toContain("selected");
    expect(list("crops").classList).not.toContain("hidden");
  });

  it.each([
    ["crops", "Crops"],
    ["items", "Items"],
    ["decorations", "Decorations"],
  ])("shows the %s tab, with its name as the tooltip", (tabId, name) => {
    renderSideMenu();

    fireEvent.click(screen.getByTestId(`${tabId}-tab`));

    expect(screen.getByTestId(`${tabId}-tab`).classList).toContain("selected");
    expect(screen.getByTestId(`${tabId}-tab`).getAttribute("title")).toBe(name);
    expect(
      screen
        .getAllByRole("tabpanel", { hidden: true })
        .filter((panel) => !panel.classList.contains("hidden")),
    ).toEqual([list(tabId)]);
  });

  it("highlights only the open tab", () => {
    renderSideMenu();

    fireEvent.click(screen.getByTestId("decorations-tab"));
    fireEvent.click(screen.getByTestId("items-tab"));

    expect(screen.getByTestId("items-tab").classList).toContain("selected");
    expect(screen.getByTestId("decorations-tab").classList).not.toContain(
      "selected",
    );
  });

  it("has no title above the list", () => {
    renderSideMenu();

    expect(
      screen
        .queryAllByRole("heading", { hidden: true })
        .filter((heading) => heading.closest("[role='tabpanel']") === null),
    ).toEqual([]);
  });

  it.each(["items", "decorations"])(
    "shows the %s tab as 1 list with no headings",
    (tabId) => {
      renderSideMenu();

      expect(headings(list(tabId))).toEqual([]);
      expect(list(tabId).children).toHaveLength(1);
    },
  );

  it("shows the crops, and then the trees under a Trees heading", () => {
    renderSideMenu();

    const menus = Array.from(list("crops").children);
    const cropHeadings = headings(list("crops"));

    expect(menus.map((menu) => menu.className)).toEqual([
      "SeedMenu",
      "TreeMenu",
    ]);
    expect(
      cropHeadings.map((heading) => heading.getAttribute("aria-label")),
    ).toEqual(["Trees"]);
    expect(menus[1].firstElementChild).toBe(cropHeadings[0]);
  });

  it.each([
    ["spring", spring],
    ["summer", summer],
    ["winter", winter],
  ])("shows all the trees A-Z by name in %s", (_, date) => {
    renderSideMenu(date);

    expect(shownTreeIds()).toEqual([
      "apple",
      "apricot",
      "banana",
      "cherry",
      "mango",
      "orange",
      "peach",
      "pomegranate",
      "tea_bush",
    ]);
  });

  it("selects a tree, and marks the selected tree", () => {
    const selectTree = vitest.fn();
    const [selectedItem, setSelectedItem] = createSignal<ISelectedItem>();

    render(() => (
      <SideMenu
        date={spring}
        selectCrop={vitest.fn()}
        selectEquipment={vitest.fn()}
        selectTree={selectTree}
        selectedItem={selectedItem()}
      />
    ));

    fireEvent.click(screen.getByTestId("tree--tea_bush"));

    expect(selectTree).toHaveBeenCalledExactlyOnceWith("tea_bush");

    setSelectedItem({ id: "tea_bush", type: "tree" });

    expect(
      Array.from(
        list("crops").querySelectorAll<HTMLElement>(".selected"),
        (row) => row.dataset.testid,
      ),
    ).toEqual(["tree--tea_bush"]);
  });

  it.each(["items", "decorations"])(
    "shows the %s A-Z by the name on the row",
    (tabId) => {
      renderSideMenu();

      const names = shownItemNames(tabId);
      const secretNames = names.filter(
        (name) => name?.startsWith("?") === true,
      );
      const otherNames = names.filter((name) => name?.startsWith("?") !== true);

      expect(names).not.toContain(undefined);
      expect(otherNames).toEqual(
        otherNames.toSorted((a = "", b = "") => a.localeCompare(b)),
      );
      expect(names).toEqual([...otherNames, ...secretNames]);
    },
  );

  it("shows each item in 1 tab", () => {
    renderSideMenu();

    expect(
      [...shownItemIds("items"), ...shownItemIds("decorations")].toSorted(),
    ).toEqual(Object.keys(items).toSorted());
  });

  it("shows only the crops in season, A-Z by name", () => {
    renderSideMenu(summer);

    const names = shownCropIds().map((cropId) => crops[cropId].name);

    expect(shownCropIds()).not.toContain("parsnip");
    expect(shownCropIds()).toContain("melon");
    expect(names).toEqual(names.toSorted((a, b) => a.localeCompare(b)));
  });

  it("changes the crops when the date changes season", () => {
    const [date, setDate] = createSignal(spring);

    render(() => (
      <SideMenu
        date={date()}
        selectCrop={vitest.fn()}
        selectEquipment={vitest.fn()}
        selectTree={vitest.fn()}
      />
    ));

    expect(shownCropIds()).toContain("parsnip");

    setDate(summer);

    expect(shownCropIds()).not.toContain("parsnip");
    expect(shownCropIds()).toContain("melon");
  });

  it("keeps the picked skin of an item when the tab changes", () => {
    renderSideMenu();

    pickSkin("scarecrow", "rarecrow_110");
    fireEvent.click(screen.getByTestId("decorations-tab"));
    fireEvent.click(screen.getByTestId("items-tab"));

    expect(shownRows("items").map((row) => row.dataset.testid)).toContain(
      "equipment-scarecrow--rarecrow_110",
    );
  });

  describe("skin dropdown", () => {
    it("opens only 1 dropdown at a time, also across tabs", () => {
      renderSideMenu();

      openDropdown("fence");
      openDropdown("scarecrow");

      expect(dropdownSkins("fence")).toEqual([]);
      expect(dropdownSkins("scarecrow")).toEqual(items.scarecrow.skinOrder);

      fireEvent.click(screen.getByTestId("decorations-tab"));
      openDropdown("wood_chair", "decorations");

      expect(dropdownSkins("scarecrow")).toEqual([]);
      expect(dropdownSkins("wood_chair", "decorations")).toEqual(
        items.wood_chair.skinOrder,
      );
    });

    it("closes the dropdown when the user picks a skin", () => {
      renderSideMenu();

      pickSkin("fence", "gate");

      expect(dropdownSkins("fence")).toEqual([]);
      expect(shownRow("fence").dataset.testid).toBe("equipment-fence--gate");
    });

    it("closes the dropdown when the user clicks away from it", () => {
      renderSideMenu();

      openDropdown("fence");
      clickAt(searchBox());

      expect(dropdownSkins("fence")).toEqual([]);

      openDropdown("fence");
      clickAt(screen.getByTestId("decorations-tab"));

      expect(dropdownSkins("fence")).toEqual([]);
    });

    it("opens the next dropdown when the user clicks its button while another is open", () => {
      renderSideMenu();

      openDropdown("fence");
      clickAt(
        within(shownRow("scarecrow")).getByTestId(
          "equipment-dropdown--trigger",
        ),
      );

      expect(dropdownSkins("fence")).toEqual([]);
      expect(dropdownSkins("scarecrow")).toEqual(items.scarecrow.skinOrder);
    });
  });

  describe("search", () => {
    it("has the search box at the top of the list frame, out of the rows that scroll", () => {
      renderSideMenu();

      const listFrame = searchBox().closest(".sdv-list");

      expect(searchBox().getAttribute("aria-label")).toBe("Search");
      expect(listFrame?.firstElementChild).toBe(
        searchBox().closest(".NameField"),
      );
      expect(searchBox().closest("[role='tabpanel']")).toBeNull();
      expect(
        ["crops", "items", "decorations"].map(
          (tabId) => list(tabId).parentElement,
        ),
      ).toEqual([listFrame, listFrame, listFrame]);
    });

    it("has no length limit", () => {
      renderSideMenu();

      expect(searchBox().hasAttribute("maxlength")).toBe(false);
    });

    it("filters the open tab", () => {
      renderSideMenu();

      fireEvent.click(screen.getByTestId("items-tab"));
      search("keg");

      expect(visibleItemIds("items")).toEqual(["keg"]);
    });

    it("keeps the text when the tab changes, and filters the new tab", () => {
      renderSideMenu();

      fireEvent.click(screen.getByTestId("items-tab"));
      search("wood");
      fireEvent.click(screen.getByTestId("decorations-tab"));

      expect(searchBox().value).toBe("wood");
      expect(visibleItemIds("decorations")).toContain("wood_chair");
      expect(visibleItemIds("decorations")).not.toContain("plush_bunny");
    });

    it("finds the text in the middle of a name, in any case", () => {
      renderSideMenu(summer);

      search("ELO");

      expect(shownCropIds()).toEqual(["melon"]);
    });

    it("finds an item by the name of a skin in its dropdown", () => {
      renderSideMenu();

      search("gate");

      expect(visibleItemIds("items")).toEqual(["fence"]);
    });

    it("shows the first skin that matches when the picked skin does not match", () => {
      renderSideMenu();

      search("IRON");

      expect(visibleRows("items")).toContain("equipment-fence--iron_fence");
    });

    it("shows the picked skin when its name matches", () => {
      renderSideMenu();

      pickSkin("fence", "hardwood_fence");
      search("fence");

      expect(visibleRows("items")).toContain("equipment-fence--hardwood_fence");
    });

    it("shows the picked skin again when the text is cleared", () => {
      renderSideMenu();

      pickSkin("fence", "hardwood_fence");
      search("gate");

      expect(visibleRows("items")).toEqual(["equipment-fence--gate"]);

      search("");

      expect(visibleRows("items")).toContain("equipment-fence--hardwood_fence");
    });

    it("shows only the skins whose name matches in the dropdown", () => {
      renderSideMenu();

      search("stone");
      openDropdown("fence");

      expect(dropdownSkins("fence")).toEqual(["stone_fence"]);

      search("fence");

      expect(dropdownSkins("fence")).toEqual([
        "wood_fence",
        "stone_fence",
        "iron_fence",
        "hardwood_fence",
      ]);

      search("");

      expect(dropdownSkins("fence")).toEqual(items.fence.skinOrder);
    });

    it("shows the skin picked in the dropdown during a search, and keeps it after the text is cleared", () => {
      const selectEquipment = vitest.fn();

      render(() => (
        <SideMenu
          date={spring}
          selectCrop={vitest.fn()}
          selectEquipment={selectEquipment}
          selectTree={vitest.fn()}
        />
      ));

      search("fence");
      pickSkin("fence", "iron_fence");

      expect(selectEquipment).toHaveBeenCalledExactlyOnceWith(
        "fence",
        "iron_fence",
      );
      expect(visibleRows("items")).toContain("equipment-fence--iron_fence");

      search("");

      expect(visibleRows("items")).toContain("equipment-fence--iron_fence");
    });

    it("picks the skin that a search shows when the user selects its row", () => {
      const selectEquipment = vitest.fn();

      render(() => (
        <SideMenu
          date={spring}
          selectCrop={vitest.fn()}
          selectEquipment={selectEquipment}
          selectTree={vitest.fn()}
        />
      ));

      search("gate");
      fireEvent.click(screen.getByTestId("equipment-fence--gate"));
      search("");

      expect(selectEquipment).toHaveBeenCalledExactlyOnceWith("fence", "gate");
      expect(visibleRows("items")).toContain("equipment-fence--gate");
    });

    it("makes the tab icons with no matches transparent", () => {
      renderSideMenu();

      expect(fadedTabIds()).toEqual([]);

      search("parsnip");

      expect(fadedTabIds()).toEqual(["items", "decorations"]);

      search("keg");

      expect(fadedTabIds()).toEqual(["crops", "decorations"]);

      search("");

      expect(fadedTabIds()).toEqual([]);
    });

    it("hides the matching crops that are not in season", () => {
      renderSideMenu(spring);

      search("melon");

      expect(shownCropIds()).toEqual([]);
      expect(fadedTabIds()).toContain("crops");
    });

    it("lets the user select a matching crop", () => {
      const selectCrop = vitest.fn();

      render(() => (
        <SideMenu
          date={spring}
          selectCrop={selectCrop}
          selectEquipment={vitest.fn()}
          selectTree={vitest.fn()}
        />
      ));

      search("parsnip");
      fireEvent.click(screen.getByTestId("seed--parsnip"));

      expect(selectCrop).toHaveBeenCalledExactlyOnceWith("parsnip");
    });

    it("finds the trees by name, and hides the Trees heading when no tree matches", () => {
      renderSideMenu(winter);

      search("AP");

      expect(shownTreeIds()).toEqual(["apple", "apricot"]);
      expect(fadedTabIds()).not.toContain("crops");

      search("parsnip");

      expect(shownTreeIds()).toEqual([]);
      expect(headings(list("crops"))).toEqual([]);
    });

    it("shows only the crops in season again when the text is cleared", () => {
      renderSideMenu(spring);

      search("melon");
      search("");

      expect(shownCropIds()).not.toContain("melon");
      expect(shownCropIds()).toContain("parsnip");
    });

    it("shows empty lists, with no other rows, when nothing matches", () => {
      renderSideMenu();

      search("zzz");

      expect(shownCropIds()).toEqual([]);
      expect(visibleRows("items")).toEqual([]);
      expect(visibleRows("decorations")).toEqual([]);
      expect(
        ["crops", "items", "decorations"].map(
          (tabId) => list(tabId).children.length,
        ),
      ).toEqual([1, 1, 1]);
    });

    it("keeps the picked skin of an item that a search hides", () => {
      renderSideMenu();

      pickSkin("scarecrow", "rarecrow_110");
      search("keg");
      search("");

      expect(shownRows("items").map((row) => row.dataset.testid)).toContain(
        "equipment-scarecrow--rarecrow_110",
      );
    });

    it("keeps the text when Esc is pressed in the search box", () => {
      renderSideMenu();

      search("keg");
      fireEvent.keyDown(searchBox(), { key: "Escape" });

      expect(searchBox().value).toBe("keg");
      expect(visibleItemIds("items")).toEqual(["keg"]);
    });
  });
});
