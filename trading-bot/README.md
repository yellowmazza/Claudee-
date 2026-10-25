# trading-bot

Paper-trading Agent SDK agent. Fetches live quotes (Yahoo Finance), simulates
orders, and tracks a per-session portfolio in `host.kv`.

## Quick start

```bash
cd trading-bot
npx @grok/agent-sdk login          # once, for model turns
npx @grok/agent-sdk validate --dir .
npx @grok/agent-sdk tool call get_quote --dir . --input '{"symbol":"AAPL"}'
npx @grok/agent-sdk run --dir . --message "Quote AAPL and show my paper portfolio"
npx @grok/agent-sdk serve --dir . --mode single --dev
# http://127.0.0.1:3000/playground
```

## Tools

| Tool | Effect | Role |
| --- | --- | --- |
| `get_quote` | read | Live price via Yahoo Finance |
| `paper_order` | write | Simulated buy/sell |
| `portfolio` | read / write | Status or reset ($100k start) |

No live brokerage. Not financial advice.
