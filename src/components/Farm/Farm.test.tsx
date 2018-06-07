import { mount, render, shallow } from "enzyme";
import * as React from "react";

import Farm from "./Farm";

it("renders the app without crashing", () => {
  const wrapper = render(<Farm date={0} images={[]} zoom={1} />);
  expect(wrapper).toMatchSnapshot();
});

describe("state", () => {
  it("initialises correctly", () => {
    const wrapper = shallow(<Farm date={0} images={[]} zoom={1} />);

    const actual = (wrapper.instance() as Farm).state;

    expect(actual).toEqual({
      crops: {},
      isMouseDown: false
    });
  });
});

describe("selecting tiles", () => {
  it("can select a region of tiles", () => {
    const imageUrls: string[] = [
      "/images/background-spring.png",
      "/images/background-summer.png",
      "/images/background-fall.png",
      "/images/background-winter.png",
      "/images/create.png",
      "/images/crops.png",
      "/images/destroy.png"
    ];

    const images = imageUrls.map(imageUrl => {
      const image = new Image();
      image.src = imageUrl;
      return image;
    });

    const wrapper = mount(<Farm date={0} images={images} zoom={1} />);

    const canvas = (wrapper.instance() as Farm).canvas;

    if (canvas === undefined) {
      throw new Error();
    }

    wrapper.find("canvas").simulate("mouseDown", {
      clientX: 0,
      clientY: 0
    });

    wrapper.find("canvas").simulate("mouseMove", {
      clientX: 10,
      clientY: 0
    });

    const actual = wrapper.instance().state;

    expect(actual).toEqual({
      crops: {},
      isMouseDown: true,
      mouseDownPosition: { left: 0, top: 0, x: 0, y: 0 },
      mousePosition: { left: 0, top: 0, x: 10, y: 0 }
    });
  });
});
