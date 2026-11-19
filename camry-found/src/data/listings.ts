export type Fuel = "híbrido" | "gasolina" | "diesel";
export type Origin = "DE" | "NL" | "BE" | "FR" | "ES" | "IT";

export type Listing = {
  id: string;
  title: string;
  year: number;
  mileageKm: number;
  priceEur: number;
  fuel: Fuel;
  powerHp: number;
  engineCc: number;
  co2Gkm: number;
  transmission: "automática" | "manual";
  origin: Origin;
  city: string;
  seller: "particular" | "stand";
  image: string;
  highlights: string[];
  sourceUrl?: string;
  source?: string;
};

export const ORIGIN_LABELS: Record<Origin, string> = {
  DE: "Alemanha",
  NL: "Países Baixos",
  BE: "Bélgica",
  FR: "França",
  ES: "Espanha",
  IT: "Itália",
};
