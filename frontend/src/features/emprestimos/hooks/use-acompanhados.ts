"use client";

import { useCallback, useEffect, useState } from "react";

import type { ActionError } from "@/lib/api/errors";

import { acaoConsultarAcompanhados, type ItemAcompanhado } from "../actions";
import { EVENTO_ACOMPANHAMENTO, lerAcompanhados } from "../acompanhamento";

interface EstadoAcompanhados {
  carregando: boolean;
  itens: ItemAcompanhado[];
  erro: ActionError | null;
}

// Lê os IDs acompanhados neste navegador e consulta cada empréstimo na API.
export function useAcompanhados(usuarioId: string) {
  const [estado, setEstado] = useState<EstadoAcompanhados>({ carregando: true, itens: [], erro: null });

  const atualizar = useCallback(async () => {
    const ids = lerAcompanhados(usuarioId).map((registro) => registro.id);
    if (ids.length === 0) {
      setEstado({ carregando: false, itens: [], erro: null });
      return;
    }
    setEstado((anterior) => ({ ...anterior, carregando: true, erro: null }));
    try {
      const resultado = await acaoConsultarAcompanhados(ids);
      setEstado(
        resultado.ok
          ? { carregando: false, itens: resultado.data, erro: null }
          : { carregando: false, itens: [], erro: resultado.error },
      );
    } catch {
      setEstado({
        carregando: false,
        itens: [],
        erro: { status: 500, message: "Falha inesperada ao consultar os empréstimos.", details: [] },
      });
    }
  }, [usuarioId]);

  useEffect(() => {
    void atualizar();
    // Outra aba (ou outra tela) acompanhou ou removeu um empréstimo: reconsulta.
    const aoMudar = (evento: Event) => {
      if (evento instanceof StorageEvent && !evento.key?.startsWith("monitoolring:")) return;
      void atualizar();
    };
    window.addEventListener(EVENTO_ACOMPANHAMENTO, aoMudar);
    window.addEventListener("storage", aoMudar);
    return () => {
      window.removeEventListener(EVENTO_ACOMPANHAMENTO, aoMudar);
      window.removeEventListener("storage", aoMudar);
    };
  }, [atualizar]);

  return { ...estado, atualizar };
}
