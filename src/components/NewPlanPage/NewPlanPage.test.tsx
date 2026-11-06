import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import mockImages from "../../__helpers__/images";
import { farmIds, type TFarmId } from "../../helpers/farmMapLoader";
import type { IPlanSummary } from "../../state/plan";
import NewPlanPage from "./NewPlanPage";

interface IRenderOptions {
  createPlan?: (farm: TFarmId, name: string) => Promise<unknown>;
  goBack?: () => void;
  plans?: IPlanSummary[];
}

function renderPage({
  createPlan = () => Promise.resolve(),
  goBack,
  plans = [],
}: IRenderOptions = {}) {
  const createPlanMock = vi.fn(createPlan);
  const openFile = vi.fn<() => void>();

  render(() => (
    <NewPlanPage
      createPlan={createPlanMock}
      goBack={goBack}
      images={mockImages}
      openFile={openFile}
      plans={plans}
    />
  ));

  return { createPlan: createPlanMock, openFile };
}

function nameField() {
  return screen.getByTestId<HTMLInputElement>("new-plan--name");
}

function typeName(name: string) {
  fireEvent.input(nameField(), { target: { value: name } });
}

function selectFarm(farm: TFarmId) {
  fireEvent.click(screen.getByTestId(`new-plan--farm-${farm}`));
}

function clickCreate() {
  fireEvent.click(screen.getByTestId("new-plan--create"));
}

function growClasses(testId: string) {
  return Array.from(screen.getByTestId(testId).classList).filter((name) =>
    name.startsWith("sdv-grow-from-"),
  );
}

// The previews are not part of these tests, so their farm maps never load.
beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockReturnValue(
    new Promise<Response>(() => {}),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("<NewPlanPage />", () => {
  it("shows a preview of each of the 8 farms, with the Standard Farm selected", () => {
    renderPage();

    farmIds.forEach((farm) => {
      expect(screen.getByTestId(`new-plan--farm-${farm}`)).toBeTruthy();
      expect(screen.getByTestId(`farm-preview-${farm}`)).toBeTruthy();
    });
    expect(
      screen
        .getByTestId("new-plan--farm-standard")
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("starts the name with the name of the selected farm, and changes it with the farm", () => {
    renderPage();

    expect(nameField().value).toBe("Standard Farm");

    selectFarm("beach");

    expect(nameField().value).toBe("Beach Farm");
    expect(
      screen.getByTestId("new-plan--farm-beach").getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByTestId("new-plan--farm-standard")
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("adds the next number to the name when a plan has the farm name", () => {
    renderPage({
      plans: [
        { farm: "beach", id: "b1", name: "Beach Farm" },
        { farm: "standard", id: "s1", name: "Beach Farm 2" },
      ],
    });

    selectFarm("beach");

    expect(nameField().value).toBe("Beach Farm 3");
  });

  it("keeps the name that the user typed when another farm is selected", () => {
    renderPage();

    typeName("Ancient fruit run");
    selectFarm("forest");

    expect(nameField().value).toBe("Ancient fruit run");
  });

  it.each([
    ["empty", ""],
    ["only spaces", "   "],
  ])("fills the name from the selected farm when it is %s", (_, name) => {
    renderPage();

    typeName("Ancient fruit run");
    typeName(name);
    selectFarm("forest");

    expect(nameField().value).toBe("Forest Farm");

    selectFarm("beach");

    expect(nameField().value).toBe("Beach Farm");
  });

  it("limits the name to 48 letters", () => {
    renderPage();

    expect(nameField().maxLength).toBe(48);
  });

  it("makes the plan on the selected farm with the name", () => {
    const { createPlan } = renderPage();

    selectFarm("hilltop");
    clickCreate();

    expect(createPlan).toHaveBeenCalledExactlyOnceWith(
      "hilltop",
      "Hill-top Farm",
    );
  });

  it("makes the plan with the typed name, with no spaces at the ends, when Enter is pressed", () => {
    const { createPlan } = renderPage();

    typeName("  Fish pond  ");
    fireEvent.keyDown(nameField(), { key: "Enter" });

    expect(createPlan).toHaveBeenCalledExactlyOnceWith("standard", "Fish pond");
  });

  it.each([
    ["empty", ""],
    ["only spaces", "   "],
  ])("turns Create plan off when the name is %s", (_, name) => {
    const { createPlan } = renderPage();

    typeName(name);
    clickCreate();
    fireEvent.keyDown(nameField(), { key: "Enter" });

    expect(
      screen.getByTestId("new-plan--create").getAttribute("aria-disabled"),
    ).toBe("true");
    expect(createPlan).not.toHaveBeenCalled();
  });

  it("makes only one plan while the new plan gets ready", () => {
    const { createPlan } = renderPage({
      createPlan: () => new Promise(() => {}),
    });

    clickCreate();
    clickCreate();

    expect(createPlan).toHaveBeenCalledTimes(1);
  });

  it("keeps the name while the new plan joins the plan list", () => {
    const [plans, setPlans] = createSignal<IPlanSummary[]>([]);
    const createPlan = vi.fn((farm: TFarmId, name: string) => {
      setPlans([{ farm, id: "new", name }]);
      return new Promise(() => {});
    });

    render(() => (
      <NewPlanPage
        createPlan={createPlan}
        images={mockImages}
        openFile={() => undefined}
        plans={plans()}
      />
    ));
    clickCreate();

    expect(createPlan).toHaveBeenCalledTimes(1);
    expect(nameField().value).toBe("Standard Farm");
  });

  it("has no Back button when there is no plan to go back to", () => {
    renderPage();

    expect(screen.queryByTestId("new-plan--back")).toBeNull();
  });

  it("goes back with the Back button", () => {
    const goBack = vi.fn<() => void>();
    const { createPlan } = renderPage({ goBack });

    fireEvent.click(screen.getByTestId("new-plan--back"));

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(createPlan).not.toHaveBeenCalled();
  });

  it("grows Back and Open away from their corners of the page on hover", () => {
    renderPage({ goBack: () => undefined });

    expect(growClasses("new-plan--back")).toEqual(["sdv-grow-from-top-left"]);
    expect(growClasses("new-plan--open")).toEqual(["sdv-grow-from-top-right"]);
  });

  it.each([
    ["with no plans", undefined],
    ["with a Back button", () => undefined],
  ])("opens a file with the Open button, Ctrl+O and Cmd+O %s", (_, goBack) => {
    const { createPlan, openFile } = renderPage({ goBack });

    fireEvent.click(screen.getByTestId("new-plan--open"));
    fireEvent.keyDown(document, { ctrlKey: true, key: "o" });
    fireEvent.keyDown(document, { key: "o", metaKey: true });
    fireEvent.keyDown(document, { key: "o" });

    expect(openFile).toHaveBeenCalledTimes(3);
    expect(createPlan).not.toHaveBeenCalled();
  });
});
