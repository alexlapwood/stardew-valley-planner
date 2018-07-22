import * as React from "react";

import * as cn from "classnames";

import "./Toolbar.css";

interface IProps {
  images: HTMLImageElement[];
  isDisabled?: boolean;
  selectedItem?: ISelectedItem;
  selectTool: (tool: string) => void;
}

const Toolbar: React.SFC<IProps> = props => (
  <div
    className={cn("Toolbar", "sdv-toolbar-border", "flex-horizontal", {
      disabled: props.isDisabled
    })}
  >
    <div
      className={cn("Toolbar--tool sdv-tool-border", {
        selected:
          props.selectedItem !== undefined &&
          props.selectedItem.type === "tool" &&
          props.selectedItem.id === "pick-axe"
      })}
      // tslint:disable-next-line:jsx-no-lambda
      onClick={() => {
        props.selectTool("pick-axe");
      }}
    >
      <img src="images/pick-axe.png" />
    </div>
    <div className="Toolbar--tool sdv-tool-border" />
    <div className="Toolbar--tool sdv-tool-border" />
    <div className="Toolbar--tool sdv-tool-border" />
    <div className="Toolbar--tool sdv-tool-border" />
    <div className="Toolbar--tool sdv-tool-border" />
    <div className="Toolbar--tool sdv-tool-border" />
  </div>
);

export default Toolbar;
