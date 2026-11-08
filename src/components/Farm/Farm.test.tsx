import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import mockImages from "../../__helpers__/images";
import {
  makeTestFarmMapFile,
  mockFarmMapFetch,
  testFarmMapFile,
} from "../../__mocks__/testFarmMap";
import { items } from "../../data/game/items.json";
import { atlasUrls } from "../../helpers/atlas";
import { loadFarmScene, type TFarmId } from "../../helpers/farmMapLoader";
import {
  buildings,
  crops,
  equipment,
  greenhouseRepair,
  houseColorPaints,
  houseUpgrades,
  petBowlPaints,
  setBuildings,
  setCrops,
  setEquipment,
  setGreenhouseRepair,
  setHouseColorPaints,
  setHouseUpgrades,
  setPetBowlPaints,
} from "../../state/farm";
import PlanSwitcher from "../Header/PlanSwitcher/PlanSwitcher";
import Farm from "./Farm";

// With the scene loaded before the tests, the farm draws on its first render,
// so the tests do not have to wait for it.
beforeAll(async () => {
  mockFarmMapFetch({ standard: testFarmMapFile });
  await loadFarmScene("standard", "spring");
});

const date = 2;

const leftButton = 0;
const middleButton = 1;
const rightButton = 2;

const buttonsBitByButton: Record<number, number> = {
  0: 1,
  1: 4,
  2: 2,
  3: 8,
  4: 16,
};

const regionTiles = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
] as const;

const tilesOutsideRegion = [
  [2, 0],
  [0, 2],
] as const;

function parsnip(
  x: number,
  y: number,
  overrides: Partial<IPlantedCrop> = {},
): IPlantedCrop {
  return {
    cropId: "parsnip",
    datePlanted: 0,
    type: "crop",
    x,
    y,
    ...overrides,
  };
}

function scarecrow(
  x: number,
  y: number,
  overrides: Partial<IInstalledEquipment> = {},
): IInstalledEquipment {
  return {
    dateInstalled: 0,
    equipmentId: "scarecrow",
    skin: "scarecrow",
    type: "equipment",
    x,
    y,
    ...overrides,
  };
}

function byTile<T extends { x: number; y: number }>(items: T[]) {
  const farmItems: IFarmItems<T[]> = {};

  items.forEach((item) => {
    farmItems[item.y] = { ...farmItems[item.y], [item.x]: [item] };
  });

  return farmItems;
}

const centreOfTile = (tile: number) => tile * 16 + 8;

const pointOnTile = (x: number, y: number) => ({
  clientX: centreOfTile(x),
  clientY: centreOfTile(y),
});

function dragAcrossTiles(
  from: [number, number],
  to: [number, number],
  button = leftButton,
) {
  const canvas = screen.getByTestId("farm-canvas");

  fireEvent.mouseDown(canvas, {
    button,
    clientX: centreOfTile(from[0]),
    clientY: centreOfTile(from[1]),
  });
  fireEvent.mouseMove(canvas, {
    buttons: buttonsBitByButton[button],
    clientX: centreOfTile(to[0]),
    clientY: centreOfTile(to[1]),
  });
  fireEvent.mouseUp(canvas, {
    button,
    clientX: centreOfTile(to[0]),
    clientY: centreOfTile(to[1]),
  });
}

function getScrollView() {
  const scrollView = screen
    .getByTestId("farm-canvas")
    .closest<HTMLElement>(".Farm");

  if (scrollView === null) {
    throw new Error("The farm has no scroll view");
  }

  return scrollView;
}

const drawImage = vi.fn<CanvasRenderingContext2D["drawImage"]>();
const clearRect = vi.fn<CanvasRenderingContext2D["clearRect"]>();

const countDraws = () => clearRect.mock.calls.length;

function getTilesDrawnWith(imageName: string) {
  return drawImage.mock.calls
    .filter(
      ([image]) =>
        image instanceof HTMLImageElement && image.src.includes(imageName),
    )
    .map(([, x, y]) => [x / 16, y / 16]);
}

function getHighlightedTiles(colour: "amber" | "green" | "grey" | "red") {
  return getTilesDrawnWith(`highlight-${colour}`);
}

function getOutlinedTiles() {
  return getTilesDrawnWith("blocker-outline");
}

function getDrawnEquipmentSprites() {
  return drawImage.mock.calls
    .filter(
      ([image]) =>
        image instanceof HTMLImageElement &&
        image.src.includes(atlasUrls.items),
    )
    .map(([, ...rects]) => rects);
}

function getDrawnBuildingRects(length = 4) {
  return drawImage.mock.calls
    .filter(
      ([image]) =>
        image instanceof HTMLImageElement &&
        image.src.includes(atlasUrls.buildings),
    )
    .map(([, ...rects]) => rects.slice(0, length));
}

function tallSpriteOnTile(x: number, y: number) {
  return [x * 16, (y - 1) * 16, 16, 32];
}

function isPanCursorShown() {
  return document.documentElement.classList.contains("farm-panning");
}

function isPlanListOpen() {
  return screen.queryByTestId("plan-switcher--list") !== null;
}

beforeEach(() => {
  drawImage.mockClear();
  clearRect.mockClear();

  // jsdom has no 2D context and no layout, so the canvas would not draw and
  // its zero-size rect would turn every mouse position into NaN.
  const context = {
    clearRect,
    drawImage,
    fillRect: vi.fn(),
    fillStyle: "#000000",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: true,
    restore: vi.fn(),
    save: vi.fn(),
  };
  // The map canvas under the plan has its own context, so that the draws
  // counted here are the draws of the plan.
  const mapContext = { ...context, clearRect: vi.fn(), drawImage: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      return this.classList.contains("Farm--map-canvas") ? mapContext : context;
    } as unknown as HTMLCanvasElement["getContext"],
  );
  vi.spyOn(
    HTMLCanvasElement.prototype,
    "getBoundingClientRect",
  ).mockImplementation(function (this: HTMLCanvasElement) {
    return new DOMRect(0, 0, this.width, this.height);
  });

  setBuildings([]);
  setCrops({});
  setEquipment({});
  setGreenhouseRepair(undefined);
  setHouseColorPaints([]);
  setHouseUpgrades([]);
  setPetBowlPaints([]);
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("renders the app without crashing", () => {
  const { container } = render(() => (
    <Farm currentFarm="standard" date={0} images={mockImages} zoom={1} />
  ));
  expect(container).toMatchSnapshot();
});

describe("doing things with a selected region", () => {
  it("won't do anything if we're not actually selecting a region of the farm", () => {
    const { container } = render(() => (
      <Farm currentFarm="standard" date={0} images={mockImages} zoom={1} />
    ));

    const canvas = screen.getByTestId("farm-canvas");

    if (canvas === undefined) {
      throw new Error();
    }

    fireEvent.mouseUp(canvas);

    expect(container).toMatchSnapshot();
  });

  it("can plant crops", () => {
    render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        images={mockImages}
        selectedItem={{ id: "parsnip", type: "crop" }}
        zoom={1}
      />
    ));

    dragAcrossTiles([0, 0], [1, 1]);

    expect(crops()).toEqual(
      byTile(regionTiles.map(([x, y]) => parsnip(x, y, { datePlanted: date }))),
    );
  });

  it("can destroy crops", () => {
    setCrops(
      byTile(
        [...regionTiles, ...tilesOutsideRegion].map(([x, y]) => parsnip(x, y)),
      ),
    );

    render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        images={mockImages}
        selectedItem={{ id: "pick-axe", type: "tool" }}
        zoom={1}
      />
    ));

    dragAcrossTiles([0, 0], [1, 1]);

    expect(crops()).toEqual(
      byTile([
        ...regionTiles.map(([x, y]) => parsnip(x, y, { dateDestroyed: date })),
        ...tilesOutsideRegion.map(([x, y]) => parsnip(x, y)),
      ]),
    );
  });

  it("can install equipment", () => {
    render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        images={mockImages}
        selectedItem={{ id: "scarecrow", type: "equipment" }}
        zoom={1}
      />
    ));

    dragAcrossTiles([0, 0], [1, 1]);

    expect(equipment()).toEqual(
      byTile(
        regionTiles.map(([x, y]) => scarecrow(x, y, { dateInstalled: date })),
      ),
    );
  });

  it("previews the selected equipment on the hovered tile without installing it", () => {
    render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        images={mockImages}
        selectedItem={{ id: "scarecrow", type: "equipment" }}
        zoom={1}
      />
    ));

    const canvas = screen.getByTestId("farm-canvas");
    drawImage.mockClear();
    fireEvent.mouseMove(canvas, pointOnTile(3, 2));

    const scarecrowSprite = items.scarecrow.skins.scarecrow?.sprite ?? [];
    expect(getDrawnEquipmentSprites()).toEqual([
      [...scarecrowSprite, ...tallSpriteOnTile(3, 2)],
    ]);
    expect(equipment()).toEqual({});
  });

  it("installs equipment beside a growing crop but not on it", () => {
    setCrops(byTile([parsnip(0, 0)]));

    render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        images={mockImages}
        selectedItem={{ id: "scarecrow", type: "equipment" }}
        zoom={1}
      />
    ));

    dragAcrossTiles([0, 0], [1, 0]);

    expect(equipment()).toEqual(
      byTile([scarecrow(1, 0, { dateInstalled: date })]),
    );
    expect(crops()).toEqual(byTile([parsnip(0, 0)]));
  });

  it("can destroy equipment", () => {
    setEquipment(
      byTile(
        [...regionTiles, ...tilesOutsideRegion].map(([x, y]) =>
          scarecrow(x, y),
        ),
      ),
    );

    render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        images={mockImages}
        selectedItem={{ id: "pick-axe", type: "tool" }}
        zoom={1}
      />
    ));

    dragAcrossTiles([0, 0], [1, 1]);

    expect(equipment()).toEqual(
      byTile([
        ...regionTiles.map(([x, y]) =>
          scarecrow(x, y, { dateDestroyed: date }),
        ),
        ...tilesOutsideRegion.map(([x, y]) => scarecrow(x, y)),
      ]),
    );
  });

  it("erases crops and equipment with a right-button drag when no item is selected", () => {
    const allTiles = [...regionTiles, ...tilesOutsideRegion];
    setCrops(byTile(allTiles.map(([x, y]) => parsnip(x, y))));
    setEquipment(byTile(allTiles.map(([x, y]) => scarecrow(x, y))));

    render(() => (
      <Farm currentFarm="standard" date={date} images={mockImages} zoom={1} />
    ));

    dragAcrossTiles([0, 0], [1, 1], rightButton);

    expect(crops()).toEqual(
      byTile([
        ...regionTiles.map(([x, y]) => parsnip(x, y, { dateDestroyed: date })),
        ...tilesOutsideRegion.map(([x, y]) => parsnip(x, y)),
      ]),
    );
    expect(equipment()).toEqual(
      byTile([
        ...regionTiles.map(([x, y]) =>
          scarecrow(x, y, { dateDestroyed: date }),
        ),
        ...tilesOutsideRegion.map(([x, y]) => scarecrow(x, y)),
      ]),
    );
  });

  it("erases with a right-button drag and keeps the selected crop", () => {
    setCrops(byTile(regionTiles.map(([x, y]) => parsnip(x, y))));

    render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        images={mockImages}
        selectedItem={{ id: "parsnip", type: "crop" }}
        zoom={1}
      />
    ));

    const erasedCrops = regionTiles.map(([x, y]) =>
      parsnip(x, y, { dateDestroyed: date }),
    );

    dragAcrossTiles([0, 0], [2, 2], rightButton);

    expect(crops()).toEqual(byTile(erasedCrops));

    dragAcrossTiles([5, 5], [5, 5]);

    expect(crops()).toEqual(
      byTile([...erasedCrops, parsnip(5, 5, { datePlanted: date })]),
    );
  });

  it.each([
    ["Windows", ["mouseDown", "mouseUp", "contextMenu"]],
    ["macOS and Linux", ["mouseDown", "contextMenu", "mouseUp"]],
  ] as const)(
    "erases only the tile under a right click (%s event order)",
    (_, eventNames) => {
      const allTiles = [...regionTiles, ...tilesOutsideRegion];
      setCrops(byTile(allTiles.map(([x, y]) => parsnip(x, y))));

      render(() => (
        <Farm currentFarm="standard" date={date} images={mockImages} zoom={1} />
      ));

      const canvas = screen.getByTestId("farm-canvas");
      eventNames.forEach((eventName) => {
        fireEvent[eventName](canvas, {
          button: rightButton,
          clientX: centreOfTile(1),
          clientY: centreOfTile(0),
        });
      });

      expect(crops()).toEqual(
        byTile(
          allTiles.map(([x, y]) =>
            x === 1 && y === 0
              ? parsnip(x, y, { dateDestroyed: date })
              : parsnip(x, y),
          ),
        ),
      );
    },
  );

  it("shows the pick-axe highlight during a right-button drag", () => {
    setCrops(byTile([parsnip(0, 0)]));

    render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        images={mockImages}
        selectedItem={{ id: "parsnip", type: "crop" }}
        zoom={1}
      />
    ));

    const canvas = screen.getByTestId("farm-canvas");
    fireEvent.mouseDown(canvas, {
      button: rightButton,
      clientX: centreOfTile(0),
      clientY: centreOfTile(0),
    });
    drawImage.mockClear();
    fireEvent.mouseMove(canvas, {
      buttons: buttonsBitByButton[rightButton],
      clientX: centreOfTile(1),
      clientY: centreOfTile(1),
    });

    expect(getHighlightedTiles("red")).toEqual([[0, 0]]);
    expect(getHighlightedTiles("grey")).toEqual([
      [1, 0],
      [0, 1],
      [1, 1],
    ]);
    expect(getHighlightedTiles("green")).toEqual([]);
  });

  it("does not open the browser context menu on the farm", () => {
    render(() => (
      <Farm currentFarm="standard" date={date} images={mockImages} zoom={1} />
    ));

    expect(fireEvent.contextMenu(screen.getByTestId("farm-canvas"))).toBe(
      false,
    );
  });

  it("does not open the browser context menu when a right-button drag from the farm ends off the farm", () => {
    render(() => (
      <Farm currentFarm="standard" date={date} images={mockImages} zoom={1} />
    ));

    const canvas = screen.getByTestId("farm-canvas");
    fireEvent.mouseDown(canvas, { button: rightButton, ...pointOnTile(0, 0) });
    fireEvent.mouseOut(canvas);
    fireEvent.mouseUp(document.body, { button: rightButton });

    expect(fireEvent.contextMenu(document.body)).toBe(false);
    expect(fireEvent.contextMenu(document.body)).toBe(true);
  });

  it("opens the browser context menu off the farm after a right click on the farm (macOS and Linux event order)", () => {
    render(() => (
      <Farm currentFarm="standard" date={date} images={mockImages} zoom={1} />
    ));

    const canvas = screen.getByTestId("farm-canvas");
    fireEvent.mouseDown(canvas, { button: rightButton, ...pointOnTile(0, 0) });

    expect(fireEvent.contextMenu(canvas)).toBe(false);

    fireEvent.mouseUp(canvas, { button: rightButton, ...pointOnTile(0, 0) });

    expect(fireEvent.contextMenu(document.body)).toBe(true);
  });

  it.each<[string, (unmount: () => void) => void]>([
    [
      "a new press",
      () => {
        fireEvent.pointerDown(document.body, { button: leftButton });
      },
    ],
    [
      "a key press",
      () => {
        fireEvent.keyDown(document.body, { key: "ContextMenu" });
      },
    ],
    [
      "the farm unmounts",
      (unmount) => {
        unmount();
      },
    ],
  ])(
    "opens the browser context menu off the farm after %s when a right press on the farm got no menu event",
    (_, endPress) => {
      const { unmount } = render(() => (
        <Farm currentFarm="standard" date={date} images={mockImages} zoom={1} />
      ));

      const canvas = screen.getByTestId("farm-canvas");
      fireEvent.mouseDown(canvas, {
        button: rightButton,
        ...pointOnTile(0, 0),
      });
      fireEvent.mouseUp(canvas, { button: rightButton, ...pointOnTile(0, 0) });
      endPress(unmount);

      expect(fireEvent.contextMenu(document.body)).toBe(true);
    },
  );

  it("cancels a drag when a second button goes down", () => {
    const disableToolbars = vi.fn();
    setEquipment(byTile([scarecrow(1, 1)]));

    render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        disableToolbars={disableToolbars}
        images={mockImages}
        selectedItem={{ id: "parsnip", type: "crop" }}
        zoom={1}
      />
    ));

    const canvas = screen.getByTestId("farm-canvas");
    const start = { clientX: centreOfTile(0), clientY: centreOfTile(0) };
    const end = { clientX: centreOfTile(1), clientY: centreOfTile(1) };

    fireEvent.mouseDown(canvas, { button: leftButton, ...start });
    fireEvent.mouseMove(canvas, {
      buttons: buttonsBitByButton[leftButton],
      ...end,
    });
    fireEvent.mouseDown(canvas, {
      button: rightButton,
      buttons: buttonsBitByButton[leftButton] | buttonsBitByButton[rightButton],
      ...end,
    });
    fireEvent.mouseUp(canvas, { button: leftButton, ...end });
    fireEvent.mouseUp(canvas, { button: rightButton, ...end });

    expect(crops()).toEqual({});
    expect(equipment()).toEqual(byTile([scarecrow(1, 1)]));
    expect(disableToolbars).toHaveBeenLastCalledWith(false);
  });

  it.each([
    ["erase", rightButton],
    ["pan", middleButton],
    ["put", leftButton],
  ] as const)(
    "starts a new drag when a press shows that the release of a drag to %s was lost",
    (_, lostButton) => {
      const disableToolbars = vi.fn();
      setCrops(byTile([parsnip(0, 0)]));

      render(() => (
        <Farm
          currentFarm="standard"
          date={date}
          disableToolbars={disableToolbars}
          images={mockImages}
          selectedItem={{ id: "parsnip", type: "crop" }}
          zoom={1}
        />
      ));

      const canvas = screen.getByTestId("farm-canvas");

      fireEvent.mouseDown(canvas, { button: lostButton, ...pointOnTile(0, 0) });
      fireEvent.mouseDown(canvas, {
        button: leftButton,
        buttons: buttonsBitByButton[leftButton],
        ...pointOnTile(3, 3),
      });

      expect(disableToolbars).toHaveBeenLastCalledWith(true);

      fireEvent.mouseUp(canvas, { button: leftButton, ...pointOnTile(3, 3) });

      expect(crops()).toEqual(
        byTile([parsnip(0, 0), parsnip(3, 3, { datePlanted: date })]),
      );
      expect(disableToolbars).toHaveBeenLastCalledWith(false);
      expect(isPanCursorShown()).toBe(false);
    },
  );

  it.each([
    ["put", leftButton],
    ["erase", rightButton],
  ] as const)(
    "cancels a drag to %s when the window loses focus",
    (_, button) => {
      const disableToolbars = vi.fn();
      setEquipment(byTile([scarecrow(1, 1)]));

      render(() => (
        <Farm
          currentFarm="standard"
          date={date}
          disableToolbars={disableToolbars}
          images={mockImages}
          selectedItem={{ id: "parsnip", type: "crop" }}
          zoom={1}
        />
      ));

      const canvas = screen.getByTestId("farm-canvas");
      const start = { clientX: centreOfTile(0), clientY: centreOfTile(0) };
      const end = { clientX: centreOfTile(1), clientY: centreOfTile(1) };

      fireEvent.mouseDown(canvas, { button, ...start });
      fireEvent.mouseMove(canvas, {
        buttons: buttonsBitByButton[button],
        ...end,
      });
      fireEvent.blur(window);

      expect(disableToolbars).toHaveBeenLastCalledWith(false);

      fireEvent.mouseUp(canvas, { button, ...end });

      expect(crops()).toEqual({});
      expect(equipment()).toEqual(byTile([scarecrow(1, 1)]));
    },
  );

  it.each([
    ["put", leftButton],
    ["erase", rightButton],
  ] as const)(
    "cancels a drag to %s when a move shows its button is up and its mouseup was lost",
    (_, button) => {
      const disableToolbars = vi.fn();
      setCrops(byTile([parsnip(1, 1)]));

      render(() => (
        <Farm
          currentFarm="standard"
          date={date}
          disableToolbars={disableToolbars}
          images={mockImages}
          selectedItem={{ id: "parsnip", type: "crop" }}
          zoom={1}
        />
      ));

      const canvas = screen.getByTestId("farm-canvas");

      fireEvent.mouseDown(canvas, { button, ...pointOnTile(0, 0) });
      fireEvent.mouseMove(canvas, {
        buttons: buttonsBitByButton[button],
        ...pointOnTile(1, 1),
      });
      fireEvent.mouseMove(canvas, { buttons: 0, ...pointOnTile(2, 2) });

      expect(disableToolbars).toHaveBeenLastCalledWith(false);

      drawImage.mockClear();
      fireEvent.mouseMove(canvas, { buttons: 0, ...pointOnTile(3, 3) });

      expect(getHighlightedTiles("green")).toEqual([[3, 3]]);
      expect(getHighlightedTiles("grey")).toEqual([]);
      expect(getHighlightedTiles("red")).toEqual([]);

      fireEvent.mouseUp(canvas, { button, ...pointOnTile(3, 3) });

      expect(crops()).toEqual(byTile([parsnip(1, 1)]));
      expect(equipment()).toEqual({});
    },
  );

  it.each([3, 4])("does nothing with mouse button %i", (button) => {
    const disableToolbars = vi.fn();
    setEquipment(byTile([scarecrow(1, 1)]));

    render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        disableToolbars={disableToolbars}
        images={mockImages}
        selectedItem={{ id: "parsnip", type: "crop" }}
        zoom={1}
      />
    ));

    dragAcrossTiles([0, 0], [1, 1], button);

    expect(crops()).toEqual({});
    expect(equipment()).toEqual(byTile([scarecrow(1, 1)]));
    expect(disableToolbars).not.toHaveBeenCalledWith(true);
  });
});

describe("panning the farm", () => {
  const scrollStart = 200;
  const panStart = { button: middleButton, clientX: 100, clientY: 100 };
  const middleButtonHeld = { buttons: 4 };

  function renderFarm(disableToolbars = vi.fn()) {
    const result = render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        disableToolbars={disableToolbars}
        images={mockImages}
        selectedItem={{ id: "parsnip", type: "crop" }}
        zoom={1}
      />
    ));

    const scrollView = getScrollView();
    scrollView.scrollLeft = scrollStart;
    scrollView.scrollTop = scrollStart;

    return { ...result, canvas: screen.getByTestId("farm-canvas"), scrollView };
  }

  it("scrolls the farm with a middle-button drag and does not put or erase", () => {
    setEquipment(byTile([scarecrow(5, 4)]));
    const { canvas, scrollView } = renderFarm();

    expect(fireEvent.mouseDown(canvas, panStart)).toBe(false);
    fireEvent.mouseMove(canvas, {
      ...middleButtonHeld,
      clientX: 70,
      clientY: 60,
    });

    expect(scrollView.scrollLeft).toBe(scrollStart + 30);
    expect(scrollView.scrollTop).toBe(scrollStart + 40);

    fireEvent.mouseUp(canvas, { ...panStart, clientX: 70, clientY: 60 });

    expect(crops()).toEqual({});
    expect(equipment()).toEqual(byTile([scarecrow(5, 4)]));
  });

  it("keeps panning off the farm until the middle button is released", () => {
    const disableToolbars = vi.fn();
    const { canvas, scrollView } = renderFarm(disableToolbars);

    fireEvent.mouseDown(canvas, panStart);
    fireEvent.mouseOut(canvas);
    fireEvent.mouseMove(document, {
      ...middleButtonHeld,
      clientX: 90,
      clientY: 80,
    });

    expect(scrollView.scrollLeft).toBe(scrollStart + 10);
    expect(scrollView.scrollTop).toBe(scrollStart + 20);
    expect(isPanCursorShown()).toBe(true);
    expect(disableToolbars).toHaveBeenLastCalledWith(true);

    fireEvent.mouseUp(document, { button: middleButton });
    fireEvent.mouseMove(document, {
      ...middleButtonHeld,
      clientX: 0,
      clientY: 0,
    });

    expect(scrollView.scrollLeft).toBe(scrollStart + 10);
    expect(scrollView.scrollTop).toBe(scrollStart + 20);
    expect(isPanCursorShown()).toBe(false);
    expect(disableToolbars).toHaveBeenLastCalledWith(false);
  });

  it.each([
    [
      "a second button goes down on the farm",
      () => {
        fireEvent.mouseDown(screen.getByTestId("farm-canvas"), {
          button: leftButton,
        });
      },
    ],
    [
      "a second button goes down off the farm",
      () => {
        fireEvent.mouseDown(document, { button: rightButton });
      },
    ],
    [
      "the window loses focus",
      () => {
        fireEvent.blur(window);
      },
    ],
    [
      "a move shows the middle button is up and its mouseup was lost",
      () => {
        fireEvent.mouseMove(document, { buttons: 0, clientX: 50, clientY: 50 });
      },
    ],
  ])("stops the pan where it is when %s", (_, stopPanning) => {
    const disableToolbars = vi.fn();
    const { canvas, scrollView } = renderFarm(disableToolbars);

    fireEvent.mouseDown(canvas, panStart);
    fireEvent.mouseMove(document, {
      ...middleButtonHeld,
      clientX: 90,
      clientY: 80,
    });
    stopPanning();
    fireEvent.mouseMove(document, {
      ...middleButtonHeld,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.mouseUp(canvas, { button: middleButton });

    expect(scrollView.scrollLeft).toBe(scrollStart + 10);
    expect(scrollView.scrollTop).toBe(scrollStart + 20);
    expect(isPanCursorShown()).toBe(false);
    expect(disableToolbars).toHaveBeenLastCalledWith(false);
    expect(crops()).toEqual({});
  });

  it("stops the pan when the farm unmounts", () => {
    const { canvas, scrollView, unmount } = renderFarm();

    fireEvent.mouseDown(canvas, panStart);
    unmount();
    fireEvent.mouseMove(document, {
      ...middleButtonHeld,
      clientX: 0,
      clientY: 0,
    });

    expect(scrollView.scrollLeft).toBe(scrollStart);
    expect(scrollView.scrollTop).toBe(scrollStart);
    expect(isPanCursorShown()).toBe(false);
  });

  it("moves 1:1 with the cursor when the planner is scaled", () => {
    const { canvas, scrollView } = renderFarm();
    Object.defineProperty(scrollView, "offsetWidth", { value: 400 });
    Object.defineProperty(scrollView, "offsetHeight", { value: 300 });
    vi.spyOn(scrollView, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 800, 600),
    );

    fireEvent.mouseDown(canvas, panStart);
    fireEvent.mouseMove(document, {
      ...middleButtonHeld,
      clientX: 70,
      clientY: 60,
    });

    expect(scrollView.scrollLeft).toBe(scrollStart + 15);
    expect(scrollView.scrollTop).toBe(scrollStart + 20);
  });

  it("shows no tile highlight during a pan", () => {
    const { canvas } = renderFarm();

    fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 });

    expect(getHighlightedTiles("green")).not.toEqual([]);

    drawImage.mockClear();
    fireEvent.mouseDown(canvas, panStart);
    fireEvent.mouseMove(canvas, {
      ...middleButtonHeld,
      clientX: 70,
      clientY: 60,
    });

    expect(drawImage).toHaveBeenCalled();
    expect(getHighlightedTiles("green")).toEqual([]);
    expect(getHighlightedTiles("grey")).toEqual([]);
    expect(getHighlightedTiles("red")).toEqual([]);
  });
});

describe("using the farm while the plan list is open", () => {
  const scrollStart = 200;
  const plan = { farm: "standard", id: "a", name: "Home" } as const;

  function renderFarmAndOpenPlanList() {
    render(() => (
      <>
        <PlanSwitcher
          changePlan={vi.fn()}
          deletePlan={vi.fn()}
          newPlan={vi.fn()}
          plan={plan}
          plans={[plan]}
          renamePlan={vi.fn()}
        />
        <Farm
          currentFarm="standard"
          date={date}
          images={mockImages}
          selectedItem={{ id: "parsnip", type: "crop" }}
          zoom={1}
        />
      </>
    ));

    const scrollView = getScrollView();
    scrollView.scrollLeft = scrollStart;
    scrollView.scrollTop = scrollStart;

    fireEvent.click(screen.getByTestId("plan-switcher"));

    return { canvas: screen.getByTestId("farm-canvas"), scrollView };
  }

  it("pans the farm with a middle-button drag, and the list stays open", () => {
    const { canvas, scrollView } = renderFarmAndOpenPlanList();
    const start = { button: middleButton, clientX: 100, clientY: 100 };
    const end = { clientX: 70, clientY: 60 };

    fireEvent.mouseDown(canvas, start);
    fireEvent.mouseMove(canvas, { buttons: 4, ...end });

    expect(scrollView.scrollLeft).toBe(scrollStart + 30);
    expect(scrollView.scrollTop).toBe(scrollStart + 40);
    expect(isPlanListOpen()).toBe(true);

    fireEvent.mouseUp(canvas, { ...start, ...end });

    expect(isPlanListOpen()).toBe(true);
  });

  it("puts items with a drag, and the list stays open", () => {
    renderFarmAndOpenPlanList();

    dragAcrossTiles([0, 0], [1, 1]);

    expect(crops()).toEqual(
      byTile(regionTiles.map(([x, y]) => parsnip(x, y, { datePlanted: date }))),
    );
    expect(isPlanListOpen()).toBe(true);
  });

  it("closes the list with a click on the farm", () => {
    const { canvas } = renderFarmAndOpenPlanList();

    fireEvent.mouseDown(canvas, { button: middleButton, ...pointOnTile(2, 2) });
    fireEvent.mouseUp(canvas, { button: middleButton, ...pointOnTile(2, 2) });

    expect(isPlanListOpen()).toBe(false);
  });
});

function renderFarmWithCropSelected() {
  render(() => (
    <Farm
      currentFarm="standard"
      date={date}
      images={mockImages}
      selectedItem={{ id: "parsnip", type: "crop" }}
      zoom={1}
    />
  ));

  return screen.getByTestId("farm-canvas");
}

describe("drawing the farm", () => {
  it("draws once when the farm loads", () => {
    renderFarmWithCropSelected();

    expect(countDraws()).toBe(1);
  });

  it("redraws when the cursor moves to a new tile", () => {
    const canvas = renderFarmWithCropSelected();
    fireEvent.mouseMove(canvas, pointOnTile(0, 0));
    clearRect.mockClear();

    fireEvent.mouseMove(canvas, pointOnTile(1, 0));

    expect(countDraws()).toBe(1);
  });

  it("does not redraw when the cursor moves within a tile", () => {
    const canvas = renderFarmWithCropSelected();
    fireEvent.mouseMove(canvas, pointOnTile(0, 0));
    clearRect.mockClear();

    fireEvent.mouseMove(canvas, {
      clientX: centreOfTile(0) + 3,
      clientY: centreOfTile(0) - 3,
    });

    expect(countDraws()).toBe(0);
  });

  it("does not redraw during a pan over the farm", () => {
    const canvas = renderFarmWithCropSelected();
    fireEvent.mouseMove(canvas, pointOnTile(5, 5));
    fireEvent.mouseDown(canvas, { button: middleButton, ...pointOnTile(5, 5) });
    clearRect.mockClear();

    fireEvent.mouseMove(canvas, {
      buttons: buttonsBitByButton[middleButton],
      ...pointOnTile(3, 3),
    });
    fireEvent.scroll(getScrollView());

    expect(countDraws()).toBe(0);
  });

  it("draws once for a press", () => {
    const canvas = renderFarmWithCropSelected();
    clearRect.mockClear();

    fireEvent.mouseDown(canvas, { button: leftButton, ...pointOnTile(0, 0) });

    expect(countDraws()).toBe(1);
  });

  it.each([
    ["plants", leftButton],
    ["erases", rightButton],
  ] as const)("draws once for a release that %s", (_, button) => {
    const canvas = renderFarmWithCropSelected();
    fireEvent.mouseDown(canvas, { button, ...pointOnTile(0, 0) });
    fireEvent.mouseMove(canvas, {
      buttons: buttonsBitByButton[button],
      ...pointOnTile(1, 1),
    });
    clearRect.mockClear();

    fireEvent.mouseUp(canvas, { button, ...pointOnTile(1, 1) });

    expect(countDraws()).toBe(1);
  });

  it("draws once when the window loses focus during a drag", () => {
    const canvas = renderFarmWithCropSelected();
    fireEvent.mouseDown(canvas, { button: leftButton, ...pointOnTile(0, 0) });
    fireEvent.mouseMove(canvas, {
      buttons: buttonsBitByButton[leftButton],
      ...pointOnTile(1, 1),
    });
    clearRect.mockClear();

    fireEvent.blur(window);

    expect(countDraws()).toBe(1);
  });

  it("shows no highlight when the farm scrolls before the cursor is on it", () => {
    renderFarmWithCropSelected();

    fireEvent.scroll(getScrollView());

    expect(getHighlightedTiles("green")).toEqual([]);
    expect(getHighlightedTiles("grey")).toEqual([]);
    expect(getHighlightedTiles("red")).toEqual([]);
  });

  it("draws the default buildings at their spots, with the start house and the broken greenhouse", () => {
    renderFarmWithCropSelected();

    const buildingDraws = drawImage.mock.calls
      .filter(
        ([image]) =>
          image instanceof HTMLImageElement &&
          image.src.includes(atlasUrls.buildings),
      )
      .map(([, ...rects]) => rects);

    expect(buildingDraws).toContainEqual([
      112,
      1504,
      112,
      160,
      25 * 16,
      10 * 16 - 64,
      112,
      160,
    ]);
    expect(buildingDraws).toContainEqual([
      0,
      1168,
      178,
      144,
      59 * 16 - 16,
      12 * 16 - 62,
      178,
      144,
    ]);
  });

  it("draws the farmhouse, the greenhouse and the pet bowl with their looks on the date", () => {
    setHouseUpgrades([{ datePlaced: 0, level: 1 }]);
    setGreenhouseRepair({ datePlaced: 1 });
    setPetBowlPaints([{ datePainted: date, skin: "hay_pet_bowl" }]);
    render(() => (
      <Farm
        currentFarm="standard"
        date={date + 1}
        images={mockImages}
        zoom={1}
      />
    ));

    const buildingRects = getDrawnBuildingRects();

    expect(buildingRects).toContainEqual([0, 1504, 112, 160]);
    expect(buildingRects).toContainEqual([178, 1168, 178, 144]);
    expect(buildingRects).toContainEqual([256, 1984, 32, 32]);
    expect(buildingRects).not.toContainEqual([112, 1504, 112, 160]);
    expect(buildingRects).not.toContainEqual([0, 1984, 32, 32]);
  });

  it("draws the new sprite at once when the pet bowl is painted, at the same spot", () => {
    render(() => (
      <Farm
        currentFarm="standard"
        date={date}
        images={mockImages}
        selectedItem={{
          id: "pet_bowl",
          skin: "stone_pet_bowl",
          type: "building",
        }}
        zoom={1}
      />
    ));

    dragAcrossTiles([53, 7], [53, 7]);
    drawImage.mockClear();
    fireEvent.mouseOut(screen.getByTestId("farm-canvas"));

    expect(petBowlPaints()).toEqual([
      { datePainted: date, skin: "stone_pet_bowl" },
    ]);
    expect(getDrawnBuildingRects(8)).toContainEqual([
      128,
      1984,
      32,
      32,
      53 * 16,
      7 * 16,
      32,
      32,
    ]);
    expect(getDrawnBuildingRects()).not.toContainEqual([0, 1984, 32, 32]);
  });

  it("does not plant crops on or beside the greenhouse, where the game takes the tilling away", () => {
    renderFarmWithCropSelected();

    dragAcrossTiles([23, 15], [25, 15]);

    expect(crops()).toEqual(byTile([parsnip(23, 15, { datePlanted: date })]));
  });
});

function renderFarmCanvas(currentFarm: TFarmId, selectedItem?: ISelectedItem) {
  render(() => (
    <Farm
      currentFarm={currentFarm}
      date={date}
      images={mockImages}
      selectedItem={selectedItem}
      zoom={1}
    />
  ));

  return screen.getByTestId<HTMLCanvasElement>("farm-canvas");
}

async function waitForFirstDraw() {
  await vi.waitFor(() => {
    expect(countDraws()).toBe(1);
  });
}

describe("loading the farm map", () => {
  it("draws nothing and has no size until the farm map loads", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>(() => {}),
    );

    const canvas = renderFarmCanvas("forest");

    expect(countDraws()).toBe(0);
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
  });

  it("draws once the farm map loads, with the size of the farm map", async () => {
    mockFarmMapFetch({ wilderness: makeTestFarmMapFile(20, 10) });

    const canvas = renderFarmCanvas("wilderness");

    expect(countDraws()).toBe(0);

    await waitForFirstDraw();
    expect([canvas.width, canvas.height]).toEqual([320, 160]);

    const mapCanvas =
      document.querySelector<HTMLCanvasElement>(".Farm--map-canvas");

    expect([mapCanvas?.width, mapCanvas?.height]).toEqual([320, 160]);
  });

  it("puts items on the far tiles of a farm that is bigger than 80 by 65", async () => {
    mockFarmMapFetch({ beach: makeTestFarmMapFile(110, 110) });

    const canvas = renderFarmCanvas("beach", { id: "parsnip", type: "crop" });
    await waitForFirstDraw();

    dragAcrossTiles([108, 108], [109, 109]);

    expect([canvas.width, canvas.height]).toEqual([110 * 16, 110 * 16]);
    expect(crops()).toEqual(
      byTile(
        regionTiles.map(([x, y]) =>
          parsnip(108 + x, 108 + y, { datePlanted: date }),
        ),
      ),
    );
  });

  it("scrolls the farmhouse to the middle of the view when the farm loads", async () => {
    const file = makeTestFarmMapFile(100, 75);
    file.farm.spots.farmhouse = { height: 5, width: 9, x: 76, y: 16 };
    mockFarmMapFetch({ meadowlands: file });

    renderFarmCanvas("meadowlands");
    const scrollView = getScrollView();
    Object.defineProperty(scrollView, "clientWidth", { value: 600 });
    await waitForFirstDraw();

    expect(scrollView.scrollLeft).toBe((76 + 9 / 2) * 16 - 600 / 2);
    expect(scrollView.scrollTop).toBe(4 * 16);
  });

  it("logs the error and draws nothing when the farm map does not load", async () => {
    mockFarmMapFetch({});
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    renderFarmCanvas("riverland");

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "Could not load the riverland farm map for spring.",
        expect.any(Error),
      );
    });
    expect(countDraws()).toBe(0);
  });
});

interface IFloorLook {
  variant?: number;
  x: number;
  y: number;
}

function byPosition(a: IFloorLook, b: IFloorLook) {
  return a.x - b.x || a.y - b.y;
}

function renderFarmWithFloorSelected(skin: string) {
  render(() => (
    <Farm
      currentFarm="standard"
      date={date}
      images={mockImages}
      selectedItem={{ id: "flooring", skin, type: "equipment" }}
      zoom={1}
    />
  ));

  return screen.getByTestId("farm-canvas");
}

function mockRandomLooks() {
  let picks = 0;

  return vi.spyOn(Math, "random").mockImplementation(() => {
    picks += 1;

    return ((picks * 5) % 16) / 16;
  });
}

function getDrawnSteppingStoneLooks(): IFloorLook[] {
  const variants = items.flooring.floorDrawing?.variants ?? [];
  const block = items.flooring.skins.stepping_stone_path?.floor?.block;
  const [blockX, blockY] = block ?? [0, 0];

  return drawImage.mock.calls
    .filter(
      ([image]) =>
        image instanceof HTMLImageElement &&
        image.src.includes(atlasUrls.flooring),
    )
    .map(([, sx, sy, , , dx, dy]) => {
      const tile = (sx - blockX) / 16 + ((sy - blockY) / 16) * 16;

      return { variant: variants.indexOf(tile), x: dx / 16, y: dy / 16 };
    })
    .toSorted(byPosition);
}

function getPlacedFloors() {
  return Object.values(equipment())
    .flatMap((row) => Object.values(row).flat())
    .toSorted(byPosition);
}

function getPlacedLooks(): IFloorLook[] {
  return getPlacedFloors().map(({ variant, x, y }) => ({ variant, x, y }));
}

function previewDragTo(canvas: HTMLElement, x: number, y: number) {
  drawImage.mockClear();
  fireEvent.mouseMove(canvas, {
    buttons: buttonsBitByButton[leftButton],
    ...pointOnTile(x, y),
  });

  return getDrawnSteppingStoneLooks();
}

describe("placing floors", () => {
  it("gives each new Stepping Stone tile one look for the whole drag, and puts down the look of the preview", () => {
    const random = mockRandomLooks();
    const canvas = renderFarmWithFloorSelected("stepping_stone_path");

    fireEvent.mouseMove(canvas, pointOnTile(0, 0));
    fireEvent.mouseDown(canvas, { button: leftButton, ...pointOnTile(0, 0) });
    const firstPreview = previewDragTo(canvas, 1, 1);
    previewDragTo(canvas, 1, 0);
    const lastPreview = previewDragTo(canvas, 1, 1);

    expect(random).toHaveBeenCalledTimes(4);
    expect(lastPreview).toEqual(firstPreview);
    expect(new Set(lastPreview.map(({ variant }) => variant)).size).toBe(4);

    fireEvent.mouseUp(canvas, { button: leftButton, ...pointOnTile(1, 1) });

    expect(getPlacedLooks()).toEqual(lastPreview);
  });

  it("picks a new look for a tile after a drag puts the floor down", () => {
    mockRandomLooks();
    renderFarmWithFloorSelected("stepping_stone_path");

    dragAcrossTiles([0, 0], [0, 0]);
    dragAcrossTiles([0, 0], [0, 0], rightButton);
    dragAcrossTiles([0, 0], [0, 0]);

    const [erased, placed] = getPlacedLooks();

    expect(erased.variant).toEqual(expect.any(Number));
    expect(placed.variant).toEqual(expect.any(Number));
    expect(placed.variant).not.toBe(erased.variant);
  });

  it("does not give a look to a floor that does not connect at random", () => {
    const random = mockRandomLooks();

    renderFarmWithFloorSelected("wood_floor");
    dragAcrossTiles([0, 0], [1, 1]);

    const placedFloors = getPlacedFloors();

    expect(placedFloors).toHaveLength(4);
    placedFloors.forEach((placedFloor) => {
      expect(placedFloor).not.toHaveProperty("variant");
    });
    expect(random).not.toHaveBeenCalled();
  });
});

function appleTree(
  x: number,
  y: number,
  overrides: Partial<IPlantedTree> = {},
): IPlantedTree {
  return {
    datePlanted: 0,
    treeId: "apple",
    type: "tree",
    x,
    y,
    ...overrides,
  };
}

const apple: ISelectedItem = { id: "apple", type: "tree" };

const teaBush: ISelectedItem = { id: "tea_bush", type: "tree" };

const teaBushOn = (x: number, y: number) =>
  appleTree(x, y, { datePlanted: date, treeId: "tea_bush" });

function previewTreeDrag(from: [number, number], to: [number, number]) {
  const canvas = screen.getByTestId("farm-canvas");

  fireEvent.mouseDown(canvas, { button: leftButton, ...pointOnTile(...from) });
  drawImage.mockClear();
  fireEvent.mouseMove(canvas, {
    buttons: buttonsBitByButton[leftButton],
    ...pointOnTile(...to),
  });
}

describe("planting trees", () => {
  it("plants a tea bush on each free tile of the drag, and not on a crop", () => {
    setCrops(byTile([parsnip(1, 1)]));
    renderFarmCanvas("standard", teaBush);

    dragAcrossTiles([0, 0], [1, 1]);

    expect(crops()).toEqual(
      byTile([
        teaBushOn(0, 0),
        teaBushOn(1, 0),
        teaBushOn(0, 1),
        parsnip(1, 1),
      ]),
    );
  });

  it("plants fruit trees with 2 empty tiles between them", () => {
    renderFarmCanvas("standard", apple);

    dragAcrossTiles([0, 0], [6, 3]);

    expect(crops()).toEqual(
      byTile(
        [
          [0, 0],
          [3, 0],
          [6, 0],
          [0, 3],
          [3, 3],
          [6, 3],
        ].map(([x, y]) => appleTree(x, y, { datePlanted: date })),
      ),
    );
  });

  it("highlights the free tiles green and the taken tiles red during the drag", () => {
    setCrops(byTile([parsnip(1, 1)]));
    renderFarmCanvas("standard", teaBush);

    previewTreeDrag([0, 0], [1, 1]);

    expect(getHighlightedTiles("green")).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
    ]);
    expect(getHighlightedTiles("red")).toEqual([[1, 1]]);
    expect(getHighlightedTiles("amber")).toEqual([]);
    expect(getOutlinedTiles()).toEqual([]);
  });

  it("highlights a fruit tree amber and outlines the things beside it that stop its growth", () => {
    setCrops(byTile([parsnip(1, 1)]));
    renderFarmCanvas("standard", apple);

    previewTreeDrag([0, 0], [3, 0]);

    expect(getHighlightedTiles("green")).toEqual([[3, 0]]);
    expect(getHighlightedTiles("amber")).toEqual([[0, 0]]);
    expect(getHighlightedTiles("red")).toEqual([
      [1, 0],
      [2, 0],
    ]);
    expect(getOutlinedTiles()).toEqual([[1, 1]]);

    fireEvent.mouseUp(screen.getByTestId("farm-canvas"), {
      button: leftButton,
      ...pointOnTile(3, 0),
    });

    expect(crops()).toEqual(
      byTile([
        appleTree(0, 0, { datePlanted: date }),
        appleTree(3, 0, { datePlanted: date }),
        parsnip(1, 1),
      ]),
    );
  });

  it("ends a tree when the pick-axe erases its trunk tile, and not its other tiles", () => {
    setCrops(byTile([appleTree(3, 5)]));
    renderFarmCanvas("standard", { id: "pick-axe", type: "tool" });

    dragAcrossTiles([2, 2], [4, 4]);

    expect(crops()).toEqual(byTile([appleTree(3, 5)]));

    dragAcrossTiles([3, 5], [3, 5]);

    expect(crops()).toEqual(byTile([appleTree(3, 5, { dateDestroyed: date })]));
  });
});

const coop: ISelectedItem = { id: "coop", type: "building" };

function plannedCoop(
  x: number,
  y: number,
  overrides: Partial<IPlannedBuilding> = {},
): IPlannedBuilding {
  return { buildingId: "coop", datePlaced: date, x, y, ...overrides };
}

function coopFootprint(x: number, y: number) {
  return [0, 1, 2].flatMap((dy) =>
    [0, 1, 2, 3, 4, 5].map((dx) => [x + dx, y + dy]),
  );
}

function byRowThenColumn(a: number[], b: number[]) {
  return a[1] - b[1] || a[0] - b[0];
}

describe("placing buildings", () => {
  it("orders the selected building on the date, with its top-left on the clicked tile", () => {
    renderFarmCanvas("standard", coop);

    dragAcrossTiles([1, 1], [1, 1]);

    expect(buildings()).toEqual([plannedCoop(1, 1)]);
  });

  it("puts the building down where a drag ends", () => {
    renderFarmCanvas("standard", coop);

    dragAcrossTiles([0, 0], [3, 4]);

    expect(buildings()).toEqual([plannedCoop(3, 4)]);
  });

  it("does not put a building down on a crop, or on another building", () => {
    setCrops(byTile([parsnip(2, 2)]));
    renderFarmCanvas("standard", coop);

    dragAcrossTiles([1, 1], [1, 1]);
    dragAcrossTiles([10, 1], [10, 1]);
    dragAcrossTiles([12, 2], [12, 2]);

    expect(buildings()).toEqual([plannedCoop(10, 1)]);
  });

  it("puts a Well down on a floor, and ends the floor on the order date", () => {
    const floor = scarecrow(2, 2, {
      equipmentId: "flooring",
      skin: "wood_floor",
    });
    setEquipment(byTile([floor]));
    renderFarmCanvas("standard", { id: "well", type: "building" });

    dragAcrossTiles([1, 1], [1, 1]);

    expect(buildings()).toEqual([
      {
        buildingId: "well",
        datePlaced: date,
        endedFloors: [{ dateInstalled: 0, x: 2, y: 2 }],
        x: 1,
        y: 1,
      },
    ]);
    expect(equipment()).toEqual(byTile([{ ...floor, dateDestroyed: date }]));
  });

  it("highlights the footprint green, and red on each tile that is taken", () => {
    setCrops(byTile([parsnip(2, 2)]));
    renderFarmCanvas("standard", coop);
    const canvas = screen.getByTestId("farm-canvas");

    fireEvent.mouseMove(canvas, pointOnTile(10, 1));

    expect(getHighlightedTiles("green")).toEqual(coopFootprint(10, 1));
    expect(getHighlightedTiles("red")).toEqual([]);

    drawImage.mockClear();
    fireEvent.mouseMove(canvas, pointOnTile(1, 1));

    expect(getHighlightedTiles("red")).toEqual([[2, 2]]);
    expect(getHighlightedTiles("green")).toHaveLength(6 * 3 - 1);
  });

  it("does not plant crops on a building, but plants them beside it", () => {
    setBuildings([plannedCoop(1, 1, { datePlaced: 0 })]);
    renderFarmCanvas("standard", { id: "parsnip", type: "crop" });

    dragAcrossTiles([6, 1], [7, 1]);

    expect(crops()).toEqual(byTile([parsnip(7, 1, { datePlanted: date })]));
  });

  it("demolishes a building from the date when the erase is on a later day and touches any of its tiles", () => {
    const well = { buildingId: "well", datePlaced: 0, x: 1, y: 1 };
    setBuildings([well]);
    renderFarmCanvas("standard");

    dragAcrossTiles([3, 3], [3, 3], rightButton);

    expect(buildings()).toEqual([{ ...well, dateDestroyed: date }]);
  });

  it("puts many buildings down on the same day, each whole from that day", () => {
    renderFarmCanvas("standard", coop);

    dragAcrossTiles([1, 1], [1, 1]);
    dragAcrossTiles([10, 1], [10, 1]);
    dragAcrossTiles([20, 1], [20, 1]);

    expect(buildings()).toEqual([
      plannedCoop(1, 1),
      plannedCoop(10, 1),
      plannedCoop(20, 1),
    ]);
  });

  it("does not plant a crop on a building on the day it goes down", () => {
    setBuildings([plannedCoop(1, 1)]);
    renderFarmCanvas("standard", { id: "parsnip", type: "crop" });

    dragAcrossTiles([2, 2], [2, 2]);

    expect(crops()).toEqual({});
  });

  it("takes a building out of the plan when the erase is on its date", () => {
    setBuildings([plannedCoop(1, 1)]);
    renderFarmCanvas("standard");

    dragAcrossTiles([1, 1], [1, 1], rightButton);

    expect(buildings()).toEqual([]);
  });

  it("gives back the floors that a Well took off when the erase is on its date", () => {
    const floor = scarecrow(2, 2, {
      equipmentId: "flooring",
      skin: "wood_floor",
    });
    setEquipment(byTile([floor]));
    renderFarmCanvas("standard", { id: "well", type: "building" });

    dragAcrossTiles([1, 1], [1, 1]);
    dragAcrossTiles([2, 2], [2, 2], rightButton);

    expect(buildings()).toEqual([]);
    expect(equipment()).toEqual(byTile([floor]));
  });

  it("gives back only the floors that the Well ended, each with its own end day, when the erase is on its date", () => {
    const flooring = { equipmentId: "flooring", skin: "wood_floor" };
    const path = scarecrow(2, 2, { ...flooring, dateDestroyed: date + 18 });
    const erasedFloor = scarecrow(3, 3, { ...flooring, dateDestroyed: date });
    setEquipment(byTile([path, erasedFloor]));
    renderFarmCanvas("standard", { id: "well", type: "building" });

    dragAcrossTiles([1, 1], [1, 1]);
    dragAcrossTiles([2, 2], [2, 2], rightButton);

    expect(buildings()).toEqual([]);
    expect(equipment()).toEqual(byTile([path, erasedFloor]));
  });

  it("does not give back the floors when the erase demolishes a Well on a later day", () => {
    const floor = scarecrow(2, 2, {
      dateDestroyed: 0,
      equipmentId: "flooring",
      skin: "wood_floor",
    });
    const well = { buildingId: "well", datePlaced: 0, x: 1, y: 1 };
    setEquipment(byTile([floor]));
    setBuildings([well]);
    renderFarmCanvas("standard");

    dragAcrossTiles([2, 2], [2, 2], rightButton);

    expect(buildings()).toEqual([{ ...well, dateDestroyed: date }]);
    expect(equipment()).toEqual(byTile([floor]));
  });

  it("shows all the tiles of a building red when the erase touches one of them", () => {
    setBuildings([plannedCoop(1, 1)]);
    renderFarmCanvas("standard", { id: "pick-axe", type: "tool" });

    fireEvent.mouseMove(screen.getByTestId("farm-canvas"), pointOnTile(1, 1));

    expect(getHighlightedTiles("red").toSorted(byRowThenColumn)).toEqual(
      coopFootprint(1, 1),
    );
    expect(getHighlightedTiles("grey")).toEqual([]);
  });
});

function renderFarmOn(onDate: number, selectedItem?: ISelectedItem) {
  render(() => (
    <Farm
      currentFarm="standard"
      date={onDate}
      images={mockImages}
      selectedItem={selectedItem}
      zoom={1}
    />
  ));
}

const bigCoop: ISelectedItem = { id: "big_coop", type: "building" };

// The coop at 1, 1 is there from day 0.
const readyCoop = plannedCoop(1, 1, { datePlaced: 0 });

function withUpgrades(...upgrades: IPlannedUpgrade[]): IPlannedBuilding {
  return { ...readyCoop, upgrades };
}

describe("upgrading buildings", () => {
  it("orders the upgrade on the date when a higher tier is clicked on a building of the tier below", () => {
    setBuildings([readyCoop]);
    renderFarmOn(10, bigCoop);

    dragAcrossTiles([3, 2], [3, 2]);

    expect(buildings()).toEqual([
      withUpgrades({ buildingId: "big_coop", datePlaced: 10 }),
    ]);
  });

  it("upgrades to each tier up to the selected one on the date, also on a Tuesday", () => {
    setBuildings([readyCoop]);
    renderFarmOn(1, { id: "deluxe_coop", type: "building" });

    dragAcrossTiles([3, 2], [3, 2]);

    expect(buildings()).toEqual([
      withUpgrades(
        { buildingId: "big_coop", datePlaced: 1 },
        { buildingId: "deluxe_coop", datePlaced: 1 },
      ),
    ]);
  });

  it("upgrades a building on the date it goes down", () => {
    setBuildings([readyCoop]);
    renderFarmOn(0, bigCoop);

    dragAcrossTiles([3, 2], [3, 2]);

    expect(buildings()).toEqual([
      withUpgrades({ buildingId: "big_coop", datePlaced: 0 }),
    ]);
  });

  it.each<[string, IPlannedBuilding, number, string]>([
    [
      "has the tier already",
      withUpgrades({ buildingId: "big_coop", datePlaced: 10 }),
      11,
      "big_coop",
    ],
    ["is of another type", readyCoop, 10, "big_barn"],
  ])(
    "refuses the upgrade with red tiles and no next good day when the building %s",
    (_, building, onDate, upgradeId) => {
      setBuildings([building]);
      renderFarmOn(onDate, { id: upgradeId, type: "building" });

      fireEvent.mouseMove(screen.getByTestId("farm-canvas"), pointOnTile(3, 2));

      expect(getHighlightedTiles("red").toSorted(byRowThenColumn)).toEqual(
        coopFootprint(1, 1),
      );
      expect(getHighlightedTiles("green")).toEqual([]);
      expect(getNoticeLines()).toHaveLength(1);

      dragAcrossTiles([3, 2], [3, 2]);

      expect(buildings()).toEqual([building]);
    },
  );

  it("puts the lowest tier and each upgrade down on the date on empty ground", () => {
    renderFarmOn(0, { id: "deluxe_coop", type: "building" });

    dragAcrossTiles([1, 1], [1, 1]);

    expect(buildings()).toEqual([
      withUpgrades(
        { buildingId: "big_coop", datePlaced: 0 },
        { buildingId: "deluxe_coop", datePlaced: 0 },
      ),
    ]);
  });

  it("takes back an upgrade and the later ones when the erase is on its date, and keeps the lower tier", () => {
    setBuildings([
      withUpgrades(
        { buildingId: "big_coop", datePlaced: 10 },
        { buildingId: "deluxe_coop", datePlaced: 13 },
      ),
    ]);
    renderFarmOn(10);

    dragAcrossTiles([3, 2], [3, 2], rightButton);

    expect(buildings()).toEqual([readyCoop]);
  });

  it("takes the whole building with its upgrades out of the plan when the erase is on its date", () => {
    setBuildings([withUpgrades({ buildingId: "big_coop", datePlaced: 0 })]);
    renderFarmOn(0);

    dragAcrossTiles([3, 2], [3, 2], rightButton);

    expect(buildings()).toEqual([]);
  });

  it("demolishes a building from a later date with no upgrade, and drops the upgrades planned after it", () => {
    setBuildings([withUpgrades({ buildingId: "big_coop", datePlaced: 20 })]);
    renderFarmOn(10);

    dragAcrossTiles([3, 2], [3, 2], rightButton);

    expect(buildings()).toEqual([{ ...readyCoop, dateDestroyed: 10 }]);
  });
});

function getNoticeLines() {
  return (
    screen
      .queryByTestId("farm-notice")
      ?.getAttribute("aria-label")
      ?.split("\n") ?? []
  );
}

const pickAxeTool: ISelectedItem = { id: "pick-axe", type: "tool" };

function renderNoticeInView(scrollLeft: number, scrollTop: number) {
  setCrops(byTile([parsnip(12, 6)]));
  renderFarmOn(1, coop);
  const canvas = screen.getByTestId("farm-canvas");
  const view = getScrollView();

  Object.defineProperty(view, "clientWidth", { value: 200 });
  Object.defineProperty(view, "clientHeight", { value: 40 });
  view.scrollLeft = scrollLeft;
  view.scrollTop = scrollTop;
  fireEvent.mouseMove(canvas, pointOnTile(10, 5));

  const notice = screen.getByTestId("farm-notice");

  Object.defineProperty(notice, "offsetWidth", { value: 100 });
  Object.defineProperty(notice, "offsetHeight", { value: 30 });

  return { canvas, notice };
}

// Spring 2 and Spring 9 are Tuesdays, when Robin is closed in the game.
describe("any day, and the notice", () => {
  it("puts a building down on a Tuesday, with green tiles and no notice", () => {
    renderFarmOn(1, coop);

    fireEvent.mouseMove(screen.getByTestId("farm-canvas"), pointOnTile(10, 5));

    expect(getHighlightedTiles("green").toSorted(byRowThenColumn)).toEqual(
      coopFootprint(10, 5),
    );
    expect(getHighlightedTiles("red")).toEqual([]);
    expect(screen.queryByTestId("farm-notice")).toBeNull();

    dragAcrossTiles([10, 5], [10, 5]);

    expect(buildings()).toEqual([plannedCoop(10, 5, { datePlaced: 1 })]);
  });

  it("puts the notice above the tile under the cursor, and below it at the top of the view", () => {
    setCrops(byTile([parsnip(12, 6)]));
    renderFarmOn(1, coop);
    const canvas = screen.getByTestId("farm-canvas");

    fireEvent.mouseMove(canvas, pointOnTile(10, 5));

    const notice = screen.getByTestId("farm-notice");

    expect([notice.style.left, notice.style.top]).toEqual(["160px", "78px"]);

    getScrollView().scrollTop = 16 * 6;
    fireEvent.mouseMove(canvas, pointOnTile(10, 6));

    expect([notice.style.left, notice.style.top]).toEqual(["160px", "114px"]);
  });

  it("shows the notice as the tooltip of the farm while the cursor is on the farm", () => {
    setCrops(byTile([parsnip(12, 6)]));
    renderFarmOn(1, coop);
    const canvas = screen.getByTestId("farm-canvas");

    fireEvent.mouseMove(canvas, pointOnTile(10, 5));

    expect(canvas.getAttribute("aria-describedby")).toBe(
      screen.getByRole("tooltip").id,
    );

    fireEvent.mouseOut(canvas);

    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(canvas.hasAttribute("aria-describedby")).toBe(false);
  });

  describe("in a view of 200 × 40 pixels, with a notice of 100 × 30", () => {
    it("keeps the notice in the view at the left and the bottom", () => {
      const { canvas, notice } = renderNoticeInView(16 * 10 + 8, 16 * 5);

      fireEvent.mouseMove(canvas, pointOnTile(10, 6));

      expect([notice.style.left, notice.style.top]).toEqual(["168px", "90px"]);
    });

    it("keeps the notice in the view at the right", () => {
      const { canvas, notice } = renderNoticeInView(0, 16 * 4);

      fireEvent.mouseMove(canvas, pointOnTile(11, 4));

      expect([notice.style.left, notice.style.top]).toEqual(["100px", "74px"]);
    });
  });

  it("puts a second building down on the day after the first, with no wait for its build days", () => {
    setBuildings([plannedCoop(1, 1)]);
    renderFarmOn(3, coop);

    fireEvent.mouseMove(screen.getByTestId("farm-canvas"), pointOnTile(10, 5));

    expect(screen.queryByTestId("farm-notice")).toBeNull();

    dragAcrossTiles([10, 5], [10, 5]);

    expect(buildings()).toEqual([
      plannedCoop(1, 1),
      plannedCoop(10, 5, { datePlaced: 3 }),
    ]);
  });

  it("gives the tile reason for a building that does not fit, and the day after the thing is gone", () => {
    setCrops(byTile([parsnip(12, 6, { dateDestroyed: 9 })]));
    renderFarmOn(date, coop);

    fireEvent.mouseMove(screen.getByTestId("farm-canvas"), pointOnTile(10, 5));

    expect(getNoticeLines()).toEqual([
      "🌱 A crop is here",
      "📅 Next good day: Sp 10",
    ]);
  });

  it("gives the count limit, and no next good day while the cabins stay", () => {
    setBuildings(
      Array.from({ length: 7 }, (_, index) =>
        plannedCabin({ x: index * 6, y: 40 }),
      ),
    );
    renderFarmOn(date, { id: "cabin", type: "building" });

    fireEvent.mouseMove(screen.getByTestId("farm-canvas"), pointOnTile(10, 5));

    expect(getNoticeLines()).toEqual(["🏠 You can have only 7 cabins"]);
  });

  it("shows no notice where the building can go down", () => {
    renderFarmOn(date, coop);

    fireEvent.mouseMove(screen.getByTestId("farm-canvas"), pointOnTile(10, 5));

    expect(screen.queryByTestId("farm-notice")).toBeNull();
  });

  it("demolishes a building on a Tuesday, with red tiles and no notice", () => {
    setBuildings([readyCoop]);
    renderFarmOn(8, pickAxeTool);

    fireEvent.mouseMove(screen.getByTestId("farm-canvas"), pointOnTile(3, 2));

    expect(getHighlightedTiles("red").toSorted(byRowThenColumn)).toEqual(
      coopFootprint(1, 1),
    );
    expect(screen.queryByTestId("farm-notice")).toBeNull();

    dragAcrossTiles([3, 2], [3, 2], rightButton);

    expect(buildings()).toEqual([{ ...readyCoop, dateDestroyed: 8 }]);
  });

  it("takes a building out of the plan on its date, also on a Tuesday", () => {
    setBuildings([plannedCoop(1, 1, { datePlaced: 1 })]);
    renderFarmOn(1);

    dragAcrossTiles([3, 2], [3, 2], rightButton);

    expect(buildings()).toEqual([]);
  });
});

const kitchen: ISelectedItem = { id: "1", type: "houseUpgrade" };
const nursery: ISelectedItem = { id: "2", type: "houseUpgrade" };
const repair: ISelectedItem = { id: "greenhouse", type: "greenhouseRepair" };

// The farmhouse of the test farm covers x 59-67 and y 12-16, and the
// greenhouse covers x 25-31 and y 10-15.
const onHouse: [number, number] = [62, 14];
const onGreenhouse: [number, number] = [27, 12];

const houseFootprint = [0, 1, 2, 3, 4].flatMap((dy) =>
  [0, 1, 2, 3, 4, 5, 6, 7, 8].map((dx) => [59 + dx, 12 + dy]),
);

function hoverOn([x, y]: [number, number]) {
  fireEvent.mouseMove(screen.getByTestId("farm-canvas"), pointOnTile(x, y));
}

describe("upgrading the farmhouse", () => {
  it("orders the selected level on the date when the farmhouse is clicked, with green tiles first", () => {
    renderFarmOn(date, kitchen);

    hoverOn(onHouse);

    expect(getHighlightedTiles("green").toSorted(byRowThenColumn)).toEqual(
      houseFootprint,
    );
    expect(screen.queryByTestId("farm-notice")).toBeNull();

    dragAcrossTiles(onHouse, onHouse);

    expect(houseUpgrades()).toEqual([{ datePlaced: date, level: 1 }]);
  });

  it("upgrades to each level up to the selected one on the date", () => {
    renderFarmOn(5, nursery);

    dragAcrossTiles(onHouse, onHouse);

    expect(houseUpgrades()).toEqual([
      { datePlaced: 5, level: 1 },
      { datePlaced: 5, level: 2 },
    ]);
  });

  it("does nothing off the farmhouse", () => {
    renderFarmOn(date, kitchen);

    hoverOn([10, 5]);

    expect(getHighlightedTiles("green")).toEqual([]);
    expect(getHighlightedTiles("red")).toEqual([]);

    dragAcrossTiles([10, 5], [10, 5]);

    expect(houseUpgrades()).toEqual([]);
    expect(buildings()).toEqual([]);
  });

  it("upgrades the house on a Tuesday, with green tiles and no notice", () => {
    renderFarmOn(1, kitchen);

    hoverOn(onHouse);

    expect(getHighlightedTiles("green").toSorted(byRowThenColumn)).toEqual(
      houseFootprint,
    );
    expect(screen.queryByTestId("farm-notice")).toBeNull();

    dragAcrossTiles(onHouse, onHouse);

    expect(houseUpgrades()).toEqual([{ datePlaced: 1, level: 1 }]);
  });

  it("upgrades the house and puts a building down on the same day", () => {
    const [selectedItem, setSelectedItem] = createSignal(kitchen);
    render(() => (
      <Farm
        currentFarm="standard"
        date={3}
        images={mockImages}
        selectedItem={selectedItem()}
        zoom={1}
      />
    ));

    dragAcrossTiles(onHouse, onHouse);
    setSelectedItem(coop);
    dragAcrossTiles([10, 5], [10, 5]);

    expect(houseUpgrades()).toEqual([{ datePlaced: 3, level: 1 }]);
    expect(buildings()).toEqual([plannedCoop(10, 5, { datePlaced: 3 })]);
  });

  it("refuses a level that the house has already, with no next good day", () => {
    setHouseUpgrades([{ datePlaced: 0, level: 1 }]);
    renderFarmOn(5, kitchen);

    hoverOn(onHouse);

    expect(getNoticeLines()).toEqual([
      "❌ The Farmhouse has a Kitchen already",
    ]);
  });

  it("takes back an upgrade and the later ones when the erase is on its date, with the house red first", () => {
    setHouseUpgrades([
      { datePlaced: 0, level: 1 },
      { datePlaced: 3, level: 2 },
    ]);
    renderFarmOn(3, pickAxeTool);

    hoverOn(onHouse);

    expect(getHighlightedTiles("red").toSorted(byRowThenColumn)).toEqual(
      houseFootprint,
    );

    dragAcrossTiles(onHouse, onHouse, rightButton);

    expect(houseUpgrades()).toEqual([{ datePlaced: 0, level: 1 }]);
  });

  it("keeps a level when the erase is on a later day, because the game cannot take it back", () => {
    setHouseUpgrades([{ datePlaced: 0, level: 1 }]);
    renderFarmOn(5, pickAxeTool);

    hoverOn(onHouse);

    expect(getHighlightedTiles("red")).toEqual([]);
    expect(screen.queryByTestId("farm-notice")).toBeNull();

    dragAcrossTiles(onHouse, onHouse, rightButton);

    expect(houseUpgrades()).toEqual([{ datePlaced: 0, level: 1 }]);
  });
});

describe("repairing the greenhouse", () => {
  it("repairs the greenhouse on the date when it is clicked", () => {
    renderFarmOn(date, repair);

    dragAcrossTiles(onGreenhouse, onGreenhouse);

    expect(greenhouseRepair()).toEqual({ datePlaced: date });
  });

  it("repairs it on any day, also on a Tuesday", () => {
    setBuildings([plannedCoop(1, 1, { datePlaced: 0 })]);
    renderFarmOn(1, repair);

    dragAcrossTiles(onGreenhouse, onGreenhouse);

    expect(greenhouseRepair()).toEqual({ datePlaced: 1 });
  });

  it("refuses a second repair, and shows why", () => {
    setGreenhouseRepair({ datePlaced: 0 });
    renderFarmOn(date, repair);

    hoverOn(onGreenhouse);

    expect(getNoticeLines()).toEqual(["🌿 The Greenhouse is repaired already"]);
  });

  it("takes the repair out of the plan when the erase is on the repair day or later", () => {
    setGreenhouseRepair({ datePlaced: 0 });
    renderFarmOn(date);

    dragAcrossTiles(onGreenhouse, onGreenhouse, rightButton);

    expect(greenhouseRepair()).toBeUndefined();
  });

  it("keeps a repair that is planned after the date of the erase", () => {
    setGreenhouseRepair({ datePlaced: 9 });
    renderFarmOn(date);

    dragAcrossTiles(onGreenhouse, onGreenhouse, rightButton);

    expect(greenhouseRepair()).toEqual({ datePlaced: 9 });
  });
});

function cabinWith(skin: string): ISelectedItem {
  return { id: "cabin", skin, type: "building" };
}

// The cabin at 1, 1 covers x 1-5 and y 1-3.
function plannedCabin(overrides: Partial<IPlannedBuilding> = {}) {
  return { buildingId: "cabin", datePlaced: 0, x: 1, y: 1, ...overrides };
}

const cabinFootprint = [0, 1, 2].flatMap((dy) =>
  [0, 1, 2, 3, 4].map((dx) => [1 + dx, 1 + dy]),
);

const onCabin: [number, number] = [3, 2];

// The pet bowl of the test farm covers x 53-54 and y 7-8.
const onPetBowl: [number, number] = [54, 8];

describe("skins and paint", () => {
  it("puts a building down with the skin that is picked on its row", () => {
    renderFarmOn(date, cabinWith("log_cabin"));

    dragAcrossTiles([1, 1], [1, 1]);

    expect(buildings()).toEqual([
      plannedCabin({ datePlaced: date, skin: "log_cabin" }),
    ]);
  });

  it("paints a building of the same type from the date, with its footprint green first", () => {
    setBuildings([plannedCabin()]);
    renderFarmOn(10, cabinWith("log_cabin"));

    hoverOn(onCabin);

    expect(getHighlightedTiles("green").toSorted(byRowThenColumn)).toEqual(
      cabinFootprint,
    );
    expect(screen.queryByTestId("farm-notice")).toBeNull();

    dragAcrossTiles(onCabin, onCabin);

    expect(buildings()).toEqual([
      plannedCabin({ paints: [{ datePainted: 10, skin: "log_cabin" }] }),
    ]);
  });

  it("paints on a Tuesday, because a paint is free and at once", () => {
    setBuildings([plannedCabin(), plannedCoop(10, 1, { datePlaced: 7 })]);
    renderFarmOn(8, cabinWith("plank_cabin"));

    dragAcrossTiles(onCabin, onCabin);

    expect(buildings()[0]).toEqual(
      plannedCabin({ paints: [{ datePainted: 8, skin: "plank_cabin" }] }),
    );
  });

  it("refuses the look that the building has on the date, with red tiles and the reason only", () => {
    setBuildings([
      plannedCabin({ paints: [{ datePainted: 4, skin: "log_cabin" }] }),
    ]);
    renderFarmOn(10, cabinWith("log_cabin"));

    hoverOn(onCabin);

    expect(getHighlightedTiles("red").toSorted(byRowThenColumn)).toEqual(
      cabinFootprint,
    );
    expect(getNoticeLines()).toEqual(["🎨 The Cabin has this look already"]);

    dragAcrossTiles(onCabin, onCabin);

    expect(buildings()).toEqual([
      plannedCabin({ paints: [{ datePainted: 4, skin: "log_cabin" }] }),
    ]);
  });

  it("paints the pet bowl of the farm from the date, and keeps its look before that date", () => {
    setPetBowlPaints([{ datePainted: 0, skin: "hay_pet_bowl" }]);
    renderFarmOn(10, { id: "pet_bowl", skin: "pet_bowl", type: "building" });

    dragAcrossTiles(onPetBowl, onPetBowl);

    expect(petBowlPaints()).toEqual([
      { datePainted: 0, skin: "hay_pet_bowl" },
      { datePainted: 10, skin: "pet_bowl" },
    ]);
    expect(buildings()).toEqual([]);
  });

  it("refuses the look that the pet bowl of the farm has", () => {
    renderFarmOn(10, { id: "pet_bowl", skin: "pet_bowl", type: "building" });

    hoverOn(onPetBowl);

    expect(getNoticeLines()).toEqual(["🎨 The Pet Bowl has this look already"]);
  });

  it("demolishes a painted building from the date of the erase, with the paints from that date", () => {
    setBuildings([
      plannedCabin({
        paints: [
          { datePainted: 4, skin: "log_cabin" },
          { datePainted: 20, skin: "plank_cabin" },
        ],
      }),
    ]);
    renderFarmOn(10, pickAxeTool);

    dragAcrossTiles(onCabin, onCabin, rightButton);

    expect(buildings()).toEqual([
      plannedCabin({
        dateDestroyed: 10,
        paints: [{ datePainted: 4, skin: "log_cabin" }],
      }),
    ]);
  });

  it("takes a painted building out of the plan, with its paints, when the erase is on its order day", () => {
    setBuildings([
      plannedCabin({
        datePlaced: date,
        paints: [{ datePainted: 4, skin: "log_cabin" }],
      }),
    ]);
    renderFarmOn(date, pickAxeTool);

    dragAcrossTiles(onCabin, onCabin, rightButton);

    expect(buildings()).toEqual([]);
  });

  it("keeps the paints of the pet bowl of the farm when the erase touches it", () => {
    setPetBowlPaints([{ datePainted: 0, skin: "hay_pet_bowl" }]);
    renderFarmOn(10, pickAxeTool);

    dragAcrossTiles(onPetBowl, onPetBowl, rightButton);

    expect(petBowlPaints()).toEqual([{ datePainted: 0, skin: "hay_pet_bowl" }]);
  });
});

const paintItem: ISelectedItem = {
  colors: { Roof: { hue: 120, lightness: 50, saturation: 60 } },
  id: "paint",
  type: "paint",
};

// The stable at 1, 1 covers x 1-4 and y 1-2.
const onStable: [number, number] = [2, 2];

const stableFootprint = [0, 1].flatMap((dy) =>
  [0, 1, 2, 3].map((dx) => [1 + dx, 1 + dy]),
);

describe("colour paint", () => {
  const stable: IPlannedBuilding = {
    buildingId: "stable",
    datePlaced: 0,
    x: 1,
    y: 1,
  };

  it("paints the building under the cursor from the date, in the lightness range of its region, with its footprint green first", () => {
    setBuildings([stable]);
    renderFarmOn(10, paintItem);

    hoverOn(onStable);

    expect(getHighlightedTiles("green").toSorted(byRowThenColumn)).toEqual(
      stableFootprint,
    );
    expect(screen.queryByTestId("farm-notice")).toBeNull();

    dragAcrossTiles(onStable, onStable);

    expect(buildings()).toEqual([
      {
        ...stable,
        colorPaints: [
          {
            colors: { Roof: { hue: 120, lightness: -12, saturation: 60 } },
            datePainted: 10,
          },
        ],
      },
    ]);
  });

  it("paints the farmhouse from the Nursery", () => {
    setHouseUpgrades([
      { datePlaced: 0, level: 1 },
      { datePlaced: 0, level: 2 },
    ]);
    renderFarmOn(10, paintItem);

    dragAcrossTiles(onHouse, onHouse);

    expect(houseColorPaints()).toEqual([
      {
        colors: { Roof: { hue: 120, lightness: -12, saturation: 60 } },
        datePainted: 10,
      },
    ]);
  });

  it("refuses the farmhouse before the Nursery, with red tiles and the reason", () => {
    setHouseUpgrades([{ datePlaced: 0, level: 1 }]);
    renderFarmOn(10, paintItem);

    hoverOn(onHouse);

    expect(getHighlightedTiles("red").toSorted(byRowThenColumn)).toEqual(
      houseFootprint,
    );
    expect(getNoticeLines()).toEqual(["🍼 Paint needs the Nursery"]);

    dragAcrossTiles(onHouse, onHouse);

    expect(houseColorPaints()).toEqual([]);
  });

  it("takes the paint out of the plan with the Deluxe Coop that it needs, so that a later Deluxe Coop does not show it", () => {
    const deluxeCoop = plannedCoop(1, 1, {
      colorPaints: [
        {
          colors: { Roof: { hue: 120, lightness: -12, saturation: 60 } },
          datePainted: 15,
        },
      ],
      datePlaced: 0,
      upgrades: [
        { buildingId: "big_coop", datePlaced: 10 },
        { buildingId: "deluxe_coop", datePlaced: 10 },
      ],
    });
    setBuildings([deluxeCoop]);
    renderFarmOn(10, pickAxeTool);

    dragAcrossTiles([2, 2], [2, 2], rightButton);

    expect(buildings()).toEqual([plannedCoop(1, 1, { datePlaced: 0 })]);
  });

  it("refuses a cabin and a building with no paint data, with the reason", () => {
    setBuildings([plannedCabin({ x: 10, y: 10 }), plannedCoop(1, 5)]);
    renderFarmOn(10, paintItem);

    hoverOn([11, 11]);

    expect(getNoticeLines()).toEqual([
      "🏠 Paint needs a Cabin upgrade (not in the planner)",
    ]);

    hoverOn([2, 6]);

    expect(getNoticeLines()).toEqual([
      "🎨 Paint needs the Deluxe Coop upgrade",
    ]);
  });
});
