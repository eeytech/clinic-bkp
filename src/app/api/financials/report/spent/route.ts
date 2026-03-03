import "dayjs/locale/pt-br";

import { format } from "date-fns";
import dayjs from "dayjs";
import { and, desc, eq, gte, lte, SQL, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

import { db } from "@/db";
import {
  clinicFinancesTable,
  clinicFinancialStatusEnum,
  clinicsTable,
} from "@/db/schema";
import { formatCurrencyInCents } from "@/helpers/currency";
import { getAuthorizedClinicContextForApi } from "@/lib/auth/clinic-context";

dayjs.locale("pt-br");

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedClinicContextForApi();
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const { clinicId, applicationId } = context;

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status") as
      | (typeof clinicFinancialStatusEnum.enumValues)[number]
      | null;

    const clinicInfo = await db.query.clinicsTable.findFirst({
      where: and(
        eq(clinicsTable.id, clinicId),
        eq(clinicsTable.applicationId, applicationId),
      ),
      columns: { name: true, cnpj: true },
    });

    const conditions: (SQL | undefined)[] = [
      eq(clinicFinancesTable.clinicId, clinicId),
      eq(clinicFinancesTable.operation, "output"),
    ];

    if (status) conditions.push(eq(clinicFinancesTable.status, status));

    const dateColumn = sql`COALESCE(${clinicFinancesTable.paymentDate}, ${clinicFinancesTable.dueDate}::timestamp, ${clinicFinancesTable.createdAt})`;
    if (from) conditions.push(gte(dateColumn, dayjs(from).startOf("day").toDate()));
    if (to) conditions.push(lte(dateColumn, dayjs(to).endOf("day").toDate()));

    const transactions = await db.query.clinicFinancesTable.findMany({
      where: and(...conditions),
      with: {
        employee: { columns: { name: true } },
        creator: { columns: { name: true } },
      },
      orderBy: desc(dateColumn),
    });

    const rows = transactions
      .map(
        (t) => `
        <tr>
            <td>${t.id}</td>
            <td>${t.typeOutput || "-"}</td>
            <td>${t.description}</td>
            <td>${t.employee?.name || "-"}</td>
            <td>${t.status}</td>
            <td>${t.paymentDate ? format(new Date(t.paymentDate), "dd/MM/yy") : t.dueDate ? format(new Date(t.dueDate), "dd/MM/yy") + " (Venc.)" : format(new Date(t.createdAt), "dd/MM/yy") + " (Criacao)"}</td>
            <td>${t.paymentMethod || "-"}</td>
            <td>${formatCurrencyInCents(t.amountInCents)}</td>
        </tr>`,
      )
      .join("");

    const totalAmount = transactions.reduce((sum, t) => sum + t.amountInCents, 0);

    const htmlContent = `
        <html>
            <head><title>Relatorio de Despesas</title>
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
                    <h1>Relatorio de Despesas</h1>
                    ${clinicInfo?.name ? `<h2>${clinicInfo.name}${clinicInfo.cnpj ? ` - ${clinicInfo.cnpj}` : ""}</h2>` : ""}
                </div>
                <div class="filter-info">
                    <p>Periodo: ${from ? dayjs(from).format("DD/MM/YYYY") : "Inicio"} ate ${to ? dayjs(to).format("DD/MM/YYYY") : "Fim"}</p>
                    ${status ? `<p>Status: ${status}</p>` : ""}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tipo</th>
                            <th>Descricao</th>
                            <th>Funcionario</th>
                            <th>Status</th>
                            <th>Data</th>
                            <th>Forma Pag.</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="total">Total Gasto no Periodo: ${formatCurrencyInCents(totalAmount)}</div>
                <div class="footer">Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm:ss")}</div>
            </body>
        </html>
    `;

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

    return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="relatorio_despesas_${dayjs().format("YYYYMMDD")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("GET Spent Report Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
