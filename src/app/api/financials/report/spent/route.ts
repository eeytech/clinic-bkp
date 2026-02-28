// src/app/api/financials/report/spent/route.ts
import "dayjs/locale/pt-br";

import { format } from "date-fns"; // Import format from date-fns
import dayjs from "dayjs";
import { and, desc, eq, gte, lte, SQL, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

import { db } from "@/db";
// *** CORREÇÃO: Importar clinicsTable ***
import {
  clinicFinancesTable,
  clinicFinancialStatusEnum,
  clinicsTable,
} from "@/db/schema";
// *** FIM DA CORREÇÃO ***
import { formatCurrencyInCents } from "@/helpers/currency";
import { auth } from "@/lib/auth";

dayjs.locale("pt-br");

// Define the expected context type for Route Handlers
interface RouteContext {
  params: Promise<{ id: string }>; // Wrap params in a Promise
}

export async function GET(request: NextRequest) {
  // Use NextRequest for searchParams
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.clinic?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = session.user.clinic.id;

    // Use request.nextUrl.searchParams instead of new URL(request.url)
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status") as
      | (typeof clinicFinancialStatusEnum.enumValues)[number]
      | null;

    // --- Fetch Clinic Info ---
    const clinicInfo = await db.query.clinicsTable.findFirst({
      where: eq(clinicsTable.id, clinicId), // Now clinicsTable is defined
      columns: { name: true, cnpj: true },
    });

    // --- Build Query ---
    const conditions: (SQL | undefined)[] = [
      eq(clinicFinancesTable.clinicId, clinicId),
      eq(clinicFinancesTable.operation, "output"), // Specific to 'spent' report
    ];
    if (status) conditions.push(eq(clinicFinancesTable.status, status));

    // Date filtering (COALESCE paymentDate, dueDate, createdAt)
    const dateColumn = sql`COALESCE(${clinicFinancesTable.paymentDate}, ${clinicFinancesTable.dueDate}::timestamp, ${clinicFinancesTable.createdAt})`;
    if (from)
      conditions.push(gte(dateColumn, dayjs(from).startOf("day").toDate()));
    if (to) conditions.push(lte(dateColumn, dayjs(to).endOf("day").toDate()));

    const transactions = await db.query.clinicFinancesTable.findMany({
      where: and(...conditions),
      with: {
        employee: { columns: { name: true } },
        creator: { columns: { name: true } },
      },
      orderBy: desc(dateColumn), // Order by the relevant date
    });

    // --- Generate HTML ---
    const generateTableRows = () =>
      transactions
        .map(
          (t) => `
        <tr>
            <td>${t.id}</td>
            <td>${t.typeOutput || "-"}</td>
            <td>${t.description}</td>
             <td>${t.employee?.name || "-"}</td>
             <td>${t.status}</td>
             <td>${t.paymentDate ? format(new Date(t.paymentDate), "dd/MM/yy") : t.dueDate ? format(new Date(t.dueDate), "dd/MM/yy") + " (Venc.)" : format(new Date(t.createdAt), "dd/MM/yy") + " (Criação)"}</td>
             <td>${t.paymentMethod || "-"}</td>
            <td>${formatCurrencyInCents(t.amountInCents)}</td>
        </tr>`,
        )
        .join("");

    const totalAmount = transactions.reduce(
      (sum, t) => sum + t.amountInCents,
      0,
    );

    const htmlContent = `
        <html>
            <head><title>Relatório de Despesas</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; font-size: 10px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .filter-info { margin-bottom: 15px; font-size: 9px; color: #555; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 20px;}
                    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .total { font-weight: bold; margin-top: 10px; text-align: right;}
                    .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #777; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Relatório de Despesas</h1>
                     ${clinicInfo?.name ? `<h2>${clinicInfo.name}${clinicInfo.cnpj ? ` - ${clinicInfo.cnpj}` : ""}</h2>` : ""}
                </div>
                 <div class="filter-info">
                    <p>Período: ${from ? dayjs(from).format("DD/MM/YYYY") : "Início"} até ${to ? dayjs(to).format("DD/MM/YYYY") : "Fim"}</p>
                     ${status ? `<p>Status: ${status}</p>` : ""}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tipo</th>
                            <th>Descrição</th>
                            <th>Funcionário</th>
                             <th>Status</th>
                             <th>Data</th>
                             <th>Forma Pag.</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateTableRows()}
                    </tbody>
                </table>
                <div class="total">
                    Total Gasto no Período: ${formatCurrencyInCents(totalAmount)}
                </div>
                <div class="footer">Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm:ss")}</div>
            </body>
        </html>
    `;

    // --- Generate PDF ---
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });
    await browser.close();

    // --- Return PDF ---
    return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="relatorio_despesas_${dayjs().format("YYYYMMDD")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("GET Spent Report Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
