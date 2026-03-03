import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function ClinicUnavailablePage() {
  const session = await auth.api.getSession();

  if (!session) {
    redirect("/authentication");
  }

  if (session.user.clinics?.length) {
    redirect("/clinic/select");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Acesso bloqueado</CardTitle>
          <CardDescription>
            Sua conta nao esta vinculada a nenhuma clinica.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          O vinculo deve ser realizado no sistema administrativo da Eeytech.
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/authentication">Voltar para login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
