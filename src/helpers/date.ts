const seasons = ["spring", "summer", "fall", "winter"];

export function getCropsLastDay(crop: ICrop, dayPlanted: number) {
  const seasonPlanted = getSeason(dayPlanted);

  for (let i = 0; i < 4; i += 1) {
    if (
      !crop.seasons.find(season => seasons[seasonPlanted + i + 1] === season)
    ) {
      const lastDay = Math.ceil((dayPlanted + i * 28) / 28) * 28;
      if (crop.regrow) {
        return lastDay;
      }

      return Math.min(
        lastDay,
        dayPlanted +
          crop.stages.reduce((acc, val) => {
            return acc + val;
          })
      );
    }
  }

  return;
}

export function getDay(day: number) {
  return (day - 1) % 28 + 1;
}

export function getSeason(day: number) {
  return Math.floor((day - 1) / 28) % 4;
}

export function getYear(day: number) {
  return Math.floor((day - 1) / (28 * 4)) + 1;
}
