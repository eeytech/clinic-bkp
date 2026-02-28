// src/app/(protected)/patients/[id]/anamnesis/_components/anamnesis-context.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AnamnesisSchema, anamnesisSchema } from "@/actions/anamnesis/schema";
import { AnamnesisRecord } from "@/actions/anamnesis/upsert-anamnesis";
import { authClient } from "@/lib/auth-client";

// Helper to get initial data
const getInitialAnamnesisData = (patientId: string): AnamnesisSchema => ({
  patientId,
  // Valores iniciais para listas e objetos complexos (coerção para Zod)
  knownConditions: [],
  painCharacteristics: [],
  currentMedications: [],
  allergies: [],
  attachments: [],
  smoking: {
    isSmoker: false,
    packPerDay: null,
    years: null,
  },
  pregnancy: false,
  breastfeeding: false,
  bleedingProblems: false,
  anesthesiaComplicationsHistory: false,
  drugUse: false,
  bruxism: false,
  oralHygieneMouthwashUse: false,
  anesthesiaAllergies: false,
  sensitivityToColdHot: false,
  tmjSymptoms: false,
  consentSigned: false,
});

// Helper para converter record DB para o formato do formulário com datas como Date
const recordToFormData = (record: AnamnesisRecord): AnamnesisSchema => {
  const data = record.data;
  // A validação de parse já trata a estrutura
  return anamnesisSchema.parse({
    id: record.id,
    patientId: record.patientId,
    ...data,
    attachments: data.attachments || [],
    knownConditions: data.knownConditions || [],
    painCharacteristics: data.painCharacteristics || [],
    currentMedications: data.currentMedications || [],
    allergies: data.allergies || [],
    smoking: data.smoking || {
      isSmoker: false,
      packPerDay: null,
      years: null,
    },
    // Coerção de booleanos e conversão de strings de data para objetos Date
    pregnancy: !!data.pregnancy,
    breastfeeding: !!data.breastfeeding,
    bleedingProblems: !!data.bleedingProblems,
    anesthesiaComplicationsHistory: !!data.anesthesiaComplicationsHistory,
    drugUse: !!data.drugUse,
    bruxism: !!data.bruxism,
    oralHygieneMouthwashUse: !!data.oralHygieneMouthwashUse,
    anesthesiaAllergies: !!data.anesthesiaAllergies,
    sensitivityToColdHot: !!data.sensitivityToColdHot,
    tmjSymptoms: !!data.tmjSymptoms,
    consentSigned: !!data.consentSigned,

    onsetDate: data.onsetDate ? new Date(data.onsetDate as string) : null,
    lastDentalVisit: data.lastDentalVisit
      ? new Date(data.lastDentalVisit as string)
      : null,
    consentDate: data.consentDate ? new Date(data.consentDate as string) : null,
    followUpDate: data.followUpDate
      ? new Date(data.followUpDate as string)
      : null,
  }) as AnamnesisSchema;
};

// --- Definição do Contexto ---

interface AnamnesisContextProps {
  // Estado
  currentAnamnesisData: AnamnesisSchema;
  currentAnamnesisId: string | undefined;
  currentAnamnesisVersion: number;
  allAnamnesisRecords: AnamnesisRecord[] | undefined;
  isLoadingHistory: boolean;

  // Dados obrigatórios
  patientId: string;

  // Ações de Estado/Carregamento
  loadRecordToCanvas: (
    record: AnamnesisRecord,
    options?: { silent: boolean },
  ) => void;
  resetToNewAnamnesis: () => void;
  setFormData: React.Dispatch<React.SetStateAction<AnamnesisSchema>>;

  // Injeção de Propriedades de Mutação (vêm do CanvasBase)
  saveDraft: (data: AnamnesisSchema, id: string | undefined) => Promise<void>;
  saveNewVersion: (data: AnamnesisSchema) => Promise<void>;
  isSaving: boolean;

  // FIX: Adiciona a função de refetch ao contexto
  refetchHistory: () => void;
}

const AnamnesisContext = React.createContext<AnamnesisContextProps | undefined>(
  undefined,
);

export const useAnamnesis = () => {
  const context = React.useContext(AnamnesisContext);
  if (!context) {
    throw new Error("useAnamnesis must be used within an AnamnesisProvider");
  }
  return context;
};

// --- Componente Provider ---

interface AnamnesisProviderProps {
  patientId: string;
  // Recebe as funções de mutação e status do CanvasBase
  saveDraft: (data: AnamnesisSchema, id: string | undefined) => Promise<void>;
  saveNewVersion: (data: AnamnesisSchema) => Promise<void>;
  isSaving: boolean;
  // FIX: Removido refetchHistory para corrigir o erro de tipagem no componente pai
  children: React.ReactNode;
}

export function AnamnesisProvider({
  patientId,
  saveDraft,
  saveNewVersion,
  isSaving,
  children,
}: AnamnesisProviderProps) {
  const { data: session } = authClient.useSession();

  const [currentAnamnesisData, setCurrentAnamnesisData] =
    React.useState<AnamnesisSchema>(getInitialAnamnesisData(patientId));

  const [currentAnamnesisId, setCurrentAnamnesisId] = React.useState<
    string | undefined
  >(undefined);
  const [currentAnamnesisVersion, setCurrentAnamnesisVersion] =
    React.useState(1);

  // --- Busca de Histórico ---
  const {
    data: allAnamnesisRecords,
    isLoading: isLoadingHistory,
    refetch: refetchHistory, // FIX: Obtém o refetch do useQuery
  } = useQuery<AnamnesisRecord[]>({
    queryKey: ["anamnesis-history", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/anamnesis`);
      if (!res.ok) throw new Error("Failed to fetch anamnesis history");
      return res.json() as Promise<AnamnesisRecord[]>;
    },
    enabled: !!session?.user?.clinic?.id && !!patientId,
  });

  const loadRecordToCanvas = React.useCallback(
    (record: AnamnesisRecord, { silent = false } = {}) => {
      try {
        const loadedData = recordToFormData(record);

        setCurrentAnamnesisData(loadedData);
        setCurrentAnamnesisId(record.id);
        setCurrentAnamnesisVersion(record.version);

        if (!silent) {
          toast.info(
            `Visualizando versão ${record.version} de ${format(record.createdAt, "dd/MM/yyyy", { locale: ptBR })} (${record.status}).`,
          );
        }
      } catch (e) {
        console.error("Error parsing anamnesis record:", e);
        toast.error("Erro ao carregar dados do registro de anamnese.");
      }
    },
    [],
  );

  // Carrega o registro mais recente na inicialização/após refetch
  React.useEffect(() => {
    if (allAnamnesisRecords && allAnamnesisRecords.length > 0) {
      loadRecordToCanvas(allAnamnesisRecords[0], { silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnamnesisRecords?.length, patientId]);

  const resetToNewAnamnesis = React.useCallback(() => {
    setCurrentAnamnesisData(getInitialAnamnesisData(patientId));
    setCurrentAnamnesisId(undefined); // Novo registro
    setCurrentAnamnesisVersion((allAnamnesisRecords?.[0]?.version || 0) + 1);
    toast.info("Iniciando nova ficha clínica.");
  }, [patientId, allAnamnesisRecords]);

  const setFormData = setCurrentAnamnesisData;

  const contextValue = React.useMemo(
    () => ({
      currentAnamnesisData,
      currentAnamnesisId,
      currentAnamnesisVersion,
      allAnamnesisRecords,
      isLoadingHistory,
      isSaving,
      patientId,
      loadRecordToCanvas,
      resetToNewAnamnesis,
      setFormData,
      saveDraft,
      saveNewVersion,
      refetchHistory: () => refetchHistory(), // FIX: Função real do useQuery
    }),
    [
      currentAnamnesisData,
      currentAnamnesisId,
      currentAnamnesisVersion,
      allAnamnesisRecords,
      isLoadingHistory,
      isSaving,
      patientId,
      loadRecordToCanvas,
      resetToNewAnamnesis,
      setFormData,
      saveDraft,
      saveNewVersion,
      refetchHistory,
    ],
  );

  return (
    <AnamnesisContext.Provider value={contextValue}>
      {children}
    </AnamnesisContext.Provider>
  );
}
