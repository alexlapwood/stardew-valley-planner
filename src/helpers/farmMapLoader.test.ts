import {
  makeTestFarmMapFile,
  mockFarmMapFetch,
} from "../__mocks__/testFarmMap";
import {
  farmIds,
  isFarmId,
  loadFarmMap,
  loadFarmScene,
  loadOneSeasonScene,
  peekFarmScene,
} from "./farmMapLoader";

class LoadingImage {
  onerror?: () => void;
  onload?: () => void;
  private url = "";

  get src() {
    return this.url;
  }

  set src(url: string) {
    this.url = url;
    queueMicrotask(() => {
      if (url.includes("broken")) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }
}

function fileWithTilesheet(images: Partial<Record<string, string>>) {
  const file = makeTestFarmMapFile(2, 2);
  file.farm.tilesheets = [
    {
      columns: 4,
      firstGid: 1,
      id: "outdoors",
      images,
      rows: 4,
      seasonal: true,
      tileHeight: 16,
      tileWidth: 16,
    },
  ];

  return file;
}

beforeEach(() => {
  vi.stubGlobal("Image", LoadingImage);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("loadFarmMap", () => {
  it("fetches the farm map file under the base URL one time", async () => {
    const fetch = mockFarmMapFetch({ once: makeTestFarmMapFile(2, 2) });

    const first = await loadFarmMap("once");
    const second = await loadFarmMap("once");

    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      `${import.meta.env.BASE_URL}data/game/farms/once.json`,
    );
    expect(second).toBe(first);
    expect([first.id, first.width, first.height]).toEqual(["once", 2, 2]);
  });

  it("rejects when the file is not there, and fetches again on the next load", async () => {
    mockFarmMapFetch({});

    await expect(loadFarmMap("later")).rejects.toThrow(
      "Could not load /data/game/farms/later.json: 404 Not Found",
    );

    mockFarmMapFetch({ later: makeTestFarmMapFile(2, 2) });

    await expect(loadFarmMap("later")).resolves.toMatchObject({ id: "later" });
  });
});

const allSeasonImages = {
  fall: "fall_sheet",
  spring: "spring_sheet",
  summer: "summer_sheet",
  winter: "winter_sheet",
};

function sheetSources(scene: IFarmScene | undefined) {
  return scene?.sheets.map((sheet) => ("src" in sheet ? sheet.src : undefined));
}

describe("isFarmId", () => {
  it.each(farmIds)("knows the %s farm", (id) => {
    expect(isFarmId(id)).toBe(true);
  });

  it.each(["Standard", "test", "", "hill-top"])("does not know %j", (id) => {
    expect(isFarmId(id)).toBe(false);
  });
});

describe("loadOneSeasonScene", () => {
  it("loads only the tilesheet images of the season", async () => {
    mockFarmMapFetch({
      preview: fileWithTilesheet({ spring: "spring_sheet" }),
    });

    const scene = await loadOneSeasonScene("preview", "spring");

    expect(scene.season).toBe("spring");
    expect(sheetSources(scene)).toEqual([
      `${import.meta.env.BASE_URL}images/game/tilesheets/spring_sheet.png`,
    ]);
    expect(peekFarmScene("preview", "spring")).toBeUndefined();
  });

  it("gives the scene of a farm that is already loaded", async () => {
    mockFarmMapFetch({ loaded: fileWithTilesheet(allSeasonImages) });
    const scene = await loadFarmScene("loaded", "spring");

    await expect(loadOneSeasonScene("loaded", "spring")).resolves.toBe(scene);
  });
});

describe("loadFarmScene", () => {
  it("loads the tilesheet images of all four seasons at once and keeps the scenes", async () => {
    mockFarmMapFetch({ seasons: fileWithTilesheet(allSeasonImages) });

    const scene = await loadFarmScene("seasons", "summer");

    expect(scene.season).toBe("summer");
    expect(sheetSources(scene)).toEqual([
      `${import.meta.env.BASE_URL}images/game/tilesheets/summer_sheet.png`,
    ]);
    expect(peekFarmScene("seasons", "summer")).toBe(scene);
    expect(
      ["spring", "fall", "winter"].map((season) =>
        sheetSources(peekFarmScene("seasons", season)),
      ),
    ).toEqual([
      [`${import.meta.env.BASE_URL}images/game/tilesheets/spring_sheet.png`],
      [`${import.meta.env.BASE_URL}images/game/tilesheets/fall_sheet.png`],
      [`${import.meta.env.BASE_URL}images/game/tilesheets/winter_sheet.png`],
    ]);
    await expect(loadFarmScene("seasons", "summer")).resolves.toBe(scene);
    expect(peekFarmScene("seasons", "spring")?.map).toBe(scene.map);
  });

  it("gives the same scene to two loads at the same time", async () => {
    mockFarmMapFetch({ twice: fileWithTilesheet(allSeasonImages) });

    const [first, second] = await Promise.all([
      loadFarmScene("twice", "fall"),
      loadFarmScene("twice", "fall"),
    ]);

    expect(second).toBe(first);
  });

  it("rejects when a tilesheet has no image for one of the seasons", async () => {
    mockFarmMapFetch({
      springOnly: fileWithTilesheet({ spring: "spring_sheet" }),
    });

    await expect(loadFarmScene("springOnly", "spring")).rejects.toThrow(
      "The outdoors tilesheet of the springOnly farm map has no summer image.",
    );
    expect(peekFarmScene("springOnly", "spring")).toBeUndefined();
  });

  it("rejects when a tilesheet image does not load", async () => {
    mockFarmMapFetch({
      broken: fileWithTilesheet({ ...allSeasonImages, fall: "broken_sheet" }),
    });

    await expect(loadFarmScene("broken", "spring")).rejects.toThrow(
      "Could not load /images/game/tilesheets/broken_sheet.png",
    );
    expect(peekFarmScene("broken", "spring")).toBeUndefined();
  });

  it("rejects when the season is not one of the four", async () => {
    mockFarmMapFetch({ odd: fileWithTilesheet(allSeasonImages) });

    await expect(loadFarmScene("odd", "monsoon")).rejects.toThrow(
      "The odd farm map has no monsoon season.",
    );
  });
});
