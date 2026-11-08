export function getDay(date: number) {
  return date % 28;
}

export const seasonNames = ["spring", "summer", "fall", "winter"];

export function getSeason(date: number) {
  return Math.floor(date / 28) % 4;
}

export function getSeasonName(date: number) {
  return seasonNames[getSeason(date)];
}

export function getYear(date: number) {
  return Math.floor(date / (28 * 4));
}

const shortSeasonNames = ["Sp", "Su", "Fa", "Wi"];

// The year shows only when it is not the year of the date on view.
export function formatShortDate(date: number, viewDate = date) {
  const day = `${shortSeasonNames[getSeason(date)]} ${getDay(date) + 1}`;

  return getYear(date) === getYear(viewDate)
    ? day
    : `${day}, Y${getYear(date) + 1}`;
}
