import type { Listing, Origin } from "../data/listings";

export type CostBreakdown = {
  purchase: number;
  transport: number;
  isvEstimate: number;
  registration: number;
  inspection: number;
  otherFees: number;
  totalLanded: number;
  notes: string[];
};

const TRANSPORT_BY_ORIGIN: Record<Origin, number> = {
  DE: 950,
  NL: 850,
  BE: 800,
  FR: 700,
  ES: 350,
  IT: 1100,
};

/**
 * Estimativa simplificada de ISV para ligeiros de passageiros híbridos.
 * Usa faixas aproximadas de CO₂ + cilindrada. Não substitui cálculo oficial AT/IMT.
 */
export function estimateIsv(co2Gkm: number, engineCc: number, year: number): number {
  let co2Component = 0;
  if (co2Gkm <= 99) co2Component = 980;
  else if (co2Gkm <= 109) co2Component = 1450;
  else if (co2Gkm <= 119) co2Component = 2100;
  else if (co2Gkm <= 129) co2Component = 2900;
  else co2Component = 3800;

  let ccComponent = 0;
  if (engineCc <= 1250) ccComponent = 200;
  else if (engineCc <= 1750) ccComponent = 450;
  else if (engineCc <= 2500) ccComponent = 780;
  else ccComponent = 1200;

  const age = Math.max(0, new Date().getFullYear() - year);
  const ageFactor = age >= 10 ? 0.55 : age >= 5 ? 0.72 : age >= 2 ? 0.88 : 1;

  return Math.round((co2Component + ccComponent) * ageFactor);
}

export function estimateImportCost(listing: Listing): CostBreakdown {
  const transport = TRANSPORT_BY_ORIGIN[listing.origin];
  const isvEstimate = estimateIsv(listing.co2Gkm, listing.engineCc, listing.year);
  const registration = 185; // matrícula + atos IMT aproximados
  const inspection = 95; // inspeção de admissão aproximada
  const otherFees = 220; // despachante / docs / seguro temporário

  const notes = [
    "Estimativa orientativa — confirma ISV e IVA com um despachante ou a AT.",
    listing.seller === "particular"
      ? "Compra a particular na UE: tipicamente sem IVA português sobre o preço."
      : "Stand na UE: verifica se o preço inclui IVA local e se há margem de IVA.",
    "Híbridos costumam beneficiar de ISV mais baixo face a gasolina pura.",
  ];

  const totalLanded =
    listing.priceEur + transport + isvEstimate + registration + inspection + otherFees;

  return {
    purchase: listing.priceEur,
    transport,
    isvEstimate,
    registration,
    inspection,
    otherFees,
    totalLanded,
    notes,
  };
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatKm(value: number): string {
  return `${new Intl.NumberFormat("pt-PT").format(value)} km`;
}
