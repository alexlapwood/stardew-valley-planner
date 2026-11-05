import { render } from "@solidjs/testing-library";

import { items } from "../../../data/game/items.json";
import EquipmentMenu from "./EquipmentMenu";
import { itemTabs } from "./itemTabs";

describe("<EquipmentMenu />", () => {
  it("renders correctly", () => {
    const { container } = render(() => (
      <EquipmentMenu
        date={0}
        equipmentIds={itemTabs.equipment.slice(0, 3)}
        isVisible={true}
        selectEquipment={vitest.fn()}
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
        isVisible={true}
        selectEquipment={vitest.fn()}
      />
    ));

    expect(container.querySelectorAll(".sdv-list-item")).toHaveLength(
      equipmentIds.length,
    );
  });
});

describe("itemTabs", () => {
  it("puts every item in exactly one tab", () => {
    const tabbedIds = [...itemTabs.equipment, ...itemTabs.decorations];

    expect(tabbedIds.toSorted()).toEqual(Object.keys(items).toSorted());
  });
});
