"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClinicOption = {
  id: string;
  name: string;
};

interface ClinicSelectorProps {
  clinics: ClinicOption[];
  activeClinicId: string | null;
}

export function ClinicSelector({
  clinics,
  activeClinicId,
}: ClinicSelectorProps) {
  const router = useRouter();
  const [selectedClinicId, setSelectedClinicId] = useState(
    activeClinicId ?? clinics[0]?.id ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  console.log("ClinicSelector Debug - Props recebidas:", {
    clinics,
    activeClinicId,
  });

  console.log(
    "ClinicSelector Debug - selectedClinicId inicial:",
    selectedClinicId,
  );

  const handleContinue = async () => {
    console.log("ClinicSelector Debug - handleContinue chamado");
    console.log("ClinicSelector Debug - selectedClinicId:", selectedClinicId);
    if (!selectedClinicId) {
      console.warn("ClinicSelector Debug - Nenhuma clínica selecionada");
      toast.error("Selecione uma clinica.");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log(
        "ClinicSelector Debug - Enviando POST para /api/admin-auth/company-context",
      );
      const response = await fetch("/api/admin-auth/company-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ companyId: selectedClinicId }),
      });
      console.log(
        "ClinicSelector Debug - Status da resposta:",
        response.status,
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error("ClinicSelector Debug - Erro retornado pela API:", data);
        throw new Error(data.error || "Nao foi possivel alterar a clinica.");
      }
      console.log("ClinicSelector Debug - Clínica alterada com sucesso");
      console.log("ClinicSelector Debug - Redirecionando para /dashboard");
      toast.success("Clinica ativa atualizada.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("ClinicSelector Debug - Erro no handleContinue:", error);
      const message =
        error instanceof Error ? error.message : "Erro ao trocar de clinica.";
      toast.error(message);
    } finally {
      console.log("ClinicSelector Debug - Finalizando submissão");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Selecionar Clinica</CardTitle>
        <CardDescription>
          Escolha qual clinica deseja usar nesta sessao.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Clinica</Label>
          <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma clinica" />
            </SelectTrigger>
            <SelectContent>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          className="w-full"
          onClick={handleContinue}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Continuar"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
