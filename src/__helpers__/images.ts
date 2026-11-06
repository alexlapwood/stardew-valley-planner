import { atlasUrls } from "../helpers/atlas";
import { waterImageUrl } from "../helpers/water";

export const imageUrls: string[] = [
  ...Object.values(atlasUrls),
  waterImageUrl,
  "images/blocker-outline.png",
  "images/highlight-amber.png",
  "images/highlight-green.png",
  "images/highlight-grey.png",
  "images/highlight-red.png",
  "images/hoeDirt.png",
  "images/hoeDirtSnow.png",
  "images/pick-axe.png",
  "images/sdv-font.png",
];

const images = imageUrls.map((imageUrl) => {
  const image = new Image();
  image.src = imageUrl;
  return image;
});

export default images;
