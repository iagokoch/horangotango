import { redirect } from "next/navigation";

import { obterSessao } from "@/lib/auth/session";
import { ROTAS } from "@/lib/rotas";

export default function Inicio() {
  redirect(obterSessao() ? ROTAS.painel : ROTAS.login);
}
