import type { atlasSprite } from "./atlas";

// sprite is a 16 × 16 game icon, which shows in place of the icon.
export interface ITooltipLine {
  icon?: string;
  sprite?: ReturnType<typeof atlasSprite>;
  text: string;
}

export interface IBox {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface ITextRun {
  isInFont: boolean;
  text: string;
}

const anchorGap = 2;

// BigText has letters only for printable ASCII, so other characters, like ×
// and the emoji, must be drawn as text.
const fontRuns = /([\u0020-\u007E]+)|[^\u0020-\u007E]+/gu;

export function splitFontRuns(text: string): ITextRun[] {
  return Array.from(text.matchAll(fontRuns), (match) => ({
    isInFont: match[1] !== undefined,
    text: match[0],
  }));
}

// A line with a sprite shows the sprite, not its icon, so the label has no
// icon either.
const getLineText = ({ icon, sprite, text }: ITooltipLine) =>
  icon === undefined || sprite !== undefined ? text : `${icon} ${text}`;

export const getTooltipText = (lines: readonly ITooltipLine[]) =>
  lines.map(getLineText).join("\n");

// A view with no size is not on screen. A tooltip that is bigger than the view
// keeps its start in the view.
function moveIntoView(
  start: number,
  size: number,
  viewStart: number,
  viewSize: number,
) {
  return viewSize > 0
    ? Math.max(viewStart, Math.min(start, viewStart + viewSize - size))
    : start;
}

// The tooltip goes above its anchor, so that it does not hide the anchor, or
// below it when the view has no space above it.
export function getTooltipPosition(
  size: Pick<IBox, "height" | "width">,
  anchor: IBox,
  view: IBox,
) {
  const above = anchor.y - size.height - anchorGap;
  const top = above >= view.y ? above : anchor.y + anchor.height + anchorGap;

  return {
    left: moveIntoView(anchor.x, size.width, view.x, view.width),
    top: moveIntoView(top, size.height, view.y, view.height),
  };
}
