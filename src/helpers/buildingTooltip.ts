import { buildings } from "../data/game/buildings.json";
import { cabinLimit, getBuildLimit, type TBuildLimit } from "./buildingLimits";
import { farmhouseId, findHouseLevel } from "./houseUpgrades";
import { getMaterialSprite } from "./materials";
import type { ITooltipLine } from "./tooltip";

interface ICost {
  buildCost: number;
  buildMaterials: readonly IBuildingMaterial[];
}

const greenhouseId = "greenhouse";

// The Wizard's book opens only after the player picks up the Magic Ink in the
// Witch's Hut (SV › GameLocation.performAction "WizardBook").
const wizardUnlock: ITooltipLine = {
  icon: "✨",
  text: "Needs the Magic Ink (the Wizard's 'Goblin Problem' quest)",
};

// The build conditions of the cabin and the stable are count limits, which
// get a limit line, so they are not here.
const conditionLines: Partial<Record<string, ITooltipLine>> = {
  // SV › Locations.IslandSouth sends the mail on the first visit.
  "PLAYER_HAS_MAIL Any Visited_Island": {
    icon: "🏝️",
    text: "Needs a visit to Ginger Island",
  },
};

const limitLines: Record<TBuildLimit, ITooltipLine> = {
  cabins: { icon: "🔢", text: `max ${cabinLimit}` },
  perCabin: { icon: "🔢", text: "max cabins + 1" },
};

function formatLimit(buildingId: string) {
  const limit = getBuildLimit(buildingId);

  return limit === undefined ? [] : [limitLines[limit]];
}

const formatGold = (gold: number) => `${gold}g`;

const formatDays = (days: number) => `${days} ${days === 1 ? "day" : "days"}`;

const formatMaterial = ({
  count,
  itemId,
  name,
}: IBuildingMaterial): ITooltipLine => ({
  icon: "🧱",
  sprite: getMaterialSprite(itemId),
  text: `${name} ×${count}`,
});

function formatCost({ buildCost, buildMaterials }: ICost): ITooltipLine[] {
  return [
    { icon: "💰", text: formatGold(buildCost) },
    ...buildMaterials.map(formatMaterial),
  ];
}

// The plan puts each building down ready, so the build days are only the
// time that the game needs, and a building with no days gets no line.
function formatBuilder(builder: string, days: number): ITooltipLine[] {
  return days === 0
    ? []
    : [
        {
          icon: builder === "Wizard" ? "✨" : "🔨",
          text: `${builder} · ⏱️ ${formatDays(days)}`,
        },
      ];
}

const formatUpgradeFrom = (name: string): ITooltipLine => ({
  icon: "⬆️",
  text: `Upgrade from: ${name}`,
});

function formatCondition(condition: string | undefined) {
  const line = condition === undefined ? undefined : conditionLines[condition];

  return line === undefined ? [] : [line];
}

// The game uses the cost and days of the skin when it has them (SV ›
// Menus.CarpenterMenu.BlueprintEntry).
function getBuildingLines(
  buildingId: string,
  skin = buildingId,
): ITooltipLine[] {
  const building = buildings[buildingId];
  const skinData = building.skins?.[skin];

  return [
    ...formatCost({
      buildCost: skinData?.buildCost ?? building.buildCost,
      buildMaterials: skinData?.buildMaterials ?? building.buildMaterials,
    }),
    ...(building.builder === undefined
      ? []
      : formatBuilder(
          building.builder,
          skinData?.buildDays ?? building.buildDays,
        )),
    ...(building.upgradeFrom === undefined
      ? []
      : [formatUpgradeFrom(buildings[building.upgradeFrom].name)]),
    ...(building.builder === "Wizard" ? [wizardUnlock] : []),
    ...formatLimit(buildingId),
    ...formatCondition(building.buildCondition),
    ...formatCondition(skinData?.condition),
  ];
}

// Robin sells the house upgrades in her shop (SV ›
// GameLocation.houseUpgradeOffer).
function getHouseLevelLines(level: number): ITooltipLine[] {
  const houseLevel = findHouseLevel(level);

  if (houseLevel === undefined) {
    return [];
  }

  return [
    ...formatCost(houseLevel),
    ...formatBuilder("Robin", houseLevel.buildDays),
    formatUpgradeFrom(
      findHouseLevel(level - 1)?.name ?? buildings[farmhouseId].name,
    ),
  ];
}

function getRepairLines(): ITooltipLine[] {
  const { repair } = buildings[greenhouseId];

  if (repair === undefined) {
    return [];
  }

  return [
    {
      icon: "🏛️",
      text: `Community Center: ${repair.communityCenterArea} bundles`,
    },
    {
      icon: "🛒",
      text: `Or Joja: ${formatGold(repair.jojaCost)} (+${formatGold(repair.jojaMembershipCost)} membership)`,
    },
    { icon: "⏱️", text: formatDays(repair.days) },
  ];
}

const linesByType: Partial<
  Record<ISelectedItem["type"], (item: ISelectedItem) => ITooltipLine[]>
> = {
  building: ({ id, skin }) => getBuildingLines(id, skin),
  greenhouseRepair: getRepairLines,
  houseUpgrade: ({ id }) => getHouseLevelLines(Number(id)),
};

export const getBuildingTooltip = (item: ISelectedItem) =>
  linesByType[item.type]?.(item) ?? [];
