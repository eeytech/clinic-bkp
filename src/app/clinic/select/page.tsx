import { redirect } from "next/navigation";

import type { ClinicData } from "@/app/(protected)/clinic/_components/upsert-clinic-form";
import { auth } from "@/lib/auth";
import { ClinicBootstrapForm } from "./clinic-bootstrap-form";
import { ClinicSelector } from "./clinic-selector";

const createBootstrapClinicData = (input: {
  id: string;
  name: string;
}): ClinicData => ({
  id: input.id,
  name: input.name,
  cnpj: null,
  stateBusinessRegistration: null,
  responsibleName: "",
  croResponsavel: "",
  paymentMethods: [],
  logoUrl: null,
  observations: null,
  phone: null,
  whatsApp: null,
  email: null,
  website: null,
  addressStreet: "",
  addressNumber: "",
  addressComplement: null,
  addressNeighborhood: "",
  addressCity: "",
  addressState: "SP",
  addressZipcode: "",
});

export default async function ClinicSelectPage() {
  console.log("ClinicSelectPage Debug - Iniciando render");

  const session = await auth.api.getSession();
  console.log("ClinicSelectPage Debug - Session:", session);

  if (!session) {
    console.warn(
      "ClinicSelectPage Debug - Sessao inexistente, redirecionando para /authentication",
    );
    redirect("/authentication");
  }

  const clinics = session.user.clinics ?? [];
  const companies = session.user.companies ?? [];
  const activeCompanyId =
    session.user.activeCompanyId ?? session.user.activeClinicId;
  const activeLocalClinic = activeCompanyId
    ? clinics.find((clinic) => clinic.id === activeCompanyId)
    : null;

  console.log("ClinicSelectPage Debug - Clinicas encontradas:", {
    count: clinics.length,
    clinics,
    activeClinicId: session.user.activeClinicId,
    activeCompanyId,
    isApplicationAdmin: session.user.isApplicationAdmin,
  });

  if (!activeLocalClinic) {
    if (session.user.isApplicationAdmin && activeCompanyId) {
      const companyFromToken = companies.find(
        (company) => company.id === activeCompanyId,
      );

      const bootstrapClinicData = createBootstrapClinicData({
        id: activeCompanyId,
        name: companyFromToken?.name ?? "Nova Clinica",
      });

      return (
        <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center bg-slate-50 p-4">
          <ClinicBootstrapForm clinicData={bootstrapClinicData} />
        </div>
      );
    }

    console.warn(
      "ClinicSelectPage Debug - Clinica ativa nao encontrada localmente, redirecionando para /clinic/unavailable",
    );
    redirect("/clinic/unavailable");
  }

  if (clinics.length === 1) {
    console.log(
      "ClinicSelectPage Debug - Apenas uma clinica local, redirecionando para /dashboard",
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
