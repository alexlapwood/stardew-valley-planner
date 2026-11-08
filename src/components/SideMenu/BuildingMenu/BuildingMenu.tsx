import cn from "clsx";
import { createSignal, For, Show } from "solid-js";

import { buildings } from "../../../data/game/buildings.json";
import { atlasSprite } from "../../../helpers/atlas";
import {
  getSkinName,
  hasSkins,
  stepSkin,
} from "../../../helpers/buildingSkins";
import { getBuildingTooltip } from "../../../helpers/buildingTooltip";
import { getSeasonName } from "../../../helpers/date";
import { getBuildingSprite } from "../../../helpers/defaultBuildings";
import BigText from "../../BigText/BigText";
import FitSprite from "../../FitSprite/FitSprite";
import Tooltip from "../../Tooltip/Tooltip";
import {
  buildingRows,
  getShownBuildingSkin,
  type IBuildingRow,
  paintRow,
} from "../sideMenuItems";
import PaintMenu from "./PaintMenu/PaintMenu";

interface IProps {
  date: number;
  search?: string;
  selectItem: (item: ISelectedItem) => void;
  selectedItem?: ISelectedItem;
  shownKeys?: ReadonlySet<string>;
}

const iconSize = 16;

const skinSteps = [
  { label: "Previous look", name: "previous", step: -1 },
  { label: "Next look", name: "next", step: 1 },
] as const;

const hasSkinPicker = ({ buildingId, item }: IBuildingRow) =>
  item?.type === "building" && hasSkins(buildingId);

const paintItem: ISelectedItem = { id: paintRow.key, type: "paint" };

export default function BuildingMenu(props: IProps) {
  const [pickedSkins, setPickedSkins] = createSignal<
    Readonly<Partial<Record<string, string>>>
  >({});
  const [brushColors, setBrushColors] = createSignal<TBrushColors>({});

  const isSelected = ({ item }: IBuildingRow) =>
    item !== undefined &&
    props.selectedItem?.type === item.type &&
    props.selectedItem.id === item.id;

  const isPaintSelected = () => props.selectedItem?.type === paintItem.type;

  const selectPaint = (colors = brushColors()) => {
    setBrushColors(colors);
    props.selectItem({ ...paintItem, colors });
  };

  const getShownSkin = (row: IBuildingRow) =>
    hasSkinPicker(row)
      ? getShownBuildingSkin(
          row.buildingId,
          pickedSkins()[row.buildingId] ?? row.buildingId,
          props.search ?? "",
        )
      : undefined;

  const getName = (row: IBuildingRow) => {
    const skin = getShownSkin(row);

    return skin === undefined ? row.name : getSkinName(row.buildingId, skin);
  };

  const getTooltip = (row: IBuildingRow) =>
    row.item === undefined
      ? []
      : getBuildingTooltip({ ...row.item, skin: getShownSkin(row) });

  const getIcon = (row: IBuildingRow) =>
    atlasSprite(
      "buildings",
      getBuildingSprite(
        buildings[row.buildingId],
        getSeasonName(props.date),
        getShownSkin(row) ?? row.lookKey,
      ).rect,
    );

  // As for an item, picking a skin also selects the row, so the next click on
  // the farm uses that skin.
  const select = ({ buildingId, item }: IBuildingRow, skin?: string) => {
    if (item === undefined) {
      return;
    }

    if (skin === undefined) {
      props.selectItem(item);
      return;
    }

    setPickedSkins({ ...pickedSkins(), [buildingId]: skin });
    props.selectItem({ ...item, skin });
  };

  return (
    <div class="BuildingMenu">
      <div classList={{ hidden: props.shownKeys?.has(paintRow.key) === false }}>
        <div
          class={cn("sdv-list-item", { selected: isPaintSelected() })}
          data-testid={paintRow.key}
          onClick={() => {
            selectPaint();
          }}
        >
          <div class="sdv-list-item-icon">
            <span aria-hidden="true" class="BuildingMenu--paint-icon">
              🎨
            </span>
          </div>
          <div>
            <BigText>{paintRow.name}</BigText>
          </div>
        </div>
        <Show when={isPaintSelected()}>
          <PaintMenu changeColors={selectPaint} colors={brushColors()} />
        </Show>
      </div>
      <For each={buildingRows}>
        {(row) => {
          let rowRef: HTMLDivElement | undefined;

          return (
            <div
              classList={{
                hidden: props.shownKeys?.has(row.key) === false,
                "margin-left": row.parentKey !== undefined,
              }}
            >
              <div
                class={cn("sdv-list-item", {
                  "BuildingMenu--label": row.item === undefined,
                  selected: isSelected(row),
                })}
                data-skin={getShownSkin(row)}
                data-testid={row.key}
                onClick={() => {
                  select(row, getShownSkin(row));
                }}
                ref={rowRef}
              >
                <div class="sdv-list-item-icon">
                  <FitSprite {...getIcon(row)} size={iconSize} />
                </div>
                <div class={hasSkinPicker(row) ? "flex" : undefined}>
                  <BigText>{getName(row)}</BigText>
                </div>
                <Show when={hasSkinPicker(row)}>
                  <For each={skinSteps}>
                    {({ label, name, step }) => (
                      <button
                        aria-label={label}
                        class={cn(
                          "BuildingMenu--skin-button",
                          `sdv-button-${name === "next" ? "right" : "left"}`,
                        )}
                        data-testid={`building-skin--${row.buildingId}--${name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          select(
                            row,
                            stepSkin(
                              row.buildingId,
                              getShownSkin(row) ?? row.buildingId,
                              step,
                            ),
                          );
                        }}
                        type="button"
                      />
                    )}
                  </For>
                </Show>
              </div>
              <Tooltip anchor={() => rowRef} lines={getTooltip(row)} />
            </div>
          );
        }}
      </For>
    </div>
  );
}
