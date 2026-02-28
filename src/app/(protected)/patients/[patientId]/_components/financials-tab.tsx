// src/app/(protected)/patients/[patientId]/_components/financials-tab.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { getPatientFinances } from "@/actions/patient-finances";
import { getPatientById } from "@/actions/patients/get-by-id"; // Para buscar dados do paciente
import { Skeleton } from "@/components/ui/skeleton";

// Importar o FinancialDashboard do local correto
import FinancialDashboard from "../financials/_components/financial-dashboard";

interface FinancialsTabProps {
  patientId: string;
}

export default function FinancialsTab({ patientId }: FinancialsTabProps) {
  // Buscar dados do paciente e financeiros separadamente
  const { data: patientResult, isLoading: isLoadingPatient } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatientById({ patientId }),
    enabled: !!patientId,
  });

  const { data: financesResult, isLoading: isLoadingFinances } = useQuery({
    queryKey: ["patient-finances", patientId],
    queryFn: async () => {
      const result = await getPatientFinances({ patientId });
      return result?.data || [];
    },
    enabled: !!patientId,
  });

  const isLoading = isLoadingPatient || isLoadingFinances;
  const patient = patientResult?.data;
  const finances = financesResult ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!patient) {
    return <p className="text-destructive">Paciente não encontrado.</p>;
  }

  return <FinancialDashboard patient={patient} initialFinances={finances} />;
}
