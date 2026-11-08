import cn from "clsx";
import { For, Show } from "solid-js";

import { trees } from "../../../data/game/trees.json";
import { atlasSprite } from "../../../helpers/atlas";
import { getIncomeTooltip } from "../../../helpers/income";
import { getSaplingCost, getTreeIncome } from "../../../helpers/treeIncome";
import BigText from "../../BigText/BigText";
import Sprite from "../../Sprite/Sprite";
import Tooltip from "../../Tooltip/Tooltip";

interface IProps {
  date: number;
  selectTree: (treeId: string) => void;
  selectedItem?: ISelectedItem;
  treeIds: string[];
}

export default function TreeMenu(props: IProps) {
  const getTooltip = (tree: ITree) =>
    getIncomeTooltip({
      cost: getSaplingCost(tree),
      income: getTreeIncome(tree, props.date),
      sell: tree.sell,
    });

  return (
    <Show when={props.treeIds.length > 0}>
      <div class="TreeMenu">
        <div
          aria-label="Trees"
          aria-level={2}
          class="TreeMenu--heading"
          data-testid="tree-menu--heading"
          role="heading"
        >
          <span aria-hidden="true" class="TreeMenu--icon">
            🌳
          </span>
          <BigText>Trees</BigText>
        </div>
        <For each={props.treeIds}>
          {(treeId) => {
            let rowRef: HTMLDivElement | undefined;

            return (
              <>
                <div
                  class={cn("sdv-list-item", {
                    selected:
                      props.selectedItem?.type === "tree" &&
                      props.selectedItem.id === treeId,
                  })}
                  data-testid={`tree--${treeId}`}
                  onClick={() => {
                    props.selectTree(treeId);
                  }}
                  ref={rowRef}
                >
                  <div class="sdv-list-item-icon">
                    <Sprite
                      {...atlasSprite("trees", trees[treeId].sprites.sapling)}
                    />
                  </div>
                  <div>
                    <BigText>{trees[treeId].name}</BigText>
                  </div>
                </div>
                <Tooltip
                  anchor={() => rowRef}
                  lines={getTooltip(trees[treeId])}
                />
              </>
            );
          }}
        </For>
      </div>
    </Show>
  );
}
