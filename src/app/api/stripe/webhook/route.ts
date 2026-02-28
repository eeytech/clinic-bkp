// src/app/api/stripe/webhook/route.ts
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { db } from "@/db";
import { usersTable } from "@/db/schema";

export const POST = async (request: Request) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe keys not configured.");
    return NextResponse.json(
      { error: "Stripe configuration error" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.error("Stripe signature missing.");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const text = await request.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil", // Use a versão desejada
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      text,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`⚠️ Webhook signature verification failed: ${errorMessage}`);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 },
    );
  }

  // Handle the event
  switch (event.type) {
    // --- NOVO HANDLER ---
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`Processing checkout.session.completed event: ${session.id}`);

      // Certifique-se de que a sessão está no modo de assinatura
      if (session.mode !== "subscription") {
        console.log(
          `Ignoring checkout.session.completed event for non-subscription mode: ${session.id}`,
        );
        break;
      }

      const subscriptionId = session.subscription;
      const customerId = session.customer;

      if (
        typeof subscriptionId !== "string" ||
        typeof customerId !== "string"
      ) {
        console.error(
          `Webhook checkout.session.completed: Missing subscriptionId or customerId for session ${session.id}`,
        );
        break;
      }

      let metadata: { userId?: string; planType?: string } | null = null;
      try {
        console.log(`Fetching subscription object: ${subscriptionId}`);
        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        metadata = subscription.metadata;
        console.log("Subscription metadata:", metadata);
      } catch (subError) {
        console.error(
          `Webhook checkout.session.completed: Failed to retrieve subscription ${subscriptionId}`,
          subError,
        );
        break; // Não pode continuar sem metadados
      }

      const userId = metadata?.userId;
      const planType = metadata?.planType;

      if (!userId || !planType) {
        console.error(
          `Webhook checkout.session.completed: Missing userId or planType in metadata for subscription ${subscriptionId}`,
        );
        break;
      }

      try {
        console.log(
          `Updating user ${userId} from checkout.session.completed with plan ${planType}`,
        );
        await db
          .update(usersTable)
          .set({
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId,
            plan: planType,
          })
          .where(eq(usersTable.id, userId));
        console.log(
          `Successfully updated user ${userId} with plan ${planType}, subscription ${subscriptionId}, customer ${customerId} from checkout session.`,
        );
      } catch (dbError) {
        console.error(
          `Webhook checkout.session.completed: DB update failed for user ${userId}`,
          dbError,
        );
      }
      break;
    }
    // --- FIM DO NOVO HANDLER ---

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`Processing invoice.paid event: ${invoice.id}`);

      // Adiciona verificação para ignorar se for a primeira fatura (já tratada por checkout.session.completed)
      if (invoice.billing_reason === "subscription_create") {
        console.log(
          `Ignoring invoice.paid for subscription creation (handled by checkout.session.completed): ${invoice.id}`,
        );
        break;
      }

      let customerId: string | null = null;
      if (typeof invoice.customer === "string") {
        customerId = invoice.customer;
      } else if (typeof invoice.customer === "object" && invoice.customer?.id) {
        customerId = invoice.customer.id;
      }

      let subscriptionId: string | null = null;
      const invoiceSubscription = (invoice as any).subscription;
      if (typeof invoiceSubscription === "string") {
        subscriptionId = invoiceSubscription;
      } else if (
        typeof invoiceSubscription === "object" &&
        invoiceSubscription?.id
      ) {
        subscriptionId = invoiceSubscription.id;
      }

      if (!subscriptionId && invoice.lines?.data?.length > 0) {
        const subscriptionLineItem = invoice.lines.data.find(
          (item) => item.subscription,
        );
        if (subscriptionLineItem?.subscription) {
          if (typeof subscriptionLineItem.subscription === "string") {
            subscriptionId = subscriptionLineItem.subscription;
          } else if (
            typeof subscriptionLineItem.subscription === "object" &&
            subscriptionLineItem.subscription.id
          ) {
            subscriptionId = subscriptionLineItem.subscription.id;
          }
        }
      }

      console.log(`Customer ID found: ${customerId}`);
      console.log(`Subscription ID found: ${subscriptionId}`);

      let metadata: { userId?: string; planType?: string } | null = null;
      if (typeof subscriptionId === "string") {
        try {
          console.log(`Fetching subscription object: ${subscriptionId}`);
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          metadata = subscription.metadata;
          console.log("Subscription metadata:", metadata);
          if (!customerId && typeof subscription.customer === "string") {
            customerId = subscription.customer;
            console.log(
              `Customer ID retrieved from subscription object: ${customerId}`,
            );
          }
        } catch (subError) {
          console.error(
            `Webhook invoice.paid: Failed to retrieve subscription ${subscriptionId}`,
            subError,
          );
          metadata = null;
        }
      } else {
        console.warn(
          `Webhook invoice.paid: subscriptionId not found or not a string for invoice ${invoice.id}. Cannot fetch metadata.`,
        );
      }

      const userId = metadata?.userId;
      const planType = metadata?.planType;

      // Para invoice.paid (renovações), userId e planType são importantes, mas talvez menos críticos se o usuário já tiver dados.
      // O customerId e subscriptionId são essenciais.
      if (!customerId || !subscriptionId) {
        console.error(
          "Webhook invoice.paid: Missing customerId or subscriptionId.",
          {
            invoiceId: invoice.id,
            customerId: customerId ?? "missing",
            subscriptionId: subscriptionId ?? "missing",
          },
        );
        break;
      }

      // Tenta atualizar mesmo sem userId/planType nos metadados (para cobrir casos de renovação onde metadados podem não estar presentes)
      // Idealmente, os metadados deveriam estar sempre lá.
      if (!userId) {
        console.warn(
          `Webhook invoice.paid: userId missing in metadata for subscription ${subscriptionId}. Attempting update using customerId.`,
        );
        try {
          // Busca o usuário pelo customerId
          const user = await db.query.usersTable.findFirst({
            where: eq(usersTable.stripeCustomerId, customerId),
            columns: { id: true, plan: true }, // Pega o plano atual
          });

          if (user) {
            // Atualiza apenas os IDs do Stripe se o plano já existir (renovação)
            // Se o plano não existir mas o planType foi encontrado, atualiza tudo
            const updateData: Partial<typeof usersTable.$inferInsert> = {
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
            };
            if (!user.plan && planType) {
              updateData.plan = planType; // Atualiza o plano se estava faltando
              console.log(
                `Updating plan for user ${user.id} to ${planType} based on invoice.paid event.`,
              );
            }
            await db
              .update(usersTable)
              .set(updateData)
              .where(eq(usersTable.id, user.id));
            console.log(
              `Successfully updated user ${user.id} (found via customerId) from invoice.paid.`,
            );
          } else {
            console.error(
              `Webhook invoice.paid: Could not find user with customerId ${customerId}.`,
            );
          }
        } catch (dbError) {
          console.error(
            `Webhook invoice.paid: DB update failed for customer ${customerId}`,
            dbError,
          );
        }
      } else if (userId && planType) {
        // Fluxo normal com metadados
        try {
          console.log(
            `Updating user ${userId} from invoice.paid with plan ${planType}`,
          );
          await db
            .update(usersTable)
            .set({
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
              plan: planType,
            })
            .where(eq(usersTable.id, userId));
          console.log(
            `Successfully updated user ${userId} with plan ${planType}, subscription ${subscriptionId}, customer ${customerId} from invoice.paid.`,
          );
        } catch (dbError) {
          console.error(
            `Webhook invoice.paid: DB update failed for user ${userId}`,
            dbError,
          );
        }
      } else {
        console.warn(
          `Webhook invoice.paid: Missing planType in metadata for user ${userId}, subscription ${subscriptionId}. Updating IDs only.`,
        );
        // Atualiza apenas os IDs se o planType estiver faltando
        try {
          await db
            .update(usersTable)
            .set({
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
            })
            .where(eq(usersTable.id, userId!)); // userId deve existir neste ponto
          console.log(
            `Successfully updated Stripe IDs for user ${userId} from invoice.paid (planType missing).`,
          );
        } catch (dbError) {
          console.error(
            `Webhook invoice.paid: DB update failed (IDs only) for user ${userId}`,
            dbError,
          );
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      console.log(
        `Processing customer.subscription.deleted event for subscription: ${subscription.id}, User ID from metadata: ${userId}`,
      );

      if (!userId) {
        const customerId = subscription.customer;
        if (typeof customerId === "string") {
          console.warn(
            `Webhook customer.subscription.deleted: userId missing in metadata for subscription ${subscription.id}. Attempting lookup by customerId ${customerId}.`,
          );
          try {
            const user = await db.query.usersTable.findFirst({
              where: eq(usersTable.stripeCustomerId, customerId),
              columns: { id: true },
            });
            if (user) {
              await db
                .update(usersTable)
                .set({
                  stripeSubscriptionId: null,
                  plan: null,
                })
                .where(eq(usersTable.id, user.id));
              console.log(
                `Updated user ${user.id} (found via customerId ${customerId}) - subscription cancelled.`,
              );
            } else {
              console.error(
                `Webhook customer.subscription.deleted: Could not find user with customerId ${customerId}.`,
              );
            }
          } catch (dbError) {
            console.error(
              `Webhook customer.subscription.deleted: DB update failed for customer ${customerId}`,
              dbError,
            );
          }
        } else {
          console.error(
            `Webhook customer.subscription.deleted: Missing userId in metadata and invalid customerId for subscription ${subscription.id}.`,
          );
        }
        break;
      }

      try {
        await db
          .update(usersTable)
          .set({
            stripeSubscriptionId: null,
            plan: null,
          })
          .where(eq(usersTable.id, userId));
        console.log(`Updated user ${userId} - subscription cancelled.`);
      } catch (dbError) {
        console.error(
          `Webhook customer.subscription.deleted: DB update failed for user ${userId}`,
          dbError,
        );
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(
        `Processing customer.subscription.updated event for subscription: ${subscription.id}`,
      );

      const userId = subscription.metadata?.userId;
      const planType =
        subscription.metadata?.planType ||
        (subscription.items.data[0]?.price?.metadata?.planType as
          | string
          | undefined);
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      console.log(
        `Subscription ${subscription.id} updated. Status: ${subscription.status}, Cancel at period end: ${subscription.cancel_at_period_end}. Metadata:`,
        subscription.metadata,
        `Plan Type from item: ${planType}`,
      );

      if (userId) {
        try {
          const updateData: Partial<typeof usersTable.$inferInsert> = {
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: customerId,
          };

          if (
            planType &&
            (subscription.status === "active" ||
              subscription.status === "trialing")
          ) {
            updateData.plan = planType;
          }

          if (
            subscription.status === "canceled" ||
            subscription.cancel_at_period_end
          ) {
            // Se cancel_at_period_end = true, não limpamos o plano aqui.
            // O plano será limpo quando o evento 'customer.subscription.deleted' for recebido no final do período.
            if (subscription.status === "canceled") {
              // Cancelamento imediato
              updateData.plan = null;
              updateData.stripeSubscriptionId = null; // Assinatura não existe mais
            }
          }

          await db
            .update(usersTable)
            .set(updateData)
            .where(eq(usersTable.id, userId));
          console.log(
            `User ${userId} updated for subscription ${subscription.id}. Plan: ${updateData.plan ?? "unchanged/cleared"}. Cancel at end: ${subscription.cancel_at_period_end}`,
          );
        } catch (dbError) {
          console.error(
            `Webhook customer.subscription.updated: DB update failed for user ${userId}`,
            dbError,
          );
        }
      } else {
        console.warn(
          `Webhook customer.subscription.updated: Missing userId in metadata for updated subscription ${subscription.id}.`,
        );
      }
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
};
