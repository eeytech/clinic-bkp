import { z } from "zod";

import {
  BrazilianState,
  DentalSpecialty,
} from "@/app/(protected)/doctors/_constants";

// Array de todas as chaves de estado para o Zod enum
const allBrazilianStates = Object.keys(BrazilianState) as [
  keyof typeof BrazilianState,
  ...(keyof typeof BrazilianState)[],
];

// Array de todos os valores de especialidades para o Zod array de enums
const allDentalSpecialties = Object.values(DentalSpecialty) as [
  DentalSpecialty,
  ...DentalSpecialty[],
];

// Enum para os dias da semana (valor como string para o form)
const weekDaysEnum = z.enum(["0", "1", "2", "3", "4", "5", "6"]);

export const upsertDoctorSchema = z
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
    cro: z.string().trim().min(1, {
      message: "CRO é obrigatório.",
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
    specialties: z.array(z.enum(allDentalSpecialties)).min(1, {
      message: "Selecione pelo menos uma especialidade.",
    }),
    observations: z.string().optional().nullable(),
    education: z.string().optional().nullable(),
    // availableFromWeekDay: z.string(), // REMOVIDO
    // availableToWeekDay: z.string(), // REMOVIDO
    availableWeekDays: z.array(weekDaysEnum).min(1, {
      // ADICIONADO
      message: "Selecione pelo menos um dia da semana.",
    }),
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
      // Garante que availableFromTime e availableToTime sejam válidos antes de comparar
      const [fromHour, fromMinute] = (data.availableFromTime || "00:00:00")
        .split(":")
        .map(Number);
      const [toHour, toMinute] = (data.availableToTime || "00:00:00")
        .split(":")
        .map(Number);

      if (
        isNaN(fromHour) ||
        isNaN(fromMinute) ||
        isNaN(toHour) ||
        isNaN(toMinute)
      ) {
        return false; // Horário inválido
      }

      const fromTotalMinutes = fromHour * 60 + fromMinute;
      const toTotalMinutes = toHour * 60 + toMinute;

      return fromTotalMinutes < toTotalMinutes;
    },
    {
      message: "O horário de início deve ser anterior ao horário de término.",
      path: ["availableToTime"],
    },
  );

export type UpsertDoctorSchema = z.infer<typeof upsertDoctorSchema>;
