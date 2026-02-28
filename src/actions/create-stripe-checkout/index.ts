// src/actions/create-stripe-checkout/index.ts
"use server";

import { headers } from "next/headers";
import Stripe from "stripe";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

export const createStripeCheckout = actionClient
  .schema(
    z.object({
      priceId: z.string(),
      planType: z.enum(["monthly", "semiannual", "annual"]),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe secret key not found");
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    });
    const { id: sessionId } = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`, // Retorna para a página de assinatura em caso de cancelamento
      subscription_data: {
        metadata: {
          userId: session.user.id, // Adiciona o ID do usuário nos metadados
          planType: parsedInput.planType, // Adiciona o tipo de plano nos metadados
        },
      },
      line_items: [
        {
          price: parsedInput.priceId, // Usa o Price ID recebido
          quantity: 1,
        },
      ],
      // Associar o checkout ao customerId, se já existir
      customer: session.user.stripeCustomerId || undefined,
      // Se não existir customerId, Stripe criará um novo.
      // Podemos passar o email para pré-preencher ou associar a um customer existente pelo email.
      customer_email: !session.user.stripeCustomerId
        ? session.user.email
        : undefined,
    });
    return {
      sessionId,
    };
  });
