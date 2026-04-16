import "dotenv/config";

import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam
} from "openai/resources/chat/completions/completions.js";
import type {
  FunctionTool,
  Response,
  ResponseFunctionToolCall,
  ResponseInputItem
} from "openai/resources/responses/responses.js";

import { BriefingMcpClient } from "../mcp/client.js";
import { createModelClient, resolveProviderConfig } from "./provider.js";
import { validateBriefingRequest } from "./request.js";
import type { BriefDocument, BriefingRequest, BriefingResult } from "./types.js";

function briefingInstructions(request: BriefingRequest): string {
  return [
    "You are a senior AI product strategist writing a concise technical briefing.",
    `Audience: ${request.audience}.`,
    "Use tools before answering.",
    "Return markdown with these headings exactly:",
    "## Executive Summary",
    "## Why This Matters Now",
    "## Key Signals",
    "## Risks And Unknowns",
    "## Suggested Next Moves",
    "## Source Notes",
    "Use bullet points for the Key Signals and Suggested Next Moves sections.",
    "Cite source titles from the tool results in the Source Notes section."
  ].join("\n");
}

function extractText(response: Response): string {
  if (response.output_text) {
    return response.output_text;
  }

  const message = response.output?.find((item) => item.type === "message");
  const parts = message && "content" in message ? message.content : [];

  return parts
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

function mockBriefing(topic: string, audience: string, documents: BriefDocument[]): string {
  const sourceNotes = documents
    .map((document) => `- ${document.title} (${document.source})`)
    .join("\n");

  const signals = documents
    .flatMap((document) => document.keySignals.slice(0, 1))
    .slice(0, 3)
    .map((signal) => `- ${signal}`)
    .join("\n");

  const nextMoves = [
    `- Build one visible workflow for ${audience} around ${topic}.`,
    "- Keep the protocol boundary explicit so the model does not own the data layer.",
    "- Add eval checks for structure, source usage, and actionability before expanding scope."
  ].join("\n");

  return `## Executive Summary

This mock briefing shows the shape of the system without requiring a live API key. The strongest signal is a small, auditable agent workflow grounded in tool results rather than a single prompt.

## Why This Matters Now

The current AI market rewards engineers who can combine reasoning loops, tool boundaries, and repeatable evaluation. A repo that demonstrates those pieces together reads as current and practical.

## Key Signals

${signals}

## Risks And Unknowns

- Overbuilding the demo can dilute the story.
- Weak docs make even a good architecture feel unfinished.
- Without evals, regressions are easy to miss when prompts evolve.

## Suggested Next Moves

${nextMoves}

## Source Notes

${sourceNotes}`;
}

async function runLiveBriefing(request: BriefingRequest, mcpClient: BriefingMcpClient): Promise<BriefingResult> {
  if (!request.live) {
    const primaryDocuments = await mcpClient.searchBriefs(request.topic, request.limit);
    const documents =
      primaryDocuments.length > 0
        ? primaryDocuments
        : await mcpClient.searchBriefs("agents tools evals protocol", request.limit);

    return {
      mode: "mock",
      markdown: mockBriefing(request.topic, request.audience, documents),
      briefIds: documents.map((document) => document.id)
    };
  }

  const providerConfig = resolveProviderConfig();
  const client = createModelClient(providerConfig);
  const usedBriefIds = new Set<string>();

  const toolHandlers = {
    search_library: async (args: { query: string; limit?: number }) => {
      const results = await mcpClient.searchBriefs(args.query, args.limit ?? request.limit);
      results.forEach((document) => usedBriefIds.add(document.id));
      return results;
    },
    read_briefing: async (args: { id: string }) => {
      const result = await mcpClient.getBrief(args.id);
      if (result) {
        usedBriefIds.add(result.id);
      }
      return result ?? { error: `No briefing found for id "${args.id}"` };
    }
  };

  const responseTools: FunctionTool[] = [
    {
      type: "function",
      name: "search_library",
      description: "Search the briefing library for relevant documents.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 8 }
        },
        required: ["query"]
      }
    },
    {
      type: "function",
      name: "read_briefing",
      description: "Read one full briefing document by id.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" }
        },
        required: ["id"]
      }
    }
  ];

  if (providerConfig.apiStyle === "chat") {
    return runChatCompletionBriefing({
      client,
      model: providerConfig.model,
      request,
      toolHandlers,
      usedBriefIds
    });
  }

  return runResponsesBriefing({
    client,
    model: providerConfig.model,
    request,
    toolHandlers,
    tools: responseTools,
    usedBriefIds
  });
}

interface ToolHandlers {
  search_library: (args: { query: string; limit?: number }) => Promise<unknown>;
  read_briefing: (args: { id: string }) => Promise<unknown>;
}

interface ResponsesBriefingArgs {
  client: OpenAI;
  model: string;
  request: BriefingRequest;
  toolHandlers: ToolHandlers;
  tools: FunctionTool[];
  usedBriefIds: Set<string>;
}

async function runResponsesBriefing({
  client,
  model,
  request,
  toolHandlers,
  tools,
  usedBriefIds
}: ResponsesBriefingArgs): Promise<BriefingResult> {
  let response: Response = await client.responses.create({
    model,
    reasoning: { effort: "medium" },
    tools,
    instructions: briefingInstructions(request),
    input: `Create a technical briefing about "${request.topic}". Search before answering.`
  });

  while (true) {
    const functionCalls = (response.output ?? []).filter(
      (item): item is ResponseFunctionToolCall => item.type === "function_call"
    );

    if (functionCalls.length === 0) {
      const markdown = extractText(response);

      if (!markdown) {
        throw new Error("The OpenAI response completed without tool calls or output text.");
      }

      return {
        mode: "live",
        markdown,
        briefIds: [...usedBriefIds]
      };
    }

    const toolOutputs: ResponseInputItem[] = [];

    for (const toolCall of functionCalls) {
      const parsedArguments = JSON.parse(toolCall.arguments || "{}") as Record<string, unknown>;
      const result =
        toolCall.name === "search_library"
          ? await toolHandlers.search_library({
              query: String(parsedArguments.query ?? request.topic),
              limit:
                typeof parsedArguments.limit === "number"
                  ? parsedArguments.limit
                  : request.limit
            })
          : await toolHandlers.read_briefing({
              id: String(parsedArguments.id ?? "")
            });

      toolOutputs.push({
        type: "function_call_output",
        call_id: toolCall.call_id,
        output: JSON.stringify(result)
      });
    }

    response = await client.responses.create({
      model,
      previous_response_id: response.id,
      tools,
      input: toolOutputs
    });
  }
}

interface ChatBriefingArgs {
  client: OpenAI;
  model: string;
  request: BriefingRequest;
  toolHandlers: ToolHandlers;
  usedBriefIds: Set<string>;
}

const TOOL_REQUIRED_REMINDER =
  "You must call search_library before writing the briefing. Do not answer until you have used the available tools.";

export interface ChatCompletionClientLike {
  create(params: {
    model: string;
    messages: ChatCompletionMessageParam[];
    tools: ChatCompletionTool[];
    tool_choice: "auto" | "required";
  }): Promise<ChatCompletion>;
}

function buildChatTools(): ChatCompletionTool[] {
  return [
    {
      type: "function",
      function: {
        name: "search_library",
        description: "Search the briefing library for relevant documents.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            query: { type: "string" },
            limit: { type: "integer", minimum: 1, maximum: 8 }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "read_briefing",
        description: "Read one full briefing document by id.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" }
          },
          required: ["id"]
        }
      }
    }
  ];
}

async function runChatCompletionBriefing({
  client,
  model,
  request,
  toolHandlers,
  usedBriefIds
}: ChatBriefingArgs): Promise<BriefingResult> {
  const tools = buildChatTools();
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: briefingInstructions(request) },
    {
      role: "user",
      content: `Create a technical briefing about "${request.topic}". Search before answering.`
    }
  ];

  return runChatCompletionBriefingLoop({
    client: client.chat.completions,
    model,
    messages,
    tools,
    request,
    toolHandlers,
    usedBriefIds
  });
}

interface ChatBriefingLoopArgs {
  client: ChatCompletionClientLike;
  model: string;
  messages: ChatCompletionMessageParam[];
  tools: ChatCompletionTool[];
  request: BriefingRequest;
  toolHandlers: ToolHandlers;
  usedBriefIds: Set<string>;
}

export async function runChatCompletionBriefingLoop({
  client,
  model,
  messages,
  tools,
  request,
  toolHandlers,
  usedBriefIds
}: ChatBriefingLoopArgs): Promise<BriefingResult> {
  let requiresInitialToolCall = true;

  while (true) {
    const completion: ChatCompletion = await client.create({
      model,
      messages,
      tools,
      tool_choice: requiresInitialToolCall ? "required" : "auto"
    });

    const message = completion.choices[0]?.message;

    if (!message) {
      throw new Error("The model response completed without a message.");
    }

    const assistantMessage: ChatCompletionAssistantMessageParam = {
      role: "assistant",
      content: message.content ?? null,
      tool_calls: message.tool_calls
    };
    messages.push(assistantMessage);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      if (usedBriefIds.size === 0) {
        messages.push({
          role: "user",
          content: TOOL_REQUIRED_REMINDER
        });
        requiresInitialToolCall = true;
        continue;
      }

      const markdown = message.content?.trim();

      if (!markdown) {
        throw new Error("The model response completed without tool calls or output text.");
      }

      return {
        mode: "live",
        markdown,
        briefIds: [...usedBriefIds]
      };
    }

    requiresInitialToolCall = false;

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") {
        continue;
      }

      const parsedArguments = JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>;
      const result =
        toolCall.function.name === "search_library"
          ? await toolHandlers.search_library({
              query: String(parsedArguments.query ?? request.topic),
              limit:
                typeof parsedArguments.limit === "number"
                  ? parsedArguments.limit
                  : request.limit
            })
          : await toolHandlers.read_briefing({
              id: String(parsedArguments.id ?? "")
            });

      const toolMessage: ChatCompletionToolMessageParam = {
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      };
      messages.push(toolMessage);
    }
  }
}

export async function generateBriefing(request: BriefingRequest): Promise<BriefingResult> {
  const validRequest = validateBriefingRequest(request);
  const mcpClient = new BriefingMcpClient();
  await mcpClient.connect();

  try {
    return await runLiveBriefing(validRequest, mcpClient);
  } finally {
    await mcpClient.close();
  }
}
