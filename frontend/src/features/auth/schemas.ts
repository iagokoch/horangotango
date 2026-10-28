import { z } from "zod";

// Espelha UserCreateRequest: senha com no mínimo 8 caracteres e no máximo 72 bytes UTF-8 (limite
// do BCrypt). Acentos e emojis ocupam mais de um byte, por isso a contagem é em bytes.
export const SENHA_MIN = 8;
export const SENHA_MAX_BYTES = 72;

export function bytesUtf8(texto: string): number {
  return new TextEncoder().encode(texto).length;
}

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe seu e-mail."),
  senha: z.string().min(1, "Informe sua senha."),
});
export type DadosLogin = z.infer<typeof loginSchema>;

export const senhaSchema = z
  .string()
  .min(SENHA_MIN, `Use pelo menos ${SENHA_MIN} caracteres.`)
  .refine((senha) => bytesUtf8(senha) <= SENHA_MAX_BYTES, {
    message: "A senha é longa demais (máximo de 72 bytes; acentos contam em dobro).",
  });

export const contaSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome completo.").max(255, "Use no máximo 255 caracteres."),
  email: z
    .string()
    .trim()
    .min(1, "Informe o e-mail.")
    .max(255, "Use no máximo 255 caracteres.")
    .pipe(z.email({ error: "Informe um e-mail válido." })),
  senha: senhaSchema,
});
export type DadosConta = z.infer<typeof contaSchema>;

export const cadastroSchema = contaSchema
  .extend({ confirmacao: z.string() })
  .refine((dados) => dados.senha === dados.confirmacao, {
    path: ["confirmacao"],
    message: "As senhas não coincidem.",
  });
export type DadosCadastro = z.infer<typeof cadastroSchema>;

export const CAMPOS_CONTA = ["nome", "email", "senha"] as const;

// Destino pós-login vindo de ?next=. Só aceita caminhos internos para evitar open redirect.
export function destinoSeguro(destino: string | null | undefined, padrao: string): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//") || destino.includes("\\")) {
    return padrao;
  }
  return destino;
}
