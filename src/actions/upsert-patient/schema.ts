// src/actions/upsert-patient/schema.ts
import { z } from "zod";

import { BrazilianState } from "@/app/(protected)/doctors/_constants";
// Importar o novo enum de status cadastral
import { patientCadastralStatusEnum } from "@/db/schema";

const allBrazilianStates = Object.keys(BrazilianState) as [
  keyof typeof BrazilianState,
  ...(keyof typeof BrazilianState)[],
];

export const upsertPatientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, { message: "Nome é obrigatório." }),
  email: z
    .string()
    .email({ message: "E-mail inválido." })
    .optional()
    .nullable(), // Tornar email opcional
  phoneNumber: z.string().regex(/^\d{10,11}$/, "Telefone inválido"), // Permitir 10 ou 11 dígitos
  sex: z.enum(["male", "female"], { required_error: "Sexo é obrigatório." }),
  cpf: z.string().regex(/^\d{11}$/, "CPF inválido"),
  rg: z.string().trim().min(1, { message: "RG é obrigatório." }),
  dateOfBirth: z.date({ required_error: "Data de nascimento é obrigatória." }),
  street: z.string().trim().min(1, { message: "Rua é obrigatória." }),
  number: z.string().trim().min(1, { message: "Número é obrigatório." }),
  neighborhood: z.string().trim().min(1, { message: "Bairro é obrigatório." }),
  zipCode: z.string().regex(/^\d{8}$/, "CEP inválido"),
  city: z.string().trim().min(1, { message: "Cidade é obrigatória." }),
  state: z.enum(allBrazilianStates, {
    required_error: "Estado é obrigatório.",
  }),
  complement: z.string().optional().nullable(),
  responsibleName: z.string().optional().nullable(),
  responsibleCpf: z
    .string()
    .regex(/^\d{11}$/, "CPF inválido")
    .optional()
    .nullable(),
  responsibleRg: z.string().optional().nullable(),
  responsiblePhoneNumber: z
    .string()
    .regex(/^\d{10,11}$/, "Telefone inválido")
    .optional()
    .nullable(),
  // Adicionar campo status, mas torná-lo opcional aqui, pois será definido no backend ou pela ação de toggle
  cadastralStatus: z.enum(patientCadastralStatusEnum.enumValues).optional(),
});

export type UpsertPatientSchema = z.infer<typeof upsertPatientSchema>;
