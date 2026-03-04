"use client";

import { useRouter } from "next/navigation";

import UpsertClinicForm, {
  type ClinicData,
} from "@/app/(protected)/clinic/_components/upsert-clinic-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ClinicBootstrapFormProps {
  clinicData: ClinicData;
}

export function ClinicBootstrapForm({ clinicData }: ClinicBootstrapFormProps) {
  const router = useRouter();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configurar clinica</CardTitle>
        <CardDescription>
          Complete os dados para liberar o primeiro acesso desta clinica no SaaS.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UpsertClinicForm
          clinicData={clinicData}
          onSuccess={() => {
            router.push("/dashboard");
            router.refresh();
          }}
        />
      </CardContent>
    </Card>
  );
}
