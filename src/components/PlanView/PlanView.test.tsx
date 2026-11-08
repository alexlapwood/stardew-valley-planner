import { fireEvent, render, screen } from "@solidjs/testing-library";

import mockImages from "../../__helpers__/images";
import {
  createMemoryPlanStorage,
  type IMemoryPlanStorage,
} from "../../__mocks__/memoryPlanStorage";
import { type IPlan, newFarmData } from "../../state/plan";
import { createPlanStore, type TPlanStore } from "../../state/planStore";
import Header from "../Header/Header";
import PlanView from "./PlanView";

function makePlan(id: string, fields: Partial<IPlan> = {}): IPlan {
  return { ...newFarmData("standard"), id, name: `Plan ${id}`, ...fields };
}

let storage: IMemoryPlanStorage;

async function startStore() {
  const store = createPlanStore(storage);
  await store.start();

  return store;
}

function renderPlanView(
  store: TPlanStore,
  openFile: () => void = () => undefined,
) {
  render(() => (
    <PlanView images={mockImages} openFile={openFile} store={store}>
      {(plan, openNewPlan) => (
        <div data-testid="editor">
          <Header
            changePlan={(id) => {
              void store.openPlan(id);
            }}
            deletePlan={(id) => {
              void store.deletePlan(id);
            }}
            newPlan={openNewPlan}
            openFile={() => undefined}
            plan={plan()}
            plans={store.plans()}
            renamePlan={(id, name) => {
              void store.renamePlan(id, name);
            }}
            saveFile={() => undefined}
          />
        </div>
      )}
    </PlanView>
  ));
}

function isNewPlanPageShown() {
  return screen.queryByTestId("new-plan--name") !== null;
}

function planSwitcherLabel() {
  return screen.getByTestId("plan-switcher").getAttribute("aria-label");
}

function openNewPlanFromHeader() {
  fireEvent.click(screen.getByTestId("plan-switcher"));
  fireEvent.click(screen.getByTestId("plan-switcher--new-plan"));
}

function openCowsFile(store: TPlanStore) {
  return () => {
    void store.addPlanFromFile(
      new File(
        [JSON.stringify({ ...newFarmData("meadowlands"), version: 4 })],
        "Cows.layout.json",
      ),
    );
  };
}

function deleteFromHeader(id: string) {
  if (screen.queryByTestId("plan-switcher--list") === null) {
    fireEvent.click(screen.getByTestId("plan-switcher"));
  }
  fireEvent.click(screen.getByTestId(`plan-switcher--delete-${id}`));
  fireEvent.click(screen.getByTestId("plan-switcher--confirm-delete"));
}

beforeEach(() => {
  storage = createMemoryPlanStorage();
  // The farm previews are not part of these tests, so their maps never load.
  vi.spyOn(globalThis, "fetch").mockReturnValue(
    new Promise<Response>(() => {}),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("<PlanView />", () => {
  it("shows the New plan page with no Back button on the first visit, when there are no plans", async () => {
    renderPlanView(await startStore());

    expect(isNewPlanPageShown()).toBe(true);
    expect(screen.queryByTestId("new-plan--back")).toBeNull();
    expect(screen.queryByTestId("editor")).toBeNull();
  });

  it("opens the editor on the last plan used when there are plans", async () => {
    await storage.putPlan(makePlan("s"));
    await storage.putPlan(
      makePlan("b", { ...newFarmData("beach"), name: "Shells" }),
    );
    await storage.setLastPlanId("b");

    renderPlanView(await startStore());

    expect(isNewPlanPageShown()).toBe(false);
    expect(planSwitcherLabel()).toBe("Beach Farm > Shells");
  });

  it("opens the New plan page with a Back button from New plan in the plan switcher, and Back goes to the editor", async () => {
    await storage.putPlan(makePlan("s", { name: "Home" }));

    renderPlanView(await startStore());
    openNewPlanFromHeader();

    expect(isNewPlanPageShown()).toBe(true);
    expect(screen.queryByTestId("editor")).toBeNull();

    fireEvent.click(screen.getByTestId("new-plan--back"));

    expect(isNewPlanPageShown()).toBe(false);
    expect(planSwitcherLabel()).toBe("Standard Farm > Home");
  });

  it("makes an empty plan on the selected farm and opens it in the editor", async () => {
    const store = await startStore();
    renderPlanView(store);

    fireEvent.click(screen.getByTestId("new-plan--farm-forest"));
    fireEvent.click(screen.getByTestId("new-plan--create"));

    await vi.waitFor(() => {
      expect(screen.queryByTestId("editor")).not.toBeNull();
    });
    expect(isNewPlanPageShown()).toBe(false);
    expect(planSwitcherLabel()).toBe("Forest Farm > Forest Farm");
    expect(store.currentPlan()).toEqual({
      ...newFarmData("forest"),
      id: store.planInfo()?.id,
      name: "Forest Farm",
    });
    expect(await storage.listPlans()).toEqual(store.plans());
    expect(await storage.getLastPlanId()).toBe(store.planInfo()?.id);
  });

  it("makes a plan with the start of the selected farm", async () => {
    const start: IFarmStart = {
      buildings: [{ building: "coop", x: 54, y: 9 }],
      items: [{ item: "fence", skin: "gate", x: 62, y: 13 }],
    };
    const loadStart = vi.fn((_farm: string) => Promise.resolve(start));
    const store = createPlanStore(storage, undefined, loadStart);
    await store.start();
    renderPlanView(store);

    fireEvent.click(screen.getByTestId("new-plan--farm-meadowlands"));
    fireEvent.click(screen.getByTestId("new-plan--create"));

    await vi.waitFor(() => {
      expect(isNewPlanPageShown()).toBe(false);
    });
    expect(loadStart).toHaveBeenCalledExactlyOnceWith("meadowlands");
    expect(store.currentPlan()).toEqual({
      ...newFarmData("meadowlands", start),
      id: store.planInfo()?.id,
      name: "Meadowlands Farm",
    });
  });

  it("opens a plan from a file on the first visit, and shows it in the editor", async () => {
    const store = await startStore();
    renderPlanView(store, openCowsFile(store));

    fireEvent.click(screen.getByTestId("new-plan--open"));

    await vi.waitFor(() => {
      expect(screen.queryByTestId("editor")).not.toBeNull();
    });
    expect(isNewPlanPageShown()).toBe(false);
    expect(planSwitcherLabel()).toBe("Meadowlands Farm > Cows");
  });

  it("opens a plan from a file on the New plan page from the plan switcher, and shows it in the editor", async () => {
    await storage.putPlan(makePlan("s", { name: "Home" }));
    const store = await startStore();
    renderPlanView(store, openCowsFile(store));

    openNewPlanFromHeader();
    fireEvent.keyDown(document, { ctrlKey: true, key: "o" });

    await vi.waitFor(() => {
      expect(isNewPlanPageShown()).toBe(false);
    });
    expect(planSwitcherLabel()).toBe("Meadowlands Farm > Cows");
    expect(store.plans().map(({ name }) => name)).toEqual(["Home", "Cows"]);
  });

  it("stays on the New plan page when the file is not a plan", async () => {
    await storage.putPlan(makePlan("s", { name: "Home" }));
    const store = await startStore();
    let opening: Promise<unknown> | undefined;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderPlanView(store, () => {
      opening = store.addPlanFromFile(
        new File(["not json"], "Bad.layout.json"),
      );
    });

    openNewPlanFromHeader();
    fireEvent.click(screen.getByTestId("new-plan--open"));
    await opening;

    expect(opening).toBeDefined();
    expect(isNewPlanPageShown()).toBe(true);
    expect(store.plans().map(({ name }) => name)).toEqual(["Home"]);
  });

  it("makes a second plan from New plan with the next free name, and opens it", async () => {
    await storage.putPlan(makePlan("s", { name: "Standard Farm" }));
    const store = await startStore();
    renderPlanView(store);

    openNewPlanFromHeader();

    expect(screen.getByTestId<HTMLInputElement>("new-plan--name").value).toBe(
      "Standard Farm 2",
    );

    fireEvent.click(screen.getByTestId("new-plan--create"));

    await vi.waitFor(() => {
      expect(isNewPlanPageShown()).toBe(false);
    });
    expect(planSwitcherLabel()).toBe("Standard Farm > Standard Farm 2");
    expect(store.plans().map(({ name }) => name)).toEqual([
      "Standard Farm",
      "Standard Farm 2",
    ]);
  });

  it("shows the new name in the plan switcher after a rename with Enter", async () => {
    await storage.putPlan(makePlan("s", { name: "Home" }));
    const store = await startStore();
    renderPlanView(store);

    fireEvent.click(screen.getByTestId("plan-switcher"));
    fireEvent.click(screen.getByTestId("plan-switcher--rename-s"));
    fireEvent.input(screen.getByTestId("plan-switcher--name"), {
      target: { value: "Parsnip field" },
    });
    fireEvent.keyDown(screen.getByTestId("plan-switcher--name"), {
      key: "Enter",
    });

    expect(planSwitcherLabel()).toBe("Standard Farm > Parsnip field");
    expect(
      screen.getByTestId("plan-switcher--plan-s").getAttribute("aria-label"),
    ).toBe("Parsnip field");
    expect(await storage.listPlans()).toEqual([
      { farm: "standard", id: "s", name: "Parsnip field" },
    ]);
  });

  it("opens the last plan used when the open plan is deleted", async () => {
    await storage.putPlan(makePlan("s", { name: "Home" }));
    await storage.putPlan(
      makePlan("b", { ...newFarmData("beach"), name: "Shells" }),
    );
    await storage.putPlan(
      makePlan("f", { ...newFarmData("forest"), name: "Woods" }),
    );
    await storage.setLastPlanId("b");
    await storage.setLastPlanId("f");
    const store = await startStore();
    renderPlanView(store);

    deleteFromHeader("f");

    await vi.waitFor(() => {
      expect(planSwitcherLabel()).toBe("Beach Farm > Shells");
    });
    expect(isNewPlanPageShown()).toBe(false);
    expect(store.plans().map(({ id }) => id)).toEqual(["s", "b"]);
  });

  it("shows the New plan page with no Back button when the last plan is deleted", async () => {
    await storage.putPlan(makePlan("s", { name: "Home" }));
    await storage.putPlan(makePlan("t", { name: "Barn" }));
    const store = await startStore();
    renderPlanView(store);

    deleteFromHeader("t");
    deleteFromHeader("s");

    await vi.waitFor(() => {
      expect(isNewPlanPageShown()).toBe(true);
    });
    expect(screen.queryByTestId("new-plan--back")).toBeNull();
    expect(screen.queryByTestId("editor")).toBeNull();
    expect(await storage.listPlans()).toEqual([]);
    expect(storage.records.size).toBe(0);
  });
});
