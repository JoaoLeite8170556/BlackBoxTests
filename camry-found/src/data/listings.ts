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
};

export const ORIGIN_LABELS: Record<Origin, string> = {
  DE: "Alemanha",
  NL: "Países Baixos",
  BE: "Bélgica",
  FR: "França",
  ES: "Espanha",
  IT: "Itália",
};

/** Dados de amostra — anúncios tipicos de mercados europeus para Camry. */
export const LISTINGS: Listing[] = [
  {
    id: "de-hybrid-21-a",
    title: "Camry 2.5 Hybrid Executive",
    year: 2021,
    mileageKm: 68500,
    priceEur: 24900,
    fuel: "híbrido",
    powerHp: 218,
    engineCc: 2487,
    co2Gkm: 101,
    transmission: "automática",
    origin: "DE",
    city: "Düsseldorf",
    seller: "stand",
    image:
      "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1400&q=80",
    highlights: ["Pack Executive", "Bancos em pele", "Câmara 360°"],
  },
  {
    id: "nl-hybrid-22-b",
    title: "Camry 2.5 Hybrid Luxury",
    year: 2022,
    mileageKm: 41200,
    priceEur: 27950,
    fuel: "híbrido",
    powerHp: 218,
    engineCc: 2487,
    co2Gkm: 98,
    transmission: "automática",
    origin: "NL",
    city: "Utrecht",
    seller: "stand",
    image:
      "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&w=1400&q=80",
    highlights: ["Teto panorâmico", "JBL Premium", "Head-up display"],
  },
  {
    id: "be-hybrid-20-c",
    title: "Camry 2.5 Hybrid Style",
    year: 2020,
    mileageKm: 89400,
    priceEur: 21490,
    fuel: "híbrido",
    powerHp: 218,
    engineCc: 2487,
    co2Gkm: 105,
    transmission: "automática",
    origin: "BE",
    city: "Antuérpia",
    seller: "particular",
    image:
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1400&q=80",
    highlights: ["Histórico completo", "1 dono", "Pneus novos"],
  },
  {
    id: "de-hybrid-23-d",
    title: "Camry 2.5 Hybrid Premiere",
    year: 2023,
    mileageKm: 18900,
    priceEur: 32900,
    fuel: "híbrido",
    powerHp: 218,
    engineCc: 2487,
    co2Gkm: 94,
    transmission: "automática",
    origin: "DE",
    city: "Munique",
    seller: "stand",
    image:
      "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&w=1400&q=80",
    highlights: ["Quase novo", "Garantia Toyota", "Cor Platinum White"],
  },
  {
    id: "fr-hybrid-19-e",
    title: "Camry 2.5 Hybrid Dynamic",
    year: 2019,
    mileageKm: 112000,
    priceEur: 17990,
    fuel: "híbrido",
    powerHp: 218,
    engineCc: 2487,
    co2Gkm: 110,
    transmission: "automática",
    origin: "FR",
    city: "Lyon",
    seller: "stand",
    image:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1400&q=80",
    highlights: ["Preço competitivo", "Revisão recente", "Sensores park"],
  },
  {
    id: "es-hybrid-21-f",
    title: "Camry 2.5 Hybrid Advance",
    year: 2021,
    mileageKm: 55600,
    priceEur: 23900,
    fuel: "híbrido",
    powerHp: 218,
    engineCc: 2487,
    co2Gkm: 102,
    transmission: "automática",
    origin: "ES",
    city: "Madrid",
    seller: "particular",
    image:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=80",
    highlights: ["Transporte curto", "IVA incluído no preço", "Documentação OK"],
  },
  {
    id: "de-hybrid-18-g",
    title: "Camry 2.5 Hybrid Business",
    year: 2018,
    mileageKm: 134500,
    priceEur: 15450,
    fuel: "híbrido",
    powerHp: 218,
    engineCc: 2487,
    co2Gkm: 118,
    transmission: "automática",
    origin: "DE",
    city: "Hamburgo",
    seller: "stand",
    image:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1400&q=80",
    highlights: ["Bom custo/km", "Bateria híbrida testada", "Navi Toyota"],
  },
  {
    id: "it-hybrid-22-h",
    title: "Camry 2.5 Hybrid Lounge",
    year: 2022,
    mileageKm: 27800,
    priceEur: 29800,
    fuel: "híbrido",
    powerHp: 218,
    engineCc: 2487,
    co2Gkm: 99,
    transmission: "automática",
    origin: "IT",
    city: "Milão",
    seller: "stand",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
    highlights: ["Acabamento Lounge", "LED matrix", "Assistentes Toyota Safety"],
  },
];
