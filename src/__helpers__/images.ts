const imageUrls: string[] = [
  "images/background-spring.png",
  "images/background-summer.png",
  "images/background-fall.png",
  "images/background-winter.png",
  "images/highlight-green.png",
  "images/highlight-grey.png",
  "images/highlight-red.png",
  "images/crops.png",
  "images/equipment.png",
  "images/hoeDirt.png",
  "images/hoeDirtSnow.png",
  "images/fences.png",
  "images/flooring.png"
];

const mockImages = imageUrls.map(imageUrl => {
  const image = new Image();
  image.src = imageUrl;
  return image;
});

export default mockImages;
