import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { fetchQuote } from "../lib/market";

export default defineTool({
  description: prompt`
    Fetch the latest market quote for a ticker (equities/ETFs via Yahoo Finance).
    Call this before placing a paper order or summarizing price action.
  `,
  effect: "read",
  inputSchema: z.object({
    symbol: z.string().describe('Ticker, e.g. "AAPL" or "SPY"'),
  }),
  async execute({ symbol }) {
    const quote = await fetchQuote(symbol);
    return quote;
  },
});
