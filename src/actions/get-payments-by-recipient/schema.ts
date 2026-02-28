// src/actions/get-payments-by-recipient/schema.ts
import { z } from "zod";

export const getPaymentsByRecipientSchema = z.object({
  recipientId: z.string().uuid(),
  from: z.date().optional(),
  to: z.date().optional(),
});

export type GetPaymentsByRecipientSchema = z.infer<
  typeof getPaymentsByRecipientSchema
>;
