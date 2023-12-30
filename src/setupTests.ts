import "@testing-library/jest-dom";

vi.mock("nanoid", async () => ({
  nanoid: () => "mocked-nanoid",
}));
