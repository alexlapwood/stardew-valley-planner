import { getMaterialSprite } from "./materials";

describe("getMaterialSprite", () => {
  it("gives the game icon of an item from the materials atlas", () => {
    expect(getMaterialSprite("(O)388")).toEqual({
      height: 16,
      src: "images/game/materials.png",
      width: 16,
      x: 176,
      y: 0,
    });
    expect(getMaterialSprite("(O)Moss")).toMatchObject({ x: 432, y: 0 });
  });

  it("has no icon for an item that the export has no icon for", () => {
    expect(getMaterialSprite("(O)0")).toBeUndefined();
  });
});
