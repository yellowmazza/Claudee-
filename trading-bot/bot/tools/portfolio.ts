import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { fetchQuote } from "../lib/market";
import {
  emptyPortfolio,
  loadPortfolio,
  markPortfolio,
  savePortfolio,
  STARTING_CASH,
} from "../lib/portfolio";

export default defineTool({
  description: prompt`
    Inspect or reset the session paper portfolio.
    Use action "status" for balances and marks; "reset" to restore starting cash.
  `,
  effect: ({ action }) => (action === "reset" ? "write" : "read"),
  inputSchema: z.object({
    action: z.enum(["status", "reset"]).default("status"),
  }),
  dryRunResult: ({ action }) =>
    action === "reset"
      ? { dryRun: true, reset: false, cash: STARTING_CASH }
      : { dryRun: true, action: "status" },
  async execute({ action }, ctx) {
    if (action === "reset") {
      const portfolio = emptyPortfolio();
      await savePortfolio(ctx.host.kv, ctx.session.id, portfolio);
      return {
        reset: true as const,
        cash: portfolio.cash,
        currency: portfolio.currency,
        startingCash: STARTING_CASH,
      };
    }

    const portfolio = await loadPortfolio(ctx.host.kv, ctx.session.id);
    const symbols = Object.keys(portfolio.positions);
    const marks: Record<string, number> = {};
    const markErrors: string[] = [];
    for (const symbol of symbols) {
      try {
        const q = await fetchQuote(symbol);
        marks[symbol] = q.price;
      } catch (err) {
        markErrors.push(
          `${symbol}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    const marked = markPortfolio(portfolio, marks);
    return {
      paper: true as const,
      currency: portfolio.currency,
      cash: marked.cash,
      equity: marked.equity,
      positionsValue: marked.positionsValue,
      positions: marked.positions,
      recentTrades: portfolio.trades.slice(-10),
      updatedAt: portfolio.updatedAt,
      markErrors: markErrors.length ? markErrors : undefined,
    };
  },
});
