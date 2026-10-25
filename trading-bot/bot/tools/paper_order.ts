import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { fetchQuote } from "../lib/market";
import {
  applyOrder,
  loadPortfolio,
  markPortfolio,
  savePortfolio,
} from "../lib/portfolio";

export default defineTool({
  description: prompt`
    Place a paper (simulated) market order against the session portfolio.
    Never claims a real brokerage fill. Always prices from a live quote.
  `,
  effect: "write",
  inputSchema: z.object({
    side: z.enum(["buy", "sell"]),
    symbol: z.string().describe('Ticker, e.g. "AAPL"'),
    qty: z.number().positive().describe("Share quantity"),
  }),
  dryRunResult: ({ side, symbol, qty }) => ({
    dryRun: true,
    filled: false,
    side,
    symbol: symbol.toUpperCase(),
    qty,
  }),
  async execute({ side, symbol, qty }, ctx) {
    const quote = await fetchQuote(symbol);
    const portfolio = await loadPortfolio(ctx.host.kv, ctx.session.id);
    const { portfolio: next, trade } = applyOrder(portfolio, {
      side,
      symbol: quote.symbol,
      qty,
      price: quote.price,
    });
    await savePortfolio(ctx.host.kv, ctx.session.id, next);
    const marked = markPortfolio(next, { [quote.symbol]: quote.price });
    return {
      paper: true as const,
      trade,
      quote,
      cash: next.cash,
      equity: marked.equity,
      position: next.positions[quote.symbol] ?? null,
    };
  },
});
