// src/app/(protected)/subscription/page.tsx

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { auth } from "@/lib/auth";

import { SubscriptionPlanCard } from "./_components/subscription-plan-card";

const plans = [
  {
    title: "Plano Mensal",
    description: "Ideal para começar.",
    price: 249.9,
    interval: "mensalmente",
    priceId: process.env.STRIPE_MONTHLY_PLAN_PRICE_ID!,
    planType: "monthly" as const,
  },
  {
    title: "Plano Semestral",
    description: "Economize com o plano de 6 meses.",
    price: 1449.9,
    interval: "semestralmente",
    priceId: process.env.STRIPE_SEMIANNUAL_PLAN_PRICE_ID!,
    planType: "semiannual" as const,
  },
  {
    title: "Plano Anual",
    description: "O melhor custo-benefício.",
    price: 2799.9,
    interval: "anualmente",
    priceId: process.env.STRIPE_ANNUAL_PLAN_PRICE_ID!,
    planType: "annual" as const,
  },
];

const SubscriptionPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/authentication");
  }
  if (!session.user.clinic) {
    redirect("/clinic");
  }
  // Se o usuário não tem plano e não tem ID de assinatura, redireciona para nova assinatura
  if (!session.user.plan && !session.user.stripeSubscriptionId) {
    redirect("/new-subscription");
  }

  // Verifica se existe alguma assinatura ativa (baseado na existência do plan no user session)
  const hasActiveSubscription = !!session.user.plan;

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Assinatura</PageTitle>
          <PageDescription>
            Gerencie ou escolha o plano que melhor se adapta à sua clínica.
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <PageContent>
        <div className="grid w-full max-w-6xl grid-cols-1 items-stretch gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <SubscriptionPlanCard
              key={plan.planType}
              {...plan}
              isCurrentPlan={session.user.plan === plan.planType}
              activeSubscriptionId={session.user.stripeSubscriptionId} // Passa o ID da assinatura
              hasActiveSubscription={hasActiveSubscription} // Passa o status geral
              userEmail={session.user.email}
            />
          ))}
        </div>
      </PageContent>
    </PageContainer>
  );
};

export default SubscriptionPage;
