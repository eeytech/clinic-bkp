// src/app/(protected)/patients/[patientId]/_components/patient-info-tab.tsx
"use client"; // Needs to be client component to use the form

import { useQuery } from "@tanstack/react-query"; // Use useQuery for client-side fetching
import { Loader2 } from "lucide-react";
import * as React from "react";

import { getPatientById } from "@/actions/patients/get-by-id"; // Action to fetch data
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator"; // *** IMPORT ADDED HERE ***
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// Import the form component
import UpsertPatientForm from "../../_components/upsert-patient-form";

export default function PatientInfoTab({ patientId }: { patientId: string }) {
  // Fetch patient data client-side using React Query and the server action
  const { data: patientResult, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatientById({ patientId }),
    enabled: !!patientId, // Only run query if patientId is available
  });

  if (isLoading) {
    // Show a more detailed skeleton resembling the form structure
    return (
      <div className="space-y-6 rounded-lg border p-6 shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Separator /> {/* Now Separator is recognized */}
        <div className="flex justify-end pt-4">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (!patientResult || !patientResult.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dados Cadastrais</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            Paciente não encontrado ou erro ao carregar os dados.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render the UpsertPatientForm directly, without Dialog wrappers
  // Pass undefined for isOpen as it's not in a dialog context here
  return <UpsertPatientForm patient={patientResult.data} isOpen={undefined} />;
}
