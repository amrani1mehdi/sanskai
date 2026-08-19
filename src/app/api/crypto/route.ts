import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/crypto";

/**
 * Proxies CoinGecko's public markets endpoint.
 *
 * Going through the server keeps the browser off a third-party origin (no CORS
 * surprises), lets several visitors share one upstream response, and leaves a
 * place to drop in a paid API key later without touching the client.
 */

/** Kept in sync with `export const revalidate` below, which must be a literal. */
const REVALIDATE_SECONDS = 45;

export const revalidate = 45;

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("vs")?.toLowerCase() ?? "eur";
  const vs = isCurrency(requested) ? requested : "eur";

  const upstream = new URL("https://api.coingecko.com/api/v3/coins/markets");
  upstream.searchParams.set("vs_currency", vs);
  upstream.searchParams.set("order", "market_cap_desc");
  upstream.searchParams.set("per_page", "250");
  upstream.searchParams.set("page", "1");
  upstream.searchParams.set("sparkline", "true");
  upstream.searchParams.set("price_change_percentage", "24h,7d");

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
      { currency: vs, updatedAt: Date.now(), coins: data },
      {
        headers: {
          "cache-control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=120`,
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
