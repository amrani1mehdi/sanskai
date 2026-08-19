import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";

/**
 * Proxies CoinGecko's coin profile, trimmed to the description shown in the
 * detail modal. Cached for an hour — this copy changes very rarely.
 */

const REVALIDATE_SECONDS = 3600;

export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const upstream = new URL(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`,
  );
  upstream.searchParams.set("localization", "false");
  upstream.searchParams.set("tickers", "false");
  upstream.searchParams.set("market_data", "false");
  upstream.searchParams.set("community_data", "false");
  upstream.searchParams.set("developer_data", "false");

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

    // The live site shows the first three sentences only, with the same
    // allowlist it sanitises against — done here so the client only ever
    // receives markup that is already safe to inject.
    const full: string = data?.description?.en ?? "";
    const description = sanitizeHtml(full.split(". ").slice(0, 3).join(". "), {
      allowedTags: ["a", "b", "i", "em", "strong", "p", "br"],
      allowedAttributes: { a: ["href", "target", "rel"] },
      transformTags: {
        a: sanitizeHtml.simpleTransform("a", {
          target: "_blank",
          rel: "noopener noreferrer",
        }),
      },
    });

    return NextResponse.json(
      { description },
      {
        headers: {
          "cache-control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
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
