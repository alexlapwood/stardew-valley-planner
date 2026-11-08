import { fireEvent, render, screen } from "@solidjs/testing-library";

import type { IPlanSummary } from "../../state/plan";
import Header from "./Header";

const plans: IPlanSummary[] = [
  { farm: "beach", id: "b1", name: "Beach Farm" },
  { farm: "standard", id: "s1", name: "My farm" },
  { farm: "beach", id: "b2", name: "Beach Farm" },
];

function renderHeader(plan = plans[1]) {
  const props = {
    changePlan: vi.fn<(id: string) => void>(),
    deletePlan: vi.fn<(id: string) => void>(),
    newPlan: vi.fn<() => void>(),
    openFile: vi.fn<() => void>(),
    renamePlan: vi.fn<(id: string, name: string) => void>(),
    saveFile: vi.fn<() => void>(),
  };

  const result = render(() => <Header {...props} plan={plan} plans={plans} />);

  return { ...props, ...result };
}

function openList() {
  fireEvent.click(screen.getByTestId("plan-switcher"));
}

function nameField() {
  return screen.getByTestId<HTMLInputElement>("plan-switcher--name");
}

function typeName(name: string) {
  fireEvent.input(nameField(), { target: { value: name } });
}

function isListOpen() {
  return screen.queryByTestId("plan-switcher--list") !== null;
}

function growClasses(testIds: string[]) {
  return testIds.map((testId) => [
    testId,
    Array.from(screen.getByTestId(testId).classList).filter((name) =>
      name.startsWith("sdv-grow-from-"),
    ),
  ]);
}

const leftButton = 0;
const middleButton = 1;

const buttonsBitByButton: Record<number, number> = {
  0: 1,
  1: 4,
};

const away = { clientX: 300, clientY: 300 };

interface IPoint {
  clientX: number;
  clientY: number;
}

function pressAway(button: number, path: IPoint[]) {
  const end = path.at(-1) ?? away;

  fireEvent.mouseDown(document.body, { button, ...away });
  path.forEach((point) => {
    fireEvent.mouseMove(document.body, {
      buttons: buttonsBitByButton[button],
      ...point,
    });
  });
  fireEvent.mouseUp(document.body, { button, ...end });
  // A browser also sends a click when the press and the release are on the
  // same element, after a drag too.
  fireEvent.click(document.body, { button, ...end });
}

function clickAway(shake = 0) {
  pressAway(leftButton, [
    { clientX: away.clientX + shake, clientY: away.clientY },
  ]);
}

describe("<Header />", () => {
  it("renders correctly", () => {
    const { container } = renderHeader();

    expect(container).toMatchSnapshot();
  });

  it("grows the buttons down on hover, and the buttons at the sides of the page away from the side", () => {
    renderHeader();

    expect(
      growClasses(["plan-switcher", "header--open", "header--save"]),
    ).toEqual([
      ["plan-switcher", ["sdv-grow-from-top-left"]],
      ["header--open", ["sdv-grow-from-top"]],
      ["header--save", ["sdv-grow-from-top-right"]],
    ]);
  });

  it("has no Upgrades button, because the Buildings tab has the house, greenhouse and pet bowl rows", () => {
    renderHeader();

    expect(screen.queryByTestId("header--upgrades")).toBeNull();
    expect(screen.queryByLabelText("Upgrades")).toBeNull();
  });

  it("shows the farm type and the plan name on the plan switcher", () => {
    renderHeader();

    expect(screen.getByTestId("plan-switcher").getAttribute("aria-label")).toBe(
      "Standard Farm > My farm",
    );
    expect(screen.getByTestId("plan-switcher").textContent).toContain("🌾");
  });

  it("lists the plans under the farms that have plans", () => {
    renderHeader();

    fireEvent.click(screen.getByTestId("plan-switcher"));

    const list = screen.getByTestId("plan-switcher--list");
    const rows = Array.from(
      list.querySelectorAll<HTMLElement>(
        ":scope > [data-testid^='plan-switcher--']",
      ),
      (row) => row.dataset.testid,
    );

    expect(rows).toEqual([
      "plan-switcher--heading-standard",
      "plan-switcher--plan-s1",
      "plan-switcher--heading-beach",
      "plan-switcher--plan-b1",
      "plan-switcher--plan-b2",
      "plan-switcher--new-plan",
    ]);
    expect(screen.getByTestId("plan-switcher--plan-s1").classList).toContain(
      "selected",
    );
  });

  it("changes to the plan that is clicked, and closes the list", () => {
    const { changePlan } = renderHeader();

    fireEvent.click(screen.getByTestId("plan-switcher"));
    fireEvent.click(screen.getByTestId("plan-switcher--plan-b2"));

    expect(changePlan).toHaveBeenCalledWith("b2");
    expect(screen.queryByTestId("plan-switcher--list")).toBeNull();
  });

  it("opens the New plan page from the last row, and closes the list", () => {
    const { changePlan, newPlan } = renderHeader();

    fireEvent.click(screen.getByTestId("plan-switcher"));
    fireEvent.click(screen.getByTestId("plan-switcher--new-plan"));

    expect(newPlan).toHaveBeenCalledTimes(1);
    expect(changePlan).not.toHaveBeenCalled();
    expect(screen.queryByTestId("plan-switcher--list")).toBeNull();
  });

  describe.each([
    ["plan switcher list", openList, isListOpen, "plan-switcher--list"],
  ])("closing the %s", (_, open, isOpen, listTestId) => {
    it("closes with a click away, also when the mouse shakes a little", () => {
      renderHeader();

      open();
      clickAway();

      expect(isOpen()).toBe(false);

      open();
      clickAway(3);

      expect(isOpen()).toBe(false);
    });

    it.each([
      ["a middle-button drag to pan", middleButton],
      ["a left-button drag to put items", leftButton],
    ])("stays open during %s away from it", (__, button) => {
      renderHeader();

      open();
      pressAway(button, [
        { clientX: 280, clientY: 290 },
        { clientX: 240, clientY: 250 },
      ]);

      expect(isOpen()).toBe(true);
    });

    it("stays open during a drag that comes back to where it started", () => {
      renderHeader();

      open();
      pressAway(middleButton, [{ clientX: 340, clientY: 300 }, away]);

      expect(isOpen()).toBe(true);
    });

    it("stays open after a click in it", () => {
      renderHeader();

      open();
      const list = screen.getByTestId(listTestId);
      fireEvent.mouseDown(list, away);
      fireEvent.mouseUp(list, away);

      expect(isOpen()).toBe(true);
    });

    it("closes with Esc", () => {
      renderHeader();

      open();
      fireEvent.keyDown(document, { key: "Escape" });

      expect(isOpen()).toBe(false);
    });
  });

  describe("rename", () => {
    it("changes the row to a name field with the plan name, and does not change the plan", () => {
      const { changePlan } = renderHeader();

      openList();
      fireEvent.click(screen.getByTestId("plan-switcher--rename-b2"));

      expect(nameField().value).toBe("Beach Farm");
      expect(document.activeElement).toBe(nameField());
      expect(screen.queryByTestId("plan-switcher--plan-b2")).toBeNull();
      expect(changePlan).not.toHaveBeenCalled();
    });

    it("keeps the row under the name field, so the list keeps its width", () => {
      renderHeader();

      openList();
      const rowContent = screen.getByTestId("plan-switcher--plan-b2").innerHTML;
      fireEvent.click(screen.getByTestId("plan-switcher--rename-b2"));

      const field = nameField().closest(".NameField");
      const row = field?.parentElement;
      const contentUnderField = Array.from(row?.children ?? [], (child) =>
        child === field ? "" : child.outerHTML,
      ).join("");

      expect(row?.classList).toContain("PlanRow");
      expect(contentUnderField).toBe(rowContent);
    });

    it("keeps the new name, with no spaces at the ends, when Enter is pressed", () => {
      const { renamePlan } = renderHeader();

      openList();
      fireEvent.click(screen.getByTestId("plan-switcher--rename-b2"));
      typeName("  Shell farm  ");
      fireEvent.keyDown(nameField(), { key: "Enter" });

      expect(renamePlan).toHaveBeenCalledExactlyOnceWith("b2", "Shell farm");
      expect(screen.queryByTestId("plan-switcher--name")).toBeNull();
      expect(isListOpen()).toBe(true);
    });

    it("cancels with Esc, and a second Esc closes the list", () => {
      const { renamePlan } = renderHeader();

      openList();
      fireEvent.click(screen.getByTestId("plan-switcher--rename-b2"));
      typeName("Shell farm");
      fireEvent.keyDown(nameField(), { key: "Escape" });

      expect(renamePlan).not.toHaveBeenCalled();
      expect(screen.queryByTestId("plan-switcher--name")).toBeNull();
      expect(
        screen.getByTestId("plan-switcher--plan-b2").getAttribute("aria-label"),
      ).toBe("Beach Farm");
      expect(isListOpen()).toBe(true);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(isListOpen()).toBe(false);
    });

    it("cancels when the list closes", () => {
      const { renamePlan } = renderHeader();

      openList();
      fireEvent.click(screen.getByTestId("plan-switcher--rename-b2"));
      typeName("Shell farm");
      clickAway();
      openList();

      expect(renamePlan).not.toHaveBeenCalled();
      expect(screen.queryByTestId("plan-switcher--name")).toBeNull();
    });

    it.each([
      ["empty", ""],
      ["only spaces", "   "],
    ])("does not keep a name that is %s", (_, name) => {
      const { renamePlan } = renderHeader();

      openList();
      fireEvent.click(screen.getByTestId("plan-switcher--rename-b2"));
      typeName(name);
      fireEvent.keyDown(nameField(), { key: "Enter" });

      expect(renamePlan).not.toHaveBeenCalled();
      expect(nameField().value).toBe(name);
    });

    it("limits the new name to 48 letters", () => {
      renderHeader();

      openList();
      fireEvent.click(screen.getByTestId("plan-switcher--rename-b2"));

      expect(nameField().maxLength).toBe(48);
    });

    it("does not rename when the name did not change", () => {
      const { renamePlan } = renderHeader();

      openList();
      fireEvent.click(screen.getByTestId("plan-switcher--rename-b2"));
      fireEvent.keyDown(nameField(), { key: "Enter" });

      expect(renamePlan).not.toHaveBeenCalled();
      expect(screen.queryByTestId("plan-switcher--name")).toBeNull();
    });
  });

  describe("delete", () => {
    it("asks first in the row, and deletes only after the Delete click", () => {
      const { changePlan, deletePlan } = renderHeader();

      openList();
      fireEvent.click(screen.getByTestId("plan-switcher--delete-b1"));

      expect(deletePlan).not.toHaveBeenCalled();
      expect(changePlan).not.toHaveBeenCalled();
      expect(
        screen.getByTestId("plan-switcher--plan-b1").getAttribute("aria-label"),
      ).toBe('Delete "Beach Farm"?');

      fireEvent.click(screen.getByTestId("plan-switcher--confirm-delete"));

      expect(deletePlan).toHaveBeenCalledExactlyOnceWith("b1");
      expect(changePlan).not.toHaveBeenCalled();
      expect(screen.queryByTestId("plan-switcher--confirm-delete")).toBeNull();
    });

    it("keeps the plan when Cancel is clicked", () => {
      const { changePlan, deletePlan } = renderHeader();

      openList();
      fireEvent.click(screen.getByTestId("plan-switcher--delete-b1"));
      fireEvent.click(screen.getByTestId("plan-switcher--cancel-delete"));

      expect(deletePlan).not.toHaveBeenCalled();
      expect(changePlan).not.toHaveBeenCalled();
      expect(
        screen.getByTestId("plan-switcher--plan-b1").getAttribute("aria-label"),
      ).toBe("Beach Farm");
      expect(isListOpen()).toBe(true);
    });

    it("keeps the plan when Esc is pressed", () => {
      const { deletePlan } = renderHeader();

      openList();
      fireEvent.click(screen.getByTestId("plan-switcher--delete-b1"));
      fireEvent.keyDown(document, { key: "Escape" });

      expect(deletePlan).not.toHaveBeenCalled();
      expect(screen.queryByTestId("plan-switcher--confirm-delete")).toBeNull();
      expect(isListOpen()).toBe(true);
    });

    it("asks in one row at a time", () => {
      renderHeader();

      openList();
      fireEvent.click(screen.getByTestId("plan-switcher--delete-b1"));
      fireEvent.click(screen.getByTestId("plan-switcher--rename-s1"));

      expect(screen.queryByTestId("plan-switcher--confirm-delete")).toBeNull();
      expect(nameField().value).toBe("My farm");
    });
  });

  it("opens and saves a file with the buttons", () => {
    const { openFile, saveFile } = renderHeader();

    fireEvent.click(screen.getByTestId("header--open"));
    fireEvent.click(screen.getByTestId("header--save"));

    expect(openFile).toHaveBeenCalledTimes(1);
    expect(saveFile).toHaveBeenCalledTimes(1);
  });

  it("opens and saves a file with Ctrl+O and Ctrl+S", () => {
    const { openFile, saveFile } = renderHeader();

    fireEvent.keyDown(document, { ctrlKey: true, key: "o" });
    fireEvent.keyDown(document, { key: "s", metaKey: true });
    fireEvent.keyDown(document, { key: "s" });

    expect(openFile).toHaveBeenCalledTimes(1);
    expect(saveFile).toHaveBeenCalledTimes(1);
  });
});
