import { buildings } from "../data/game/buildings.json";
import type { TPaintBlock } from "./buildingColors";
import { cabinLimit, type TBuildLimit } from "./buildingLimits";
import type { TBuildingRefusal } from "./buildingRules";
import { formatShortDate } from "./date";
import { farmhouseId, findHouseLevel } from "./houseUpgrades";
import type { TBlockingThing, TTileBlocker } from "./tileBlockers";

export interface IReasonLine {
  icon: string;
  text: string;
}

const nameOf = (buildingId: string) => buildings[buildingId].name;

const article = (name: string) => (/^[aeiou]/iu.test(name) ? "an" : "a");

const withArticle = (name: string) => `${article(name)} ${name}`;

const capitalise = (text: string) =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

// A date shows only when it is not the date on view.
const onDate = (date: number, viewDate: number) =>
  date === viewDate ? "" : ` on ${formatShortDate(date, viewDate)}`;

const thingLines: Record<TBlockingThing, IReasonLine> = {
  bush: { icon: "🌿", text: "A bush is here" },
  crop: { icon: "🌱", text: "A crop is here" },
  floor: { icon: "🧱", text: "A floor is here" },
  item: { icon: "📦", text: "An item is here" },
  tree: { icon: "🌳", text: "A tree is here" },
};

const groundLines: Record<"door" | "ground" | "water", IReasonLine> = {
  door: { icon: "🚪", text: "Keep the tile below the door clear" },
  ground: { icon: "🚫", text: "You cannot build here" },
  water: { icon: "🌊", text: "You cannot build on water" },
};

function describeTile(blocker: TTileBlocker, viewDate: number): IReasonLine {
  if (blocker.type === "building") {
    const name = nameOf(blocker.buildingId);

    return {
      icon: "🏡",
      text: blocker.isFixed
        ? `The ${name} is here`
        : `${capitalise(withArticle(name))} is here${onDate(blocker.date, viewDate)}`,
    };
  }

  if (blocker.type === "thing") {
    const line = thingLines[blocker.thing];

    return { ...line, text: `${line.text}${onDate(blocker.date, viewDate)}` };
  }

  return groundLines[blocker.type];
}

const houseLevelIcons: Partial<Record<number, string>> = {
  1: "🍳",
  2: "🍼",
  3: "🍷",
};

// Only the house and the cabins need a level, and the plan has no cabin
// levels (SV › Building.CanBePainted).
function describePaintBlock(
  buildingId: string,
  block: TPaintBlock,
): IReasonLine {
  if (block.type === "level") {
    const houseLevel = findHouseLevel(block.level);

    return buildingId === farmhouseId
      ? {
          icon: houseLevelIcons[block.level] ?? "🏠",
          text: `Paint needs the ${houseLevel?.name ?? `house level ${block.level}`}`,
        }
      : {
          icon: "🏠",
          text: `Paint needs a ${nameOf(buildingId)} upgrade (not in the planner)`,
        };
  }

  return block.upgradeId === undefined
    ? { icon: "🎨", text: `The ${nameOf(buildingId)} cannot take paint` }
    : {
        icon: "🎨",
        text: `Paint needs the ${nameOf(block.upgradeId)} upgrade`,
      };
}

function describeColors(buildingId: string, hasPaint: boolean): IReasonLine {
  return {
    icon: "🎨",
    text: hasPaint
      ? `The ${nameOf(buildingId)} has these colours already`
      : `The ${nameOf(buildingId)} has no paint already`,
  };
}

function describeLimit(limit: TBuildLimit, buildingId: string): IReasonLine {
  return limit === "cabins"
    ? { icon: "🏠", text: `You can have only ${cabinLimit} cabins` }
    : {
        icon: "🐴",
        text: `Each ${nameOf(buildingId)} after the first needs a cabin`,
      };
}

export function describeRefusal(
  refusal: TBuildingRefusal,
  viewDate: number,
): IReasonLine {
  if (refusal.type === "tile") {
    return describeTile(refusal.blocker, viewDate);
  }

  if (refusal.type === "limit") {
    return describeLimit(refusal.limit, refusal.buildingId);
  }

  if (refusal.type === "painted") {
    return {
      icon: "🎨",
      text: `The ${nameOf(refusal.buildingId)} has this look already`,
    };
  }

  if (refusal.type === "unpaintable") {
    return describePaintBlock(refusal.buildingId, refusal.block);
  }

  if (refusal.type === "colored") {
    return describeColors(refusal.buildingId, refusal.hasPaint);
  }

  if (refusal.type === "houseBuilt") {
    return {
      icon: "❌",
      text: `The ${nameOf(farmhouseId)} has ${withArticle(findHouseLevel(refusal.level)?.name ?? "")} already`,
    };
  }

  if (refusal.type === "repaired") {
    return {
      icon: "🌿",
      text: `The ${nameOf("greenhouse")} is repaired already`,
    };
  }

  return {
    icon: "❌",
    text: `You cannot upgrade ${withArticle(nameOf(refusal.fromId))} to ${withArticle(nameOf(refusal.upgradeId))}`,
  };
}

export function describeNextGoodDate(
  nextDate: number,
  viewDate: number,
): IReasonLine {
  return {
    icon: "📅",
    text: `Next good day: ${formatShortDate(nextDate, viewDate)}`,
  };
}
