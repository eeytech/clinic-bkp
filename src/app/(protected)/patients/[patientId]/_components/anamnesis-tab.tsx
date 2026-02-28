// src/app/(protected)/patients/[patientId]/_components/anamnesis-tab.tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import * as React from "react";
import { toast } from "sonner";

import { AnamnesisSchema } from "@/actions/anamnesis/schema";
import { upsertAnamnesis } from "@/actions/anamnesis/upsert-anamnesis";
import AnamnesisCanvas from "@/app/(protected)/patients/_components/anamnesis/anamnesis-canvas";
import { AnamnesisProvider } from "@/app/(protected)/patients/_components/anamnesis/anamnesis-context";
// Importar AnamnesisHistory separadamente se quiser um link/botão para ele
// import AnamnesisHistory from "@/app/(protected)/patients/_components/anamnesis/anamnesis-history";

// Componente Wrapper AnamnesisView removido para simplificar

export default function AnamnesisTab({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();

  // Lógica de salvamento permanece aqui no componente da aba
  const upsertAction = useAction(upsertAnamnesis, {
    onSuccess: ({ input }) => {
      queryClient.invalidateQueries({
        queryKey: ["anamnesis-history", patientId],
      });

      if (input.id) {
        toast.success("Rascunho da anamnese salvo com sucesso!");
      } else {
        toast.success("Nova versão da anamnese criada com sucesso!");
      }
    },
    onError: (error) => {
      console.error("Anamnesis Save Error:", error);
      toast.error("Erro ao salvar a ficha clínica.");
    },
  });

  const handleSaveDraft = React.useCallback(
    async (data: AnamnesisSchema, currentRecordId: string | undefined) => {
      upsertAction.execute({
        ...data,
        id: currentRecordId,
        patientId: data.patientId, // Garante que patientId está presente
      } as any);
    },
    [upsertAction], // patientId removido das dependências pois vem de `data`
  );

  const handleSaveNewVersion = React.useCallback(
    async (data: AnamnesisSchema) => {
      upsertAction.execute({
        ...data,
        id: undefined, // Garante que é uma nova versão
        patientId: data.patientId, // Garante que patientId está presente
      } as any);
    },
    [upsertAction], // patientId removido das dependências pois vem de `data`
  );

  return (
    // Provider envolve diretamente o Canvas
    <AnamnesisProvider
      patientId={patientId}
      saveDraft={handleSaveDraft}
      saveNewVersion={handleSaveNewVersion}
      isSaving={upsertAction.isExecuting}
    >
      {/* Renderiza apenas o Canvas diretamente */}
      <AnamnesisCanvas />
      {/* Poderia adicionar um botão/link para abrir o histórico em um modal ou outra seção, se necessário */}
      {/* Ex: <Button onClick={() => openHistoryModal()}>Ver Histórico</Button> */}
    </AnamnesisProvider>
  );
}
