import { mount, shallow } from "enzyme";
import * as React from "react";

import App from "./App";

it("renders the app without crashing", async () => {
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

  const wrapper = mount(<App />);

  wrapper.instance().setState({ images, isLoading: false });

  expect(wrapper.render()).toMatchSnapshot();
});

describe("state", () => {
  it("initialises correctly", () => {
    const wrapper = shallow(<App />);

    const actual = (wrapper.instance() as App).state.date;

    expect(actual).toBe(0);
  });

  describe("changeDate", () => {
    it("changes the date", () => {
      const wrapper = shallow(<App />);

      (wrapper.instance() as App).changeDate(10);

      const actual = (wrapper.instance() as App).state.date;
      expect(actual).toBe(10);
    });

    it("deselects the current crop if it is out of season", () => {
      const wrapper = shallow(<App />);

      (wrapper.instance() as App).setState({ selectedCropId: "parsnip" });
      (wrapper.instance() as App).changeDate(28 * 1);

      const actual = (wrapper.instance() as App).state.selectedCropId;
      expect(actual).toBeUndefined();
    });

    it("does not deselect the current crop if it is in season", () => {
      const wrapper = shallow(<App />);

      (wrapper.instance() as App).setState({ selectedCropId: "ancient_fruit" });
      (wrapper.instance() as App).changeDate(28 * 1);

      const actual = (wrapper.instance() as App).state.selectedCropId;
      expect(actual).toBeUndefined();
    });
  });
});
