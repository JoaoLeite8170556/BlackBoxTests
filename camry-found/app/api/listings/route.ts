import { fetchBudgetPremiumListings } from "@/src/lib/autoscout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchBudgetPremiumListings();
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=900",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao obter anúncios";
    return Response.json(
      { error: message, listings: [], sourceTotal: 0, fetchedAt: null, cached: false },
      { status: 502 },
    );
  }
}
