import type { Fuel, Listing, Make, Origin } from "@/src/data/listings";
import { BUDGET_MAX_EUR, BUDGET_MAX_KM } from "@/src/data/listings";

const AS24_ORIGIN = "https://www.autoscout24.com";

const EU =
  "cy=D%2CA%2CB%2CE%2CF%2CI%2CL%2CNL&atype=C&desc=0&ustate=N%2CU&priceto=25000&kmto=100000&fregfrom=2016";

/**
 * Hardcoded AutoScout24 search paths only — never accept visitor-controlled URLs (SSRF).
 * Mercedes, Audi, BMW, Volvo · ≤ €25 000 · ≤ 100 000 km
 */
const SEARCH_PATHS = [
  `/lst/mercedes-benz?${EU}&sort=age&page=1`,
  `/lst/audi?${EU}&sort=age&page=1`,
  `/lst/bmw?${EU}&sort=age&page=1`,
  `/lst/volvo?${EU}&sort=age&page=1`,
  `/lst/mercedes-benz?${EU}&sort=price&page=1`,
  `/lst/audi?${EU}&sort=price&page=1`,
  `/lst/bmw?${EU}&sort=price&page=1`,
  `/lst/volvo?${EU}&sort=price&page=1`,
] as const;

type As24Listing = {
  id: string;
  title?: string;
  url?: string;
  images?: string[];
  price?: { priceRaw?: number; priceFormatted?: string };
  vehicle?: {
    make?: string;
    model?: string;
    modelVersionInput?: string;
    transmission?: string;
    fuel?: string;
    mileageInKm?: string;
    engineDisplacementInCCM?: string;
  };
  vehicleDetails?: Array<{ data?: string; ariaLabel?: string }>;
  location?: { countryCode?: string; city?: string };
  seller?: { type?: string; companyName?: string };
};

type CacheEntry = { at: number; listings: Listing[]; sourceTotal: number };
let cache: CacheEntry | null = null;
const CACHE_MS = 15 * 60 * 1000;

/** Simple process-wide gate so cold-cache storms don't hammer AutoScout24. */
let lastFreshFetchAt = 0;
const MIN_FRESH_GAP_MS = 20_000;

const ORIGIN_MAP: Record<string, Origin> = {
  DE: "DE",
  D: "DE",
  NL: "NL",
  BE: "BE",
  B: "BE",
  FR: "FR",
  F: "FR",
  ES: "ES",
  E: "ES",
  IT: "IT",
  I: "IT",
  AT: "DE",
  A: "DE",
  LU: "BE",
  L: "BE",
};

function parseNumber(raw?: string): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number(digits);
}

function parseYear(raw?: string): number | null {
  if (!raw) return null;
  const m = raw.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

function parsePowerHp(raw?: string): number {
  if (!raw) return 150;
  const hp = raw.match(/(\d+)\s*hp/i);
  if (hp) return Number(hp[1]);
  const kw = raw.match(/(\d+)\s*kW/i);
  if (kw) return Math.round(Number(kw[1]) * 1.36);
  return 150;
}

function mapFuel(raw?: string): Fuel {
  const f = (raw || "").toLowerCase();
  if (f.includes("diesel")) return "diesel";
  if (f.includes("electric") || f.includes("hybrid") || f.includes("híbrid")) return "híbrido";
  return "gasolina";
}

function mapOrigin(code?: string): Origin {
  if (!code) return "DE";
  return ORIGIN_MAP[code.toUpperCase()] ?? "DE";
}

function mapMake(raw?: string): Make | null {
  const m = (raw || "").toLowerCase();
  if (m.includes("mercedes")) return "Mercedes-Benz";
  if (m.includes("audi")) return "Audi";
  if (m.includes("bmw")) return "BMW";
  if (m.includes("volvo")) return "Volvo";
  return null;
}

function estimateCo2(fuel: Fuel, year: number): number {
  if (fuel === "híbrido") return year >= 2021 ? 98 : year >= 2018 ? 105 : 115;
  if (fuel === "diesel") return 130;
  return 155;
}

function detail(listing: As24Listing, label: string): string | undefined {
  return listing.vehicleDetails?.find((d) => d.ariaLabel === label)?.data;
}

function upgradeImage(url?: string): string {
  if (!url) {
    return "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1400&q=80";
  }
  return url.replace(/\/\d+x\d+\.webp$/i, "/800x600.webp");
}

function titleCaseCity(city: string): string {
  return city
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const JUNK_TITLE =
  /\b(noleggio|leasing|loa\b|huur|miete|aluguer|renting|abonnement|e-step|egret|quadricycle|bromfiets)\b/i;

export function mapAs24Listing(raw: As24Listing): Listing | null {
  const priceEur = raw.price?.priceRaw;
  // Skip lease/rent teaser prices and anything outside the buy budget.
  if (!priceEur || priceEur < 8_000 || priceEur > BUDGET_MAX_EUR) return null;

  const make = mapMake(raw.vehicle?.make) ?? mapMake(raw.title);
  if (!make) return null;

  const blob = `${raw.title || ""} ${raw.vehicle?.modelVersionInput || ""}`;
  if (JUNK_TITLE.test(blob)) return null;

  const year =
    parseYear(detail(raw, "First registration")) ??
    parseYear(detail(raw, "Erstzulassung")) ??
    2016;
  const mileageKm =
    parseNumber(detail(raw, "Mileage")) ??
    parseNumber(raw.vehicle?.mileageInKm) ??
    0;
  if (mileageKm <= 0 || mileageKm > BUDGET_MAX_KM) return null;
  if (!raw.vehicle?.model?.trim()) return null;

  const powerHp = parsePowerHp(detail(raw, "Power"));
  const engineCc =
    parseNumber(raw.vehicle?.engineDisplacementInCCM) ??
    (mapFuel(raw.vehicle?.fuel) === "híbrido" ? 2000 : 1800);
  const fuel = mapFuel(raw.vehicle?.fuel);
  const transmissionRaw = (detail(raw, "Gear") || raw.vehicle?.transmission || "").toLowerCase();
  const transmission = transmissionRaw.includes("manual") ? "manual" : "automática";
  const origin = mapOrigin(raw.location?.countryCode);
  const cityRaw = raw.location?.city || "Europa";
  const sellerType = (raw.seller?.type || "").toLowerCase().includes("private")
    ? "particular"
    : "stand";

  const model = raw.vehicle?.model?.trim();
  const version = raw.vehicle?.modelVersionInput?.trim();
  const title =
    [make, model, version].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() ||
    raw.title ||
    make;

  const path = raw.url?.startsWith("http") ? raw.url : `${AS24_ORIGIN}${raw.url || ""}`;

  return {
    id: raw.id,
    make,
    title,
    year,
    mileageKm,
    priceEur,
    fuel,
    powerHp,
    engineCc,
    co2Gkm: estimateCo2(fuel, year),
    transmission,
    origin,
    city: titleCaseCity(cityRaw),
    seller: sellerType,
    image: upgradeImage(raw.images?.[0]),
    highlights: [
      "Anúncio real AutoScout24",
      raw.location?.countryCode ? `Origem ${raw.location.countryCode}` : "UE",
      fuel,
    ],
    sourceUrl: path,
    source: "AutoScout24",
  };
}

async function fetchSearchPage(path: (typeof SEARCH_PATHS)[number]): Promise<As24Listing[]> {
  const res = await fetch(`${AS24_ORIGIN}${path}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-GB,en;q=0.9,pt;q=0.8",
    },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`AutoScout24 ${res.status}`);
  const html = await res.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/,
  );
  if (!match?.[1]) return [];
  const data = JSON.parse(match[1]) as {
    props?: { pageProps?: { listings?: As24Listing[] } };
  };
  return data.props?.pageProps?.listings ?? [];
}

export async function fetchBudgetPremiumListings(): Promise<{
  listings: Listing[];
  sourceTotal: number;
  fetchedAt: string;
  cached: boolean;
}> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return {
      listings: cache.listings,
      sourceTotal: cache.sourceTotal,
      fetchedAt: new Date(cache.at).toISOString(),
      cached: true,
    };
  }

  const now = Date.now();
  if (now - lastFreshFetchAt < MIN_FRESH_GAP_MS && cache) {
    return {
      listings: cache.listings,
      sourceTotal: cache.sourceTotal,
      fetchedAt: new Date(cache.at).toISOString(),
      cached: true,
    };
  }
  lastFreshFetchAt = now;

  // Sequential batches of 4 to reduce burst load on AutoScout24
  const batchA = SEARCH_PATHS.slice(0, 4);
  const batchB = SEARCH_PATHS.slice(4);
  const pagesA = await Promise.all(batchA.map((p) => fetchSearchPage(p)));
  const pagesB = await Promise.all(batchB.map((p) => fetchSearchPage(p)));

  const byId = new Map<string, Listing>();
  for (const page of [...pagesA, ...pagesB]) {
    for (const raw of page) {
      const mapped = mapAs24Listing(raw);
      if (mapped) byId.set(mapped.id, mapped);
    }
  }

  const listings = [...byId.values()].sort((a, b) => b.year - a.year || a.priceEur - b.priceEur);
  cache = { at: Date.now(), listings, sourceTotal: listings.length };

  return {
    listings,
    sourceTotal: listings.length,
    fetchedAt: new Date(cache.at).toISOString(),
    cached: false,
  };
}

/** @deprecated use fetchBudgetPremiumListings */
export const fetchRealCamryListings = fetchBudgetPremiumListings;
