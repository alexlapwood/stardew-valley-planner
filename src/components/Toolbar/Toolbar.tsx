import * as React from "react";

import * as cn from "classnames";

import "./Toolbar.css";

interface IProps {
  images: HTMLImageElement[];
  selectedToolId?: string;
  selectTool: (tool: string) => void;
}

const Toolbar: React.SFC<IProps> = props => (
  <div className="Toolbar sdv-toolbar-border flex-horizontal">
    <div
      className={cn("Toolbar--tool sdv-tool-border", {
        selected: props.selectedToolId === "axe"
      })}
      // tslint:disable-next-line:jsx-no-lambda
      onClick={() => {
        props.selectTool("axe");
      }}
    >
      <img src="/images/pick-axe.png" />
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
