// src/app/(protected)/patients/[patientId]/_components/documents-tab.tsx
"use client";

import { Plus } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

interface DocumentsTabProps {
  patientId: string;
}

export default function DocumentsTab({ patientId }: DocumentsTabProps) {
  // Placeholder: Fetch documents data here using useQuery or similar
  const isLoading = false; // Replace with actual loading state
  const documents: any[] = []; // Replace with actual documents data

  // Placeholder: Add state and handlers for upsert dialog

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Documentos</CardTitle>
        <Button size="sm" disabled>
          {" "}
          {/* Placeholder button */}
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Documento (Em breve)
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-muted-foreground">Nenhum documento encontrado.</p>
        ) : (
          <div className="space-y-2">
            {/* Placeholder: List documents here */}
            <p className="text-muted-foreground italic">
              (Lista de documentos aparecerá aqui)
            </p>
          </div>
        )}
        {/* Placeholder: Add Dialog for UpsertDocumentForm */}
      </CardContent>
    </Card>
  );
}
