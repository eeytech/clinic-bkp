import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import LoginForm from "./components/login-form";
import SignUpForm from "./components/sign-up-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function AuthenticationPage() {
  // Verifica se já existe um cookie de sessão
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  // Se já estiver logado, manda para o dashboard direto
  if (token) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Image
            src="/logofundotransparente.png"
            alt="Doutor Agenda"
            width={300}
            height={60}
            priority
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            Bem-vindo de volta
          </h1>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Criar Conta</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          <TabsContent value="register">
            <SignUpForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
