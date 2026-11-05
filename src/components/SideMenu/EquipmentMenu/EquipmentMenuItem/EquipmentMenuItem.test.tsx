import { fireEvent, render, screen } from "@solidjs/testing-library";

import { items } from "../../../../data/game/items.json";
import EquipmentMenuItem from "./EquipmentMenuItem";

describe("<EquipmentMenuItem />", () => {
  it("renders correctly", () => {
    const { container } = render(() => (
      <EquipmentMenuItem
        date={0}
        equipmentId="scarecrow"
        selectEquipment={vitest.fn()}
      />
    ));

    expect(container).toMatchSnapshot();
  });

  it("selects the item when clicked", () => {
    const selectEquipment = vitest.fn();

    render(() => (
      <EquipmentMenuItem
        date={0}
        equipmentId="scarecrow"
        selectEquipment={selectEquipment}
      />
    ));

    fireEvent.click(screen.getByTestId("equipment-scarecrow--scarecrow"));

    expect(selectEquipment).toHaveBeenCalledWith("scarecrow", "scarecrow");
  });

  describe("equipment with multiple skins", () => {
    it("shows extra skins when clicking the dropdown trigger", () => {
      const selectEquipment = vitest.fn();
      const { container } = render(() => (
        <EquipmentMenuItem
          date={0}
          equipmentId="scarecrow"
          selectEquipment={selectEquipment}
        />
      ));

      fireEvent.click(screen.getByTestId("equipment-dropdown--trigger"));

      expect(container.querySelectorAll(".sdv-list-item")).toHaveLength(
        items.scarecrow.skinOrder.length + 1,
      );
    });

    it("hides extra skins when clicking the dropdown trigger if the dropdown is already open", () => {
      const selectEquipment = vitest.fn();
      const { container } = render(() => (
        <EquipmentMenuItem
          date={0}
          equipmentId="scarecrow"
          selectEquipment={selectEquipment}
        />
      ));

      fireEvent.click(screen.getByTestId("equipment-dropdown--trigger"));
      fireEvent.click(screen.getByTestId("equipment-dropdown--trigger"));

      expect(container.querySelectorAll(".sdv-list-item")).toHaveLength(1);
    });
  });

  it("updates the selected equipment when equipment is clicked", () => {
    const selectEquipment = vitest.fn();
    render(() => (
      <EquipmentMenuItem
        date={0}
        equipmentId="scarecrow"
        selectEquipment={selectEquipment}
      />
    ));

    fireEvent.click(screen.getByTestId("equipment-dropdown--trigger"));
    fireEvent.click(screen.getByTestId("equipment-scarecrow--rarecrow_110"));

    expect(selectEquipment).toHaveBeenCalledWith("scarecrow", "rarecrow_110");
  });

  it("shows the sprite of the current season for a seasonal item", () => {
    const summer = 28;
    const summerSprite =
      items.seasonal_plant.skins.seasonal_plant_184?.spritesBySeason?.summer;

    render(() => (
      <EquipmentMenuItem
        date={summer}
        equipmentId="seasonal_plant"
        selectEquipment={vitest.fn()}
      />
    ));

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
