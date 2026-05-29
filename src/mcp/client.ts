import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import type { BriefDocument } from "../briefing/types.js";

function projectRootFrom(moduleUrl: string): string {
  const filename = fileURLToPath(moduleUrl);
  return path.resolve(path.dirname(filename), "..", "..");
}

function isBuiltModule(moduleUrl: string): boolean {
  const filename = fileURLToPath(moduleUrl);
  return filename.includes(`${path.sep}dist${path.sep}`);
}

export function resolveServerCommand(
  moduleUrl: string,
  fileExists: (path: string) => boolean = existsSync
): { command: string; args: string[] } {
  const root = projectRootFrom(moduleUrl);
  const distServer = path.join(root, "dist", "mcp", "server.js");

  if (isBuiltModule(moduleUrl) && fileExists(distServer)) {
    return {
      command: process.execPath,
      args: [distServer]
    };
  }

  return {
    command: process.execPath,
    args: ["--import", "tsx", path.join(root, "src", "mcp", "server.ts")]
  };
}

function parseToolText(response: { content?: Array<{ text?: string }> }): unknown {
  const text = response.content?.find((item) => item.text)?.text;

  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

export class BriefingMcpClient {
  private readonly client = new Client({
    name: "mcp-briefing-agent-client",
    version: "0.1.0"
  });

  private transport?: StdioClientTransport;

  async connect(): Promise<void> {
    if (this.transport) {
      return;
    }

    const command = resolveServerCommand(import.meta.url);
    this.transport = new StdioClientTransport(command);

    try {
      await this.client.connect(this.transport);
    } catch (error) {
      this.transport = undefined;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to the local MCP server: ${message}`);
    }
  }

  async close(): Promise<void> {
    await this.transport?.close?.();
    await (this.client as { close?: () => Promise<void> }).close?.();
    this.transport = undefined;
  }

  async searchBriefs(query: string, limit = 3): Promise<BriefDocument[]> {
    const response = await this.client.callTool({
      name: "search_briefs",
      arguments: { query, limit }
    });

    return (parseToolText(response as { content?: Array<{ text?: string }> }) as BriefDocument[]) ?? [];
  }

  async getBrief(id: string): Promise<BriefDocument | undefined> {
    const response = await this.client.callTool({
      name: "get_brief",
      arguments: { id }
    });

    const result = parseToolText(response as { content?: Array<{ text?: string }> }) as
      | BriefDocument
      | { error?: string }
      | null;

    if (!result || ("error" in result && result.error)) {
      return undefined;
    }

    return result as BriefDocument;
  }

  async getCatalog(): Promise<Array<Pick<BriefDocument, "id" | "title" | "source" | "tags">>> {
    const response = await this.client.readResource({
      uri: "briefing://catalog"
    });

    const firstContent = response.contents?.[0];
    const text = firstContent && "text" in firstContent ? firstContent.text : undefined;
    return text ? JSON.parse(text) : [];
  }
}
