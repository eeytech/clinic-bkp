import { z } from "zod";

// Zod Schemas para estruturas aninhadas

const medicationSchema = z.object({
  name: z.string().trim().min(1, "Nome do medicamento é obrigatório."),
  dose: z.string().trim().optional().nullable(),
  frequency: z.string().trim().optional().nullable(),
  since: z.string().date("Data de início inválida").optional().nullable(),
});

const allergySchema = z.object({
  substance: z.string().trim().min(1, "Substância é obrigatória."),
  reaction: z.string().trim().optional().nullable(),
  severity: z
    .enum(["mild", "moderate", "severe"], {
      required_error: "Selecione a severidade.",
      // FIX: Permite que seja null, o que é mais flexível para inicialização.
    })
    .optional()
    .nullable(),
});

const smokingSchema = z.object({
  isSmoker: z.boolean(),
  packPerDay: z.number().int().min(0).nullable(), // Número de maços por dia
  years: z.number().int().min(0).nullable(), // Anos fumando
});

const attachmentSchema = z.object({
  url: z.string().url("URL do anexo inválida."),
  name: z.string().min(1, "Nome do arquivo é obrigatório."),
  type: z.string().min(1, "Tipo do arquivo é obrigatório."),
});

// Enum values para condições e características da dor
export const PainCharacteristics = [
  // AGORA EXPORTADO
  "agudo",
  "cronico",
  "latejante",
  "constante",
  "intermitente",
] as const;

export const KnownConditions = [
  // AGORA EXPORTADO
  "diabetes",
  "hipertensao",
  "cardiopatias",
  "avc",
  "asma",
  "doencas_renais",
  "hepatite",
  "imunossupressao",
  "cancer",
  "disturbios_coagulacao",
  "hiv",
  "tireoide",
  "outras",
] as const;

// Schema principal da Anamnese
export const anamnesisSchema = z.object({
  // Identificação e metadados (para update/versionamento)
  id: z.string().uuid().optional(),
  patientId: z.string().uuid({
    message: "ID do paciente é obrigatório.",
  }),
  previousVersionId: z.string().uuid().optional().nullable(),

  // 2. Queixa principal
  chiefComplaint: z.string().trim().max(500).optional().nullable(),
  painScale: z.number().int().min(0).max(10).optional().nullable(),
  onsetDate: z.union([z.string().date(), z.date()]).optional().nullable(),
  painCharacteristics: z.array(z.enum(PainCharacteristics)).optional(),
  triggersAlleviatingFactors: z.string().optional().nullable(),
  previousAttemptedTreatments: z.string().optional().nullable(),

  // 3. História médica geral
  knownConditions: z.array(z.enum(KnownConditions)).optional(),
  otherMedicalConditions: z.string().optional().nullable(),
  currentMedications: z.array(medicationSchema).optional(),
  allergies: z.array(allergySchema).optional(),
  surgicalHistory: z.string().optional().nullable(),
  pregnancy: z.boolean().optional().nullable(),
  pregnancyWeeks: z.number().int().min(0).max(42).optional().nullable(),
  breastfeeding: z.boolean().optional().nullable(),
  bleedingProblems: z.boolean().optional().nullable(),
  anesthesiaComplicationsHistory: z.boolean().optional().nullable(),
  anesthesiaComplicationsDetail: z.string().optional().nullable(),

  // 4. Hábitos e fatores de risco
  smoking: smokingSchema.optional(),
  alcoholFrequency: z.enum(["none", "ocasional", "weekly", "daily"]).optional(),
  drugUse: z.boolean().optional().nullable(),
  drugUseDetail: z.string().optional().nullable(),
  bruxism: z.boolean().optional().nullable(),
  dietaryHabits: z.string().optional().nullable(),
  oralHygieneBrushingFrequency: z.number().int().min(0).optional().nullable(),
  oralHygieneFlossingFrequency: z.number().int().min(0).optional().nullable(),
  oralHygieneMouthwashUse: z.boolean().optional().nullable(),

  // 5. História odontológica
  lastDentalVisit: z.union([z.string().date(), z.date()]).optional().nullable(),
  previousTreatments: z.string().optional().nullable(),
  currentProsthesisOrAppliance: z.string().optional().nullable(),
  anesthesiaAllergies: z.boolean().optional().nullable(),
  anesthesiaAllergiesDetail: z.string().optional().nullable(),
  sensitivityToColdHot: z.boolean().optional().nullable(),

  // 6. Exame clínico
  extraOralFindings: z.string().optional().nullable(),
  intraOralFindings: z.string().optional().nullable(),
  periodontalIndexSummary: z.string().optional().nullable(),
  cariesRisk: z.enum(["low", "medium", "high"]).optional().nullable(),
  cariesRiskRationale: z.string().optional().nullable(),
  tmjSymptoms: z.boolean().optional().nullable(),
  tmjSymptomsDetail: z.string().optional().nullable(),

  // 7. Imagens e anexos
  attachments: z.array(attachmentSchema).optional(),

  // 8. Plano inicial e consentimento
  preliminaryTreatmentPlan: z.string().optional().nullable(),
  immediateActions: z.string().optional().nullable(),
  consentSigned: z.boolean().optional().nullable(),
  consentSignedBy: z.string().optional().nullable(),
  consentDate: z.union([z.string().date(), z.date()]).optional().nullable(),

  // 9. Observações gerais e notas do profissional
  notes: z.string().optional().nullable(),
  followUpDate: z.union([z.string().date(), z.date()]).optional().nullable(),
});

export type AnamnesisSchema = z.infer<typeof anamnesisSchema>;
export type AnamnesisFormInputs = Omit<
  AnamnesisSchema,
  "onsetDate" | "lastDentalVisit" | "consentDate" | "followUpDate"
> & {
  onsetDate: Date | null | undefined;
  lastDentalVisit: Date | null | undefined;
  consentDate: Date | null | undefined;
  followUpDate: Date | null | undefined;
};
