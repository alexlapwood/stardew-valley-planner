export const imageUrls: string[] = [
  "images/crops.png",
  "images/equipment-sheet.png",
  "images/fences.png",
  "images/flooring.png",
  "images/highlight-green.png",
  "images/highlight-grey.png",
  "images/highlight-red.png",
  "images/hoeDirt.png",
  "images/hoeDirtSnow.png",
  "images/pick-axe.png",
  "images/sdv-font.png",
  "images/seeds.png",
  "images/standard-fall.png",
  "images/standard-spring.png",
  "images/standard-summer.png",
  "images/standard-winter.png",
  "images/riverland-fall.png",
  "images/riverland-spring.png",
  "images/riverland-summer.png",
  "images/riverland-winter.png",
  "images/wilderness-fall.png",
  "images/wilderness-spring.png",
  "images/wilderness-summer.png",
  "images/wilderness-winter.png"
];

const images = imageUrls.map(imageUrl => {
  const image = new Image();
  image.src = imageUrl;
  return image;
});

export default images;
