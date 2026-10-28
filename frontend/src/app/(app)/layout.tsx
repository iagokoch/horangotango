import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { exigirUsuario } from "@/lib/auth/session";

export default function AppLayout({ children }: { children: ReactNode }) {
  const usuario = exigirUsuario();
  return <AppShell usuario={usuario}>{children}</AppShell>;
}
