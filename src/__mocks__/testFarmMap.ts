import { decodeFarmMap } from "../helpers/farmMap";

const tillableBuildableAndFloorable = "z";

export const testRuleFlags: IFarmRuleFlags = {
  blocked: 16,
  buildable: 2,
  floorable: 32,
  noSprinklers: 8,
  tillable: 1,
  water: 4,
};

const testWaterTints: IFarmWater["tints"] = {
  fall: [255, 131, 201, 127],
  spring: [120, 201, 255, 127],
  summer: [60, 241, 255, 127],
  winter: [131, 80, 255, 127],
};

export const testSpots: IFarmSpots = {
  farmhouse: { height: 5, width: 9, x: 59, y: 12 },
  greenhouse: { height: 6, width: 7, x: 25, y: 10 },
  petBowl: { height: 2, width: 2, x: 53, y: 7 },
  shippingBin: { height: 1, width: 2, x: 71, y: 14 },
};

export function makeTestFarmMapFile(width = 80, height = 65): IFarmMapFile {
  return {
    farm: {
      animations: [],
      greenhousePath: [],
      height,
      layers: [],
      map: "Farm_Test",
      name: "Test Farm",
      rules: {
        flags: testRuleFlags,
        rows: Array.from({ length: height }, () =>
          tillableBuildableAndFloorable.repeat(width),
        ),
      },
      spots: structuredClone(testSpots),
      tilesheets: [],
      tillable: width * height,
      water: { tints: structuredClone(testWaterTints) },
      width,
    },
    gameVersion: "1.6.15",
  };
}

export const testFarmMapFile = makeTestFarmMapFile();

export const testFarmMap = decodeFarmMap("test", testFarmMapFile);

export function mockFarmMapFetch(files: Partial<Record<string, IFarmMapFile>>) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      const id = /data\/game\/farms\/([^/]+)\.json$/u.exec(url)?.[1];
      const file = id === undefined ? undefined : files[id];

      return Promise.resolve(
        file === undefined
          ? new Response(null, { status: 404, statusText: "Not Found" })
          : Response.json(file),
      );
    });
}
