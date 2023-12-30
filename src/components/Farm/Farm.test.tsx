import { fireEvent, render, screen } from "@solidjs/testing-library";

import mockImages from "../../__helpers__/images";
import Farm from "./Farm";

it("renders the app without crashing", () => {
  const { container } = render(() => (
    <Farm currentFarm="Test" date={0} images={[]} zoom={1} />
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
    const { container } = render(() => (
      <Farm
        currentFarm="Test"
        date={0}
        images={mockImages}
        selectedItem={{ id: "parsnip", type: "crop" }}
        zoom={1}
      />
    ));

    const canvas = screen.getByTestId("farm-canvas");

    if (canvas === undefined) {
      throw new Error();
    }

    fireEvent.mouseDown(canvas, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(canvas, { clientX: 16, clientY: 16 });
    fireEvent.mouseUp(canvas);

    expect(container).toMatchSnapshot();
  });

  it.skip("can destroy crops", () => {
    const parsnip = {
      cropId: "parsnip",
      datePlanted: 0,
      x: 0,
      y: 0,
    };

    const { container } = render(() => (
      <Farm
        currentFarm="Test"
        date={0}
        images={mockImages}
        selectedItem={{ id: "pick-axe", type: "tool" }}
        zoom={1}
      />
    ));

    farm.setState({
      crops: {
        "0": {
          "0": [parsnip],
          "1": [parsnip],
        },
        "1": {
          "0": [parsnip],
          "1": [parsnip],
        },
      },
    });

    const canvas = screen.getByTestId("farm-canvas");

    if (canvas === undefined) {
      throw new Error();
    }

    farm.setState({
      isMouseDown: true,
      mouseDownPosition: { left: 0, top: 0, x: 0, y: 0 },
      mousePosition: { left: 0, top: 0, x: 16, y: 16 },
    });

    farm.find("canvas").simulate("mouseUp");

    const actual = farm.instance().state;

    expect(actual).toMatchSnapshot();
  });

  it("can install equipment", () => {
    const { container } = render(() => (
      <Farm
        currentFarm="Test"
        date={0}
        images={mockImages}
        selectedItem={{ id: "scarecrow", type: "equipment" }}
        zoom={1}
      />
    ));

    const canvas = screen.getByTestId("farm-canvas");

    if (canvas === undefined) {
      throw new Error();
    }

    fireEvent.mouseDown(canvas, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(canvas, { clientX: 16, clientY: 16 });
    fireEvent.mouseUp(canvas);

    expect(container).toMatchSnapshot();
  });

  it.skip("can destroy equipment", () => {
    const scarecrow = {
      dateInstalled: 0,
      equipmentId: "scarecrow",
      x: 0,
      y: 0,
    };
    const { container } = render(() => (
      <Farm
        currentFarm="Test"
        date={0}
        images={mockImages}
        selectedItem={{ id: "pick-axe", type: "tool" }}
        zoom={1}
      />
    ));

    farm.setState({
      equipment: {
        "0": {
          "0": [scarecrow],
          "1": [scarecrow],
        },
        "1": {
          "0": [scarecrow],
          "1": [scarecrow],
        },
      },
    });

    const canvas = screen.getByTestId("farm-canvas");

    if (canvas === undefined) {
      throw new Error();
    }

    farm.setState({
      isMouseDown: true,
      mouseDownPosition: { left: 0, top: 0, x: 0, y: 0 },
      mousePosition: { left: 0, top: 0, x: 16, y: 16 },
    });

    farm.find("canvas").simulate("mouseUp");

    const actual = farm.instance().state;

    expect(actual).toMatchSnapshot();
  });
});
