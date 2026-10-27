import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { listarFerramentas } from "@/features/ferramentas/api";
import { ToolForm } from "@/features/ferramentas/components/tool-form";
import { carregar } from "@/lib/api/server";
import { exigirStaff } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cadastrar ferramenta" };

export default async function NovaFerramentaPage() {
  exigirStaff();
  // As categorias existentes alimentam a sugestão do campo. Se a consulta falhar, o cadastro
  // continua possível, só sem sugestões.
  const ferramentas = await carregar(() => listarFerramentas());
  const categorias = ferramentas.ok
    ? Array.from(new Set(ferramentas.data.map((f) => f.categoria))).sort((a, b) => a.localeCompare(b, "pt-BR"))
    : [];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Cadastrar ferramenta"
        description="Toda ferramenta nova entra no acervo como disponível para retirada."
      />
      <ToolForm categoriasExistentes={categorias} />
    </div>
  );
}
