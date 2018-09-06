export function forEachTile(
  highlightedRegion: { x1: number; x2: number; y1: number; y2: number },
  cb: (x: number, y: number) => any
) {
  const { x1, x2, y1, y2 } = highlightedRegion;

  if (isNaN(x1) || isNaN(x2) || isNaN(y1) || isNaN(y2)) {
    return;
  }

  const xDirection = Math.sign(x2 - x1) || 1;
  const yDirection = Math.sign(y2 - y1) || 1;

  for (let y = y1; y !== y2 + yDirection; y += yDirection) {
    for (let x = x1; x !== x2 + xDirection; x += xDirection) {
      cb(x, y);
    }
  }
}

export function getCropsAtLocation(
  currentCrops: IFarmCrops,
  x: number,
  y: number
) {
  if (currentCrops[y] !== undefined && currentCrops[y][x] !== undefined) {
    return currentCrops[y][x];
  }

  return [] as IPlantedCrop[];
}

export function getEquipmentAtLocation(
  currentEquipment: IFarmEquipment,
  x: number,
  y: number
) {
  if (
    currentEquipment[y] !== undefined &&
    currentEquipment[y][x] !== undefined
  ) {
    return currentEquipment[y][x];
  }

  return [] as IInstalledEquipment[];
}
