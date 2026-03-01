import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const adminApiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL;

    if (!adminApiUrl) {
      return NextResponse.json(
        { error: "Configuração NEXT_PUBLIC_ADMIN_API_URL ausente." },
        { status: 500 },
      );
    }

    const body = await request.text();

    const upstreamResponse = await fetch(`${adminApiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });

    const responseBody = await upstreamResponse.text();
    const headers = new Headers();
    const contentType = upstreamResponse.headers.get("content-type");
    const setCookie = upstreamResponse.headers.get("set-cookie");

    if (contentType) headers.set("content-type", contentType);
    if (setCookie) headers.set("set-cookie", setCookie);

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao conectar com o servidor de autenticação." },
      { status: 502 },
    );
  }
}
