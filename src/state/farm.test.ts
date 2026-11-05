const storageKey = "stardewValleySeasonalPlannerV2";
const storageKeyV1 = "stardewValleySeasonalPlannerV1";

const cropV1 = {
  cropId: "cranberry",
  datePlanted: 56,
  type: "crop",
  x: 0,
  y: 0,
};

const sprinklerV1 = {
  dateInstalled: 0,
  equipmentId: "sprinkler",
  skinIndex: 1,
  type: "equipment",
  x: 2,
  y: 1,
};

const saveV1 = {
  crops: { 0: { 0: [cropV1] } },
  date: 3,
  equipment: {
    1: {
      2: [sprinklerV1],
      3: [{ ...sprinklerV1, equipmentId: "not_an_item", x: 3 }],
    },
  },
};

const crops = { 0: { 0: [{ ...cropV1, cropId: "cranberries" }] } };

const equipment = {
  1: {
    2: [
      {
        dateInstalled: 0,
        equipmentId: "sprinkler",
        skin: "quality_sprinkler",
        type: "equipment",
        x: 2,
        y: 1,
      },
    ],
    3: [],
  },
};

async function loadFarmState() {
  vi.resetModules();

  return import("./farm");
}

describe("Farm state", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts a new farm when nothing is saved", async () => {
    const state = await loadFarmState();

    expect(state.farmStore()).toEqual({ crops: {}, date: 0, equipment: {} });
  });

  it("loads a V1 save, saves it as V2 and keeps the V1 data", async () => {
    const savedV1 = JSON.stringify(saveV1);
    localStorage.setItem(storageKeyV1, savedV1);

    const state = await loadFarmState();

    expect(state.farmStore()).toEqual({ crops, date: 3, equipment });
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "")).toEqual({
      crops,
      date: 3,
      equipment,
      version: 2,
    });
    expect(localStorage.getItem(storageKeyV1)).toBe(savedV1);
    expect(localStorage.getItem(`${storageKeyV1}Backup`)).toBe(savedV1);
    expect(console.warn).toHaveBeenCalledWith(
      "Removed 1 bad items from the saved farm.",
      [
        {
          path: "equipment[1][3][0]",
          value: { ...sprinklerV1, equipmentId: "not_an_item", x: 3 },
        },
      ],
    );
  });

  it("loads the V2 save when there is one", async () => {
    localStorage.setItem(storageKeyV1, JSON.stringify(saveV1));
    localStorage.setItem(
      storageKey,
      JSON.stringify({ crops: {}, date: 7, equipment, version: 2 }),
    );

    const state = await loadFarmState();

    expect(state.farmStore()).toEqual({ crops: {}, date: 7, equipment });
  });

  it("saves a change with the V2 key", async () => {
    const state = await loadFarmState();

    state.setDate(9);

    expect(JSON.parse(localStorage.getItem(storageKey) ?? "")).toEqual({
      crops: {},
      date: 9,
      equipment: {},
      version: 2,
    });
  });
});
