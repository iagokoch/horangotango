import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar" };

interface LoginPageProps {
  searchParams: { next?: string; motivo?: string; email?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return <LoginForm destino={searchParams.next} motivo={searchParams.motivo} emailInicial={searchParams.email} />;
}
