import { findAtlas, findImage } from "../../helpers/atlas";
import { waterImageUrl } from "../../helpers/water";

export function findPlanImages(images: HTMLImageElement[]) {
  return {
    buildings: findAtlas(images, "buildings"),
    bushes: findAtlas(images, "bushes"),
    crops: findAtlas(images, "crops"),
    fences: findAtlas(images, "fences"),
    flooring: findAtlas(images, "flooring"),
    flooringWinter: findAtlas(images, "flooringWinter"),
    highlight: {
      amber: findImage(images, "/images/highlight-amber.png"),
      blockerOutline: findImage(images, "/images/blocker-outline.png"),
      green: findImage(images, "/images/highlight-green.png"),
      grey: findImage(images, "/images/highlight-grey.png"),
      lime: findImage(images, "/images/highlight-lime.png"),
      red: findImage(images, "/images/highlight-red.png"),
      yellow: findImage(images, "/images/highlight-yellow.png"),
    },
    hoeDirt: findImage(images, "/images/hoeDirt.png"),
    hoeDirtSnow: findImage(images, "/images/hoeDirtSnow.png"),
    items: findAtlas(images, "items"),
    robin: findAtlas(images, "robin"),
    trees: findAtlas(images, "trees"),
    water: findImage(images, waterImageUrl),
  };
}
