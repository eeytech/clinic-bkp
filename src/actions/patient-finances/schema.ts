import { z } from "zod";

export const upsertFinanceSchema = z.object({
  id: z.number().optional(),
  patientId: z.string().uuid(),
  type: z.enum(["charge", "payment"]),
  amount: z.number().positive("O valor deve ser maior que zero."),
  description: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  status: z.enum(["pending", "paid"]).optional().nullable(),
});

export type UpsertFinanceSchema = z.infer<typeof upsertFinanceSchema>;
