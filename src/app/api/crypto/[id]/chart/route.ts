import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/crypto";

/**
 * Proxies CoinGecko's market_chart endpoint for one coin.
 *
 * Same reasoning as the markets proxy: keeps the API key server-side and lets
 * several visitors share a cached upstream response.
 */

const REVALIDATE_SECONDS = 60;

export const revalidate = 60;

/** Mirrors the ranges offered by the detail modal's timeframe switcher. */
const ALLOWED_DAYS = new Set([
  "0.041666666666666664",
  "1",
  "7",
  "30",
  "365",
  "max",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const search = new URL(request.url).searchParams;

  const requested = search.get("vs")?.toLowerCase() ?? "eur";
  const vs = isCurrency(requested) ? requested : "eur";

  const requestedDays = search.get("days") ?? "7";
  const days = ALLOWED_DAYS.has(requestedDays) ? requestedDays : "7";

  const upstream = new URL(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart`,
  );
  upstream.searchParams.set("vs_currency", vs);
  upstream.searchParams.set("days", days);

  const apiKey = process.env.COINGECKO_API_KEY;

  try {
    const response = await fetch(upstream, {
      headers: {
        accept: "application/json",
        ...(apiKey ? { "x-cg-demo-api-key": apiKey } : {}),
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `CoinGecko responded with ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();

    return NextResponse.json(
      { prices: data.prices ?? [] },
      {
        headers: {
          "cache-control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=180`,
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the market data provider." },
      { status: 502 },
    );
  }
}
