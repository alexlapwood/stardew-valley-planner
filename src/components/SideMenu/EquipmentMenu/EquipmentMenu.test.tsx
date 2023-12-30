import { fireEvent, render, screen } from "@solidjs/testing-library";

import { equipmentIds } from "../../../data/sdv.json";
import EquipmentMenu from "./EquipmentMenu";

describe("<EquipmentMenu />", () => {
  it("renders correctly", () => {
    const { container } = render(() => (
      <EquipmentMenu
        date={0}
        isVisible={true}
        range={{ to: 2 }}
        selectEquipment={vitest.fn()}
      />
    ));

    expect(container).toMatchSnapshot();
  });

  describe("speciying a range", () => {
    it("renders the items up to and including range.to", () => {
      const to = 4;

      const { container } = render(() => (
        <EquipmentMenu
          date={0}
          isVisible={true}
          range={{ to }}
          selectEquipment={vitest.fn()}
        />
      ));

      expect(container.querySelectorAll(".sdv-list-item")).toHaveLength(to + 1);
    });

    it("only renders the items from range.from onwards", () => {
      const from = 4;

      const { container } = render(() => (
        <EquipmentMenu
          date={0}
          isVisible={true}
          range={{ from }}
          selectEquipment={vitest.fn()}
        />
      ));

      expect(container.querySelectorAll(".sdv-list-item")).toHaveLength(
        equipmentIds.length - 4
      );
    });

    it("only renders the items in the range", () => {
      const from = 2;
      const to = 4;
      const { container } = render(() => (
        <EquipmentMenu
          date={0}
          isVisible={true}
          range={{ from, to }}
          selectEquipment={vitest.fn()}
        />
      ));

      expect(container.querySelectorAll(".sdv-list-item")).toHaveLength(
        to - from + 1
      );
    });
  });
});
