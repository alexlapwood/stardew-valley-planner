import { fireEvent, render, screen } from "@solidjs/testing-library";

import { equipmentIds } from "../../../../data/sdv.json";
import EquipmentMenuItem from "./EquipmentMenuItem";

describe("<EquipmentMenuItem />", () => {
  it("renders correctly", () => {
    const { container } = render(() => (
      <EquipmentMenuItem
        date={0}
        equipmentId={equipmentIds[0]}
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

    fireEvent.click(screen.getByTestId("equipment-scarecrow--0"));

    expect(selectEquipment).toHaveBeenCalledWith("scarecrow", 0);
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

      expect(container.querySelectorAll(".sdv-list-item")).toHaveLength(10);
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
    fireEvent.click(screen.getByTestId("equipment-scarecrow--1"));

    expect(selectEquipment).toBeCalledWith("scarecrow", 1);
  });
});
