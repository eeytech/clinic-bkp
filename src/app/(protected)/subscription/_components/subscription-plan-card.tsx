// src/app/(protected)/subscription/_components/subscription-plan-card.tsx

"use client";

import { loadStripe } from "@stripe/stripe-js";
import { CheckCircle2, Loader2 } from "lucide-react";
// Remover useRouter se não for mais necessário para gerenciar plano
// import { useRouter } from "next/navigation";
// *** CORREÇÃO: Importar 'useAction' do local correto ***
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

// Importar o Form do Next.js 15 (se aplicável, senão usar form normal)
// Assumindo que o projeto pode não estar no Next 15 ainda, usaremos form normal por segurança.
// import { Form } from "next/form"; // Para Next 15+
// Importar a nova action de cancelamento
import { cancelSubscriptionAction } from "@/actions/cancel-subscription";
import { createStripeCheckout } from "@/actions/create-stripe-checkout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SubscriptionPlanCardProps {
  title: string;
  description: string;
  price: number;
  interval: string;
  priceId: string;
  planType: "monthly" | "semiannual" | "annual";
  features?: string[];
  isCurrentPlan?: boolean;
  activeSubscriptionId?: string | null; // Adicionado para passar o ID da assinatura ativa
  hasActiveSubscription: boolean; // Adicionado para saber se existe alguma assinatura ativa
  userEmail: string;
  className?: string;
}

export function SubscriptionPlanCard({
  title,
  description,
  price,
  interval,
  priceId,
  planType,
  isCurrentPlan = false,
  activeSubscriptionId, // Recebe o ID da assinatura
  hasActiveSubscription, // Recebe o status geral de assinatura
  userEmail,
  className,
}: SubscriptionPlanCardProps) {
  // Remover useRouter se não for mais necessário
  // const router = useRouter();

  const createStripeCheckoutAction = useAction(createStripeCheckout, {
    onSuccess: async ({ data }) => {
      // ... (lógica existente de checkout)
      if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        throw new Error("Stripe publishable key not found");
      }
      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      );
      if (!stripe || !data?.sessionId) {
        throw new Error("Stripe or Session ID not found");
      }
      await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });
    },
    onError: (error) => {
      console.error("Stripe Checkout Error:", error);
      toast.error("Ocorreu um erro ao iniciar o checkout. Tente novamente.");
    },
  });

  // Action para cancelamento
  const cancelSubscription = useAction(cancelSubscriptionAction, {
    onSuccess: () => {
      toast.success(
        "Sua assinatura será cancelada no final do período de faturamento.",
      );
      // Revalidação já acontece na action, não precisa redirect aqui
    },
    onError: (error) => {
      console.error("Subscription Cancel Error:", error);
      toast.error(error.error.serverError || "Erro ao cancelar assinatura.");
    },
  });

  const handleSubscribeClick = () => {
    createStripeCheckoutAction.execute({ priceId, planType });
  };

  // Handler para o formulário de cancelamento
  const handleCancelSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault(); // Previne o envio padrão do formulário
    if (!activeSubscriptionId) {
      toast.error("ID da assinatura não encontrado.");
      return;
    }
    cancelSubscription.execute({ subscriptionId: activeSubscriptionId });
  };

  const R$ = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Desabilita o botão "Assinar Agora" se não for o plano atual E já existir uma assinatura ativa
  const shouldDisableSubscribe = !isCurrentPlan && hasActiveSubscription;

  return (
    <Card
      className={cn(
        "flex flex-col",
        isCurrentPlan && "border-primary ring-primary/50 ring-2",
        className,
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          {isCurrentPlan && (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              Plano Atual
            </Badge>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
        <div className="flex items-baseline whitespace-nowrap">
          <span className="text-3xl font-bold">{R$.format(price)}</span>
          <span className="ml-1 text-gray-600">/ {interval}</span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="mt-auto">
          {isCurrentPlan ? (
            // Formulário para cancelar a assinatura atual
            <form onSubmit={handleCancelSubmit}>
              {/* Input hidden para passar o ID da assinatura */}
              <input
                type="hidden"
                name="subscriptionId"
                value={activeSubscriptionId || ""}
              />
              <Button
                type="submit"
                variant="destructive" // Mudar para variante destrutiva
                className="w-full"
                disabled={
                  cancelSubscription.isExecuting || !activeSubscriptionId
                }
              >
                {cancelSubscription.isExecuting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Cancelar Assinatura
              </Button>
            </form>
          ) : (
            // Botão para assinar um novo plano
            <Button
              className="w-full"
              onClick={handleSubscribeClick}
              disabled={
                createStripeCheckoutAction.isExecuting || shouldDisableSubscribe
              } // Desabilita se houver assinatura ativa
            >
              {createStripeCheckoutAction.isExecuting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Assinar Agora
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
