// src/app/(protected)/patients/_components/anamnesis/anamnesis-history.tsx
"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, History, Loader2, Microscope } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAnamnesis } from "./anamnesis-context";

// A prop patientId foi removida
export default function AnamnesisHistory() {
  const {
    allAnamnesisRecords,
    loadRecordToCanvas,
    isLoadingHistory,
    currentAnamnesisId,
  } = useAnamnesis();

  if (isLoadingHistory) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Histórico de Fichas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
            <span className="text-muted-foreground ml-2">
              Carregando histórico...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!allAnamnesisRecords || allAnamnesisRecords.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Histórico de Fichas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Nenhuma ficha clínica encontrada para este paciente.
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
          Histórico de Fichas ({allAnamnesisRecords.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {allAnamnesisRecords.map((record) => {
          const formattedDate = format(
            record.createdAt,
            "dd/MM/yyyy 'às' HH:mm",
            {
              locale: ptBR,
            },
          );
          const isCurrent = record.id === currentAnamnesisId;
          const isFinalized = record.status === "finalized";
          const statusVariant = isFinalized ? "default" : "secondary";

          return (
            <div
              key={record.id}
              className={`flex flex-col gap-2 rounded-md border p-3 shadow-sm transition-shadow hover:shadow-md ${isCurrent ? "border-primary ring-primary/50 ring-2" : ""}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Versão {record.version} ({record.status.toUpperCase()})
                </p>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadRecordToCanvas(record)}
                        disabled={isCurrent}
                      >
                        <Microscope className="mr-2 h-4 w-4" />
                        Visualizar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Carregar no Canvas para Visualizar/Editar Rascunho
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" disabled>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Exportar PDF (Em breve)</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Criado por {record.creator.name} em {formattedDate}
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant={statusVariant}>
                  {record.status.charAt(0).toUpperCase() +
                    record.status.slice(1)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {record.summary}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
