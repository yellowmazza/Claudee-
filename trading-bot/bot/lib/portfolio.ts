import type { HostKvApi, JsonValue } from "@grok/agent-sdk";

export const STARTING_CASH = 100_000;

export type Position = {
  qty: number;
  avgCost: number;
};

export type Trade = {
  id: string;
  side: "buy" | "sell";
  symbol: string;
  qty: number;
  price: number;
  notional: number;
  at: string;
};

export type Portfolio = {
  cash: number;
  currency: "USD";
  positions: Record<string, Position>;
  trades: Trade[];
  updatedAt: string;
};

function isPortfolio(value: JsonValue | undefined): value is Portfolio {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.cash === "number" && typeof v.positions === "object";
}

export function emptyPortfolio(): Portfolio {
  return {
    cash: STARTING_CASH,
    currency: "USD",
    positions: {},
    trades: [],
    updatedAt: new Date().toISOString(),
  };
}

export function portfolioKey(sessionId: string): string {
  return `portfolio:${sessionId}`;
}

export async function loadPortfolio(
  kv: HostKvApi,
  sessionId: string,
): Promise<Portfolio> {
  const raw = await kv.get(portfolioKey(sessionId));
  if (isPortfolio(raw)) return raw;
  return emptyPortfolio();
}

export async function savePortfolio(
  kv: HostKvApi,
  sessionId: string,
  portfolio: Portfolio,
): Promise<void> {
  portfolio.updatedAt = new Date().toISOString();
  await kv.put(portfolioKey(sessionId), portfolio);
}

export function markPortfolio(
  portfolio: Portfolio,
  marks: Record<string, number>,
): {
  equity: number;
  cash: number;
  positionsValue: number;
  positions: Array<{
    symbol: string;
    qty: number;
    avgCost: number;
    mark: number | null;
    marketValue: number | null;
    unrealizedPnl: number | null;
  }>;
} {
  let positionsValue = 0;
  const positions = Object.entries(portfolio.positions).map(
    ([symbol, pos]) => {
      const mark = marks[symbol] ?? null;
      const marketValue = mark == null ? null : mark * pos.qty;
      const unrealizedPnl =
        mark == null ? null : (mark - pos.avgCost) * pos.qty;
      if (marketValue != null) positionsValue += marketValue;
      return {
        symbol,
        qty: pos.qty,
        avgCost: pos.avgCost,
        mark,
        marketValue,
        unrealizedPnl,
      };
    },
  );
  return {
    equity: portfolio.cash + positionsValue,
    cash: portfolio.cash,
    positionsValue,
    positions,
  };
}

export function applyOrder(
  portfolio: Portfolio,
  input: {
    side: "buy" | "sell";
    symbol: string;
    qty: number;
    price: number;
  },
): { portfolio: Portfolio; trade: Trade } {
  const { side, symbol, qty, price } = input;
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("qty must be a positive number");
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("price must be a positive number");
  }

  const notional = qty * price;
  const positions = { ...portfolio.positions };
  const existing = positions[symbol];

  if (side === "buy") {
    if (portfolio.cash < notional) {
      throw new Error(
        `insufficient cash: need ${notional.toFixed(2)}, have ${portfolio.cash.toFixed(2)}`,
      );
    }
    const nextQty = (existing?.qty ?? 0) + qty;
    const nextCost =
      ((existing?.avgCost ?? 0) * (existing?.qty ?? 0) + notional) / nextQty;
    positions[symbol] = { qty: nextQty, avgCost: nextCost };
    const trade: Trade = {
      id: `t_${Date.now().toString(36)}`,
      side,
      symbol,
      qty,
      price,
      notional,
      at: new Date().toISOString(),
    };
    return {
      portfolio: {
        ...portfolio,
        cash: portfolio.cash - notional,
        positions,
        trades: [...portfolio.trades, trade].slice(-100),
      },
      trade,
    };
  }

  if (!existing || existing.qty < qty) {
    throw new Error(
      `insufficient shares of ${symbol}: have ${existing?.qty ?? 0}, need ${qty}`,
    );
  }
  const remaining = existing.qty - qty;
  if (remaining === 0) delete positions[symbol];
  else positions[symbol] = { qty: remaining, avgCost: existing.avgCost };

  const trade: Trade = {
    id: `t_${Date.now().toString(36)}`,
    side,
    symbol,
    qty,
    price,
    notional,
    at: new Date().toISOString(),
  };
  return {
    portfolio: {
      ...portfolio,
      cash: portfolio.cash + notional,
      positions,
      trades: [...portfolio.trades, trade].slice(-100),
    },
    trade,
  };
}
