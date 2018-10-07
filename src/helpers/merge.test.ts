import { mergeDeep } from "immutable";

describe("Merging", () => {
  it("merges objects", () => {
    const obj1 = { key1: "value1" };
    const obj2 = { key2: "value2" };

    const result = mergeDeep(obj1, obj2);

    expect(result).toMatchObject({ key1: "value1", key2: "value2" });
  });

  it("merges objects deeply", () => {
    const obj1 = { key1: { key1: "value1" } };
    const obj2 = { key1: { key2: "value2" }, key2: { key3: "value3" } };

    const result = mergeDeep(obj1, obj2);

    expect(result).toMatchObject({
      key1: { key1: "value1", key2: "value2" },
      key2: { key3: "value3" }
    });
  });

  it("merges arrays", () => {
    const arr1 = ["value1"];
    const arr2 = ["value2"];

    const result = mergeDeep(arr1, arr2);

    expect(result).toMatchObject(["value1", "value2"]);
  });

  it("merges arrays in objects", () => {
    const arr1 = { key1: ["value1"] };
    const arr2 = { key1: ["value2"] };

    const result = mergeDeep(arr1, arr2);

    expect(result).toMatchObject({ key1: ["value1", "value2"] });
  });

  describe("Immutability", () => {
    it("doesn't mutate objects", () => {
      const obj1 = { key1: { key1: "value1", key2: "value2" } };
      const obj2 = { key1: { key2: "value2" }, key2: { key3: "value3" } };

      mergeDeep(obj1, obj2);

      expect(obj1).toMatchObject({ key1: { key1: "value1" } });
      expect(obj2).toMatchObject({
        key1: { key2: "value2" },
        key2: { key3: "value3" }
      });
    });

    it("doesn't mutate arrays", () => {
      const arr1 = { key1: ["value1"] };
      const arr2 = { key1: ["value2"] };

      mergeDeep(arr1, arr2);

      expect(arr1).toMatchObject({ key1: ["value1"] });
      expect(arr2).toMatchObject({ key1: ["value2"] });
    });
  });
});
