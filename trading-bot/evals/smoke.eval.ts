import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "Shows paper portfolio status via the portfolio tool.",
  async test(t) {
    await t.send(
      "Show my paper portfolio status. Use the portfolio tool with action status.",
    );
    t.succeeded();
    t.calledTool("portfolio");
  },
});
