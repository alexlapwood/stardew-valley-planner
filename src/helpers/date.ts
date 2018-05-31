export function getDay(day: number) {
  return day % 28;
}

export function getSeason(day: number) {
  return Math.floor(day / 28) % 4;
}

export function getYear(day: number) {
  return Math.floor(day / (28 * 4));
}
