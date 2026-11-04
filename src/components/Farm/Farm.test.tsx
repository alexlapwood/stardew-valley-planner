import { fireEvent, render, screen } from "@solidjs/testing-library";

import mockImages from "../../__helpers__/images";
import { crops, equipment, setCrops, setEquipment } from "../../state/farm";
import Farm from "./Farm";

// sdv.json has no layout for the "Test" farm. The React version of Farm
// added this one.
vi.mock("../../data/sdv.json", async (importOriginal) => {
  const sdv = await importOriginal<typeof import("../../data/sdv.json")>();
  const { default: testFarm } = await import("../../__mocks__/testFarm");

  return { ...sdv, farmLayouts: { ...sdv.farmLayouts, test: testFarm } };
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
    skinIndex: 0,
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

function getHighlightedTiles(colour: "green" | "grey" | "red") {
  return drawImage.mock.calls
    .filter(
      ([image]) =>
        image instanceof HTMLImageElement &&
        image.src.includes(`highlight-${colour}`),
    )
    .map(([, x, y]) => [x / 16, y / 16]);
}

function isPanCursorShown() {
  return document.documentElement.classList.contains("farm-panning");
}

beforeEach(() => {
  drawImage.mockClear();
  clearRect.mockClear();

  // jsdom has no 2D context and no layout, so the canvas would not draw and
  // its zero-size rect would turn every mouse position into NaN.
  const context = {
    clearRect,
    drawImage,
    imageSmoothingEnabled: true,
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(
    HTMLCanvasElement.prototype,
    "getBoundingClientRect",
  ).mockImplementation(function (this: HTMLCanvasElement) {
    return new DOMRect(0, 0, this.width, this.height);
  });

  setCrops({});
  setEquipment({});
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("renders the app without crashing", () => {
  const { container } = render(() => (
    <Farm currentFarm="Test" date={0} images={mockImages} zoom={1} />
  ));
  expect(container).toMatchSnapshot();
});

describe("doing things with a selected region", () => {
  it("won't do anything if we're not actually selecting a region of the farm", () => {
    const { container } = render(() => (
      <Farm currentFarm="Test" date={0} images={mockImages} zoom={1} />
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
        currentFarm="Test"
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
        currentFarm="Test"
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
        currentFarm="Test"
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
        currentFarm="Test"
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
      <Farm currentFarm="Test" date={date} images={mockImages} zoom={1} />
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
        currentFarm="Test"
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
        <Farm currentFarm="Test" date={date} images={mockImages} zoom={1} />
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
        currentFarm="Test"
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
      <Farm currentFarm="Test" date={date} images={mockImages} zoom={1} />
    ));

    expect(fireEvent.contextMenu(screen.getByTestId("farm-canvas"))).toBe(
      false,
    );
  });

  it("does not open the browser context menu when a right-button drag from the farm ends off the farm", () => {
    render(() => (
      <Farm currentFarm="Test" date={date} images={mockImages} zoom={1} />
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
      <Farm currentFarm="Test" date={date} images={mockImages} zoom={1} />
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
        <Farm currentFarm="Test" date={date} images={mockImages} zoom={1} />
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
        currentFarm="Test"
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
          currentFarm="Test"
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
          currentFarm="Test"
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
          currentFarm="Test"
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
        currentFarm="Test"
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
        currentFarm="Test"
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

function renderFarmWithCropSelected() {
  render(() => (
    <Farm
      currentFarm="Test"
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
});
