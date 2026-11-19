import type { Fuel, Listing, Origin } from "@/src/data/listings";

const AS24_ORIGIN = "https://www.autoscout24.com";

/** Hardcoded search paths only — never accept visitor-controlled URLs (SSRF). */
const SEARCH_PATHS = [
  "/lst/toyota/camry?atype=C&cy=D%2CA%2CB%2CE%2CF%2CI%2CL%2CNL&desc=0&sort=age&ustate=N%2CU&fregfrom=2015&page=1",
  "/lst/toyota/camry?atype=C&cy=D%2CA%2CB%2CE%2CF%2CI%2CL%2CNL&desc=0&sort=age&ustate=N%2CU&fregfrom=2015&page=2",
  "/lst/toyota/camry?atype=C&cy=D%2CA%2CB%2CE%2CF%2CI%2CL%2CNL&desc=0&sort=price&ustate=N%2CU&fregfrom=2015&page=1",
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
const CACHE_MS = 10 * 60 * 1000;

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
  AT: "DE", // treat AT transport like DE for estimate
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
  if (!raw) return 218;
  const hp = raw.match(/(\d+)\s*hp/i);
  if (hp) return Number(hp[1]);
  const kw = raw.match(/(\d+)\s*kW/i);
  if (kw) return Math.round(Number(kw[1]) * 1.36);
  return 218;
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

function estimateCo2(fuel: Fuel, year: number): number {
  if (fuel === "híbrido") return year >= 2021 ? 98 : year >= 2018 ? 105 : 115;
  if (fuel === "diesel") return 140;
  return 160;
}

function detail(listing: As24Listing, label: string): string | undefined {
  return listing.vehicleDetails?.find((d) => d.ariaLabel === label)?.data;
}

function upgradeImage(url?: string): string {
  if (!url) {
    return "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1400&q=80";
  }
  return url.replace(/\/\d+x\d+\.webp$/i, "/800x600.webp");
}

export function mapAs24Listing(raw: As24Listing): Listing | null {
  const priceEur = raw.price?.priceRaw;
  if (!priceEur || priceEur <= 0) return null;

  const year =
    parseYear(detail(raw, "First registration")) ??
    parseYear(detail(raw, "Erstzulassung")) ??
    2015;
  const mileageKm =
    parseNumber(detail(raw, "Mileage")) ??
    parseNumber(raw.vehicle?.mileageInKm) ??
    0;
  const powerHp = parsePowerHp(detail(raw, "Power"));
  const engineCc =
    parseNumber(raw.vehicle?.engineDisplacementInCCM) ??
    (mapFuel(raw.vehicle?.fuel) === "híbrido" ? 2487 : 2000);
  const fuel = mapFuel(raw.vehicle?.fuel);
  const transmissionRaw = (detail(raw, "Gear") || raw.vehicle?.transmission || "").toLowerCase();
  const transmission = transmissionRaw.includes("manual") ? "manual" : "automática";
  const origin = mapOrigin(raw.location?.countryCode);
  const city = raw.location?.city || ORIGIN_MAP[raw.location?.countryCode || ""] || "Europa";
  const sellerType = (raw.seller?.type || "").toLowerCase().includes("private")
    ? "particular"
    : "stand";
  const version = raw.vehicle?.modelVersionInput?.trim();
  const title = version
    ? `Camry ${version}`.replace(/^Camry Camry/i, "Camry")
    : raw.title || "Toyota Camry";
  const path = raw.url?.startsWith("http") ? raw.url : `${AS24_ORIGIN}${raw.url || ""}`;

  return {
    id: raw.id,
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
    city: city.charAt(0) + city.slice(1).toLowerCase(),
    seller: sellerType,
    image: upgradeImage(raw.images?.[0]),
    highlights: [
      "Anúncio real AutoScout24",
      raw.location?.countryCode ? `Origem ${raw.location.countryCode}` : "UE",
      fuel,
    ].filter(Boolean),
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
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`AutoScout24 ${res.status}`);
  const html = await res.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/,
  );
  if (!match?.[1]) return [];
  const data = JSON.parse(match[1]) as {
    props?: { pageProps?: { listings?: As24Listing[]; numberOfResults?: number } };
  };
  return data.props?.pageProps?.listings ?? [];
}

export async function fetchRealCamryListings(): Promise<{
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

  const pages = await Promise.all(SEARCH_PATHS.map((p) => fetchSearchPage(p)));
  const byId = new Map<string, Listing>();
  for (const page of pages) {
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
