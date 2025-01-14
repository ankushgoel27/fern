import { z } from "zod";
import { DeclarationSchema } from "./DeclarationSchema";
import { HttpHeaderSchema } from "./HttpHeaderSchema";
import { WebhookPayloadSchema } from "./WebhookPayloadSchema";

export const WebhookSchema = DeclarationSchema.extend({
    method: z.enum(["GET", "POST"]),
    "display-name": z.optional(z.string()),
    headers: z.optional(z.record(HttpHeaderSchema)),
    payload: WebhookPayloadSchema,
});

export type WebhookSchema = z.infer<typeof WebhookSchema>;
