// src/app/(protected)/financials/_components/finance-card.tsx
import { LucideIcon, Printer } from "lucide-react"; // Import Printer icon

import { Button } from "@/components/ui/button"; // Import Button
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyInCents } from "@/helpers/currency";
import { cn } from "@/lib/utils";

interface FinanceCardProps {
  title: string;
  amountInCents: number;
  icon: LucideIcon;
  variant?: "default" | "destructive" | "success" | "warning";
  onPrint?: () => void; // Add optional print handler
}

export default function FinanceCard({
  title,
  amountInCents,
  icon: Icon,
  variant = "default",
  onPrint,
}: FinanceCardProps) {
  const amount = amountInCents; // Already in cents

  const colorClasses = {
    default: "",
    destructive: "text-destructive",
    success: "text-green-600",
    warning: "text-amber-600",
  };

  return (
    <Card className="relative">
      {" "}
      {/* Added relative positioning */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", colorClasses[variant])}>
          {formatCurrencyInCents(amount)}
        </div>
        {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
      </CardContent>
      {/* Print Button - positioned absolutely */}
      {onPrint && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-accent absolute right-1 bottom-1 h-6 w-6"
          onClick={onPrint}
          title={`Imprimir Relatório - ${title}`}
        >
          <Printer className="h-4 w-4" />
        </Button>
      )}
    </Card>
  );
}
