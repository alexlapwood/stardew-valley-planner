import { fireEvent, render, screen } from "@solidjs/testing-library";
import { type ComponentProps, createSignal } from "solid-js";

import { items } from "../../../../data/game/items.json";
import EquipmentMenuItem from "./EquipmentMenuItem";

type TItemProps = ComponentProps<typeof EquipmentMenuItem>;

function renderItem(props: Partial<TItemProps> = {}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [selectedItem, setSelectedItem] = createSignal<ISelectedItem>();
  const selectEquipment = vitest.fn((equipmentId: string, skin: string) => {
    setSelectedItem({ id: equipmentId, skin, type: "equipment" });
  });

  const result = render(() => (
    <EquipmentMenuItem
      date={0}
      equipmentId="scarecrow"
      isOpen={isOpen()}
      selectEquipment={selectEquipment}
      selectedItem={selectedItem()}
      setIsOpen={setIsOpen}
      {...props}
    />
  ));

  return { ...result, isOpen, selectEquipment };
}

function trigger() {
  return screen.getByTestId("equipment-dropdown--trigger");
}

function shownRow(container: HTMLElement) {
  const row = container.querySelector<HTMLElement>(":scope > div > div");

  if (row === null) {
    throw new Error("The row is not there.");
  }

  return row;
}

function options(container: HTMLElement) {
  return container.querySelectorAll(".margin-left > .sdv-list-item");
}

describe("<EquipmentMenuItem />", () => {
  it("renders correctly", () => {
    const { container } = renderItem();

    expect(container).toMatchSnapshot();
  });

  it("selects the item when clicked", () => {
    const { selectEquipment } = renderItem();

    fireEvent.click(screen.getByTestId("equipment-scarecrow--scarecrow"));

    expect(selectEquipment).toHaveBeenCalledWith("scarecrow", "scarecrow");
  });

  describe("equipment with multiple skins", () => {
    it("shows extra skins when clicking the dropdown trigger", () => {
      const { container } = renderItem();

      fireEvent.click(trigger());

      expect(container.querySelectorAll(".sdv-list-item")).toHaveLength(
        items.scarecrow.skinOrder.length + 1,
      );
    });

    it("hides extra skins when clicking the dropdown trigger if the dropdown is already open", () => {
      const { container } = renderItem();

      fireEvent.click(trigger());
      fireEvent.click(trigger());

      expect(container.querySelectorAll(".sdv-list-item")).toHaveLength(1);
    });

    it("puts the dropdown trigger at the right end of the row", () => {
      const { container } = renderItem();

      expect(shownRow(container).lastElementChild).toBe(trigger());
    });

    it("has no dropdown trigger for an item with 1 skin", () => {
      renderItem({ equipmentId: "keg" });

      expect(screen.queryByTestId("equipment-dropdown--trigger")).toBeNull();
    });

    it("names the dropdown trigger after the shown skin for a screen reader, and tells if the list is open", () => {
      renderItem({ equipmentId: "fence" });

      expect(trigger().getAttribute("aria-label")).toBe("Skins for Wood Fence");
      expect(trigger().getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(trigger());

      expect(trigger().getAttribute("aria-expanded")).toBe("true");

      fireEvent.click(screen.getByTestId("equipment-fence--stone_fence"));

      expect(trigger().getAttribute("aria-label")).toBe(
        "Skins for Stone Fence",
      );
    });
  });

  it("updates the selected equipment when equipment is clicked", () => {
    const { selectEquipment } = renderItem();

    fireEvent.click(trigger());
    fireEvent.click(screen.getByTestId("equipment-scarecrow--rarecrow_110"));

    expect(selectEquipment).toHaveBeenCalledWith("scarecrow", "rarecrow_110");
  });

  describe("closing the dropdown", () => {
    it("closes when the user picks a skin", () => {
      const { container, isOpen } = renderItem();

      fireEvent.click(trigger());
      fireEvent.click(screen.getByTestId("equipment-scarecrow--rarecrow_110"));

      expect(isOpen()).toBe(false);
      expect(options(container)).toHaveLength(0);
      expect(shownRow(container).dataset.testid).toBe(
        "equipment-scarecrow--rarecrow_110",
      );
    });

    it("closes when the user selects the row", () => {
      const { container, isOpen, selectEquipment } = renderItem();

      fireEvent.click(trigger());
      fireEvent.click(shownRow(container));

      expect(isOpen()).toBe(false);
      expect(selectEquipment).toHaveBeenCalledExactlyOnceWith(
        "scarecrow",
        "scarecrow",
      );
    });

    it("closes when the user clicks away from it", () => {
      const { container, isOpen, selectEquipment } = renderItem();

      fireEvent.click(trigger());
      fireEvent.mouseDown(document.body);
      fireEvent.mouseUp(document.body);

      expect(isOpen()).toBe(false);
      expect(options(container)).toHaveLength(0);
      expect(selectEquipment).not.toHaveBeenCalled();
    });

    it("closes with Esc", () => {
      const { container, isOpen, selectEquipment } = renderItem();

      fireEvent.click(trigger());
      fireEvent.keyDown(document, { key: "Escape" });

      expect(isOpen()).toBe(false);
      expect(options(container)).toHaveLength(0);
      expect(selectEquipment).not.toHaveBeenCalled();
    });

    it("does not close another dropdown with Esc when its own is closed", () => {
      const setIsOpen = vitest.fn();
      renderItem({ isOpen: false, setIsOpen });

      fireEvent.keyDown(document, { key: "Escape" });

      expect(setIsOpen).not.toHaveBeenCalled();
    });

    it("stays open when the user presses inside it", () => {
      const { container, isOpen } = renderItem();

      fireEvent.click(trigger());

      const option = options(container)[1];

      fireEvent.mouseDown(option);
      fireEvent.mouseUp(option);

      expect(isOpen()).toBe(true);
    });

    it("does not close another dropdown when the closed row is selected", () => {
      const setIsOpen = vitest.fn();
      const { container } = renderItem({ isOpen: false, setIsOpen });

      fireEvent.click(shownRow(container));

      expect(setIsOpen).not.toHaveBeenCalled();
    });
  });

  it("shows the sprite of the current season for a seasonal item", () => {
    const summer = 28;
    const summerSprite =
      items.seasonal_plant.skins.seasonal_plant_184?.spritesBySeason?.summer;

    renderItem({ date: summer, equipmentId: "seasonal_plant" });

    const sprite = screen
      .getByTestId("equipment-seasonal_plant--seasonal_plant_184")
      .querySelector<HTMLElement>(".sprite");

    expect(summerSprite).toBeDefined();
    expect(sprite?.style.backgroundPosition).toBe(
      summerSprite
        ?.slice(0, 2)
        .map((position) => `-${position}px`)
        .join(" "),
    );
  });
});
