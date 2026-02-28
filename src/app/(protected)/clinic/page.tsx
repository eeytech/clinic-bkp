import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { auth } from "@/lib/auth";

import UpsertClinicForm from "./_components/upsert-clinic-form";

const ClinicFormPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }
  if (!session.user.plan) {
    redirect("/new-subscription");
  }
  if (session.user.clinic) {
    redirect("/dashboard");
  }

  return (
    <div>
      <Dialog open>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Cadastrar sua Clínica</DialogTitle>
            <DialogDescription>
              Preencha as informações da sua clínica para começar a usar o
              sistema.
            </DialogDescription>
          </DialogHeader>
          <UpsertClinicForm clinicData={null} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClinicFormPage;
