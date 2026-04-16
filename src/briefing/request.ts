import { z } from "zod";

import type { BriefingRequest } from "./types.js";

const briefingRequestSchema = z.object({
  topic: z.string().trim().min(5, "Topic must be at least 5 characters long."),
  audience: z.string().trim().min(3, "Audience must be at least 3 characters long."),
  limit: z.number().int().min(1).max(8),
  live: z.boolean()
});

export function validateBriefingRequest(input: BriefingRequest): BriefingRequest {
  return briefingRequestSchema.parse({
    ...input,
    topic: input.topic.trim(),
    audience: input.audience.trim()
  });
}
