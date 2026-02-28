// src/app/(protected)/patients/_components/odontogram/tooth.tsx
"use client";

// Importações mantidas
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bone,
  Check,
  Circle,
  Stethoscope,
  X,
} from "lucide-react";
import * as React from "react";

import {
  ODONTOGRAM_STATUS_MAP,
  OdontogramStatus,
  TOOTH_FACES, // Importar TOOTH_FACES
  ToothFace,
} from "@/app/(protected)/patients/[patientId]/odontogram/_constants";
import {
  ToothFaceMarks,
  ToothNumber,
} from "@/app/(protected)/patients/[patientId]/odontogram/_types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useOdontogram } from "./odontogram-context";

interface ToothProps {
  toothNumber: ToothNumber;
  marks: ToothFaceMarks; // This is the collection of marks for the whole tooth
  className?: string;
  isUpper: boolean;
}

const STATUS_ICON_MAP: Record<OdontogramStatus, React.ElementType> = {
  carie: AlertTriangle,
  restauracao: Check,
  canal: Circle,
  extracao: X,
  protese: Bone,
  implante: Stethoscope,
  ausente: X,
  saudavel: Check,
};

// --- Funções Helper ---
const getFaceLabel = (value: ToothFace) =>
  TOOTH_FACES.find((f) => f.value === value)?.label || value;

const isPosterior = (toothNumber: ToothNumber) =>
  ["8", "7", "6", "5", "4"].includes(toothNumber[1]);

// --- Componente Face ---
const ToothFaceComp: React.FC<{
  face: ToothFace;
  mark?: ToothFaceMarks[ToothFace]; // This is the specific mark for *this* face
  toothNumber: ToothNumber;
  isUpper: boolean;
}> = ({ face, mark, toothNumber, isUpper }) => {
  const { selectTooth } = useOdontogram();
  const Icon = mark ? STATUS_ICON_MAP[mark.status] : null; // Ícone apenas se houver marcação

  const isFacePosterior = isPosterior(toothNumber);
  const faceConfig = ODONTOGRAM_STATUS_MAP[mark?.status || "saudavel"];
  const faceColor =
    mark && mark.status !== "saudavel" ? faceConfig.color : "bg-transparent"; // Cor ou transparente

  // Classes base e de hover
  const baseClasses =
    "absolute cursor-pointer border border-gray-400/50 transition-colors duration-150";
  const hoverClass = mark ? "" : "hover:bg-primary/10"; // Hover sutil apenas se saudável

  let faceClasses = "";
  const iconPositionClasses =
    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
  const showIcon =
    mark && mark.status !== "saudavel" && mark.status !== "ausente"; // Não mostra ícone para saudável ou ausente

  // Definição das áreas das faces (simplificado, usar SVG seria mais preciso)
  switch (face) {
    case "oclusal":
    case "incisal": // Tratar ambos juntos
      if (!isFacePosterior && face === "oclusal") return null; // Oclusal só para posteriores
      if (isFacePosterior && face === "incisal") return null; // Incisal só para anteriores
      faceClasses =
        "w-[60%] h-[60%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm z-20"; // Centro
      break;
    case "vestibular":
      faceClasses = "w-full h-[20%] top-0 left-0 rounded-t-sm z-10"; // Topo
      break;
    case "lingual":
      faceClasses = "w-full h-[20%] bottom-0 left-0 rounded-b-sm z-10"; // Base
      break;
    case "mesial":
      faceClasses = "w-[20%] h-full top-0 left-0 rounded-l-sm z-10"; // Esquerda
      break;
    case "distal":
      faceClasses = "w-[20%] h-full top-0 right-0 rounded-r-sm z-10"; // Direita
      break;
  }

  // Ajusta cor do ícone
  let iconColorClass = "text-white"; // Default para fundos coloridos
  if (mark?.status === "restauracao") iconColorClass = "text-blue-700";
  if (mark?.status === "canal") iconColorClass = "text-yellow-700";

  // Mostrar número do dente na face central se não houver marcação nela
  const centralFace = isFacePosterior ? "oclusal" : "incisal";
  // *** CORRECTION HERE: Use 'mark' which is defined in this scope ***
  const showToothNumberOnFace = face === centralFace && !mark; // Check if the *current face's* mark is missing

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(baseClasses, faceClasses, faceColor, hoverClass)}
          onClick={() => selectTooth(toothNumber, face)}
          aria-label={`Dente ${toothNumber}, Face ${getFaceLabel(face)}`}
        >
          {showIcon && Icon && (
            <Icon
              className={cn("h-3 w-3", iconPositionClasses, iconColorClass)}
            />
          )}
          {showToothNumberOnFace && (
            <span
              className={cn(
                "pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[0.6rem] font-bold text-gray-600",
              )}
            >
              {toothNumber}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          Dente: {toothNumber} | Face: {getFaceLabel(face)} ({faceConfig.label})
        </p>
        {mark?.observation && (
          <p className="mt-1 text-xs">{mark.observation}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

// --- Componente Dente ---
export const Tooth: React.FC<ToothProps> = ({
  toothNumber,
  marks, // Pass the whole marks object for the tooth here
  className,
  isUpper,
}) => {
  const isToothMissing = Object.values(marks).some(
    (mark) => mark?.status === "ausente",
  );

  const facesToRender: ToothFace[] = [
    "oclusal",
    "incisal",
    "vestibular",
    "lingual",
    "mesial",
    "distal",
  ];

  return (
    <div
      className={cn(
        "relative flex size-10 items-center justify-center rounded-sm border border-gray-300 bg-white shadow-sm", // Estilo base do dente
        isToothMissing && "opacity-30", // Estilo para dente ausente
        className,
      )}
      aria-label={`Dente ${toothNumber}`}
    >
      {/* Container interno para aplicar rotação às faces se necessário */}
      <div
        className={cn(
          "relative h-full w-full",
          isUpper && "rotate-180 transform",
        )}
      >
        {facesToRender.map((face) => (
          <ToothFaceComp
            key={face}
            face={face}
            mark={marks[face]} // Pass the specific mark for this face
            toothNumber={toothNumber}
            isUpper={isUpper}
          />
        ))}
      </div>
      {/* Ícone X sobreposto para dente ausente */}
      {isToothMissing && (
        <X className="absolute z-30 h-6 w-6 text-red-500" strokeWidth={3} />
      )}
    </div>
  );
};
