// src/app/(protected)/patients/[id]/odontogram/_constants/index.ts

// Mapeamento dos 32 dentes permanentes por quadrante (FDI)
export const PERMANENT_TEETH_FDI: { [quadrant: string]: string[] } = {
  // Quadrante 1 e 2 (Superior)
  quadrant1: ["18", "17", "16", "15", "14", "13", "12", "11"].reverse(),
  quadrant2: ["21", "22", "23", "24", "25", "26", "27", "28"],
  // Quadrante 3 e 4 (Inferior)
  quadrant3: ["38", "37", "36", "35", "34", "33", "32", "31"].reverse(),
  quadrant4: ["41", "42", "43", "44", "45", "46", "47", "48"],
};

// Faces do dente para interação
export const TOOTH_FACES: { label: string; value: string }[] = [
  { label: "Oclusal/Incisal", value: "oclusal" },
  { label: "Vestibular", value: "vestibular" },
  { label: "Lingual", value: "lingual" },
  { label: "Mesial", value: "mesial" },
  { label: "Distal", value: "distal" },
];

// Mapeamento de Status para cor (Tailwind classes) e ícone
export const ODONTOGRAM_STATUS_MAP: {
  [key: string]: { label: string; color: string; icon: string };
} = {
  carie: { label: "Cárie", color: "bg-red-500", icon: "AlertTriangle" },
  restauracao: {
    label: "Restauração",
    color: "bg-blue-500",
    icon: "Check",
  },
  canal: { label: "Canal", color: "bg-yellow-500", icon: "Circle" },
  extracao: { label: "Extração", color: "bg-black/50", icon: "X" },
  protese: { label: "Prótese", color: "bg-purple-500", icon: "Bone" },
  implante: { label: "Implante", color: "bg-green-500", icon: "Stethoscope" },
  ausente: { label: "Ausente", color: "bg-gray-500", icon: "X" },
  saudavel: { label: "Saudável", color: "bg-transparent", icon: "Check" },
};

// Tipos para dentes e arcos (para reuso)
export type QuadrantKeys = keyof typeof PERMANENT_TEETH_FDI;
export type ToothNumber = string;
export type OdontogramStatus = keyof typeof ODONTOGRAM_STATUS_MAP;
export type ToothFace = (typeof TOOTH_FACES)[number]["value"];
