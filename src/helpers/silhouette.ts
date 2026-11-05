type TSilhouetteSource = HTMLCanvasElement | HTMLImageElement;

const silhouettes = new WeakMap<TSilhouetteSource, HTMLCanvasElement>();

function getSize(image: TSilhouetteSource) {
  return image instanceof HTMLImageElement
    ? { height: image.naturalHeight, width: image.naturalWidth }
    : { height: image.height, width: image.width };
}

function makeSilhouette(image: TSilhouetteSource) {
  const { height, width } = getSize(image);

  // An image that has not loaded has no size, and a blank silhouette must
  // not stay in the cache.
  if (height === 0 || width === 0) {
    return undefined;
  }

  const canvas = document.createElement("canvas");
  canvas.height = height;
  canvas.width = width;

  const context = canvas.getContext("2d");

  if (context === null) {
    return undefined;
  }

  context.drawImage(image, 0, 0);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, height);

  return canvas;
}

export function getSilhouette(image: TSilhouetteSource) {
  const cached = silhouettes.get(image);

  if (cached !== undefined) {
    return cached;
  }

  const silhouette = makeSilhouette(image);

  if (silhouette !== undefined) {
    silhouettes.set(image, silhouette);
  }

  return silhouette;
}
