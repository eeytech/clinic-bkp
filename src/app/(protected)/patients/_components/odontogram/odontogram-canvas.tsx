// src/app/(protected)/patients/_components/odontogram/odontogram-canvas.tsx
"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Save } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Separator removido
import { cn } from "@/lib/utils";

import {
  PERMANENT_TEETH_FDI,
  QuadrantKeys,
  ToothNumber,
} from "../../[patientId]/odontogram/_constants";
import { useOdontogram } from "./odontogram-context";
import { Tooth } from "./tooth";

const QUADRANT_IS_UPPER: Record<QuadrantKeys, boolean> = {
  quadrant1: true,
  quadrant2: true,
  quadrant3: false,
  quadrant4: false,
};

// --- Componente Quadrant ---
function Quadrant({
  quadrant,
  isUpper,
  className, // Adicionado className
}: {
  quadrant: ToothNumber[];
  isUpper: boolean;
  className?: string; // Adicionado className
}) {
  const { visualOdontogram } = useOdontogram();
  return (
    // Ajustado para gap menor e alinhamento
    <div className={cn("flex items-center justify-center gap-0.5", className)}>
      {quadrant.map((toothNumber) => (
        <Tooth
          key={toothNumber}
          toothNumber={toothNumber}
          marks={visualOdontogram[toothNumber] || {}}
          isUpper={isUpper}
        />
      ))}
    </div>
  );
}

// --- Componente Principal ---
export default function OdontogramCanvas() {
  const {
    saveNewOdontogramRecord,
    isSaving,
    doctors,
    currentDoctorId,
    setCurrentDoctorId,
    currentDate,
    setCurrentDate,
  } = useOdontogram();

  const hasDoctors = doctors && doctors.length > 0;

  const isDisabled =
    isSaving || !hasDoctors || !currentDoctorId || !currentDate;

  return (
    <Card className="w-full overflow-hidden">
      {" "}
      {/* Adicionado overflow-hidden */}
      <CardHeader>
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Arcada Dentária Permanente</CardTitle>
          <Button
            onClick={saveNewOdontogramRecord}
            disabled={isDisabled}
            size="sm"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Novo Registro"}
          </Button>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Select
            value={currentDoctorId}
            onValueChange={(value) => setCurrentDoctorId(value)}
            disabled={!hasDoctors || isSaving}
          >
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Selecione o Médico" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal sm:w-[200px]",
                  !currentDate && "text-muted-foreground",
                )}
                disabled={isSaving}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {currentDate ? (
                  format(currentDate, "dd/MM/yyyy", { locale: ptBR }) // Formato mais curto
                ) : (
                  <span>Selecione a data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => {
                  if (date) {
                    setCurrentDate(date);
                  }
                }}
                // toYear={new Date().getFullYear() + 1} // Remover limite futuro
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {/* Container principal com overflow e padding */}
        <div className="flex w-full justify-center overflow-x-auto p-4">
          {/* Container para centralizar e adicionar espaço */}
          <div className="inline-flex flex-col items-center gap-2">
            {/* Arcada Superior */}
            <div className="flex items-center gap-1">
              {/* Quadrante 1 (Superior Direito no Desenho) */}
              <Quadrant
                quadrant={PERMANENT_TEETH_FDI.quadrant1}
                isUpper={QUADRANT_IS_UPPER.quadrant1}
                className="flex-row-reverse" // Inverte a ordem visual
              />
              {/* Linha Vertical Central (Opcional) */}
              <div className="h-10 w-px bg-gray-300"></div>
              {/* Quadrante 2 (Superior Esquerdo no Desenho) */}
              <Quadrant
                quadrant={PERMANENT_TEETH_FDI.quadrant2}
                isUpper={QUADRANT_IS_UPPER.quadrant2}
              />
            </div>

            {/* Linha Horizontal Central (Opcional) */}
            {/* <div className="w-full h-px bg-gray-300 my-1"></div> */}

            {/* Arcada Inferior */}
            <div className="flex items-center gap-1">
              {/* Quadrante 4 (Inferior Direito no Desenho) */}
              <Quadrant
                quadrant={PERMANENT_TEETH_FDI.quadrant4}
                isUpper={QUADRANT_IS_UPPER.quadrant4}
                className="flex-row-reverse" // Inverte a ordem visual
              />
              {/* Linha Vertical Central (Opcional) */}
              <div className="h-10 w-px bg-gray-300"></div>
              {/* Quadrante 3 (Inferior Esquerdo no Desenho) */}
              <Quadrant
                quadrant={PERMANENT_TEETH_FDI.quadrant3}
                isUpper={QUADRANT_IS_UPPER.quadrant3}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
