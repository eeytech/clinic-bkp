// src/app/(protected)/patients/_components/odontogram/odontogram-history.tsx
"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Microscope } from "lucide-react";
import * as React from "react";

import { ODONTOGRAM_STATUS_MAP } from "@/app/(protected)/patients/[patientId]/odontogram/_constants";
import { OdontogramMarkDb } from "@/app/(protected)/patients/[patientId]/odontogram/_types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useOdontogram } from "./odontogram-context";

const getMarksSummary = (marks: OdontogramMarkDb[]) => {
  const summary: { [key: string]: number } = {};

  marks.forEach((mark) => {
    if (mark.status !== "saudavel") {
      summary[mark.status] = (summary[mark.status] || 0) + 1;
    }
  });

  return Object.entries(summary).map(([status, count]) => ({
    status: status as keyof typeof ODONTOGRAM_STATUS_MAP,
    count,
  }));
};

// As props patientId e doctors foram removidas
export default function OdontogramHistory() {
  const { allOdontogramRecords, loadRecordToCanvas } = useOdontogram();

  if (!allOdontogramRecords || allOdontogramRecords.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Histórico de Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Nenhum registro de odontograma encontrado para este paciente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5" />
          Histórico de Registros ({allOdontogramRecords.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {allOdontogramRecords.map((record) => {
          const formattedDate = format(new Date(record.date), "dd/MM/yyyy", {
            locale: ptBR,
          });
          const summary = getMarksSummary(record.marks);
          const totalMarks = record.marks.filter(
            (m) => m.status !== "saudavel",
          ).length;

          return (
            <div
              key={record.id}
              className="flex flex-col gap-2 rounded-md border p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Registro de {formattedDate}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadRecordToCanvas(record)}
                >
                  <Microscope className="mr-2 h-4 w-4" />
                  Visualizar
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Dr(a). {record.doctor.name} | {totalMarks} marcações
              </p>
              <div className="flex flex-wrap gap-1">
                {summary.length > 0 ? (
                  summary.map((item) => (
                    <Tooltip key={item.status}>
                      <TooltipTrigger asChild>
                        <Badge
                          className={ODONTOGRAM_STATUS_MAP[item.status].color}
                        >
                          {ODONTOGRAM_STATUS_MAP[item.status].label} (
                          {item.count})
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {ODONTOGRAM_STATUS_MAP[item.status].label}: {item.count}{" "}
                        dentes/faces marcadas
                      </TooltipContent>
                    </Tooltip>
                  ))
                ) : (
                  <Badge variant="outline">Nenhuma marcação detectada</Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
