const testRow = Array.from(Array(80))
  .map(() => " ")
  .join("");
const testMap = Array.from(Array(65)).map(() => testRow);

const testFarm: {
  map: string[];
  name: "Standard" | "Riverland" | "Forest" | "Hill-top" | "Wilderness";
} = { map: testMap, name: "Standard" };

export default testFarm;
