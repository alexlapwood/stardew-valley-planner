import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import { readTooltip } from "../../../__helpers__/tooltip";
import { getBuildingTooltip } from "../../../helpers/buildingTooltip";
import { getTooltipText } from "../../../helpers/tooltip";
import BuildingMenu from "./BuildingMenu";

function renderBuildingMenu() {
  render(() => <BuildingMenu date={0} selectItem={vitest.fn()} />);
}

// The menu gets the item that it selects back, as the planner does.
function renderSelectingMenu() {
  const [selectedItem, setSelectedItem] = createSignal<ISelectedItem>();
  const selectItem = vitest.fn((item: ISelectedItem) => {
    setSelectedItem(item);
  });

  render(() => (
    <BuildingMenu
      date={0}
      selectItem={selectItem}
      selectedItem={selectedItem()}
    />
  ));

  return { selectedItem, selectItem };
}

const slider = (regionId: string, channel: string) =>
  screen.getByTestId<HTMLInputElement>(`paint-slider--${regionId}--${channel}`);

const noPaintBox = (regionId: string) =>
  screen.getByTestId<HTMLInputElement>(`paint-no-paint--${regionId}`);

function moveSlider(regionId: string, channel: string, value: number) {
  fireEvent.input(slider(regionId, channel), { target: { value } });
}

const tooltip = (testId: string) => readTooltip(screen.getByTestId(testId));

const fontStart = 32;
const letterWidth = 8;

// BigText draws the name as a sprite from the font for each letter.
function rowName(testId: string) {
  return Array.from(
    screen
      .getByTestId(testId)
      .querySelectorAll<HTMLElement>(".BigText .sprite"),
    ({ style }) =>
      String.fromCodePoint(
        Math.abs(Number(style.backgroundPosition.split("px")[0])) /
          letterWidth +
          fontStart,
      ),
  ).join("");
}

describe("<BuildingMenu />", () => {
  it("shows the cost tooltip on each row that can be selected", () => {
    renderBuildingMenu();

    expect(tooltip("building--big_barn")).toBe(
      getTooltipText(getBuildingTooltip({ id: "big_barn", type: "building" })),
    );
    expect(tooltip("house-upgrade--2")).toBe(
      getTooltipText(getBuildingTooltip({ id: "2", type: "houseUpgrade" })),
    );
    expect(tooltip("greenhouse-repair")).toBe(
      getTooltipText(
        getBuildingTooltip({ id: "greenhouse", type: "greenhouseRepair" }),
      ),
    );
  });

  it("draws the game icon of each material in the cost tooltip", () => {
    renderBuildingMenu();

    fireEvent.focusIn(screen.getByTestId("building--barn"));

    expect(
      Array.from(
        screen
          .getByRole("tooltip")
          .querySelectorAll<HTMLElement>(".FitSprite .sprite"),
        ({ style }) => [style.backgroundImage, style.backgroundPosition],
      ),
    ).toEqual([
      ['url("images/game/materials.png")', "-176px 0px"],
      ['url("images/game/materials.png")', "-192px 0px"],
    ]);
  });

  it("shows no tooltip on the farmhouse and greenhouse rows, which cannot be selected", () => {
    renderBuildingMenu();

    expect(tooltip("fixed-building--farmhouse")).toBeNull();
    expect(tooltip("fixed-building--greenhouse")).toBeNull();
  });

  it("shows the name of the picked skin on the row, and not in the tooltip", () => {
    renderBuildingMenu();

    expect(rowName("building--cabin")).toBe("Cabin");

    fireEvent.click(screen.getByTestId("building-skin--cabin--next"));

    expect(rowName("building--cabin")).toBe("Beach Cabin");
    expect(tooltip("building--cabin")).toBe(
      getTooltipText(
        getBuildingTooltip({
          id: "cabin",
          skin: "beach_cabin",
          type: "building",
        }),
      ),
    );
    expect(tooltip("building--cabin")).not.toContain("Cabin");
  });

  describe("the Paint row", () => {
    it("is the first row, with no tooltip, and shows no paint controls until it is selected", () => {
      renderBuildingMenu();

      expect(
        screen
          .getAllByTestId(/^(paint|building--barn)$/u)
          .map((row) => row.dataset.testid),
      ).toEqual(["paint", "building--barn"]);
      expect(tooltip("paint")).toBeNull();
      expect(screen.queryByTestId("paint-menu")).toBeNull();
    });

    it("selects the paint with no colours, and shows a box of 3 sliders for each region of the game", () => {
      const { selectItem } = renderSelectingMenu();

      fireEvent.click(screen.getByTestId("paint"));

      expect(selectItem).toHaveBeenCalledExactlyOnceWith({
        colors: {},
        id: "paint",
        type: "paint",
      });
      expect(
        screen
          .getAllByRole("group")
          .map((group) => group.getAttribute("aria-label")),
      ).toEqual(["Building", "Roof", "Trim"]);
      expect(
        ["hue", "saturation", "lightness"].map((channel) => {
          const { max, min } = slider("Roof", channel);

          return [min, max];
        }),
      ).toEqual([
        ["0", "360"],
        ["0", "75"],
        ["0", "100"],
      ]);
    });

    it("starts each region with no paint, with the sliders where the game starts them", () => {
      renderSelectingMenu();

      fireEvent.click(screen.getByTestId("paint"));

      expect(noPaintBox("Building").checked).toBe(true);
      expect(
        ["hue", "saturation", "lightness"].map(
          (channel) => slider("Building", channel).value,
        ),
      ).toEqual(["0", "75", "50"]);
      expect(screen.getByTestId("paint-swatch--Building").classList).toContain(
        "hidden",
      );
    });

    it("paints a region from the first move of a slider, with the other sliders where they were", () => {
      const { selectItem } = renderSelectingMenu();

      fireEvent.click(screen.getByTestId("paint"));
      moveSlider("Roof", "hue", 200);

      expect(selectItem).toHaveBeenLastCalledWith({
        colors: { Roof: { hue: 200, lightness: 50, saturation: 75 } },
        id: "paint",
        type: "paint",
      });
      expect(noPaintBox("Roof").checked).toBe(false);
      expect(screen.getByTestId("paint-swatch--Roof").classList).not.toContain(
        "hidden",
      );

      moveSlider("Roof", "lightness", 20);

      expect(selectItem).toHaveBeenLastCalledWith({
        colors: { Roof: { hue: 200, lightness: 20, saturation: 75 } },
        id: "paint",
        type: "paint",
      });
    });

    it("takes the paint off a region with its box, and puts the sliders back", () => {
      const { selectItem } = renderSelectingMenu();

      fireEvent.click(screen.getByTestId("paint"));
      moveSlider("Trim", "saturation", 10);
      fireEvent.click(noPaintBox("Trim"));

      expect(selectItem).toHaveBeenLastCalledWith({
        colors: {},
        id: "paint",
        type: "paint",
      });
      expect(slider("Trim", "saturation").value).toBe("75");

      fireEvent.click(noPaintBox("Trim"));

      expect(selectItem).toHaveBeenLastCalledWith({
        colors: { Trim: { hue: 0, lightness: 50, saturation: 75 } },
        id: "paint",
        type: "paint",
      });
    });

    it("keeps the colours when another row is selected and the Paint row is selected again", () => {
      const { selectItem } = renderSelectingMenu();

      fireEvent.click(screen.getByTestId("paint"));
      moveSlider("Building", "hue", 90);
      fireEvent.click(screen.getByTestId("building--barn"));

      expect(screen.queryByTestId("paint-menu")).toBeNull();

      fireEvent.click(screen.getByTestId("paint"));

      expect(selectItem).toHaveBeenLastCalledWith({
        colors: { Building: { hue: 90, lightness: 50, saturation: 75 } },
        id: "paint",
        type: "paint",
      });
      expect(slider("Building", "hue").value).toBe("90");
    });
  });

  it("shows the tooltip of the row while the focus is on a skin arrow", () => {
    renderBuildingMenu();

    const arrow = screen.getByTestId("building-skin--cabin--next");

    fireEvent.focusIn(arrow);

    expect(screen.getByRole("tooltip").getAttribute("aria-label")).toBe(
      getTooltipText(
        getBuildingTooltip({ id: "cabin", skin: "cabin", type: "building" }),
      ),
    );
    expect(
      screen.getByTestId("building--cabin").getAttribute("aria-describedby"),
    ).toBe(screen.getByRole("tooltip").id);
  });
});
