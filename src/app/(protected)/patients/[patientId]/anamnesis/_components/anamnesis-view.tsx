// src/app/(protected)/patients/[patientId]/anamnesis/_components/anamnesis-view.tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import * as React from "react";
import { toast } from "sonner";

import { AnamnesisSchema } from "@/actions/anamnesis/schema";
import { upsertAnamnesis } from "@/actions/anamnesis/upsert-anamnesis";
import AnamnesisCanvas from "@/app/(protected)/patients/_components/anamnesis/anamnesis-canvas";
import { AnamnesisProvider } from "@/app/(protected)/patients/_components/anamnesis/anamnesis-context";
import AnamnesisHistory from "@/app/(protected)/patients/_components/anamnesis/anamnesis-history";

export default function AnamnesisView({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();

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
        patientId,
      } as any);
    },
    [upsertAction, patientId],
  );

  const handleSaveNewVersion = React.useCallback(
    async (data: AnamnesisSchema) => {
      upsertAction.execute({
        ...data,
        id: undefined,
        patientId,
      } as any);
    },
    [upsertAction, patientId],
  );

  return (
    <AnamnesisProvider
      patientId={patientId}
      saveDraft={handleSaveDraft}
      saveNewVersion={handleSaveNewVersion}
      isSaving={upsertAction.isExecuting}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <AnamnesisCanvas />
        <AnamnesisHistory />
      </div>
    </AnamnesisProvider>
  );
}
