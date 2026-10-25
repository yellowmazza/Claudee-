---
description: Use when the user wants a market brief, ticker summary, or watchlist recap.
---

# Trading brief

1. Call `get_quote` for each ticker the user named (skip unknowns after one failure).
2. Call `portfolio` with `action: "status"` if they ask how a move affects them.
3. Reply in this shape:

```
## Brief — <symbols>
- <SYM>: $<price> (as of <asOf>)
- Move / context: one short sentence (range vs open/high/low if useful)
- Paper impact: only if they hold it; otherwise omit

## Next
One optional question (size, horizon, or risk) — no hard sell.
```

Keep it under ~12 lines. No fake catalysts. Label everything as paper/sim when tied to the portfolio.
