interface ICrop {
  buy: number;
  harvest:
    | {}
    | {
        extra_chance: number;
        level_increase: number;
        max: number;
        min: number;
      };
  id: string;
  index: number;
  isFlower?: boolean;
  name: string;
  regrow?: number;
  scythe?: boolean;
  seasons: string[];
  sell: number;
  stages: number[];
}