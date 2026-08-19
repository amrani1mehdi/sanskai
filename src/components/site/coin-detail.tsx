"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CURRENCY_SYMBOL,
  formatCompact,
  formatPrice,
  formatSupply,
  type Coin,
  type Currency,
} from "@/lib/crypto";
import { siteContent } from "@/lib/content";

const { crypto } = siteContent;

/** Ranges offered by the timeframe switcher; 7D is the default. */
const TIMEFRAMES = [
  { key: "1H", days: 1 / 24 },
  { key: "24H", days: 1 },
  { key: "7D", days: 7 },
  { key: "1M", days: 30 },
  { key: "1Y", days: 365 },
  { key: "All", days: "max" },
] as const;

type Timeframe = (typeof TIMEFRAMES)[number];
type Point = { time: number; price: number };

export function CoinDetail({
  coin,
  currency,
  onClose,
}: {
  coin: Coin;
  currency: Currency;
  onClose: () => void;
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>(TIMEFRAMES[2]);
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartFailed, setChartFailed] = useState(false);
  const [description, setDescription] = useState("");

  /**
   * Price series for the selected range.
   *
   * Same discipline as the market table: nothing is written to state on the
   * effect's synchronous path. The spinner starts on because of the initial
   * state, and the timeframe buttons switch it back on when they trigger a
   * refetch.
   *
   * CoinGecko's free tier only serves 365 days of history, so the "All" range
   * comes back empty unless the project is on a paid plan.
   */
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/crypto/${coin.id}/chart?vs=${currency}&days=${timeframe.days}`)
      .then((response) => response.json())
      .then((data: { prices?: [number, number][] }) => {
        if (cancelled) return;
        const next = (data.prices ?? []).map(([time, price]) => ({
          time,
          price,
        }));
        setPoints(next);
        setChartFailed(next.length === 0);
      })
      .catch(() => {
        if (!cancelled) setChartFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coin.id, currency, timeframe]);

  // Profile blurb — already trimmed and sanitised by the proxy.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/crypto/${coin.id}`)
      .then((response) => response.json())
      .then((data: { description?: string }) => {
        if (!cancelled) setDescription(data.description ?? "");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [coin.id]);

  // Escape closes, and the page behind stays put while the modal is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const change = coin.price_change_percentage_24h_in_currency ?? 0;
  const up = change >= 0;
  const intraday = timeframe.days === 1 || timeframe.days === 1 / 24;

  const stats = [
    {
      label: crypto.detail.marketCap,
      value: formatCompact(coin.market_cap, CURRENCY_SYMBOL[currency]),
    },
    {
      label: crypto.detail.volume24h,
      value: formatCompact(coin.total_volume, CURRENCY_SYMBOL[currency]),
    },
    {
      label: crypto.detail.supply,
      value: formatSupply(coin.circulating_supply, coin.symbol),
    },
    { label: crypto.detail.rank, value: `#${coin.market_cap_rank}` },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={coin.name}
    >
      <div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            {/* Remote CoinGecko host, and the modal is client-only. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coin.image}
              alt={coin.name}
              className="w-10 h-10 rounded-full"
            />
            <div className="min-w-0">
              <h3 className="font-display text-xl font-bold text-card-foreground truncate">
                {coin.name}
              </h3>
              <p className="text-xs text-muted-foreground uppercase">
                {coin.symbol} · #{coin.market_cap_rank}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-baseline gap-3 mb-4 flex-wrap">
            <span className="font-display text-3xl font-bold text-card-foreground">
              {formatPrice(coin.current_price, currency)}
            </span>
            <span
              className={`text-sm font-semibold px-2 py-1 rounded-md ${
                up ? "text-accent bg-accent/10" : "text-red-500 bg-red-500/10"
              }`}
            >
              {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            </span>
          </div>

          <div className="flex gap-1 mb-4 flex-wrap">
            {TIMEFRAMES.map((option) => (
              <button
                key={option.key}
                onClick={() => {
                  if (option.key === timeframe.key) return;
                  setLoading(true);
                  setChartFailed(false);
                  setTimeframe(option);
                }}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  timeframe.key === option.key
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.key}
              </button>
            ))}
          </div>

          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full w-full bg-muted/30 animate-pulse rounded-lg" />
            ) : chartFailed ? (
              <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted/30 px-4 text-center text-sm text-muted-foreground">
                {crypto.detail.chartUnavailable}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--accent))"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--accent))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.4}
                  />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(value: number) =>
                      new Date(value).toLocaleDateString("en-GB", {
                        month: "short",
                        day: "numeric",
                        ...(intraday
                          ? { hour: "2-digit", minute: "2-digit" }
                          : {}),
                      })
                    }
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    minTickGap={40}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value: number) =>
                      formatCompact(value, CURRENCY_SYMBOL[currency])
                    }
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(label) =>
                      new Date(Number(label)).toLocaleString("en-GB")
                    }
                    formatter={(value) => [
                      formatPrice(Number(value), currency),
                      coin.name,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    fill="url(#grad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="font-semibold text-sm text-card-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {description ? (
            <div className="mt-6">
              <h4 className="font-semibold text-sm text-card-foreground mb-2">
                {crypto.detail.about} {coin.name}
              </h4>
              <p
                className="text-sm text-muted-foreground leading-relaxed [&_a]:text-accent"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
