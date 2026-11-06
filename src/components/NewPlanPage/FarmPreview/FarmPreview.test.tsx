import { render, screen } from "@solidjs/testing-library";

import mockImages from "../../../__helpers__/images";
import {
  makeTestFarmMapFile,
  mockFarmMapFetch,
} from "../../../__mocks__/testFarmMap";
import FarmPreview from "./FarmPreview";

const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();

beforeEach(() => {
  drawImage.mockClear();

  // jsdom has no 2D context, so the preview would not draw.
  const context = {
    clearRect: vi.fn(),
    drawImage,
    fillRect: vi.fn(),
    fillStyle: "#000000",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    restore: vi.fn(),
    save: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    (() => context) as unknown as HTMLCanvasElement["getContext"],
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function previewCanvas() {
  return screen.getByTestId<HTMLCanvasElement>("farm-preview-beach");
}

describe("<FarmPreview />", () => {
  it("loads the farm map only when it shows, and draws the map at a quarter of its size", async () => {
    const fetch = mockFarmMapFetch({ beach: makeTestFarmMapFile(110, 100) });

    expect(fetch).not.toHaveBeenCalled();

    render(() => <FarmPreview farm="beach" images={mockImages} />);

    await vi.waitFor(() => {
      expect([previewCanvas().width, previewCanvas().height]).toEqual([
        440, 400,
      ]);
    });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      `${import.meta.env.BASE_URL}data/game/farms/beach.json`,
    );

    const copies = drawImage.mock.calls.filter(
      ([, ...rect]) => rect.join() === "0,0,440,400",
    );

    expect(copies).toHaveLength(2);
    copies.forEach(([source]) => {
      expect(source).toBeInstanceOf(HTMLCanvasElement);
      expect(source).toMatchObject({ height: 1600, width: 1760 });
    });
  });

  it("logs the error and draws nothing when the farm map does not load", async () => {
    mockFarmMapFetch({});
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(() => <FarmPreview farm="riverland" images={mockImages} />);

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "Could not load the riverland farm map for its preview.",
        expect.any(Error),
      );
    });
    expect(drawImage).not.toHaveBeenCalled();
  });
});
