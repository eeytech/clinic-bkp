// src/actions/cancel-subscription/index.ts
"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { z } from "zod";

import { auth } from "@/lib/auth"; // Import auth configuration
import { actionClient } from "@/lib/next-safe-action";

// Schema para validar o input (subscriptionId vindo do form)
const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, "ID da assinatura é obrigatório."),
});

export const cancelSubscriptionAction = actionClient
  .schema(cancelSubscriptionSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Validação de sessão e assinatura ativa
    if (!session?.user) {
      throw new Error("Usuário não autenticado.");
    }

    // Agora TypeScript deve reconhecer stripeSubscriptionId
    if (session.user.stripeSubscriptionId !== parsedInput.subscriptionId) {
      console.error(
        "Mismatch:",
        session.user.stripeSubscriptionId,
        parsedInput.subscriptionId,
      ); // Log para debug
      throw new Error("ID da assinatura inválido ou não pertence ao usuário.");
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Chave secreta do Stripe não configurada.");
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-08-27.basil", // Use a versão da API desejada
      });

      // Cancela a assinatura no Stripe (ao final do período)
      await stripe.subscriptions.update(parsedInput.subscriptionId, {
        cancel_at_period_end: true,
      });

      // Revalida a página de assinatura para refletir a mudança no estado (cancelamento pendente)
      revalidatePath("/subscription");

      return { success: true, message: "Cancelamento solicitado." };
    } catch (error) {
      console.error("Erro ao cancelar assinatura no Stripe:", error);
      // Lança um erro que o useAction pode capturar
      throw new Error("Falha ao solicitar cancelamento da assinatura.");
    }
  });
