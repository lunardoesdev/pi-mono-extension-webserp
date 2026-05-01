import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ENGINES = "duckduckgo,brave,presearch";
const DEFAULT_MAX_RESULTS = 75;

const SEARCH_DESCRIPTION = [
  "Search the web using webserp, excluding Google and Bing.",
  "Deduplicates results and returns JSON.",
  "Search results are discovery only: snippets and URLs are unverified until fetched."
].join(" ");

const SEARCH_PROMPT_SNIPPET =
  "webserp_search(query, maxResults?): search the live web. Search results must be fetched before you rely on or share result links.";

const SEARCH_PROMPT_GUIDELINES = [
  "Use webserp_search when the user asks to search the web, wants current information, asks for links, or asks about something that may have changed.",
  "Do not use search snippets as evidence. Treat every webserp_search result as unverified until the target URL has been fetched.",
  "Before you give a final answer containing links, citations, factual claims from search results, or recommendations based on search results, fetch the relevant results URLs first.",
  "Use the best available active web-fetch tool to check result URLs. Prefer richer page fetchers that extract readable content, preserve metadata, and support batch fetching when multiple links must be checked.",
  "Do not search for paid products, subscriptions, shops and cinemas unless the user explicitly asks for paid products.",
  "When multiple searches are needed, run webserp_search calls sequentially rather than in parallel.",
  "if you didn't get enough results after fetching, continue searching and fetching untill satisfied."
];

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "webserp_search",
    label: "WebSerp Search",
    description: SEARCH_DESCRIPTION,
    promptSnippet: SEARCH_PROMPT_SNIPPET,
    promptGuidelines: SEARCH_PROMPT_GUIDELINES,
    executionMode: "sequential",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      maxResults: Type.Optional(Type.Number({ description: "Maximum results per engine (default 75)" }))
    }),
    async execute(_toolCallId, params, signal, onUpdate) {
      const maxResults = normalizeCount(params.maxResults, DEFAULT_MAX_RESULTS, 1, 100);
      const args = [
        "--engines",
        ENGINES,
        "--max-results",
        String(maxResults),
        params.query
      ];

      onUpdate?.({
        content: [{ type: "text", text: `Searching webserp for: ${params.query}` }],
        details: { engines: ENGINES, maxResults }
      });

      try {
        const { stdout, stderr } = await execFileAsync("webserp", args, {
          signal,
          maxBuffer: 10 * 1024 * 1024
        });
        const formatted = formatSearchOutput(stdout);

        return {
          content: [{ type: "text", text: formatted }],
          details: {
            stderr,
            command: ["webserp", ...args],
            engines: ENGINES,
            maxResults
          }
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: err.stdout || err.message }],
          isError: true,
          details: {
            error: err.message,
            stderr: err.stderr,
            command: ["webserp", ...args],
            engines: ENGINES,
            maxResults
          }
        };
      }
    },
  });
}

function normalizeCount(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function formatSearchOutput(stdout: string): string {
  try {
    const parsed = JSON.parse(stdout);
    return JSON.stringify(
      {
        ...parsed,
        verification_required: true,
        required_next_step:
          "Fetch relevant result URLs with the best available active web-fetch tool before sharing links, making citations, or relying on snippets.",
        final_answer_rules: [
          "Do not present search-result URLs as checked sources until fetched.",
          "Use fetched page content, not snippets, for factual claims.",
          "Provide clean text links only for relevant, fetched results.",
          "If no web-fetch tool is available, explicitly say the links could not be verified."
        ]
      },
      null,
      2
    );
  } catch {
    return [
      "verification_required: true",
      "required_next_step: Fetch relevant result URLs with the best available active web-fetch tool before sharing links or relying on snippets.",
      "",
      stdout
    ].join("\n");
  }
}
