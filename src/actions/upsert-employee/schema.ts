// src/actions/upsert-employee/schema.ts
import { z } from "zod";

import {
  BrazilianState,
  EmployeeRole,
} from "@/app/(protected)/employees/_constants"; // Importa do novo local

// Array de todas as chaves de estado para o Zod enum
const allBrazilianStates = Object.keys(BrazilianState) as [
  keyof typeof BrazilianState,
  ...(keyof typeof BrazilianState)[],
];

// Array de todos os valores de cargos para o Zod enum
const allEmployeeRoles = Object.values(EmployeeRole) as [
  EmployeeRole,
  ...EmployeeRole[],
];

export const upsertEmployeeSchema = z
  .object({
    id: z.string().uuid().optional(),
    avatarImageUrl: z
      .string()
      .url("URL inválida.")
      .or(z.literal(""))
      .optional()
      .nullable(),
    name: z.string().trim().min(1, {
      message: "Nome é obrigatório.",
    }),
    // cro: z.string().trim().min(1, { message: "CRO é obrigatório." }), // Removido
    role: z.array(z.enum(allEmployeeRoles)).min(1, {
      // ALTERADO: para array
      message: "Selecione pelo menos um cargo.",
    }),
    rg: z.string().trim().min(1, {
      message: "RG é obrigatório.",
    }),
    cpf: z.string().trim().min(1, {
      message: "CPF é obrigatório.",
    }),
    dateOfBirth: z.date({
      required_error: "Data de nascimento é obrigatória.",
    }),
    email: z.string().email({
      message: "E-mail inválido.",
    }),
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
    // specialties: z.array(z.enum(allDentalSpecialties)).min(1, { message: "Selecione pelo menos uma especialidade." }), // Removido
    observations: z.string().optional().nullable(),
    education: z.string().optional().nullable(),
    availableFromWeekDay: z.string(),
    availableToWeekDay: z.string(),
    availableFromTime: z.string().min(1, {
      message: "Hora de início é obrigatória.",
    }),
    availableToTime: z.string().min(1, {
      message: "Hora de término é obrigatória.",
    }),
    addressStreet: z.string().trim().min(1, "Rua/Avenida é obrigatória."),
    addressNumber: z.string().trim().min(1, "Número é obrigatório."),
    addressComplement: z.string().optional().nullable(),
    addressNeighborhood: z.string().trim().min(1, "Bairro é obrigatório."),
    addressCity: z.string().trim().min(1, "Cidade é obrigatória."),
    addressState: z.enum(allBrazilianStates, {
      required_error: "Estado é obrigatório.",
    }),
    addressZipcode: z.string().regex(/^\d{8}$/, "CEP inválido"),
  })
  .refine(
    (data) => {
      return data.availableFromTime < data.availableToTime;
    },
    {
      message:
        "O horário de início não pode ser anterior ao horário de término.",
      path: ["availableToTime"],
    },
  );

export type UpsertEmployeeSchema = z.infer<typeof upsertEmployeeSchema>;
