// src/app/(protected)/clinic/_components/user-management.tsx
"use client";

import { useAction } from "next-safe-action/hooks";
import { addUserToClinic } from "@/actions/clinic/manage-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, UserPlus, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addUserToClinicSchema,
  AddUserToClinicSchema,
} from "@/actions/clinic/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

export function UserManagement() {
  const form = useForm<AddUserToClinicSchema>({
    resolver: zodResolver(addUserToClinicSchema),
    defaultValues: { email: "" },
  });

  const { execute, isPending } = useAction(addUserToClinic, {
    onSuccess: () => {
      toast.success("Usuário vinculado com sucesso!");
      form.reset();
    },
    onError: () => toast.error("Erro ao vincular usuário."),
  });

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <UserPlus className="size-5" />
          Gestão de Colaboradores
        </h3>
        <p className="text-muted-foreground text-sm">
          Adicione o e-mail dos colaboradores que já estão cadastrados no
          sistema central.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(execute)} className="flex gap-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                    <Input
                      placeholder="email@exemplo.com"
                      className="pl-9"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : "Vincular"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
