"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignUpForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criação de Conta</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          A criação de novos usuários é gerenciada centralmente pelo
          administrador do sistema.
        </p>
      </CardContent>
    </Card>
  );
}
