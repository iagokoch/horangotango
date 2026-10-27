import { z } from "zod";

export const papelSchema = z.enum(["MEMBER", "STAFF"]);
export type Papel = z.infer<typeof papelSchema>;

// UserResponse do backend: nunca inclui senha nem hash.
export const usuarioSchema = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  papel: papelSchema,
});
export type Usuario = z.infer<typeof usuarioSchema>;

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  tipo: z.string(),
  expiraEm: z.string(),
  usuario: usuarioSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// Conteúdo do cookie de sessão. O token só é lido no servidor (cookie httpOnly).
export const sessaoSchema = z.object({
  token: z.string().min(1),
  expiraEm: z.string(),
  usuario: usuarioSchema,
});
export type Sessao = z.infer<typeof sessaoSchema>;

export const ROTULO_PAPEL: Record<Papel, string> = {
  MEMBER: "Membro",
  STAFF: "Staff",
};
