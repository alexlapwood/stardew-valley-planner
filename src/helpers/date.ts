export function getDay(day: number) {
  return (day - 1) % 28 + 1;
}

export function getSeason(day: number) {
  return Math.floor((day - 1) / 28) % 4;
}

export function getYear(day: number) {
  return Math.floor((day - 1) / (28 * 4)) + 1;
}
