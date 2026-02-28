// src/actions/support-tickets/schema.ts
import { z } from "zod";

import { supportTicketStatusEnum } from "@/db/schema"; // Import enum

export const createSupportTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, "O assunto deve ter pelo menos 5 caracteres."),
  description: z
    .string()
    .trim()
    .min(10, "A descrição deve ter pelo menos 10 caracteres."),
});

export type CreateSupportTicketSchema = z.infer<
  typeof createSupportTicketSchema
>;

// Schema opcional para atualizar status (se necessário no futuro)
export const updateSupportTicketStatusSchema = z.object({
  id: z.number(),
  status: z.enum(supportTicketStatusEnum.enumValues),
});
