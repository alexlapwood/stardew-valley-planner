import "./SideMenu.css";

import cn from "clsx";
import { createMemo, createSignal, For } from "solid-js";

import { buildings } from "../../data/game/buildings.json";
import { crops } from "../../data/game/crops.json";
import { items } from "../../data/game/items.json";
import type { TItemTabId } from "../../data/itemTabs";
import { atlasSprite } from "../../helpers/atlas";
import FitSprite from "../FitSprite/FitSprite";
import NameField from "../NameField/NameField";
import Tooltip from "../Tooltip/Tooltip";
import BuildingMenu from "./BuildingMenu/BuildingMenu";
import EquipmentMenu from "./EquipmentMenu/EquipmentMenu";
import SeedMenu from "./SeedMenu/SeedMenu";
import {
  getCropIdsInSeason,
  getTabItemIds,
  searchBuildingRows,
  searchCropIds,
  searchItemIds,
  searchTreeIds,
} from "./sideMenuItems";
import TreeMenu from "./TreeMenu/TreeMenu";

interface IProps {
  date: number;
  selectBuilding: (buildingId: string, skin?: string) => void;
  selectCrop: (cropId: string) => void;
  selectEquipment: (equipmentId: string, skin: string) => void;
  selectItem: (item: ISelectedItem) => void;
  selectTree: (treeId: string) => void;
  selectedItem?: ISelectedItem;
}

type TTabId = "buildings" | "crops" | TItemTabId;

interface ITab {
  icon: ReturnType<typeof atlasSprite>;
  id: TTabId;
  name: string;
}

const tabIconSize = 16;

function getDefaultIcon(itemId: string): TSpriteRect {
  const item = items[itemId];

  return item.skins[item.skinOrder[0]]?.icon ?? [0, 0, 0, 0];
}

// A tab has room for 16 px of a 32 px tall sprite, so it shows the part of the
// item that is easy to see: the head of the scarecrow and the pot of the plant.
const [scarecrowX, scarecrowY] = getDefaultIcon("scarecrow");
const [plantX, plantY, , plantHeight] = getDefaultIcon("seasonal_plant");

const tabs: readonly ITab[] = [
  {
    icon: atlasSprite("crops", crops.ancient_fruit.sprites.seed),
    id: "crops",
    name: "Crops",
  },
  {
    icon: atlasSprite("items", [
      scarecrowX,
      scarecrowY,
      tabIconSize,
      tabIconSize,
    ]),
    id: "items",
    name: "Items",
  },
  {
    icon: atlasSprite("items", [
      plantX,
      plantY + plantHeight - tabIconSize,
      tabIconSize,
      tabIconSize,
    ]),
    id: "decorations",
    name: "Decorations",
  },
  // No 16 px part of a building is easy to see, so the tab shows a whole barn,
  // shrunk to fit.
  {
    icon: atlasSprite("buildings", buildings.barn.sprite.sprite),
    id: "buildings",
    name: "Buildings",
  },
];

const tabItemIds: Record<TItemTabId, string[]> = {
  decorations: getTabItemIds("decorations"),
  items: getTabItemIds("items"),
};

export default function SideMenu(props: IProps) {
  const [currentTabId, setCurrentTabId] = createSignal(tabs[0].id);
  const [searchText, setSearchText] = createSignal("");
  const [openDropdownId, setOpenDropdownId] = createSignal<string>();

  const isSearching = () => searchText().trim() !== "";

  const cropIds = createMemo(() =>
    searchCropIds(getCropIdsInSeason(props.date), searchText()),
  );

  const treeIds = createMemo(() => searchTreeIds(searchText()));

  const shownItemIds = createMemo(() => ({
    buildings: new Set(searchBuildingRows(searchText())),
    decorations: new Set(searchItemIds(tabItemIds.decorations, searchText())),
    items: new Set(searchItemIds(tabItemIds.items, searchText())),
  }));

  const hasNoMatches = (tabId: TTabId) =>
    isSearching() &&
    (tabId === "crops"
      ? cropIds().length === 0 && treeIds().length === 0
      : shownItemIds()[tabId].size === 0);

  const renderList = (tabId: TTabId) => {
    if (tabId === "crops") {
      return (
        <>
          <SeedMenu
            cropIds={cropIds()}
            date={props.date}
            selectCrop={props.selectCrop}
            selectedItem={props.selectedItem}
          />
          <TreeMenu
            date={props.date}
            selectTree={props.selectTree}
            selectedItem={props.selectedItem}
            treeIds={treeIds()}
          />
        </>
      );
    }

    if (tabId === "buildings") {
      return (
        <BuildingMenu
          date={props.date}
          search={searchText()}
          selectItem={(item) => {
            if (item.type !== "building") {
              props.selectItem(item);
            } else if (item.skin === undefined) {
              props.selectBuilding(item.id);
            } else {
              props.selectBuilding(item.id, item.skin);
            }
          }}
          selectedItem={props.selectedItem}
          shownKeys={shownItemIds().buildings}
        />
      );
    }

    return (
      <EquipmentMenu
        date={props.date}
        equipmentIds={tabItemIds[tabId]}
        openDropdownId={openDropdownId()}
        search={searchText()}
        selectEquipment={props.selectEquipment}
        selectedItem={props.selectedItem}
        setOpenDropdownId={setOpenDropdownId}
        shownIds={shownItemIds()[tabId]}
      />
    );
  };

  return (
    <div class="SideMenu flex-vertical">
      <div class="SideMenu--tabs" role="tablist">
        <For each={tabs}>
          {(tab) => {
            let tabRef: HTMLDivElement | undefined;

            return (
              <>
                <div
                  aria-label={tab.name}
                  aria-selected={tab.id === currentTabId()}
                  class={cn("sdv-tab", {
                    "no-matches": hasNoMatches(tab.id),
                    selected: tab.id === currentTabId(),
                  })}
                  data-testid={`${tab.id}-tab`}
                  onClick={() => {
                    setCurrentTabId(tab.id);
                  }}
                  ref={tabRef}
                  role="tab"
                >
                  <FitSprite {...tab.icon} size={tabIconSize} />
                </div>
                <Tooltip anchor={() => tabRef} lines={[{ text: tab.name }]} />
              </>
            );
          }}
        </For>
      </div>
      <div class="SideMenu--frame sdv-list">
        <NameField
          changeValue={setSearchText}
          class="SideMenu--search"
          label="Search"
          placeholder="Search"
          testId="side-menu--search"
          value={searchText()}
        />
        <For each={tabs}>
          {(tab) => (
            <div
              aria-label={tab.name}
              class={cn("SideMenu--list", {
                hidden: tab.id !== currentTabId(),
              })}
              data-testid={`side-menu--list-${tab.id}`}
              role="tabpanel"
            >
              {renderList(tab.id)}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
