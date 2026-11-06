import { seasonNames } from "./date";
import { parseFarmMap } from "./farmMap";

export const farmIds = [
  "standard",
  "riverland",
  "forest",
  "hilltop",
  "wilderness",
  "four_corners",
  "beach",
  "meadowlands",
] as const;

export type TFarmId = (typeof farmIds)[number];

export const defaultFarmId: TFarmId = "standard";

const farmIdSet: ReadonlySet<string> = new Set(farmIds);

export function isFarmId(value: string): value is TFarmId {
  return farmIdSet.has(value);
}

const farmMaps = new Map<string, Promise<IFarmMap>>();
const images = new Map<string, Promise<HTMLImageElement>>();
const farmScenes = new Map<string, Promise<readonly IFarmScene[]>>();
const loadedFarmScenes = new Map<string, readonly IFarmScene[]>();

export function farmMapUrl(id: string) {
  return `${import.meta.env.BASE_URL}data/game/farms/${id}.json`;
}

export function tilesheetUrl(image: string) {
  return `${import.meta.env.BASE_URL}images/game/tilesheets/${image}.png`;
}

function loadOnce<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
) {
  const cached = cache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const promise = load();
  cache.set(key, promise);
  // A failed load must not stay in the cache, so that the next call tries
  // again. The caller still gets the rejection.
  void promise.catch(() => {
    cache.delete(key);
  });

  return promise;
}

async function fetchFarmMap(id: string) {
  const url = farmMapUrl(id);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Could not load ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return parseFarmMap(id, await response.json());
}

export function loadFarmMap(id: string) {
  return loadOnce(farmMaps, id, () => fetchFarmMap(id));
}

function loadImage(url: string) {
  return loadOnce(
    images,
    url,
    () =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          resolve(image);
        };
        image.onerror = () => {
          reject(new Error(`Could not load ${url}`));
        };
        image.src = url;
      }),
  );
}

export async function loadTilesheetImages(map: IFarmMap, season: string) {
  return Promise.all(
    map.tilesheets.map(async (sheet) => {
      const image = sheet.images[season];

      if (image === undefined) {
        throw new Error(
          `The ${sheet.id} tilesheet of the ${map.id} farm map has no ${season} image.`,
        );
      }

      return loadImage(tilesheetUrl(image));
    }),
  );
}

// All the seasons load before the farm shows, so that a change of season
// never shows the tiles of the last season while the new ones load.
async function fetchFarmScenes(id: string) {
  const map = await loadFarmMap(id);
  const scenes = await Promise.all(
    seasonNames.map(async (season): Promise<IFarmScene> => ({
      map,
      season,
      sheets: await loadTilesheetImages(map, season),
    })),
  );

  loadedFarmScenes.set(id, scenes);

  return scenes;
}

function findScene(scenes: readonly IFarmScene[] | undefined, season: string) {
  return scenes?.find((scene) => scene.season === season);
}

export function peekFarmScene(id: string, season: string) {
  return findScene(loadedFarmScenes.get(id), season);
}

// For a picture of the farm that never changes season, so the tilesheets of
// the other seasons do not load.
export async function loadOneSeasonScene(
  id: string,
  season: string,
): Promise<IFarmScene> {
  const loaded = peekFarmScene(id, season);

  if (loaded !== undefined) {
    return loaded;
  }

  const map = await loadFarmMap(id);

  return { map, season, sheets: await loadTilesheetImages(map, season) };
}

export async function loadFarmScene(id: string, season: string) {
  const scene = findScene(
    await loadOnce(farmScenes, id, () => fetchFarmScenes(id)),
    season,
  );

  if (scene === undefined) {
    throw new Error(`The ${id} farm map has no ${season} season.`);
  }

  return scene;
}
