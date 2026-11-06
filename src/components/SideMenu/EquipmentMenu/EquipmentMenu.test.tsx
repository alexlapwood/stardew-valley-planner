import { fireEvent, render, screen, within } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import EquipmentMenu from "./EquipmentMenu";

function openSkins(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(".margin-left > .sdv-list-item"),
    (option) => option.dataset.testid,
  );
}

describe("<EquipmentMenu />", () => {
  it("renders correctly", () => {
    const { container } = render(() => (
      <EquipmentMenu
        date={0}
        equipmentIds={["scarecrow", "sprinkler", "fence"]}
        selectEquipment={vitest.fn()}
        setOpenDropdownId={vitest.fn()}
      />
    ));

    expect(container).toMatchSnapshot();
  });

  it("renders one item for each equipment id", () => {
    const equipmentIds = ["keg", "cask", "loom"];

    const { container } = render(() => (
      <EquipmentMenu
        date={0}
        equipmentIds={equipmentIds}
        selectEquipment={vitest.fn()}
        setOpenDropdownId={vitest.fn()}
      />
    ));

    expect(container.querySelectorAll(".sdv-list-item")).toHaveLength(
      equipmentIds.length,
    );
  });

  it("opens only the dropdown of the open id", () => {
    const { container } = render(() => (
      <EquipmentMenu
        date={0}
        equipmentIds={["scarecrow", "sprinkler", "fence"]}
        openDropdownId="sprinkler"
        selectEquipment={vitest.fn()}
        setOpenDropdownId={vitest.fn()}
      />
    ));

    expect(openSkins(container)).toEqual([
      "equipment-sprinkler--sprinkler",
      "equipment-sprinkler--quality_sprinkler",
      "equipment-sprinkler--iridium_sprinkler",
    ]);
  });

  it("opens a dropdown by its item id, and closes it", () => {
    const [openDropdownId, setOpenDropdownId] = createSignal<string>();
    const changeOpenDropdownId = vitest.fn((id: string | undefined) => {
      setOpenDropdownId(id);
    });

    const { container } = render(() => (
      <EquipmentMenu
        date={0}
        equipmentIds={["scarecrow", "sprinkler", "fence"]}
        openDropdownId={openDropdownId()}
        selectEquipment={vitest.fn()}
        setOpenDropdownId={changeOpenDropdownId}
      />
    ));

    const fenceTrigger = within(
      screen.getByTestId("equipment-fence--wood_fence"),
    ).getByTestId("equipment-dropdown--trigger");

    fireEvent.click(fenceTrigger);

    expect(changeOpenDropdownId).toHaveBeenLastCalledWith("fence");

    fireEvent.click(fenceTrigger);

    expect(changeOpenDropdownId).toHaveBeenLastCalledWith(undefined);
    expect(openSkins(container)).toEqual([]);
  });
});
