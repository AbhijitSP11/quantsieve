export interface SectorThreshold {
  good_roe: number;
  good_roce: number | null;
  roa_threshold?: number;
  acceptable_de: number;
  pe_range: [number, number];
  min_horizon: string;
}

export const SECTOR_THRESHOLDS: Record<string, SectorThreshold> = {
  "Banking / NBFC": {
    good_roe: 14,
    good_roce: null,
    roa_threshold: 1.2,
    acceptable_de: 999,
    pe_range: [10, 25],
    min_horizon: "5+",
  },
  "IT / Technology": {
    good_roe: 20,
    good_roce: 25,
    acceptable_de: 0.5,
    pe_range: [20, 35],
    min_horizon: "3-5+",
  },
  "Pharma / Healthcare": {
    good_roe: 15,
    good_roce: 18,
    acceptable_de: 0.8,
    pe_range: [20, 35],
    min_horizon: "5+",
  },
  "FMCG / Consumer": {
    good_roe: 25,
    good_roce: 30,
    acceptable_de: 0.5,
    pe_range: [35, 60],
    min_horizon: "5-7+",
  },
  "Auto / Auto ancillary": {
    good_roe: 14,
    good_roce: 18,
    acceptable_de: 1.0,
    pe_range: [15, 30],
    min_horizon: "5+",
  },
  "Metal / Mining": {
    good_roe: 12,
    good_roce: 15,
    acceptable_de: 1.5,
    pe_range: [8, 15],
    min_horizon: "5-7",
  },
  "Real Estate": {
    good_roe: 10,
    good_roce: 12,
    acceptable_de: 1.5,
    pe_range: [15, 30],
    min_horizon: "5-7+",
  },
  "Infrastructure / Capital Goods": {
    good_roe: 12,
    good_roce: 15,
    acceptable_de: 1.5,
    pe_range: [20, 35],
    min_horizon: "5-7+",
  },
  "Power / Utilities": {
    good_roe: 10,
    good_roce: 12,
    acceptable_de: 2.0,
    pe_range: [10, 20],
    min_horizon: "5+",
  },
  Chemicals: {
    good_roe: 15,
    good_roce: 18,
    acceptable_de: 1.0,
    pe_range: [20, 35],
    min_horizon: "5+",
  },
  General: {
    good_roe: 15,
    good_roce: 18,
    acceptable_de: 1.0,
    pe_range: [15, 25],
    min_horizon: "5+",
  },
};
