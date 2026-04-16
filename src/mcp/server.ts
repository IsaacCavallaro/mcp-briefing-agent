import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getBrief, getCatalog, searchBriefs } from "../briefing/library.js";

const server = new McpServer({
  name: "mcp-briefing-agent-library",
  version: "0.1.0"
});

server.registerTool(
  "search_briefs",
  {
    title: "Search briefing documents",
    description: "Find relevant briefing documents by topic, technology, or market signal.",
    inputSchema: {
      query: z.string().min(2),
      limit: z.number().int().min(1).max(8).optional()
    }
  },
  async ({ query, limit = 3 }) => {
    const results = searchBriefs(query, limit);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  }
);

server.registerTool(
  "get_brief",
  {
    title: "Get one briefing document",
    description: "Load a full briefing document by id.",
    inputSchema: {
      id: z.string()
    }
  },
  async ({ id }) => {
    const result = getBrief(id);

    if (!result) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `No briefing found for id "${id}"` }, null, 2)
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

server.registerResource(
  "briefing-catalog",
  "briefing://catalog",
  {
    title: "Briefing catalog",
    description: "Compact listing of available briefing documents."
  },
  async () => ({
    contents: [
      {
        uri: "briefing://catalog",
        mimeType: "application/json",
        text: JSON.stringify(getCatalog(), null, 2)
      }
    ]
  })
);

const transport = new StdioServerTransport();

await server.connect(transport);
