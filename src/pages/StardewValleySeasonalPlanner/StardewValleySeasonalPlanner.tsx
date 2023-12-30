import "./StardewValleySeasonalPlanner.scss";

import Solid, { createSignal, onMount } from "solid-js";

import { imageUrls } from "../../__helpers__/images";
import DatePicker from "../../components/DatePicker/DatePicker";
import Farm from "../../components/Farm/Farm";
import SideMenu from "../../components/SideMenu/SideMenu";
import Toolbar from "../../components/Toolbar/Toolbar";
import { crops } from "../../data/sdv.json";
import { getSeason } from "../../helpers/date";

interface Props extends Solid.JSX.HTMLAttributes<HTMLDivElement> {}

const [windowWidth, setWindowWidth] = createSignal(window.innerWidth);
const [windowHeight, setWindowHeight] = createSignal(window.innerHeight);

function onResize() {
  setWindowWidth(window.innerWidth);
  setWindowHeight(window.innerHeight);
}

window.addEventListener("resize", onResize);

document.addEventListener("DOMContentLoaded", onResize);

export const StardewValleySeasonalPlanner: Solid.Component<Props> = ({
  class: className,
  ...attributes
}) => {
  document.title = "Stardew Valley Seasonal Planner";

  const plannerHeight = () => (800 * windowHeight()) / windowWidth();
  const plannerScale = () => windowWidth() / 800;

  const [currentFarm] = createSignal<
    "Standard" | "Riverland" | "Forest" | "Hill-top" | "Wilderness" | "Test"
  >("Standard");
  const [date, setDate] = createSignal(0);
  const [images, setImages] = createSignal<HTMLImageElement[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [selectedItem, setSelectedItem] = createSignal<ISelectedItem>();
  const [toolbarsDisabled, setToolbarsDisabled] = createSignal(false);

  function changeDate(date: number) {
    const currentItem = selectedItem();

    if (currentItem === undefined || currentItem.type !== "crop") {
      setDate(date);
      return;
    }

    const selectedCrop = crops[currentItem.id];

    const keepSelectedItem =
      selectedCrop !== undefined &&
      selectedCrop.seasons.find(
        (season) =>
          season === ["spring", "summer", "fall", "winter"][getSeason(date)]
      );

    setDate(date);
    setSelectedItem(keepSelectedItem ? selectedItem : undefined);
  }

  const imagePromises = imageUrls.map(async (imageUrl) => {
    const image = new Image();
    image.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      image.onerror = () => {
        reject();
      };
      image.onload = () => {
        resolve();
      };
    });

    return image;
  });

  onMount(async () => {
    const images = await Promise.all(imagePromises);

    setImages(images);

    setIsLoading(false);
  });

  return (
    <>
      {isLoading() ? (
        <div>loading...</div>
      ) : (
        <div
          class={`pageStardewValleySeasonalPlanner ${className}`}
          style={{
            height: plannerHeight() + "px",
            transform: "scale(" + plannerScale() + ")",
          }}
          {...attributes}
        >
          <div class="flex-horizontal" style={{ height: "100%" }}>
            <div class="flex-vertical flex overflow-hidden">
              <div class="relative flex overflow-hidden">
                <Farm
                  currentFarm={currentFarm()}
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
                // tslint:disable-next-line:jsx-no-lambda
                selectCrop={(cropId: string) => {
                  setSelectedItem({ id: cropId, type: "crop" });
                }}
                // tslint:disable-next-line:jsx-no-lambda
                selectEquipment={(id: string, skinIndex: number) => {
                  setSelectedItem({ id, skinIndex, type: "equipment" });
                }}
                selectedItem={selectedItem()}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
