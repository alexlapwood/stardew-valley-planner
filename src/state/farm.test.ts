import {
  makeTestFarmMapFile,
  mockFarmMapFetch,
} from "../__mocks__/testFarmMap";
import { farmIds } from "../helpers/farmMapLoader";
import { newFarmData } from "./plan";

const exportedFarms = import.meta.glob<IFarmMapFile>(
  "../../public/data/game/farms/{meadowlands,standard}.json",
  { eager: true, import: "default" },
);

function exportedFarm(id: string) {
  const file = exportedFarms[`../../public/data/game/farms/${id}.json`];

  if (file === undefined) {
    throw new Error(`There is no exported ${id} farm.`);
  }

  return file;
}

const saveAs = vi.hoisted(() => vi.fn<(data: Blob, name: string) => void>());
const loadFarmScene = vi.hoisted(() =>
  vi.fn<(farm: string, season: string) => Promise<void>>(),
);

vi.mock("file-saver", () => ({ default: saveAs }));

vi.mock("../helpers/farmMapLoader", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadFarmScene,
}));

const houseUpgrades: IPlannedHouseUpgrade[] = [
  { datePlaced: 2, level: 1 },
  { datePlaced: 5, level: 2 },
];

const greenhouseRepair: IPlannedRepair = { datePlaced: 20 };

const petBowlPaints: IPlannedPaint[] = [
  { datePainted: 3, skin: "stone_pet_bowl" },
];

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
    mockFarmMapFetch(
      Object.fromEntries(farmIds.map((id) => [id, makeTestFarmMapFile()])),
    );
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

  it("makes a new Meadowlands plan with the finished Coop and the fence with its gate from the farm file", async () => {
    mockFarmMapFetch({ meadowlands: exportedFarm("meadowlands") });
    const state = await loadFarmState();

    await state.planStore.addNewPlan("meadowlands", "Cows");

    const fences = Object.values(state.equipment()).flatMap((row) =>
      Object.values(row).flat(),
    );

    expect(state.planStore.planInfo()).toMatchObject({
      farm: "meadowlands",
      name: "Cows",
    });
    expect(state.buildings()).toEqual([
      { buildingId: "coop", datePlaced: 0, starter: true, x: 54, y: 9 },
    ]);
    expect(fences).toHaveLength(33);
    expect(
      fences.filter(
        ({ dateInstalled, equipmentId }) =>
          dateInstalled !== 0 || equipmentId !== "fence",
      ),
    ).toEqual([]);
    expect(
      fences.filter(({ skin }) => skin === "gate").map(({ x, y }) => [x, y]),
    ).toEqual([[62, 13]]);
  });

  it("makes a new plan with no buildings and no items on a farm with nothing in its start", async () => {
    mockFarmMapFetch({ standard: exportedFarm("standard") });
    const state = await loadFarmState();

    await state.planStore.addNewPlan("standard", "Home");

    expect(state.planStore.planInfo()).toMatchObject({ farm: "standard" });
    expect(state.buildings()).toEqual([]);
    expect(state.equipment()).toEqual({});
  });

  it("opens the last plan used after a reload, with its house upgrades, greenhouse repair and pet bowl paints", async () => {
    const first = await loadFarmState();
    const plan = await first.planStore.addPlan(newFarmData("forest"), "Woods");
    first.setDate(9);
    first.setHouseUpgrades(houseUpgrades);
    first.setGreenhouseRepair(greenhouseRepair);
    first.setPetBowlPaints(petBowlPaints);

    const second = await loadFarmState();

    expect(second.planStore.planInfo()).toEqual({
      farm: "forest",
      id: plan.id,
      name: "Woods",
    });
    expect(second.date()).toBe(9);
    expect(second.houseUpgrades()).toEqual(houseUpgrades);
    expect(second.greenhouseRepair()).toEqual(greenhouseRepair);
    expect(second.petBowlPaints()).toEqual(petBowlPaints);
    expect(second.planStore.plans()).toHaveLength(1);
  });

  it("saves the open plan as <plan name>.layout.json with its farm type, the dated upgrades and the pet bowl paints", async () => {
    const state = await loadFarmState();
    await state.planStore.addPlan(newFarmData("beach"), "My beach");
    state.setPetBowlPaints(petBowlPaints);
    state.setHouseUpgrades(houseUpgrades);
    state.setGreenhouseRepair(greenhouseRepair);

    state.savePlanFile();

    expect(saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      "My beach.layout.json",
    );
    expect(JSON.parse(await saveAs.mock.calls[0][0].text())).toEqual({
      buildings: [],
      crops: {},
      cutBushes: [],
      date: 0,
      equipment: {},
      farm: "beach",
      greenhouseRepair,
      houseUpgrades,
      petBowlPaints,
      version: 4,
    });
  });

  it("keeps the pet bowl paints and the dated upgrades of a saved file when the file is opened again", async () => {
    const state = await loadFarmState();
    await state.planStore.addPlan(
      {
        ...newFarmData("forest"),
        greenhouseRepair,
        houseUpgrades,
        petBowlPaints,
      },
      "Woods",
    );
    state.savePlanFile();
    const saved = saveAs.mock.calls[0][0];

    const plan = await state.planStore.addPlanFromFile(
      new File([await saved.text()], "Woods.layout.json"),
    );

    expect(plan).toMatchObject({
      greenhouseRepair,
      houseUpgrades,
      petBowlPaints,
    });
    expect(state.planStore.planInfo()?.id).toBe(plan?.id);
    expect(state.houseUpgrades()).toEqual(houseUpgrades);
    expect(state.petBowlPaints()).toEqual(petBowlPaints);
  });

  it("keeps only the cuts of the destroyable bushes of the farm map when a file opens, and reports the others", async () => {
    const file = makeTestFarmMapFile();
    file.farm.bushes = [
      { destroyable: true, size: "medium", x: 10, y: 5 },
      { destroyable: false, size: "small", x: 20, y: 5 },
    ];
    // The mock of the map loader keeps each map that a test loads, so this
    // test uses a farm that no other test loads.
    mockFarmMapFetch({ wilderness: file });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const state = await loadFarmState();
    const cutBushes: ICutBush[] = [
      { dateCut: 3, x: 10, y: 5 },
      { dateCut: 3, x: 20, y: 5 },
      { dateCut: 3, x: 11, y: 5 },
    ];

    const plan = await state.planStore.addPlanFromFile(
      new File(
        [
          JSON.stringify({
            ...newFarmData("wilderness"),
            cutBushes,
            version: 4,
          }),
        ],
        "Wild.layout.json",
      ),
    );

    expect(plan?.cutBushes).toEqual([cutBushes[0]]);
    expect(state.cutBushes()).toEqual([cutBushes[0]]);
    expect(warn).toHaveBeenCalledWith(
      "Removed 2 bad items from the opened plan.",
      [
        { path: "cutBushes[1]", value: cutBushes[1] },
        { path: "cutBushes[2]", value: cutBushes[2] },
      ],
    );
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
      [JSON.stringify({ ...newFarmData("meadowlands"), version: 4 })],
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
