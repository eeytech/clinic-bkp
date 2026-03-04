import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ClinicSelector } from "./clinic-selector";

export default async function ClinicSelectPage() {
  console.log("ClinicSelectPage Debug - Iniciando render");
  const session = await auth.api.getSession();
  console.log("ClinicSelectPage Debug - Session:", session);
  if (!session) {
    console.warn(
      "ClinicSelectPage Debug - Sessão inexistente, redirecionando para /authentication",
    );
    redirect("/authentication");
  }

  const clinics = session.user.clinics ?? [];
  console.log("ClinicSelectPage Debug - Clínicas encontradas:", {
    count: clinics.length,
    clinics,
    activeClinicId: session.user.activeClinicId,
  });

  if (clinics.length === 0) {
    console.warn(
      "ClinicSelectPage Debug - Nenhuma clínica disponível, redirecionando para /clinic/unavailable",
    );
    redirect("/clinic/unavailable");
  }

  if (clinics.length === 1) {
    console.log(
      "ClinicSelectPage Debug - Apenas uma clínica, redirecionando para /dashboard",
    );
    redirect("/dashboard");
  }
  console.log("ClinicSelectPage Debug - Renderizando ClinicSelector");
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <ClinicSelector
        clinics={clinics.map((clinic) => ({
          id: clinic.id,
          name: clinic.name,
        }))}
        activeClinicId={session.user.activeClinicId}
      />
    </div>
  );
}
