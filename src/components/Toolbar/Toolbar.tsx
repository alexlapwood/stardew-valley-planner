import React from "react";

import cn from "classnames";

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
      data-automationid="tool--pick-axe"
      // tslint:disable-next-line:jsx-no-lambda
      onClick={() => {
        props.selectTool("pick-axe");
      }}
    >
      <img src="images/pick-axe.png" />
    </div>
    <div className="Toolbar--tool sdv-tool-border" data-automationid="tool--" />
    <div className="Toolbar--tool sdv-tool-border" data-automationid="tool--" />
    <div className="Toolbar--tool sdv-tool-border" data-automationid="tool--" />
    <div className="Toolbar--tool sdv-tool-border" data-automationid="tool--" />
    <div className="Toolbar--tool sdv-tool-border" data-automationid="tool--" />
    <div className="Toolbar--tool sdv-tool-border" data-automationid="tool--" />
  </div>
);

export default Toolbar;
