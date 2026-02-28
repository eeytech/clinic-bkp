// src/app/(protected)/patients/[patientId]/_components/odontogram-tab.tsx
"use client";

import OdontogramCanvas from "@/app/(protected)/patients/_components/odontogram/odontogram-canvas";
import { OdontogramProvider } from "@/app/(protected)/patients/_components/odontogram/odontogram-context";
import OdontogramHistory from "@/app/(protected)/patients/_components/odontogram/odontogram-history";
import { doctorsTable } from "@/db/schema";

type Doctor = Pick<
  typeof doctorsTable.$inferSelect,
  "id" | "name" | "specialties"
>;
interface OdontogramTabProps {
  patientId: string;
  doctors: Doctor[];
}

export default function OdontogramTab({
  patientId,
  doctors,
}: OdontogramTabProps) {
  return (
    <OdontogramProvider patientId={patientId} doctors={doctors}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <OdontogramCanvas />
        </div>
        <div className="xl:col-span-1">
          <OdontogramHistory />
        </div>
      </div>
    </OdontogramProvider>
  );
}
