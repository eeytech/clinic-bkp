import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ClinicSelector } from "./clinic-selector";

export default async function ClinicSelectPage() {
  const session = await auth.api.getSession();

  if (!session) {
    redirect("/authentication");
  }

  const clinics = session.user.clinics ?? [];

  if (clinics.length === 0) {
    redirect("/clinic/unavailable");
  }

  if (clinics.length === 1) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <ClinicSelector
        clinics={clinics.map((clinic) => ({ id: clinic.id, name: clinic.name }))}
        activeClinicId={session.user.activeClinicId}
      />
    </div>
  );
}
