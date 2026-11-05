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
