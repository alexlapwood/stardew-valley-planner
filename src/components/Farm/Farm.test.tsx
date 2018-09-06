import { mount, render, shallow } from "enzyme";
import * as React from "react";

import Farm from "./Farm";

const imageUrls: string[] = [
  "images/background-spring.png",
  "images/background-summer.png",
  "images/background-fall.png",
  "images/background-winter.png",
  "images/highlight-green.png",
  "images/highlight-grey.png",
  "images/highlight-red.png",
  "images/crops.png",
  "images/scarecrows.png"
];

const mockImages = imageUrls.map(imageUrl => {
  const image = new Image();
  image.src = imageUrl;
  return image;
});

it("renders the app without crashing", () => {
  const farm = render(<Farm date={0} images={[]} zoom={1} />);
  expect(farm).toMatchSnapshot();
});

describe("state", () => {
  it("initialises correctly", () => {
    const farm = shallow(<Farm date={0} images={[]} zoom={1} />);

    const actual = (farm.instance() as Farm).state;

    expect(actual).toMatchSnapshot();
  });
});

describe("selecting tiles", () => {
  it("can select a region of tiles", () => {
    const farm = mount(<Farm date={0} images={mockImages} zoom={1} />);

    const canvas = (farm.instance() as Farm).canvas;

    if (canvas === undefined) {
      throw new Error();
    }

    farm.find("canvas").simulate("mouseDown", {
      clientX: 0,
      clientY: 0
    });

    farm.find("canvas").simulate("mouseMove", {
      clientX: 100,
      clientY: 0
    });

    const actual = (farm.instance() as Farm).state;

    expect(actual.isMouseDown).toBe(true);
    expect(actual.mouseDownPosition).toEqual({ left: 0, top: 0, x: 0, y: 0 });
    expect(actual.mousePosition).toEqual({ left: 0, top: 0, x: 100, y: 0 });
  });
});

describe("doing things with a selected region", () => {
  it("won't do anything if we're not actually selecting a region of the farm", () => {
    const farm = mount(<Farm date={0} images={mockImages} zoom={1} />);

    const canvas = (farm.instance() as Farm).canvas;

    if (canvas === undefined) {
      throw new Error();
    }

    farm.find("canvas").simulate("mouseUp");

    const actual = (farm.instance() as Farm).state;

    expect(actual.crops).toEqual({});
    expect(actual.isMouseDown).toEqual(false);
  });

  it("can plant crops", () => {
    const farm = mount(
      <Farm
        date={0}
        images={mockImages}
        selectedItem={{ id: "parsnip", type: "crop" }}
        zoom={1}
      />
    );

    const canvas = (farm.instance() as Farm).canvas;

    if (canvas === undefined) {
      throw new Error();
    }

    farm.instance().setState({
      isMouseDown: true,
      mouseDownPosition: { left: 0, top: 0, x: 0, y: 0 },
      mousePosition: { left: 0, top: 0, x: 16, y: 16 }
    });

    farm.find("canvas").simulate("mouseUp");

    const actual = farm.instance().state;

    expect(actual).toMatchSnapshot();
  });

  it("can destroy crops", () => {
    const parsnip = {
      cropId: "parsnip",
      datePlanted: 0,
      x: 0,
      y: 0
    };
    const farm = mount(
      <Farm
        date={0}
        images={mockImages}
        selectedItem={{ id: "pick-axe", type: "tool" }}
        zoom={1}
      />
    );

    farm.setState({
      crops: {
        "0": {
          "0": [parsnip],
          "1": [parsnip]
        },
        "1": {
          "0": [parsnip],
          "1": [parsnip]
        }
      }
    });

    const canvas = (farm.instance() as Farm).canvas;

    if (canvas === undefined) {
      throw new Error();
    }

    farm.instance().setState({
      isMouseDown: true,
      mouseDownPosition: { left: 0, top: 0, x: 0, y: 0 },
      mousePosition: { left: 0, top: 0, x: 16, y: 16 }
    });

    farm.find("canvas").simulate("mouseUp");

    const actual = farm.instance().state;

    expect(actual).toMatchSnapshot();
  });

  it("can install equipment", () => {
    const farm = mount(
      <Farm
        date={0}
        images={mockImages}
        selectedItem={{ id: "scarecrow", type: "equipment" }}
        zoom={1}
      />
    );

    const canvas = (farm.instance() as Farm).canvas;

    if (canvas === undefined) {
      throw new Error();
    }

    farm.instance().setState({
      isMouseDown: true,
      mouseDownPosition: { left: 0, top: 0, x: 0, y: 0 },
      mousePosition: { left: 0, top: 0, x: 16, y: 16 }
    });

    farm.find("canvas").simulate("mouseUp");

    const actual = farm.instance().state;

    expect(actual).toMatchSnapshot();
  });

  it("can destroy equipment", () => {
    const scarecrow = {
      dateInstalled: 0,
      equipmentId: "scarecrow",
      x: 0,
      y: 0
    };
    const farm = mount(
      <Farm
        date={0}
        images={mockImages}
        selectedItem={{ id: "pick-axe", type: "tool" }}
        zoom={1}
      />
    );

    farm.setState({
      equipment: {
        "0": {
          "0": [scarecrow],
          "1": [scarecrow]
        },
        "1": {
          "0": [scarecrow],
          "1": [scarecrow]
        }
      }
    });

    const canvas = (farm.instance() as Farm).canvas;

    if (canvas === undefined) {
      throw new Error();
    }

    farm.instance().setState({
      isMouseDown: true,
      mouseDownPosition: { left: 0, top: 0, x: 0, y: 0 },
      mousePosition: { left: 0, top: 0, x: 16, y: 16 }
    });

    farm.find("canvas").simulate("mouseUp");

    const actual = farm.instance().state;

    expect(actual).toMatchSnapshot();
  });
});
