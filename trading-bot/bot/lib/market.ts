/** Public quote helpers (Yahoo Finance chart API). No API key required. */

export type Quote = {
  symbol: string;
  price: number;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  changePercent: number | null;
  currency: string;
  asOf: string;
  source: "yahoo";
};

export function normalizeSymbol(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!s) throw new Error("symbol is required");
  // Accept AAPL.US from Stooq-style input
  return s.replace(/\.US$/i, "");
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketTime?: number;
        regularMarketChangePercent?: number;
      };
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
};

function lastFinite(values: Array<number | null> | undefined): number | null {
  if (!values?.length) return null;
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export async function fetchQuote(rawSymbol: string): Promise<Quote> {
  const symbol = normalizeSymbol(rawSymbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; trading-bot/0.1)",
      accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`quote fetch failed (${res.status}) for ${symbol}`);
  }
  const body = (await res.json()) as YahooChartResponse;
  if (body.chart?.error) {
    throw new Error(
      `quote error for ${symbol}: ${body.chart.error.description ?? body.chart.error.code}`,
    );
  }
  const result = body.chart?.result?.[0];
  const meta = result?.meta;
  const quoteBar = result?.indicators?.quote?.[0];
  const price = meta?.regularMarketPrice ?? lastFinite(quoteBar?.close);
  if (price == null || !Number.isFinite(price) || price <= 0) {
    throw new Error(`invalid or unknown symbol "${rawSymbol}"`);
  }
  const previousClose =
    meta?.chartPreviousClose ?? meta?.previousClose ?? null;
  const changePercent =
    typeof meta?.regularMarketChangePercent === "number"
      ? meta.regularMarketChangePercent
      : previousClose != null && previousClose > 0
        ? ((price - previousClose) / previousClose) * 100
        : null;
  const asOf = meta?.regularMarketTime
    ? new Date(meta.regularMarketTime * 1000).toISOString()
    : new Date().toISOString();

  return {
    symbol: meta?.symbol ?? symbol,
    price,
    open: lastFinite(quoteBar?.open),
    high: meta?.regularMarketDayHigh ?? lastFinite(quoteBar?.high),
    low: meta?.regularMarketDayLow ?? lastFinite(quoteBar?.low),
    previousClose,
    changePercent,
    currency: meta?.currency ?? "USD",
    asOf,
    source: "yahoo",
  };
}
