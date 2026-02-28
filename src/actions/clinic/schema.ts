// src/actions/clinic/schema.ts
import { z } from "zod";

import { BrazilianState } from "@/app/(protected)/doctors/_constants";
import { clinicPaymentMethodsEnum } from "@/db/schema";

const allBrazilianStates = Object.keys(BrazilianState) as [
  keyof typeof BrazilianState,
  ...(keyof typeof BrazilianState)[],
];

const allClinicPaymentMethods = clinicPaymentMethodsEnum.enumValues as [
  string,
  ...string[],
];

export const upsertClinicSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Nome da clínica é obrigatório."),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, "CNPJ inválido")
    .optional()
    .nullable(),
  stateBusinessRegistration: z.string().optional().nullable(),
  responsibleName: z
    .string()
    .trim()
    .min(1, "Nome do responsável é obrigatório."),
  croResponsavel: z.string().trim().min(1, "CRO do responsável é obrigatório."),
  paymentMethods: z
    .array(z.enum(allClinicPaymentMethods))
    .min(1, "Selecione pelo menos um método de pagamento."),
  logoUrl: z
    .string()
    .url("URL inválida.")
    .or(z.literal(""))
    .optional()
    .nullable(),
  observations: z.string().optional().nullable(),

  phone: z
    .string()
    .regex(/^\d{10}$/, "Telefone inválido")
    .optional()
    .nullable(),
  whatsApp: z
    .string()
    .regex(/^\d{11}$/, "WhatsApp inválido")
    .optional()
    .nullable(),
  email: z.string().email("E-mail inválido.").optional().nullable(),
  website: z
    .string()
    .url("URL inválida.")
    .or(z.literal(""))
    .optional()
    .nullable(),
  addressStreet: z.string().trim().min(1, "Rua/Avenida é obrigatória."),
  addressNumber: z.string().trim().min(1, "Número é obrigatório."),
  addressComplement: z.string().optional().nullable(),
  addressNeighborhood: z.string().trim().min(1, "Bairro é obrigatório."),
  addressCity: z.string().trim().min(1, "Cidade é obrigatória."),
  addressState: z.enum(allBrazilianStates, {
    required_error: "Estado é obrigatório.",
  }),
  addressZipcode: z.string().regex(/^\d{8}$/, "CEP inválido"),
});

export type UpsertClinicSchema = z.infer<typeof upsertClinicSchema>;
