"use client";

import { useEffect } from "react";

import { acompanhar } from "../acompanhamento";

// Ao abrir um empréstimo com sucesso, ele passa a ser acompanhado neste dispositivo.
export function TrackVisit({ usuarioId, emprestimoId }: { usuarioId: string; emprestimoId: string }) {
  useEffect(() => {
    acompanhar(usuarioId, emprestimoId);
  }, [usuarioId, emprestimoId]);
  return null;
}
