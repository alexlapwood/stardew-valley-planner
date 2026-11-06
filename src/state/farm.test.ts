import { newFarmData } from "./plan";

const saveAs = vi.hoisted(() => vi.fn<(data: Blob, name: string) => void>());
const loadFarmScene = vi.hoisted(() =>
  vi.fn<(farm: string, season: string) => Promise<void>>(),
);

vi.mock("file-saver", () => ({ default: saveAs }));

vi.mock("../helpers/farmMapLoader", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadFarmScene,
}));

async function loadFarmState() {
  vi.resetModules();
  // vi.resetModules loads Solid again, and Solid warns when it finds the flag
  // that its first copy set.
  Reflect.deleteProperty(globalThis, "Solid$$");

  const state = await import("./farm");
  await state.planStore.start();

  return state;
}

describe("Farm state", () => {
  beforeEach(() => {
    localStorage.clear();
    saveAs.mockClear();
    loadFarmScene.mockReset();
    loadFarmScene.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens no plan and makes none when nothing is saved", async () => {
    const state = await loadFarmState();

    expect(state.planStore.plans()).toEqual([]);
    expect(state.planStore.planInfo()).toBeUndefined();
  });

  it("loads the farm map of a plan before the plan shows", async () => {
    const state = await loadFarmState();
    loadFarmScene.mockClear();

    await state.planStore.addPlan(
      { ...newFarmData("hilltop"), date: 30 },
      "Hills",
    );

    expect(loadFarmScene).toHaveBeenCalledWith("hilltop", "summer");
  });

  it("opens the last plan used after a reload", async () => {
    const first = await loadFarmState();
    const plan = await first.planStore.addPlan(newFarmData("forest"), "Woods");
    first.setDate(9);

    const second = await loadFarmState();

    expect(second.planStore.planInfo()).toEqual({
      farm: "forest",
      id: plan.id,
      looks: { greenhouse: "broken", house: 0, petBowl: "pet_bowl" },
      name: "Woods",
    });
    expect(second.date()).toBe(9);
    expect(second.planStore.plans()).toHaveLength(1);
  });

  it("saves the open plan as <plan name>.layout.json with its farm type and the looks picked last", async () => {
    const state = await loadFarmState();
    await state.planStore.addPlan(newFarmData("beach"), "My beach");
    state.planStore.setLooks({
      greenhouse: "repaired",
      house: 2,
      petBowl: "stone_pet_bowl",
    });

    state.savePlanFile();

    expect(saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      "My beach.layout.json",
    );
    expect(JSON.parse(await saveAs.mock.calls[0][0].text())).toEqual({
      crops: {},
      date: 0,
      equipment: {},
      farm: "beach",
      looks: { greenhouse: "repaired", house: 2, petBowl: "stone_pet_bowl" },
      version: 3,
    });
  });

  it("keeps the looks of a saved file when the file is opened again", async () => {
    const looks: IFarmLooks = {
      greenhouse: "repaired",
      house: 1,
      petBowl: "hay_pet_bowl",
    };
    const state = await loadFarmState();
    await state.planStore.addPlan(newFarmData("forest", looks), "Woods");
    state.savePlanFile();
    const saved = saveAs.mock.calls[0][0];

    const plan = await state.planStore.addPlanFromFile(
      new File([await saved.text()], "Woods.layout.json"),
    );

    expect(plan?.looks).toEqual(looks);
    expect(state.planStore.planInfo()).toMatchObject({ id: plan?.id, looks });
  });

  it("opens the picked file as a new plan", async () => {
    const state = await loadFarmState();
    const { id: firstPlanId } = await state.planStore.addPlan(
      newFarmData("standard"),
      "Home",
    );
    const click = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);
    const file = new File(
      [JSON.stringify({ ...newFarmData("meadowlands"), version: 3 })],
      "Cows.layout.json",
    );

    state.openPlanFile();

    const input = click.mock.contexts[0];

    if (!(input instanceof HTMLInputElement)) {
      throw new TypeError("The file picker did not open");
    }

    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change"));

    await vi.waitFor(() => {
      expect(state.planStore.plans()).toHaveLength(2);
    });
    expect(state.planStore.planInfo()).toMatchObject({
      farm: "meadowlands",
      name: "Cows",
    });
    expect(state.planStore.planInfo()?.id).not.toBe(firstPlanId);
  });
});
