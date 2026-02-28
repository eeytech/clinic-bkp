// src/app/(protected)/patients/[id]/odontogram/_components/odontogram-context.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as React from "react";
import { toast } from "sonner";

import { doctorsTable } from "@/db/schema";
import { authClient } from "@/lib/auth-client"; // CORRIGIDO: Importa authClient

import {
  ODONTOGRAM_STATUS_MAP,
  PERMANENT_TEETH_FDI,
  ToothFace,
} from "../../[patientId]/odontogram/_constants";
import {
  OdontogramMark,
  OdontogramRecord,
  OdontogramState,
  ToothNumber,
  VisualOdontogram,
} from "../../[patientId]/odontogram/_types";
import ToothModal from "./tooth-modal";

// Define o Doctor type
type Doctor = Pick<
  typeof doctorsTable.$inferSelect,
  "id" | "name" | "specialties"
>;

// --- Definição do Contexto ---

interface OdontogramContextProps {
  // Estado
  odontogramState: OdontogramState;
  visualOdontogram: VisualOdontogram;
  selectedTooth: ToothNumber | null;
  selectedFace: ToothFace | null;
  isModalOpen: boolean;
  isSaving: boolean;
  allOdontogramRecords: OdontogramRecord[] | undefined;

  // Novos campos obrigatórios
  doctors: Doctor[];
  currentDoctorId: string;
  currentDate: Date;

  // Ações
  selectTooth: (toothNumber: ToothNumber, face: ToothFace) => void;
  closeModal: () => void;
  setOdontogramState: React.Dispatch<React.SetStateAction<OdontogramState>>;
  saveOdontogram: () => Promise<void>; // Salva o estado atual no banco (chamado pelo modal)
  saveNewOdontogramRecord: () => Promise<void>; // Salva como novo registro (chamado pelo botão)
  loadRecordToCanvas: (record: OdontogramRecord) => void;
  setCurrentDoctorId: React.Dispatch<React.SetStateAction<string>>;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

const OdontogramContext = React.createContext<
  OdontogramContextProps | undefined
>(undefined);

export const useOdontogram = () => {
  const context = React.useContext(OdontogramContext);
  if (!context) {
    throw new Error("useOdontogram must be used within an OdontogramProvider");
  }
  return context;
};

// Helper para criar estado inicial vazio (32 dentes permanentes)
const getInitialOdontogramState = (): OdontogramState => {
  const state: OdontogramState = {};
  const allTeeth = [
    ...PERMANENT_TEETH_FDI.quadrant1,
    ...PERMANENT_TEETH_FDI.quadrant2,
    ...PERMANENT_TEETH_FDI.quadrant3,
    ...PERMANENT_TEETH_FDI.quadrant4,
  ];
  for (const toothNumber of allTeeth) {
    state[toothNumber as ToothNumber] = {
      toothNumber: toothNumber as ToothNumber,
      marks: {},
    };
  }
  return state;
};

// Helper para converter OdontogramRecord para OdontogramState
const recordToState = (record: OdontogramRecord): OdontogramState => {
  const newState = getInitialOdontogramState();

  for (const mark of record.marks) {
    const toothNumber = mark.toothNumber as ToothNumber;
    const face = mark.face as ToothFace;

    if (newState[toothNumber]) {
      const cleanMark: OdontogramMark = {
        id: mark.id,
        toothNumber: mark.toothNumber as ToothNumber,
        face: mark.face as ToothFace,
        status: mark.status as any,
        observation: mark.observation || null,
      };

      newState[toothNumber].marks[face] = cleanMark;
    }
  }

  return newState;
};

// Helper para converter OdontogramState para VisualOdontogram (para renderização)
const stateToVisual = (state: OdontogramState): VisualOdontogram => {
  const visual: VisualOdontogram = {};

  for (const toothNumber in state) {
    visual[toothNumber as ToothNumber] = {};
    const toothState = state[toothNumber as ToothNumber];

    for (const face in toothState.marks) {
      const mark = toothState.marks[face as ToothFace];
      if (mark && mark.status !== "saudavel") {
        const config = ODONTOGRAM_STATUS_MAP[mark.status];
        visual[toothNumber as ToothNumber][face as ToothFace] = {
          color: config.color,
          status: mark.status,
          observation: mark.observation,
        };
      }
    }
  }
  return visual;
};

// Helper para extrair as marcas a serem salvas
const getMarksToSave = (state: OdontogramState): OdontogramMark[] => {
  const marks: OdontogramMark[] = [];
  for (const toothNumber in state) {
    const tooth = state[toothNumber as ToothNumber];
    for (const face in tooth.marks) {
      const mark = tooth.marks[face as ToothFace];
      // Só inclui marcas não-saudáveis
      if (mark && mark.status !== "saudavel") {
        marks.push(mark);
      }
    }
  }
  return marks;
};

// --- Componente Provider ---

interface OdontogramProviderProps {
  patientId: string;
  doctors: Doctor[];
  children: React.ReactNode;
}

export function OdontogramProvider({
  patientId,
  doctors,
  children,
}: OdontogramProviderProps) {
  // CORRIGIDO: Usa authClient.useSession()
  const { data: session } = authClient.useSession();
  const [odontogramState, setOdontogramState] = React.useState<OdontogramState>(
    getInitialOdontogramState,
  );
  const [selectedTooth, setSelectedTooth] = React.useState<ToothNumber | null>(
    null,
  );
  const [selectedFace, setSelectedFace] = React.useState<ToothFace | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Novos campos
  const [currentDoctorId, setCurrentDoctorId] = React.useState(
    doctors[0]?.id || "",
  );
  const [currentDate, setCurrentDate] = React.useState(new Date());

  // --- Estado Derivado ---
  const visualOdontogram = React.useMemo(
    () => stateToVisual(odontogramState),
    [odontogramState],
  );

  // --- Busca de Dados (Histórico) ---
  const { data: allOdontogramRecords, refetch: refetchHistory } = useQuery<
    OdontogramRecord[]
  >({
    queryKey: ["odontogram-history", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/odontogram`);
      if (!res.ok) throw new Error("Failed to fetch odontogram history");
      return res.json();
    },
    enabled: !!session?.user?.clinic?.id && !!patientId,
  });

  // Carrega o registro mais recente na inicialização
  React.useEffect(() => {
    if (allOdontogramRecords && allOdontogramRecords.length > 0) {
      // Carrega o primeiro (mais recente) registro
      loadRecordToCanvas(allOdontogramRecords[0], { silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOdontogramRecords]);

  // --- Ações ---

  const selectTooth = React.useCallback(
    (toothNumber: ToothNumber, face: ToothFace) => {
      setSelectedTooth(toothNumber);
      setSelectedFace(face);
      setIsModalOpen(true);
    },
    [],
  );

  const closeModal = React.useCallback(() => {
    setIsModalOpen(false);
    setSelectedTooth(null);
    setSelectedFace(null);
  }, []);

  const saveOdontogram = React.useCallback(async () => {
    if (!currentDoctorId || !currentDate) {
      toast.error("Selecione o médico e a data para salvar o registro.");
      return;
    }

    setIsSaving(true);
    const marksToSave = getMarksToSave(odontogramState);

    try {
      const response = await fetch(`/api/patients/${patientId}/odontogram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marks: marksToSave,
          doctorId: currentDoctorId,
          date: format(currentDate, "yyyy-MM-dd"),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save odontogram record");
      }

      toast.success("Marcação salva e novo registro criado com sucesso!");
      refetchHistory(); // Atualiza a lista de histórico
    } catch (error) {
      console.error("Save Odontogram Error:", error);
      toast.error("Erro ao salvar o registro de odontograma.");
    } finally {
      setIsSaving(false);
    }
  }, [
    odontogramState,
    patientId,
    currentDoctorId,
    currentDate,
    refetchHistory,
  ]);

  const saveNewOdontogramRecord = React.useCallback(async () => {
    // A lógica é a mesma de saveOdontogram, mas com feedback diferente e auto-avanço da data
    if (!currentDoctorId || !currentDate) {
      toast.error("Selecione o médico e a data para salvar o novo registro.");
      return;
    }

    setIsSaving(true);
    const marksToSave = getMarksToSave(odontogramState);

    try {
      const response = await fetch(`/api/patients/${patientId}/odontogram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marks: marksToSave,
          doctorId: currentDoctorId,
          date: format(currentDate, "yyyy-MM-dd"),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create new odontogram record");
      }

      // Limpa a tela para começar o novo registro e avança a data
      setOdontogramState(getInitialOdontogramState());
      setCurrentDate(new Date());

      toast.success("Novo registro de odontograma criado com sucesso!");
      refetchHistory();
    } catch (error) {
      console.error("Create New Odontogram Error:", error);
      toast.error("Erro ao criar novo registro.");
    } finally {
      setIsSaving(false);
    }
  }, [
    odontogramState,
    patientId,
    currentDoctorId,
    currentDate,
    refetchHistory,
  ]);

  const loadRecordToCanvas = React.useCallback(
    (record: OdontogramRecord, { silent = false } = {}) => {
      const newState = recordToState(record);
      setOdontogramState(newState);
      setCurrentDoctorId(record.doctor.id);
      setCurrentDate(new Date(record.date)); // Carrega a data do registro

      if (!silent) {
        toast.info(
          `Visualizando registro de ${format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}.`,
        );
      }
    },
    [],
  );

  const contextValue = React.useMemo(
    () => ({
      odontogramState,
      setOdontogramState,
      visualOdontogram,
      selectedTooth,
      selectedFace,
      isModalOpen,
      closeModal,
      selectTooth,
      isSaving,
      saveOdontogram,
      saveNewOdontogramRecord,
      allOdontogramRecords,
      loadRecordToCanvas,
      doctors,
      currentDoctorId,
      setCurrentDoctorId,
      currentDate,
      setCurrentDate,
    }),
    [
      odontogramState,
      visualOdontogram,
      selectedTooth,
      selectedFace,
      isModalOpen,
      closeModal,
      selectTooth,
      isSaving,
      saveOdontogram,
      saveNewOdontogramRecord,
      allOdontogramRecords,
      loadRecordToCanvas,
      doctors,
      currentDoctorId,
      setCurrentDoctorId,
      currentDate,
      setCurrentDate,
    ],
  );

  return (
    <OdontogramContext.Provider value={contextValue}>
      {children}
      {isModalOpen && <ToothModal />}
    </OdontogramContext.Provider>
  );
}
