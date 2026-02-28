// src/app/(protected)/patients/[patientId]/_components/prescriptions-tab.tsx
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

interface PrescriptionsTabProps {
  patientId: string;
  doctors: Doctor[]; // Added doctors prop
}

export default function PrescriptionsTab({
  patientId,
  doctors,
}: PrescriptionsTabProps) {
  // Placeholder: Fetch prescriptions data here using useQuery or similar
  const isLoading = false; // Replace with actual loading state
  const prescriptions: any[] = []; // Replace with actual prescriptions data

  // Placeholder: Add state and handlers for upsert dialog

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Receitas</CardTitle>
        <Button size="sm" disabled>
          {" "}
          {/* Placeholder button */}
          <Plus className="mr-2 h-4 w-4" />
          Nova Receita (Em breve)
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : prescriptions.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma receita encontrada.</p>
        ) : (
          <div className="space-y-2">
            {/* Placeholder: List prescriptions here */}
            <p className="text-muted-foreground italic">
              (Lista de receitas aparecerá aqui)
            </p>
          </div>
        )}
        {/* Placeholder: Add Dialog for UpsertPrescriptionForm */}
      </CardContent>
    </Card>
  );
}
