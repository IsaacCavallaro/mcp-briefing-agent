import test from "node:test";
import assert from "node:assert/strict";

import type { ChatCompletion } from "openai/resources/chat/completions/completions.js";

import { runChatCompletionBriefingLoop } from "../src/briefing/agent.js";

test("runChatCompletionBriefingLoop requires and uses tools before accepting a final answer", async () => {
  const requestedToolChoices: string[] = [];
  let searchCalls = 0;

  const client = {
    async create(params: {
      model: string;
      messages: Array<{ role: string; content?: unknown }>;
      tool_choice: "auto" | "required";
    }): Promise<ChatCompletion> {
      requestedToolChoices.push(params.tool_choice);

      if (requestedToolChoices.length === 1) {
        return {
          id: "chatcmpl-1",
          object: "chat.completion",
          created: 1,
          model: params.model,
          choices: [
            {
              index: 0,
              finish_reason: "tool_calls",
              message: {
                role: "assistant",
                content: null,
                refusal: null,
                tool_calls: [
                  {
                    id: "call-1",
                    type: "function",
                    function: {
                      name: "search_library",
                      arguments: JSON.stringify({ query: "remote MCP servers", limit: 1 })
                    }
                  }
                ]
              }
            }
          ]
        } as ChatCompletion;
      }

      return {
        id: "chatcmpl-2",
        object: "chat.completion",
        created: 2,
        model: params.model,
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: `## Executive Summary

Grounded summary

## Why This Matters Now

Now

## Key Signals

- Signal

## Risks And Unknowns

Risk

## Suggested Next Moves

- Move

## Source Notes

- Model Context Protocol docs`,
              refusal: null
            }
          }
        ]
      } as ChatCompletion;
    }
  };

  const usedBriefIds = new Set<string>();
  const result = await runChatCompletionBriefingLoop({
    client,
    model: "gemini-2.5-flash-lite",
    messages: [
      { role: "system", content: "Use tools before answering." },
      { role: "user", content: 'Create a technical briefing about "remote MCP servers".' }
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "search_library",
          description: "Search the briefing library.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string" }
            },
            required: ["query"]
          }
        }
      }
    ],
    request: {
      topic: "remote MCP servers",
      audience: "engineering manager",
      limit: 3,
      live: true
    },
    toolHandlers: {
      search_library: async () => {
        searchCalls += 1;
        usedBriefIds.add("mcp-protocol");
        return [
          {
            id: "mcp-protocol",
            title: "MCP defines the context boundary"
          }
        ];
      },
      read_briefing: async () => ({ error: "unused" })
    },
    usedBriefIds
  });

  assert.equal(searchCalls, 1);
  assert.deepEqual(requestedToolChoices, ["required", "auto"]);
  assert.equal(result.mode, "live");
  assert.deepEqual(result.briefIds, ["mcp-protocol"]);
  assert.match(result.markdown, /## Executive Summary/);
});
