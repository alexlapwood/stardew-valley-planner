import { buildings } from "../data/game/buildings.json";
import { getTierOn, getUpgradePath } from "./buildingTiers";
import { getHouseLevelOn } from "./houseUpgrades";
import { earliestChange, noChange, type TNextChange } from "./mapFrames";
import {
  getSwingFrame,
  getSwingNextChange,
  hammerSwing,
  type IHammerSwing,
} from "./robin";

// site: Robin's site of buildingId, on its last day or not. upgrade: fromId
// with the upgrade sign, while Robin works inside. house: the house of the
// level, with Robin at its wall.
export type TBuildStage =
  | { buildingId: string; isLastDay: boolean; type: "site" }
  | { fromId: string; type: "upgrade" }
  | { level: number; type: "house" };

// The animation draws its stages in the place of the building, for as long
// as the building or the house upgrades that it was made for are on the plan.
export type TBuildTarget =
  | { houseUpgrades: readonly IPlannedHouseUpgrade[]; type: "house" }
  | { plannedBuilding: IPlannedBuilding; type: "building" };

export interface IBuild {
  stages: TBuildStage[];
  target: TBuildTarget;
}

// start is the time of the map clock when the animation starts.
export interface IBuildAnimation extends IBuild {
  date: number;
  start: number;
}

export interface IBuildMoment {
  robinFrame?: number;
  stage: TBuildStage;
}

export interface IBuildPlan {
  buildings: readonly IPlannedBuilding[];
  date: number;
  houseUpgrades: readonly IPlannedHouseUpgrade[];
}

// Each stage is 1 swing of Robin's hammer, so that the animation takes as long
// as her frames do, and not a set time.
const swing: IHammerSwing = hammerSwing;

function getUpgradeStages(fromId: string, toId: string): TBuildStage[] {
  return (getUpgradePath(fromId, toId) ?? []).map((tierId) => ({
    fromId: buildings[tierId].upgradeFrom ?? fromId,
    type: "upgrade",
  }));
}

// The game shows the site of a building that Robin builds from the ground,
// and the export gives a site only to those buildings (SV ›
// Building.drawInConstruction). The other buildings are there at once.
export function getNewBuildingBuild(
  plannedBuilding: IPlannedBuilding,
): IBuild | undefined {
  const { buildingId, datePlaced } = plannedBuilding;

  if (buildings[buildingId].site === undefined) {
    return undefined;
  }

  return {
    stages: [
      { buildingId, isLastDay: false, type: "site" },
      { buildingId, isLastDay: true, type: "site" },
      ...getUpgradeStages(
        buildingId,
        getTierOn(plannedBuilding, datePlaced).buildingId,
      ),
    ],
    target: { plannedBuilding, type: "building" },
  };
}

export function getUpgradeBuild(
  before: IPlannedBuilding,
  after: IPlannedBuilding,
  date: number,
): IBuild | undefined {
  const stages = getUpgradeStages(
    getTierOn(before, date).buildingId,
    getTierOn(after, date).buildingId,
  );

  return stages.length === 0
    ? undefined
    : { stages, target: { plannedBuilding: after, type: "building" } };
}

export function getHouseBuild(
  before: readonly IPlannedHouseUpgrade[],
  after: readonly IPlannedHouseUpgrade[],
  date: number,
): IBuild | undefined {
  const fromLevel = getHouseLevelOn(before, date);
  const toLevel = getHouseLevelOn(after, date);

  return toLevel <= fromLevel
    ? undefined
    : {
        stages: Array.from({ length: toLevel - fromLevel }, (_, index) => ({
          level: fromLevel + index,
          type: "house",
        })),
        target: { houseUpgrades: after, type: "house" },
      };
}

// A time before the start shows the first frame, because the click starts
// the animation between 2 ticks of the clock.
function getProgress({ start }: IBuildAnimation, time: number) {
  return Math.max(time - start, 0);
}

export function getBuildLength({ stages }: IBuild) {
  return stages.length * swing.length;
}

// Undefined: the animation is over, and the building shows as it is.
export function getBuildMoment(
  animation: IBuildAnimation,
  time: number,
): IBuildMoment | undefined {
  const progress = getProgress(animation, time);
  const stage = animation.stages.at(Math.floor(progress / swing.length));

  if (stage === undefined) {
    return undefined;
  }

  // Robin works inside during a building upgrade (SV ›
  // NPC.updateConstructionAnimation).
  return stage.type === "upgrade"
    ? { stage }
    : { robinFrame: getSwingFrame(swing, progress % swing.length), stage };
}

// An upgrade stage has no Robin, so it changes only at its end.
export function getBuildNextChange(animation: IBuildAnimation): TNextChange {
  return (time) => {
    const progress = getProgress(animation, time);
    const index = Math.floor(progress / swing.length);
    const stage = animation.stages.at(index);

    if (stage === undefined) {
      return Infinity;
    }

    const stageStart = index * swing.length;

    return (
      animation.start +
      stageStart +
      (stage.type === "upgrade"
        ? swing.length
        : getSwingNextChange(swing, progress - stageStart))
    );
  };
}

export function getBuildsNextChange(
  animations: readonly IBuildAnimation[],
): TNextChange {
  return animations.length === 0
    ? noChange
    : earliestChange(animations.map(getBuildNextChange));
}

export function isBuildOn({ date, target }: IBuildAnimation, plan: IBuildPlan) {
  if (date !== plan.date) {
    return false;
  }

  return target.type === "house"
    ? target.houseUpgrades === plan.houseUpgrades
    : plan.buildings.includes(target.plannedBuilding);
}

export function isBuildOver(animation: IBuildAnimation, time: number) {
  return getProgress(animation, time) >= getBuildLength(animation);
}
