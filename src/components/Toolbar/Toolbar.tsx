import "./Toolbar.css";

import cn from "clsx";

interface IProps {
  images: HTMLImageElement[];
  isDisabled?: boolean;
  selectedItem?: ISelectedItem;
  selectTool: (tool: string) => void;
}

export default function Toolbar(props: IProps) {
  return (
    <div
      class={cn("Toolbar", "sdv-toolbar-border", "flex-horizontal", {
        disabled: props.isDisabled,
      })}
    >
      <div
        class={cn("Toolbar--tool sdv-tool-border", {
          selected:
            props.selectedItem !== undefined &&
            props.selectedItem.type === "tool" &&
            props.selectedItem.id === "pick-axe",
        })}
        data-testid="tool--pick-axe"
        // tslint:disable-next-line:jsx-no-lambda
        onClick={() => {
          props.selectTool("pick-axe");
        }}
      >
        <img src="images/pick-axe.png" />
      </div>
      <div class="Toolbar--tool sdv-tool-border" data-testid="tool--" />
      <div class="Toolbar--tool sdv-tool-border" data-testid="tool--" />
      <div class="Toolbar--tool sdv-tool-border" data-testid="tool--" />
      <div class="Toolbar--tool sdv-tool-border" data-testid="tool--" />
      <div class="Toolbar--tool sdv-tool-border" data-testid="tool--" />
      <div class="Toolbar--tool sdv-tool-border" data-testid="tool--" />
    </div>
  );
}
