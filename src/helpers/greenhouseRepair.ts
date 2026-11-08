export type TRepairOrder =
  | { refusal: "repaired"; repair?: undefined }
  | { refusal?: undefined; repair: IPlannedRepair };

// The game opens the greenhouse on the morning after the Pantry bundle or the
// Joja payment, but the plan shows it repaired from the date, as it does a
// building (SV › CommunityCenter.doAreaCompleteReward, JojaCDMenu).
export function isGreenhouseRepairedOn(
  repair: IPlannedRepair | undefined,
  date: number,
) {
  return repair !== undefined && date >= repair.datePlaced;
}

// A repair on an earlier day takes the place of the planned one.
export function orderRepair(
  repair: IPlannedRepair | undefined,
  date: number,
): TRepairOrder {
  return repair !== undefined && repair.datePlaced <= date
    ? { refusal: "repaired" }
    : { repair: { datePlaced: date } };
}

// The game cannot break the greenhouse again, so an erase from the repair day
// takes the repair out of the plan.
export function eraseRepairOn(
  repair: IPlannedRepair | undefined,
  date: number,
) {
  return repair !== undefined && date >= repair.datePlaced ? undefined : repair;
}
