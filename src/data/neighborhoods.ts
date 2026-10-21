import type { Neighborhood } from "../types";

export const NEIGHBORHOODS: Neighborhood[] = [
  {
    id: "downtown",
    name: "Downtown",
    area: "Miami core",
    lat: 25.7743,
    lon: -80.1937,
    coast: "bay",
    flood: "high",
    tags: ["metro", "commute", "bayfront"]
  },
  {
    id: "brickell",
    name: "Brickell",
    area: "Miami core",
    lat: 25.7663,
    lon: -80.1917,
    coast: "bay",
    flood: "high",
    tags: ["metro", "commute", "bayfront"]
  },
  {
    id: "south-beach",
    name: "South Beach",
    area: "Miami Beach",
    lat: 25.7826,
    lon: -80.1341,
    coast: "atlantic",
    flood: "high",
    tags: ["beach", "tourist", "coastal"]
  },
  {
    id: "mid-beach",
    name: "Mid-Beach",
    area: "Miami Beach",
    lat: 25.815,
    lon: -80.122,
    coast: "atlantic",
    flood: "high",
    tags: ["beach", "coastal"]
  },
  {
    id: "key-biscayne",
    name: "Key Biscayne",
    area: "Barrier island",
    lat: 25.6937,
    lon: -80.1628,
    coast: "atlantic",
    flood: "high",
    tags: ["beach", "island", "coastal"]
  },
  {
    id: "coconut-grove",
    name: "Coconut Grove",
    area: "Bayshore",
    lat: 25.727,
    lon: -80.244,
    coast: "bay",
    flood: "high",
    tags: ["bayfront", "parks"]
  },
  {
    id: "coral-gables",
    name: "Coral Gables",
    area: "Inner suburbs",
    lat: 25.721,
    lon: -80.268,
    coast: "inland",
    flood: "moderate",
    tags: ["metro", "canals"]
  },
  {
    id: "wynwood",
    name: "Wynwood",
    area: "Miami core",
    lat: 25.801,
    lon: -80.199,
    coast: "inland",
    flood: "moderate",
    tags: ["metro", "nightlife"]
  },
  {
    id: "little-havana",
    name: "Little Havana",
    area: "Miami core",
    lat: 25.765,
    lon: -80.22,
    coast: "inland",
    flood: "moderate",
    tags: ["metro"]
  },
  {
    id: "doral",
    name: "Doral",
    area: "West metro",
    lat: 25.8195,
    lon: -80.3553,
    coast: "inland",
    flood: "low",
    tags: ["commute", "inland"]
  },
  {
    id: "kendall",
    name: "Kendall",
    area: "Southwest",
    lat: 25.679,
    lon: -80.317,
    coast: "inland",
    flood: "moderate",
    tags: ["suburbs", "inland"]
  },
  {
    id: "homestead",
    name: "Homestead",
    area: "Far south",
    lat: 25.4687,
    lon: -80.4776,
    coast: "inland",
    flood: "moderate",
    tags: ["far-south", "agriculture"]
  },
  {
    id: "hialeah",
    name: "Hialeah",
    area: "Northwest metro",
    lat: 25.8576,
    lon: -80.2781,
    coast: "inland",
    flood: "moderate",
    tags: ["metro"]
  },
  {
    id: "miami-gardens",
    name: "Miami Gardens",
    area: "North county",
    lat: 25.942,
    lon: -80.2456,
    coast: "inland",
    flood: "moderate",
    tags: ["north"]
  },
  {
    id: "aventura",
    name: "Aventura",
    area: "North county",
    lat: 25.9565,
    lon: -80.139,
    coast: "atlantic",
    flood: "high",
    tags: ["north", "coastal"]
  },
  {
    id: "hollywood",
    name: "Hollywood",
    area: "Broward",
    lat: 26.0112,
    lon: -80.1495,
    coast: "atlantic",
    flood: "high",
    tags: ["beach", "broward"]
  },
  {
    id: "fort-lauderdale",
    name: "Fort Lauderdale",
    area: "Broward",
    lat: 26.1224,
    lon: -80.1373,
    coast: "atlantic",
    flood: "high",
    tags: ["beach", "broward", "commute"]
  }
];

export const DEFAULT_PLACE_ID = "south-beach";

export function findNeighborhood(id: string): Neighborhood {
  return NEIGHBORHOODS.find((n) => n.id === id) ?? NEIGHBORHOODS[2]!;
}

export function searchNeighborhoods(query: string): Neighborhood[] {
  const q = query.trim().toLowerCase();
  if (!q) return NEIGHBORHOODS;
  return NEIGHBORHOODS.filter((n) => {
    const hay = `${n.name} ${n.area} ${n.tags.join(" ")} ${n.coast}`.toLowerCase();
    return hay.includes(q);
  });
}
