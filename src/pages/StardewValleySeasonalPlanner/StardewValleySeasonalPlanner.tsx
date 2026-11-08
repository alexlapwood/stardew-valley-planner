import "./StardewValleySeasonalPlanner.css";

import {
  type Component,
  createSignal,
  type JSX,
  onMount,
  Show,
} from "solid-js";

import { imageUrls } from "../../__helpers__/images";
import DatePicker from "../../components/DatePicker/DatePicker";
import Farm from "../../components/Farm/Farm";
import Header from "../../components/Header/Header";
import PlanView from "../../components/PlanView/PlanView";
import SideMenu from "../../components/SideMenu/SideMenu";
import Toolbar from "../../components/Toolbar/Toolbar";
import { crops } from "../../data/game/crops.json";
import { getSeasonName } from "../../helpers/date";
import {
  hasDevFarmSwitch,
  parseDevFarmSwitch,
} from "../../helpers/devFarmSwitch";
import {
  date,
  openPlanFile,
  planStore,
  savePlanFile,
  setDate,
} from "../../state/farm";
import { defaultPlanName } from "../../state/plan";

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {}

const [windowWidth, setWindowWidth] = createSignal(window.innerWidth);
const [windowHeight, setWindowHeight] = createSignal(window.innerHeight);

function onResize() {
  setWindowWidth(window.innerWidth);
  setWindowHeight(window.innerHeight);
}

window.addEventListener("resize", onResize);

document.addEventListener("DOMContentLoaded", onResize);

const plannerHeight = () => (800 * windowHeight()) / windowWidth();
const plannerScale = () => windowWidth() / 800;

// A new browser, like a headless one that takes screenshots, opens on the New
// plan page and cannot click, so in development ?farm=beach adds a plan for
// that farm and opens it in the editor.
async function addDevFarmPlan() {
  if (!import.meta.env.DEV || !hasDevFarmSwitch(window.location.search)) {
    return;
  }

  const farm = parseDevFarmSwitch(window.location.search);

  await planStore.addNewPlan(farm, defaultPlanName(farm, planStore.plans()));
  // A reload must not add the plan again.
  window.history.replaceState(null, "", window.location.pathname);
}

async function loadPlans() {
  await planStore.start();
  await addDevFarmPlan();
}

export const StardewValleySeasonalPlanner: Component<Props> = ({
  class: className,
  ...attributes
}) => {
  document.title = "Stardew Valley Seasonal Planner";

  const [images, setImages] = createSignal<HTMLImageElement[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [loadingMessage, setLoadingMessage] = createSignal("loading...");
  const [selectedItem, setSelectedItem] = createSignal<ISelectedItem>();
  const [toolbarsDisabled, setToolbarsDisabled] = createSignal(false);

  function changeDate(date: number) {
    const currentItem = selectedItem();

    if (currentItem === undefined || currentItem.type !== "crop") {
      setDate(date);
      return;
    }

    const isInSeason =
      Object.hasOwn(crops, currentItem.id) &&
      crops[currentItem.id].seasons.includes(getSeasonName(date));

    setDate(date);

    if (!isInSeason) {
      setSelectedItem(undefined);
    }
  }

  const imagePromises = imageUrls.map(async (imageUrl) => {
    const image = new Image();
    image.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      image.onerror = () => {
        reject(new Error(`Could not load image ${imageUrl}`));
      };
      image.onload = () => {
        resolve();
      };
    });

    return image;
  });

  async function loadImages() {
    setImages(await Promise.all(imagePromises));
  }

  async function loadPage() {
    const [imagesResult, plansResult] = await Promise.allSettled([
      loadImages(),
      loadPlans(),
    ]);

    if (imagesResult.status === "rejected") {
      console.error("Could not load the images.", imagesResult.reason);
      setLoadingMessage("Could not load the images. Reload the page.");
      return;
    }

    if (plansResult.status === "rejected") {
      console.error("Could not load the plans.", plansResult.reason);
      setLoadingMessage("Could not load the plans. Reload the page.");
      return;
    }

    setIsLoading(false);
  }

  onMount(() => {
    void loadPage();
  });

  return (
    <Show fallback={<div>{loadingMessage()}</div>} when={!isLoading()}>
      <div
        class={`pageStardewValleySeasonalPlanner ${className}`}
        style={{
          height: plannerHeight() + "px",
          transform: "scale(" + plannerScale() + ")",
        }}
        {...attributes}
      >
        <PlanView images={images()} openFile={openPlanFile} store={planStore}>
          {(plan, openNewPlan) => (
            <div class="flex-vertical" style={{ height: "100%" }}>
              <Header
                changePlan={(id) => {
                  void planStore.openPlan(id);
                }}
                deletePlan={(id) => {
                  void planStore.deletePlan(id);
                }}
                newPlan={openNewPlan}
                openFile={openPlanFile}
                plan={plan()}
                plans={planStore.plans()}
                renamePlan={(id, name) => {
                  void planStore.renamePlan(id, name);
                }}
                saveFile={savePlanFile}
              />
              <div class="flex-horizontal flex overflow-hidden">
                <div class="flex-vertical flex overflow-hidden">
                  <div class="relative flex overflow-hidden">
                    <Farm
                      currentFarm={plan().farm}
                      date={date()}
                      disableToolbars={(disabled: boolean) => {
                        setToolbarsDisabled(disabled);
                      }}
                      images={images()}
                      selectedItem={selectedItem()}
                      zoom={1}
                    />
                    <Toolbar
                      images={images()}
                      isDisabled={toolbarsDisabled()}
                      selectTool={(toolId: string) => {
                        setSelectedItem({ id: toolId, type: "tool" });
                      }}
                      selectedItem={selectedItem()}
                    />
                    <DatePicker
                      changeDate={changeDate}
                      date={date()}
                      isDisabled={toolbarsDisabled()}
                    />
                  </div>
                </div>
                <div style={{ width: "200px" }}>
                  <SideMenu
                    date={date()}
                    selectBuilding={(buildingId: string, skin?: string) => {
                      setSelectedItem({
                        id: buildingId,
                        skin,
                        type: "building",
                      });
                    }}
                    selectCrop={(cropId: string) => {
                      setSelectedItem({ id: cropId, type: "crop" });
                    }}
                    selectEquipment={(id: string, skin: string) => {
                      setSelectedItem({ id, skin, type: "equipment" });
                    }}
                    selectItem={(item: ISelectedItem) => {
                      setSelectedItem(item);
                    }}
                    selectTree={(treeId: string) => {
                      setSelectedItem({ id: treeId, type: "tree" });
                    }}
                    selectedItem={selectedItem()}
                  />
                </div>
              </div>
            </div>
          )}
        </PlanView>
      </div>
    </Show>
  );
};
