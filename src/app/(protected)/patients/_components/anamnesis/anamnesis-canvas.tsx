// src/app/(protected)/patients/_components/anamnesis/anamnesis-canvas.tsx
"use client";

import { ClipboardList, Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useAnamnesis } from "./anamnesis-context";
import AnamnesisForm from "./anamnesis-form";

// O conteúdo do canvas agora é o componente principal
export default function AnamnesisCanvas() {
  const {
    currentAnamnesisId,
    currentAnamnesisVersion,
    currentAnamnesisData,
    resetToNewAnamnesis,
    patientId,
    saveDraft,
    saveNewVersion,
    isSaving,
  } = useAnamnesis();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex w-full items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="size-5" />
            Ficha Clínica (Versão {currentAnamnesisVersion})
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetToNewAnamnesis}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Rascunho
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          {currentAnamnesisId
            ? `Editando Rascunho (ID: ${currentAnamnesisId.slice(0, 8)}...)`
            : `Criando Versão ${currentAnamnesisVersion}`}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <AnamnesisForm
          initialData={currentAnamnesisData}
          currentRecordId={currentAnamnesisId}
          onSaveDraft={saveDraft}
          onSaveNewVersion={saveNewVersion}
          isSaving={isSaving}
          patientId={patientId}
        />
      </CardContent>
    </Card>
  );
}
