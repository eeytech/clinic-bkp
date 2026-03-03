import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const adminApiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL;

    if (!adminApiUrl) {
      return NextResponse.json(
        { error: "Configuracao NEXT_PUBLIC_ADMIN_API_URL ausente." },
        { status: 500 },
      );
    }

    const cookie = request.headers.get("cookie");

    const upstreamResponse = await fetch(`${adminApiUrl}/api/auth/session`, {
      method: "GET",
      headers: cookie ? { Cookie: cookie } : undefined,
      cache: "no-store",
    });

    const responseBody = await upstreamResponse.text();
    const headers = new Headers();
    const contentType = upstreamResponse.headers.get("content-type");

    if (contentType) headers.set("content-type", contentType);

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao conectar com o servidor de autenticacao." },
      { status: 502 },
    );
  }
}
