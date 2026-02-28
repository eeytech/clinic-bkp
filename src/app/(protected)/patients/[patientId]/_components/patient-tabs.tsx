// src/app/(protected)/patients/[patientId]/_components/patient-tabs.tsx
"use client";

import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { doctorsTable } from "@/db/schema";

// Lazy imports for better performance
const PatientInfoTab = React.lazy(() => import("./patient-info-tab"));
const OdontogramTab = React.lazy(() => import("./odontogram-tab"));
const AnamnesisTab = React.lazy(() => import("./anamnesis-tab"));
const FinancialsTab = React.lazy(() => import("./financials-tab")); // Nova Aba
const DocumentsTab = React.lazy(() => import("./documents-tab")); // Nova Aba
const PrescriptionsTab = React.lazy(() => import("./prescriptions-tab")); // Nova Aba
const CertificatesTab = React.lazy(() => import("./certificates-tab")); // Nova Aba

type Doctor = Pick<
  typeof doctorsTable.$inferSelect,
  "id" | "name" | "specialties"
>;

interface PatientTabsProps {
  patientId: string;
  doctors: Doctor[];
}

export function PatientTabs({ patientId, doctors }: PatientTabsProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "info";

  return (
    <Tabs defaultValue={defaultTab} className="mt-4 w-full">
      <TabsList className="bg-background sticky top-0 z-10 w-full justify-start overflow-x-auto px-1 sm:justify-center sm:px-4">
        <TabsTrigger value="info">Dados Cadastrais</TabsTrigger>
        <TabsTrigger value="financials">Financeiro</TabsTrigger>{" "}
        {/* Nova Aba */}
        <TabsTrigger value="odontogram">Odontograma</TabsTrigger>
        <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
        <TabsTrigger value="prescriptions">Receitas</TabsTrigger>{" "}
        {/* Nova Aba */}
        <TabsTrigger value="certificates">Atestados</TabsTrigger>{" "}
        {/* Nova Aba */}
        <TabsTrigger value="documents">Documentos</TabsTrigger> {/* Nova Aba */}
        <TabsTrigger value="history" disabled>
          {" "}
          {/* Mantida desabilitada por enquanto */}
          Histórico
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
          <PatientInfoTab patientId={patientId} />
        </Suspense>
      </TabsContent>

      <TabsContent value="financials">
        <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
          <FinancialsTab patientId={patientId} />
        </Suspense>
      </TabsContent>

      <TabsContent value="odontogram">
        <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
          <OdontogramTab patientId={patientId} doctors={doctors} />
        </Suspense>
      </TabsContent>

      <TabsContent value="anamnese">
        <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
          <AnamnesisTab patientId={patientId} />
        </Suspense>
      </TabsContent>

      <TabsContent value="prescriptions">
        <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
          <PrescriptionsTab patientId={patientId} doctors={doctors} />
        </Suspense>
      </TabsContent>

      <TabsContent value="certificates">
        <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
          <CertificatesTab patientId={patientId} doctors={doctors} />
        </Suspense>
      </TabsContent>

      <TabsContent value="documents">
        <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
          <DocumentsTab patientId={patientId} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
