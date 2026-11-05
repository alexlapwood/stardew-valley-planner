import { items } from "../data/game/items.json";
import { drawSprite } from "./atlas";
import { getItemSkin } from "./items";

function getFenceSkin(skin: string | undefined) {
  return skin === undefined ? undefined : getItemSkin("fence", skin)?.fence;
}

// SV › Fence.countsForDrawing: a gate joins to every fence, but no fence
// joins to a gate.
function isJoined(skin: string, fence: IFenceSkin, neighbour?: string) {
  const neighbourFence = getFenceSkin(neighbour);

  if (neighbourFence === undefined || neighbourFence.gate) {
    return false;
  }

  return fence.gate || neighbour === skin;
}

function getNeighbourSum(
  drawing: IFenceDrawing,
  fenceMap: string[][],
  installedFence: IInstalledEquipment,
  fence: IFenceSkin,
) {
  const { skin, x, y } = installedFence;
  const { neighbours } = drawing;

  return (
    neighbours.n * +isJoined(skin, fence, fenceMap[x]?.[y - 1]) +
    neighbours.e * +isJoined(skin, fence, fenceMap[x + 1]?.[y]) +
    neighbours.s * +isJoined(skin, fence, fenceMap[x]?.[y + 1]) +
    neighbours.w * +isJoined(skin, fence, fenceMap[x - 1]?.[y])
  );
}

function getCellRect(
  drawing: IFenceDrawing,
  block: TSpriteRect,
  cell: number,
): TSpriteRect {
  return [
    block[0] + (cell % drawing.columns) * drawing.cellWidth,
    block[1] + Math.floor(cell / drawing.columns) * drawing.cellHeight,
    drawing.cellWidth,
    drawing.cellHeight,
  ];
}

export function renderFenceToContext(
  context: CanvasRenderingContext2D,
  fenceImage: CanvasImageSource,
  installedFence: IInstalledEquipment,
  fenceMap: string[][],
) {
  const { fenceDrawing: drawing } = items.fence;
  const fence = getFenceSkin(installedFence.skin);

  if (drawing === undefined || fence === undefined) {
    return;
  }

  const sum = String(getNeighbourSum(drawing, fenceMap, installedFence, fence));
  const tileX = installedFence.x * 16;
  const tileY = installedFence.y * 16;
  const gateParts = fence.gate ? drawing.gate.partsBySum[sum] : undefined;

  if (gateParts !== undefined) {
    gateParts.forEach(({ closed, offset }) => {
      const [x, y, width, height] = closed;

      drawSprite(
        context,
        fenceImage,
        [fence.block[0] + x, fence.block[1] + y, width, height],
        tileX + offset[0],
        tileY + offset[1],
      );
    });

    return;
  }

  const cell = fence.gate
    ? drawing.gate.otherCell
    : (drawing.drawGuide[sum] ?? drawing.drawGuide["0"] ?? 0);

  drawSprite(
    context,
    fenceImage,
    getCellRect(drawing, fence.block, cell),
    tileX + drawing.cellOffset[0],
    tileY + drawing.cellOffset[1],
  );
}
