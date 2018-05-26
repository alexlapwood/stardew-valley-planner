import { shallow } from "enzyme";
import * as React from "react";

import Crop from "./Crop";

describe("Crop", () => {
  const defaultProps = {
    age: 0,
    id: "test_crop",
    name: "Test Crop",
    stages: [1, 2, 2, 5]
  };

  it("renders correctly", () => {
    const crop = shallow(<Crop {...defaultProps} />);

    expect(crop.render()).toMatchSnapshot();
  });

  it("renders flower head correctly", () => {
    const crop = shallow(<Crop {...defaultProps} age={11} isFlower={true} />);

    expect(crop.render()).toMatchSnapshot();
  });

  it("renders correctly after it has been removed", () => {
    const crop = shallow(<Crop {...defaultProps} age={28} />);
    expect(crop.render()).toMatchSnapshot();
  });

  it("calculates its growth correctly", () => {
    const crop = shallow(<Crop {...defaultProps} />);
    const cropInstance = crop.instance() as Crop;

    for (let age = 1; age < 28; age += 1) {
      const cropStage = cropInstance.calculateStageOfCrop(
        age,
        cropInstance.props.stages
      );
      switch (age) {
        case 1:
          expect(cropStage).toBe(0);
          break;
        case 2:
        case 3:
          expect(cropStage).toBe(1);
          break;
        case 4:
        case 5:
          expect(cropStage).toBe(2);
          break;
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
          expect(cropStage).toBe(3);
          break;
        case 11:
          expect(cropStage).toBe(4);
          break;
        default:
          expect(cropStage).toBe(undefined);
      }
    }
  });

  it("calculates its harvesting dates correctly", () => {
    const crop = shallow(<Crop {...defaultProps} regrow={3} />);
    const cropInstance = crop.instance() as Crop;

    for (let age = 12; age < 28; age += 1) {
      const cropStage = cropInstance.calculateStageOfCrop(
        age,
        cropInstance.props.stages,
        cropInstance.props.regrow
      );
      switch (age) {
        case 12:
        case 13:
          expect(cropStage).toBe(5);
          break;
        case 14:
          expect(cropStage).toBe(4);
          break;
      }
    }
  });
});
