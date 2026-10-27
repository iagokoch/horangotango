import { NETWORK_ERROR_STATUS, type ActionError } from "./errors";

export interface DescricaoErro {
  titulo: string;
  motivo: string;
  orientacao: string;
}

type ContextoErro = Partial<Record<number, Partial<DescricaoErro>>>;

// Tradução de status HTTP para a linguagem de quem opera o balcão. A mensagem da API é mantida
// como motivo quando é específica (400, 409, 422): é ela que diz o que corrigir. O contexto de
// cada tela pode sobrescrever qualquer status.
export function descreverErro(
  erro: Pick<ActionError, "status" | "message">,
  titulo: string,
  contexto: ContextoErro = {},
): DescricaoErro {
  const base = descricaoPadrao(erro);
  return { titulo, ...base, ...contexto[erro.status] };
}

function descricaoPadrao({ status, message }: Pick<ActionError, "status" | "message">): Omit<DescricaoErro, "titulo"> {
  switch (status) {
    case NETWORK_ERROR_STATUS:
      return {
        motivo: "O servidor da API não respondeu. A conexão pode estar indisponível.",
        orientacao: "Verifique se o backend está em execução e tente novamente.",
      };
    case 400:
      return { motivo: message, orientacao: "Corrija os dados destacados e envie novamente." };
    case 401:
      return { motivo: "Sua sessão expirou.", orientacao: "Entre novamente para continuar." };
    case 403:
      return {
        motivo: "Seu perfil não tem permissão para esta operação.",
        orientacao: "Se você precisa deste acesso, procure o responsável pela oficina.",
      };
    case 404:
      return { motivo: message, orientacao: "Confira o identificador informado." };
    case 409:
      return { motivo: message, orientacao: "A situação mudou desde a última consulta. Atualize e confira." };
    case 422:
      return { motivo: message, orientacao: "Complete as informações exigidas e confirme novamente." };
    default:
      return {
        motivo: "O servidor encontrou um problema inesperado.",
        orientacao: "Tente novamente. Se continuar, avise o responsável pelo sistema.",
      };
  }
}

// O backend devolve erros de Bean Validation como "campo: mensagem". Os que correspondem a um
// campo do formulário aparecem junto dele; os demais ficam no bloco de erro geral.
export function errosDeCampo<C extends string>(
  detalhes: string[],
  campos: readonly C[],
): { campo: C; mensagem: string }[] {
  const encontrados: { campo: C; mensagem: string }[] = [];
  for (const detalhe of detalhes) {
    const separador = detalhe.indexOf(":");
    if (separador < 0) continue;
    const nome = detalhe.slice(0, separador).trim();
    const campo = campos.find((candidato) => candidato === nome);
    const mensagem = detalhe.slice(separador + 1).trim();
    if (campo && mensagem) {
      encontrados.push({ campo, mensagem: mensagem.charAt(0).toUpperCase() + mensagem.slice(1) });
    }
  }
  return encontrados;
}
