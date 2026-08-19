export const CURRENCIES = ["eur", "usd", "gbp"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  eur: "€",
  usd: "$",
  gbp: "£",
};

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

export type Coin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  circulating_supply: number;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
  sparkline_in_7d: { price: number[] } | null;
};

/** €1.12tn / €200.32bn / €417.33m / €374.79k — the compact style used on the site. */
export function formatCompact(value: number, symbol = ""): string {
  if (!Number.isFinite(value)) return "—";

  const units: [number, string][] = [
    [1e12, "tn"],
    [1e9, "bn"],
    [1e6, "m"],
    [1e3, "k"],
  ];

  for (const [threshold, suffix] of units) {
    if (Math.abs(value) >= threshold) {
      return `${symbol}${(value / threshold).toFixed(2)}${suffix}`;
    }
  }

  return `${symbol}${value.toFixed(2)}`;
}

/** Prices ≥ 1 get 2 decimals with separators; sub-unit prices get 6. */
export function formatPrice(value: number, currency: Currency): string {
  if (!Number.isFinite(value)) return "—";
  const symbol = CURRENCY_SYMBOL[currency];

  if (Math.abs(value) >= 1) {
    return `${symbol}${value.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `${symbol}${value.toFixed(6)}`;
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${Math.abs(value).toFixed(2)}%`;
}

export function formatSupply(value: number, symbol: string): string {
  if (!Number.isFinite(value)) return "—";
  return `${formatCompact(value)} ${symbol.toUpperCase()}`;
}
