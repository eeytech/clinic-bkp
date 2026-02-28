// src/app/(protected)/patients/[patientId]/_components/certificates-tab.tsx
"use client";

import { Plus } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { doctorsTable } from "@/db/schema"; // Import doctorsTable type

type Doctor = Pick<
  typeof doctorsTable.$inferSelect,
  "id" | "name" | "specialties"
>;

interface CertificatesTabProps {
  patientId: string;
  doctors: Doctor[]; // Added doctors prop
}

export default function CertificatesTab({
  patientId,
  doctors,
}: CertificatesTabProps) {
  // Placeholder: Fetch certificates data here using useQuery or similar
  const isLoading = false; // Replace with actual loading state
  const certificates: any[] = []; // Replace with actual certificates data

  // Placeholder: Add state and handlers for upsert dialog

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Atestados</CardTitle>
        <Button size="sm" disabled>
          {" "}
          {/* Placeholder button */}
          <Plus className="mr-2 h-4 w-4" />
          Novo Atestado (Em breve)
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : certificates.length === 0 ? (
          <p className="text-muted-foreground">Nenhum atestado encontrado.</p>
        ) : (
          <div className="space-y-2">
            {/* Placeholder: List certificates here */}
            <p className="text-muted-foreground italic">
              (Lista de atestados aparecerá aqui)
            </p>
          </div>
        )}
        {/* Placeholder: Add Dialog for UpsertCertificateForm */}
      </CardContent>
    </Card>
  );
}
