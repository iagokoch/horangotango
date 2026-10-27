// Formatação pt-BR. A API trabalha em UTC (Instant ISO-8601); a exibição usa o fuso do usuário,
// exceto na renderização do servidor, onde o fuso é fixado para evitar divergência de hidratação.
const FUSO = process.env.NEXT_PUBLIC_TIME_ZONE ?? "America/Sao_Paulo";

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSO,
});

const dataCurta = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: FUSO,
});

const dataLonga = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: FUSO,
});

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moedaCompacta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : dataHora.format(data).replace(".", "");
}

export function formatarDataCurta(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : dataCurta.format(data).replace(".", "");
}

export function formatarDataLonga(data: Date): string {
  return dataLonga.format(data);
}

export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

export function formatarMoedaCompacta(valor: number): string {
  return moedaCompacta.format(valor);
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

// Distância entre agora e um instante, em linguagem de balcão: "em 3 dias", "há 2 h".
export function formatarDistancia(iso: string, agora: number = Date.now()): string {
  const alvo = Date.parse(iso);
  if (Number.isNaN(alvo)) return iso;
  const delta = alvo - agora;
  const abs = Math.abs(delta);
  let texto: string;
  if (abs < HORA) {
    const minutos = Math.max(1, Math.round(abs / MINUTO));
    texto = `${minutos} min`;
  } else if (abs < DIA) {
    texto = `${Math.round(abs / HORA)} h`;
  } else {
    const dias = Math.round(abs / DIA);
    texto = `${dias} ${dias === 1 ? "dia" : "dias"}`;
  }
  return delta >= 0 ? `em ${texto}` : `há ${texto}`;
}

// IDs são UUIDs: a forma curta ajuda a reconhecer o registro sem ocupar a linha inteira.
export function idCurto(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

export function plural(quantidade: number, singular: string, pluralForma: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : pluralForma}`;
}
