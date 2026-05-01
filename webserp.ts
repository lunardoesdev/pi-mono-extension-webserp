import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "webserp_search",
    label: "WebSerp Search",
    description: "Search the web using webserp (excluding Google and Bing). Deduplicates results and returns JSON. Do not run more than 2 searches simultaneously.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      maxResults: Type.Optional(Type.Number({ description: "Maximum results per engine (default 75)" }))
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const maxResults = params.maxResults || 75;
      
      // webserp outputs JSON by default.
      // We exclude google, bing, yahoo, mojeek, and startpage to ensure stability and privacy.
      const engines = "duckduckgo,brave,presearch";
      
      // Escape double quotes to prevent shell injection
      const safeQuery = params.query.replace(/"/g, '\\"');
      const cmd = `webserp "${safeQuery}" --engines ${engines} --max-results ${maxResults}`;
      
      try {
        const { stdout, stderr } = await execAsync(cmd, { signal });
        
        return {
          content: [{ type: "text", text: stdout }],
          details: { stderr, cmd }
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: err.stdout || err.message }],
          isError: true,
          details: { error: err.message, stderr: err.stderr, cmd }
        };
      }
    },
  });
}
