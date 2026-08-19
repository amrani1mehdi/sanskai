"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  TriangleAlert,
} from "lucide-react";
import {
  CURRENCIES,
  CURRENCY_SYMBOL,
  formatCompact,
  formatPercent,
  formatPrice,
  formatSupply,
  type Coin,
  type Currency,
} from "@/lib/crypto";
import { siteContent } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Sparkline } from "@/components/site/sparkline";
import { CoinDetail } from "@/components/site/coin-detail";

const { crypto } = siteContent;

const REFRESH_MS = 45_000;
const PER_PAGE = 25;
const TICKER_COUNT = 8;

const COLUMNS = [
  "#",
  "NAME",
  "PRICE",
  "24H",
  "7D",
  "MARKET CAP",
  "24H VOLUME",
  "CIRCULATING",
  "LAST 7 DAYS",
];

function Change({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-muted-foreground">—</span>;
  }
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        up ? "text-success" : "text-danger",
      )}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {formatPercent(value)}
    </span>
  );
}

export function CryptoMarket() {
  const [currency, setCurrency] = useState<Currency>("eur");
  const [coins, setCoins] = useState<Coin[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Coin | null>(null);

  const tickerRef = useRef<HTMLDivElement>(null);

  /**
   * Fetches on mount, on every currency change, and every 45s thereafter.
   *
   * All state writes happen in promise callbacks rather than on the effect's
   * synchronous path, so starting a request never cascades a second render.
   * The spinner is switched on by whatever *triggers* a refetch — mount starts
   * with `loading: true`, the currency buttons set it in their click handler,
   * and the interval sets it in its own callback.
   */
  useEffect(() => {
    let cancelled = false;

    const run = () => {
      fetch(`/api/crypto?vs=${currency}`)
        .then((response) => {
          if (!response.ok) throw new Error("request failed");
          return response.json() as Promise<{ coins: Coin[] }>;
        })
        .then((payload) => {
          if (cancelled) return;
          setCoins(payload.coins);
          // Count from when this client received data — the server payload
          // carries a cache timestamp that reads as stale between revalidations.
          setUpdatedAt(Date.now());
          setError(null);
        })
        .catch(() => {
          if (!cancelled) {
            setError("Market data is temporarily unavailable. Retrying shortly.");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    run();

    const id = setInterval(() => {
      setLoading(true);
      run();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [currency]);

  // A once-per-second clock; "Updated Ns ago" is derived from it below so the
  // label ticks without an effect writing state on every render pass.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsAgo =
    updatedAt && now ? Math.max(0, Math.round((now - updatedAt) / 1000)) : 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coins;
    return coins.filter(
      (coin) =>
        coin.name.toLowerCase().includes(q) ||
        coin.symbol.toLowerCase().includes(q),
    );
  }, [coins, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  const scrollTicker = (direction: -1 | 1) => {
    tickerRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  };

  return (
    <section id="crypto" className="bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-7xl">
          {/* Heading + currency switcher */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              className="text-left lg:max-w-2xl"
              eyebrow={crypto.eyebrow}
              titleLead={crypto.titleLead}
              titleAccent={crypto.titleAccent}
              subtitle={crypto.subtitle}
            />

            <Reveal className="flex items-center gap-4">
              <div
                className="inline-flex rounded-md bg-secondary p-1"
                role="group"
                aria-label="Display currency"
              >
                {CURRENCIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      if (code === currency) return;
                      setCurrency(code);
                      setLoading(true);
                      setPage(1);
                    }}
                    aria-pressed={currency === code}
                    className={cn(
                      "rounded-sm px-4 py-1.5 text-xs font-semibold uppercase transition-colors",
                      currency === code
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {code}
                  </button>
                ))}
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw
                  className={cn("size-3.5", loading && "animate-spin")}
                  aria-hidden
                />
                {updatedAt ? `Updated ${secondsAgo}s ago` : "Loading…"}
              </span>
            </Reveal>
          </div>

          {error ? (
            <p className="mt-8 inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <TriangleAlert className="size-4 text-accent" aria-hidden />
              {error}
            </p>
          ) : null}

          {/* Top-coin ticker rail */}
          <Reveal className="mt-10">
            <div className="relative">
              <div
                ref={tickerRef}
                className="scrollbar-brand flex gap-3 overflow-x-auto pb-3"
              >
                {(loading && coins.length === 0
                  ? Array.from({ length: TICKER_COUNT })
                  : coins.slice(0, TICKER_COUNT)
                ).map((entry, i) => {
                  const coin = entry as Coin | undefined;

                  if (!coin) {
                    return (
                      <div
                        key={i}
                        className="flex min-w-[186px] shrink-0 items-center gap-2.5 rounded-md border border-border bg-card px-4 py-3"
                      >
                        <span className="h-5 w-full animate-pulse rounded bg-secondary" />
                      </div>
                    );
                  }

                  return (
                    <button
                      key={coin.id}
                      type="button"
                      onClick={() => setSelected(coin)}
                      aria-label={`${coin.name} details`}
                      className="flex min-w-[186px] shrink-0 cursor-pointer items-center gap-2.5 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:border-accent/40"
                    >
                      <Image
                        src={coin.image}
                        alt=""
                        width={20}
                        height={20}
                        unoptimized
                        className="size-5 rounded-full"
                      />
                      <span className="text-xs font-bold uppercase text-foreground">
                        {coin.symbol}
                      </span>
                      <span className="text-xs tabular-nums text-foreground">
                        {formatPrice(coin.current_price, currency)}
                      </span>
                      <span className="ml-auto text-[11px]">
                        <Change
                          value={coin.price_change_percentage_24h_in_currency}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollTicker(-1)}
                aria-label="Scroll ticker left"
                className="absolute -left-3 top-1/2 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-[var(--shadow-soft)] transition-colors hover:text-accent md:inline-flex"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => scrollTicker(1)}
                aria-label="Scroll ticker right"
                className="absolute -right-3 top-1/2 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-[var(--shadow-soft)] transition-colors hover:text-accent md:inline-flex"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </Reveal>

          {/* Search */}
          <Reveal className="mt-6">
            <label className="relative block max-w-md">
              <span className="sr-only">{crypto.searchPlaceholder}</span>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={crypto.searchPlaceholder}
                className="w-full rounded-md border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </label>
          </Reveal>

          {/* Market table */}
          <Reveal className="mt-6">
            <div className="scrollbar-brand overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {COLUMNS.map((column, i) => (
                      <th
                        key={column}
                        scope="col"
                        className={cn(
                          "px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                          i <= 1 ? "text-left" : "text-right",
                          column === "LAST 7 DAYS" && "text-right",
                        )}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {loading && coins.length === 0
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/60">
                          <td colSpan={COLUMNS.length} className="px-4 py-4">
                            <span className="block h-5 w-full animate-pulse rounded bg-secondary" />
                          </td>
                        </tr>
                      ))
                    : visible.map((coin) => {
                        const trend =
                          coin.price_change_percentage_7d_in_currency ?? 0;
                        return (
                          <tr
                            key={coin.id}
                            onClick={() => setSelected(coin)}
                            className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/50"
                          >
                            <td className="px-4 py-4 text-left text-xs tabular-nums text-muted-foreground">
                              {coin.market_cap_rank}
                            </td>

                            <td className="px-4 py-4 text-left">
                              <span className="flex items-center gap-3">
                                <Image
                                  src={coin.image}
                                  alt=""
                                  width={24}
                                  height={24}
                                  unoptimized
                                  className="size-6 rounded-full"
                                />
                                <span className="leading-tight">
                                  <span className="block font-medium text-foreground">
                                    {coin.name}
                                  </span>
                                  <span className="block text-xs uppercase text-muted-foreground">
                                    {coin.symbol}
                                  </span>
                                </span>
                              </span>
                            </td>

                            <td className="px-4 py-4 text-right font-medium tabular-nums text-foreground">
                              {formatPrice(coin.current_price, currency)}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <Change
                                value={coin.price_change_percentage_24h_in_currency}
                              />
                            </td>

                            <td className="px-4 py-4 text-right">
                              <Change
                                value={coin.price_change_percentage_7d_in_currency}
                              />
                            </td>

                            <td className="px-4 py-4 text-right tabular-nums text-foreground">
                              {formatCompact(
                                coin.market_cap,
                                CURRENCY_SYMBOL[currency],
                              )}
                            </td>

                            <td className="px-4 py-4 text-right tabular-nums text-foreground">
                              {formatCompact(
                                coin.total_volume,
                                CURRENCY_SYMBOL[currency],
                              )}
                            </td>

                            <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">
                              {formatSupply(coin.circulating_supply, coin.symbol)}
                            </td>

                            <td className="px-4 py-4">
                              <span className="flex justify-end">
                                <Sparkline
                                  points={coin.sparkline_in_7d?.price ?? []}
                                  positive={trend >= 0}
                                />
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                  {!loading && visible.length === 0 ? (
                    <tr>
                      <td
                        colSpan={COLUMNS.length}
                        className="px-4 py-10 text-center text-sm text-muted-foreground"
                      >
                        No coin matches “{query}”.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Reveal>

          {/* Pagination + disclaimer */}
          <Reveal className="mt-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-accent disabled:opacity-40 disabled:hover:text-muted-foreground"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>

              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages} · {filtered.length} coins
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-accent disabled:opacity-40 disabled:hover:text-muted-foreground"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {crypto.disclaimer}
            </p>
          </Reveal>
        </div>
      </div>

      {selected ? (
        <CoinDetail
          coin={selected}
          currency={currency}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
