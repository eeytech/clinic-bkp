// src/app/(protected)/patients/[id]/odontogram/_types/index.ts
import {
  doctorsTable,
  odontogramMarksTable,
  odontogramsTable,
} from "@/db/schema";

import { OdontogramStatus, ToothFace, ToothNumber } from "../_constants";

// CORREÇÃO: Re-exportar tipos base para que possam ser importados por outros módulos
export type { OdontogramStatus, ToothFace, ToothNumber };
// ---------------------------------------------------------------------------------

// Tipo base do registro de odontograma
type OdontogramBase = typeof odontogramsTable.$inferSelect;

// Tipo de marcação no banco de dados
export type OdontogramMarkDb = typeof odontogramMarksTable.$inferSelect;

// Tipo que inclui o odontograma e as marcas
// RENOMEADO: Agora representa um registro completo (uma versão)
export type OdontogramRecord = OdontogramBase & {
  doctor: Pick<typeof doctorsTable.$inferSelect, "id" | "name">; // Adicionado
  marks: OdontogramMarkDb[];
};

// Tipo de Marcação no Frontend (simplificado)
export interface OdontogramMark {
  id?: string;
  toothNumber: ToothNumber;
  face: ToothFace;
  status: OdontogramStatus;
  observation: string | null;
}

// Estrutura de dados para o estado de um único dente
export interface ToothState {
  toothNumber: ToothNumber;
  // Mapeamento de face para marcação
  marks: Partial<Record<ToothFace, OdontogramMark>>;
}

// Estrutura do Odontograma no estado
export type OdontogramState = Record<ToothNumber, ToothState>;

// Configuração de cores para as faces do dente (Tailwind classes)
export type FaceMark = {
  color: string;
  status: OdontogramStatus;
  observation: string | null;
};
// Mapeamento de dente para suas marcas visualmente (para o componente Tooth)
export type ToothFaceMarks = Partial<Record<ToothFace, FaceMark>>;
export type VisualOdontogram = Record<ToothNumber, ToothFaceMarks>;
