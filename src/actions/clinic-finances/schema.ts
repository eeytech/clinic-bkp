// src/actions/clinic-finances/schema.ts
import { z } from "zod";

import {
  clinicFinancialOperationEnum,
  clinicFinancialStatusEnum,
  clinicFinancialTypeInputEnum,
  clinicFinancialTypeOutputEnum,
  clinicPaymentMethodsEnum,
} from "@/db/schema";

// Helper function to check if a value is a valid UUID or null/undefined
const isOptionalUuid = (val: unknown): val is string | null | undefined =>
  val === null ||
  val === undefined ||
  (typeof val === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      val,
    ));

export const clinicFinanceSchema = z
  .object({
    id: z.number().optional(),
    operation: z.enum(clinicFinancialOperationEnum.enumValues, {
      required_error: "Selecione a operação (Entrada/Saída).",
    }),
    typeInput: z
      .enum(clinicFinancialTypeInputEnum.enumValues)
      .optional()
      .nullable(), // Make nullable
    typeOutput: z
      .enum(clinicFinancialTypeOutputEnum.enumValues)
      .optional()
      .nullable(), // Make nullable
    description: z.string().trim().min(1, "Descrição é obrigatória."),
    amount: z.number().positive("O valor deve ser maior que zero."),
    paymentDate: z.date().optional().nullable(),
    dueDate: z.date().optional().nullable(),
    // --- status não é mais opcional ---
    status: z.enum(clinicFinancialStatusEnum.enumValues).default("pending"),
    // --- Fim ---
    paymentMethod: z
      .enum(clinicPaymentMethodsEnum.enumValues)
      .optional()
      .nullable(),
    observations: z.string().optional().nullable(),
    patientId: z.string().uuid().optional().nullable(), // Validate as UUID if provided
    employeeId: z.string().uuid().optional().nullable(), // Validate as UUID if provided
    linkedPatientChargeIds: z.array(z.number()).optional().nullable(),
  })
  .refine((data) => data.operation !== "input" || !!data.typeInput, {
    message: "Selecione o tipo de entrada.",
    path: ["typeInput"],
  })
  .refine((data) => data.operation !== "output" || !!data.typeOutput, {
    message: "Selecione o tipo de saída.",
    path: ["typeOutput"],
  })
  .refine(
    (data) => data.typeOutput !== "Pagamento Funcionário" || !!data.employeeId,
    { message: "Selecione o funcionário/médico.", path: ["employeeId"] },
  )
  .refine(
    (data) => {
      // If it's a patient receipt linked to charges, require patientId and linkedPatientChargeIds
      const requiresPatientAndCharges =
        data.operation === "input" &&
        (data.typeInput === "Recebimento Consulta" ||
          data.typeInput === "Recebimento Procedimento" ||
          data.typeInput === "Recebimento Pacote");
      if (requiresPatientAndCharges) {
        return (
          !!data.patientId &&
          !!data.linkedPatientChargeIds &&
          data.linkedPatientChargeIds.length > 0
        );
      }
      // If it's a patient credit, require patientId
      if (
        data.operation === "input" &&
        data.typeInput === "Crédito/Adiantamento Paciente"
      ) {
        return !!data.patientId;
      }
      return true; // No patient required otherwise for clinic finance entry itself
    },
    {
      message:
        "Paciente e/ou cobranças vinculadas são obrigatórios para este tipo de entrada.",
      path: ["patientId"],
    },
  )
  .refine((data) => data.status !== "paid" || !!data.paymentDate, {
    message: 'Data de pagamento é obrigatória para status "Pago".',
    path: ["paymentDate"],
  })
  .refine((data) => data.status !== "paid" || !!data.paymentMethod, {
    message: 'Forma de pagamento é obrigatória para status "Pago".',
    path: ["paymentMethod"],
  });

export type ClinicFinanceSchema = z.infer<typeof clinicFinanceSchema>;
