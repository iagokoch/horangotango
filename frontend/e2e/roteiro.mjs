// Roteiro E2E do Monitoolring após o redesign "Etiqueta & Bancada".
// Executa pela interface real (Next em produção) contra a API Spring Boot e um PostgreSQL de teste
// descartável. Nenhum mock. Preparação do ambiente em e2e/README.md. Uso: npm run test:e2e
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PG_CONTAINER = process.env.E2E_PG_CONTAINER ?? "monitoolring-e2e-pg";
// Nome fixo de propósito: o roteiro só escreve no banco de testes, nunca num banco configurável.
const PG_DATABASE = "monitoolring_e2e";
const CANAL_NAVEGADOR = process.env.E2E_BROWSER_CHANNEL ?? "msedge";
const OUT = process.env.E2E_OUT ?? join(dirname(fileURLToPath(import.meta.url)), "resultados");

// Proteções contra execução fora do ambiente de teste: o roteiro cria contas, ferramentas e
// empréstimos e altera datas diretamente no banco.
const hostBase = new URL(BASE).hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(hostBase)) {
  console.error(`Abortado: BASE_URL precisa ser local (recebido ${BASE}).`);
  process.exit(2);
}
try {
  const contagem = execFileSync(
    "docker",
    [
      "exec", PG_CONTAINER, "psql", "-U", "monitoolring", "-d", PG_DATABASE, "-tAc",
      "select (select count(*) from usuarios)||'|'||(select count(*) from ferramentas)||'|'||(select count(*) from emprestimos)||'|'||(select count(*) from configuracao_prazo_devolucao)",
    ],
    { encoding: "utf8" },
  ).trim();
  // Esperado: só o Staff do bootstrap, sem ferramentas, empréstimos ou prazo.
  if (contagem !== "1|0|0|0") {
    console.error(`Abortado: o banco ${PG_DATABASE} em ${PG_CONTAINER} não está vazio (usuários|ferramentas|empréstimos|prazos = ${contagem}).`);
    console.error("Recrie o contêiner de teste e reinicie o backend antes de rodar o roteiro (veja e2e/README.md).");
    process.exit(2);
  }
} catch (erro) {
  console.error(`Abortado: não foi possível consultar o banco de teste ${PG_DATABASE} no contêiner ${PG_CONTAINER}.`);
  console.error(String(erro?.message ?? erro).split("\n")[0]);
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });

const STAFF = {
  email: process.env.E2E_STAFF_EMAIL ?? "staff@monitoolring.local",
  senha: process.env.E2E_STAFF_SENHA ?? "change-me-dev-only",
  nome: "Staff Inicial (dev)",
};
const SUF = Date.now().toString(36).slice(-4).toUpperCase();
const MEMBRO_A = { nome: "Ana Bancada", email: `ana.${SUF.toLowerCase()}@e2e.test`, senha: "senha-forte-123" };
const MEMBRO_B = { nome: "Bruno Torno", email: `bruno.${SUF.toLowerCase()}@e2e.test`, senha: "senha-forte-456" };
const STAFF2 = { nome: "Carla Balcão", email: `carla.${SUF.toLowerCase()}@e2e.test`, senha: "senha-forte-789" };
const COD = (s) => `E2E-${s}-${SUF}`;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
};

// ---------------------------------------------------------------- runner
const resultados = [];
const estado = {};
class NaoExecutado extends Error {}
function requer(...nomes) {
  const faltando = nomes.filter((n) => estado[n] === undefined || estado[n] === null);
  if (faltando.length) throw new NaoExecutado(`pré-requisito ausente: ${faltando.join(", ")}`);
}
let paginaAtual = null;
async function passo(area, descricao, fn) {
  const n = resultados.length + 1;
  const inicio = Date.now();
  try {
    await fn();
    resultados.push({ n, area, descricao, status: "OK", ms: Date.now() - inicio });
    console.log(`  ✔ ${String(n).padStart(2)} [${area}] ${descricao}`);
  } catch (erro) {
    const naoExec = erro instanceof NaoExecutado;
    const msg = String(erro?.message ?? erro).split("\n").slice(0, 4).join(" | ");
    resultados.push({ n, area, descricao, status: naoExec ? "NÃO EXECUTADO" : "FALHOU", erro: msg, ms: Date.now() - inicio });
    console.log(`  ${naoExec ? "–" : "✘"} ${String(n).padStart(2)} [${area}] ${descricao}\n       ${msg}`);
    if (!naoExec && paginaAtual) {
      await paginaAtual.screenshot({ path: join(OUT, `falha-${String(n).padStart(2, "0")}.png`), fullPage: true }).catch(() => {});
    }
  }
}
function confere(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

// ---------------------------------------------------------------- helpers
const T = 15_000;
async function ir(page, caminho) {
  paginaAtual = page;
  await page.goto(BASE + caminho, { waitUntil: "load" });
}
async function urlTermina(page, regex, timeout = T) {
  await page.waitForURL((u) => regex.test(u.pathname + u.search), { timeout });
}
async function ve(page, texto, timeout = T) {
  await page.getByText(texto).first().waitFor({ state: "visible", timeout });
}
async function naoVe(page, texto) {
  const n = await page.getByText(texto).count();
  confere(n === 0, `não deveria exibir "${texto}" (${n} ocorrências)`);
}
async function toast(page, texto) {
  await page.locator("[data-sonner-toast]").filter({ hasText: texto }).first().waitFor({ state: "visible", timeout: T });
}
async function heading(page, nome) {
  await page.getByRole("heading", { name: nome }).first().waitFor({ state: "visible", timeout: T });
}
async function entrar(page, { email, senha }, destino = /\/painel$/) {
  await ir(page, "/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await urlTermina(page, destino);
}
async function sair(page) {
  const gatilho = page.getByRole("button", { name: /^Conta de / });
  if (!(await gatilho.isVisible())) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
  }
  await page.getByRole("button", { name: /^Conta de / }).last().click();
  await page.getByRole("menuitem", { name: "Encerrar sessão" }).click();
  await urlTermina(page, /\/login\?motivo=saiu$/);
}
async function cadastrar(page, conta) {
  await ir(page, "/cadastro");
  await page.getByLabel("Nome completo").fill(conta.nome);
  await page.getByLabel("E-mail").fill(conta.email);
  await page.getByLabel("Senha", { exact: true }).fill(conta.senha);
  await page.getByLabel("Confirme a senha").fill(conta.senha);
  await page.getByRole("button", { name: "Criar conta" }).click();
}
async function idDoPerfil(page) {
  await ir(page, "/perfil");
  const texto = await page.locator("main").innerText();
  const id = texto.match(UUID)?.[0];
  confere(id, "ID não encontrado em Meu perfil");
  return id;
}
async function preencherFerramenta(page, f) {
  if (f.codigo !== undefined) await page.getByLabel("Código", { exact: true }).fill(f.codigo);
  if (f.nome !== undefined) await page.getByLabel("Nome", { exact: true }).fill(f.nome);
  if (f.categoria !== undefined) await page.getByLabel("Categoria", { exact: true }).fill(f.categoria);
  if (f.valor !== undefined) await page.getByLabel("Valor estimado").fill(f.valor);
  if (f.estado !== undefined) await page.getByLabel("Estado de conservação").fill(f.estado);
}
async function cadastrarFerramenta(page, f) {
  await ir(page, "/ferramentas/nova");
  await preencherFerramenta(page, f);
  await page.getByRole("button", { name: "Cadastrar ferramenta" }).click();
  await urlTermina(page, /\/ferramentas\/[0-9a-f-]{36}$/);
  await toast(page, `Ferramenta ${f.codigo} cadastrada.`);
  return page.url().split("/").pop();
}
async function preencherChecklist(page, escopo, { estado, avarias, semAvarias, acessorios, nenhum }) {
  const raiz = escopo ?? page;
  await raiz.getByRole("radio", { name: new RegExp(estado === "DEFECTIVE" ? "Com defeito" : "Íntegra") }).click();
  if (semAvarias) await raiz.getByRole("button", { name: "Sem avarias", exact: true }).click();
  else if (avarias) await raiz.getByLabel("Avarias visíveis").fill(avarias);
  if (nenhum) await raiz.getByRole("button", { name: "Nenhum", exact: true }).click();
  for (const item of acessorios ?? []) {
    const campo = raiz.getByPlaceholder(/Ex\.: maleta/);
    await campo.fill(item);
    await campo.press("Enter");
  }
}
async function retirada(page, { ferramentaCodigo, membroId, checklist }) {
  await ir(page, "/emprestimos/nova");
  if (ferramentaCodigo) await page.getByRole("radio", { name: new RegExp(ferramentaCodigo) }).click();
  if (membroId) await page.getByLabel("ID do membro").fill(membroId);
  if (checklist) await preencherChecklist(page, null, checklist);
  await page.getByRole("button", { name: "Confirmar retirada" }).click();
}
async function codigoDoComprovante(page) {
  await heading(page, "Retirada confirmada");
  const href = await page.getByRole("link", { name: "Abrir empréstimo" }).getAttribute("href");
  const id = href?.split("/").pop();
  confere(id && UUID.test(id), `código inválido no comprovante: ${href}`);
  return id;
}
async function semRolagemHorizontal(page) {
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
  confere(r.sw <= r.vw, `rolagem horizontal: scrollWidth ${r.sw} > largura ${r.vw}`);
  return r;
}
async function medirBuscaCabecalho(page) {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const el = document.getElementById("busca-global");
    if (!el) return null;
    const cs = getComputedStyle(el);
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const texto = ctx.measureText(el.placeholder).width;
    const disponivel = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const r = el.getBoundingClientRect();
    const header = el.closest("header");
    return {
      placeholder: el.placeholder,
      fonte: `${cs.fontSize} ${cs.fontFamily.split(",")[0]}`,
      largura: Math.round(r.width),
      texto: Math.round(texto * 10) / 10,
      disponivel: Math.round(disponivel * 10) / 10,
      cabe: texto <= disponivel,
      direita: Math.round(r.right),
      vw: document.documentElement.clientWidth,
      headerTransborda: header ? header.scrollWidth > header.clientWidth : null,
    };
  });
}
function sql(comando) {
  return execFileSync("docker", ["exec", PG_CONTAINER, "psql", "-U", "monitoolring", "-d", PG_DATABASE, "-tAc", comando], {
    encoding: "utf8",
  }).trim();
}
async function cookieSessao(ctx) {
  return (await ctx.cookies()).find((c) => c.name === "mt_session");
}
function decodificar(valor) {
  return JSON.parse(Buffer.from(valor, "base64url").toString("utf8"));
}
function codificar(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}
async function trocarCookie(ctx, transformar) {
  const c = await cookieSessao(ctx);
  confere(c, "sem cookie de sessão");
  const novo = typeof transformar === "function" ? codificar(transformar(decodificar(c.value))) : transformar;
  await ctx.addCookies([{ ...c, value: novo }]);
}
async function shot(page, nome) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, `${nome}.png`), fullPage: false });
}

// ---------------------------------------------------------------- roteiro
const browser = await chromium.launch({ channel: CANAL_NAVEGADOR, headless: true });
const novoContexto = (vp = "desktop", extra = {}) =>
  browser.newContext({ viewport: VIEWPORTS[vp], locale: "pt-BR", timezoneId: "America/Sao_Paulo", ...extra });

const anonimo = await (await novoContexto()).newPage();
const ctxStaff = await novoContexto();
const staff = await ctxStaff.newPage();
const ctxA = await novoContexto();
const membroA = await ctxA.newPage();
const ctxB = await novoContexto();
const membroB = await ctxB.newPage();

console.log(`\nRoteiro E2E — ${BASE} — sufixo ${SUF}\n`);

// ===== Autenticação e proteção de rotas
await passo("Auth", "Raiz sem sessão redireciona para /login", async () => {
  await ir(anonimo, "/");
  await urlTermina(anonimo, /^\/login$/);
});
await passo("Auth", "Rota protegida sem sessão guarda o destino em ?next=", async () => {
  await ir(anonimo, "/ferramentas?status=AVAILABLE");
  await urlTermina(anonimo, /^\/login\?next=%2Fferramentas%3Fstatus%3DAVAILABLE$/);
});
await passo("Auth", "Rota de Staff sem sessão também exige login", async () => {
  await ir(anonimo, "/configuracoes");
  await urlTermina(anonimo, /^\/login\?next=%2Fconfiguracoes$/);
});
await passo("Auth", "Login vazio mostra validação no cliente", async () => {
  await ir(anonimo, "/login");
  await anonimo.getByRole("button", { name: "Entrar", exact: true }).click();
  await anonimo.locator('input[name="email"][aria-invalid="true"]').waitFor({ timeout: T });
  confere(/\/login$/.test(anonimo.url()), "saiu da tela de login");
});
await passo("Auth", "Login inválido (401) mostra erro neutro e limpa a senha", async () => {
  await ir(anonimo, "/login");
  await anonimo.getByLabel("E-mail").fill(STAFF.email);
  await anonimo.getByLabel("Senha", { exact: true }).fill("senha-errada-123");
  await anonimo.getByRole("button", { name: "Entrar", exact: true }).click();
  await ve(anonimo, "Não foi possível entrar");
  await ve(anonimo, "E-mail ou senha incorretos.");
  confere((await anonimo.getByLabel("Senha", { exact: true }).inputValue()) === "", "senha não foi limpa");
});
await passo("Cadastro", "Validação: senha curta e confirmação divergente", async () => {
  await ir(anonimo, "/cadastro");
  await anonimo.getByLabel("Nome completo").fill("X");
  await anonimo.getByLabel("E-mail").fill("invalido");
  await anonimo.getByLabel("Senha", { exact: true }).fill("curta");
  await anonimo.getByLabel("Confirme a senha").fill("outra");
  await anonimo.getByRole("button", { name: "Criar conta" }).click();
  await anonimo.locator('input[name="senha"][aria-invalid="true"]').waitFor({ timeout: T });
  await anonimo.locator('input[name="email"][aria-invalid="true"]').waitFor({ timeout: T });
  await anonimo.locator('input[name="confirmacao"][aria-invalid="true"]').waitFor({ timeout: T });
  confere(/\/cadastro$/.test(anonimo.url()), "não deveria sair do cadastro");
});
await passo("Cadastro", "Cadastro de membro A leva ao login com aviso e e-mail preenchido", async () => {
  await cadastrar(anonimo, MEMBRO_A);
  await urlTermina(anonimo, /^\/login\?motivo=cadastro&email=/);
  await ve(anonimo, "Conta criada");
  confere((await anonimo.getByLabel("E-mail").inputValue()) === MEMBRO_A.email, "e-mail não veio preenchido");
});
await passo("Cadastro", "E-mail repetido (409) marca o campo", async () => {
  await cadastrar(anonimo, MEMBRO_A);
  await ve(anonimo, "Este e-mail já tem cadastro.");
  await ve(anonimo, "Não foi possível criar a conta");
});
await passo("Cadastro", "Cadastro de membro B", async () => {
  await cadastrar(anonimo, MEMBRO_B);
  await urlTermina(anonimo, /^\/login\?motivo=cadastro/);
});
await passo("Auth", "Login válido respeita o destino ?next=", async () => {
  await ir(membroA, "/perfil");
  await urlTermina(membroA, /^\/login\?next=%2Fperfil$/);
  await membroA.getByLabel("E-mail").fill(MEMBRO_A.email);
  await membroA.getByLabel("Senha", { exact: true }).fill(MEMBRO_A.senha);
  await membroA.getByRole("button", { name: "Entrar", exact: true }).click();
  await urlTermina(membroA, /^\/perfil$/);
  await heading(membroA, "Meu perfil");
  estado.idA = (await membroA.locator("main").innerText()).match(UUID)?.[0];
  confere(estado.idA, "ID do membro A não exibido no perfil");
});
await passo("Auth", "Destino externo em ?next= é ignorado (sem open redirect)", async () => {
  const p = await (await novoContexto()).newPage();
  paginaAtual = p;
  await p.goto(`${BASE}/login?next=${encodeURIComponent("https://exemplo.com/x")}`);
  await p.getByLabel("E-mail").fill(MEMBRO_B.email);
  await p.getByLabel("Senha", { exact: true }).fill(MEMBRO_B.senha);
  await p.getByRole("button", { name: "Entrar", exact: true }).click();
  await urlTermina(p, /^\/painel$/);
  confere(new URL(p.url()).host === new URL(BASE).host, `redirecionou para ${p.url()}`);
  await p.context().close();
});
await passo("Auth", "Com sessão, /login redireciona ao painel", async () => {
  await ir(membroA, "/login");
  await urlTermina(membroA, /^\/painel$/);
});

// ===== Permissões do Membro
await passo("Permissões", "Painel do membro mostra o ID para o balcão", async () => {
  requer("idA");
  await ir(membroA, "/painel");
  await ve(membroA, "Seu ID para o balcão");
  confere((await membroA.locator("main").innerText()).includes(estado.idA), "ID não aparece no painel");
});
await passo("Permissões", "Navegação do membro não exibe ações de Staff", async () => {
  const nav = membroA.locator("aside");
  for (const rotulo of ["Painel", "Ferramentas", "Empréstimos", "Meu perfil"]) {
    confere((await nav.getByRole("link", { name: rotulo, exact: true }).count()) === 1, `falta "${rotulo}"`);
  }
  for (const rotulo of ["Registrar retirada", "Cadastrar ferramenta", "Configurações"]) {
    confere((await nav.getByRole("link", { name: rotulo }).count()) === 0, `membro vê "${rotulo}"`);
  }
});
await passo("Permissões", "Catálogo vazio para membro: estado vazio sem botão de cadastro", async () => {
  await ir(membroA, "/ferramentas");
  await ve(membroA, "O acervo ainda está vazio");
  await ve(membroA, "Nenhuma ferramenta foi cadastrada pela equipe da oficina até agora.");
  confere((await membroA.getByRole("link", { name: "Cadastrar ferramenta" }).count()) === 0, "membro vê botão de cadastro");
});
for (const rota of ["/configuracoes", "/ferramentas/nova", "/emprestimos/nova"]) {
  await passo("Permissões", `Membro em ${rota} é barrado (acesso negado)`, async () => {
    await ir(membroA, rota);
    await urlTermina(membroA, /^\/acesso-negado$/);
    await ve(membroA, "Área exclusiva do Staff");
  });
}
await passo("Auth", "Logout encerra a sessão e protege as rotas novamente", async () => {
  await ir(membroA, "/painel");
  await sair(membroA);
  await ve(membroA, "Sessão encerrada");
  confere(!(await cookieSessao(ctxA)), "cookie continua no navegador");
  await ir(membroA, "/painel");
  await urlTermina(membroA, /^\/login\?next=%2Fpainel$/);
});

// ===== Staff: prazo e configurações
await passo("Staff", "Login do Staff do bootstrap; painel alerta prazo não configurado", async () => {
  await entrar(staff, STAFF);
  await ve(staff, "Retiradas bloqueadas: prazo padrão não configurado");
  for (const rotulo of ["Registrar retirada", "Cadastrar ferramenta", "Configurações"]) {
    confere((await staff.locator("aside").getByRole("link", { name: rotulo }).count()) === 1, `Staff não vê "${rotulo}"`);
  }
  estado.idStaff = await idDoPerfil(staff);
});
await passo("Staff", "Catálogo vazio para Staff oferece o cadastro", async () => {
  await ir(staff, "/ferramentas");
  await ve(staff, "O acervo ainda está vazio");
  confere((await staff.getByRole("main").getByRole("link", { name: "Cadastrar ferramenta" }).count()) >= 1, "sem link de cadastro");
});
await passo("Prazos", "Retirada sem prazo configurado fica bloqueada na interface", async () => {
  await ir(staff, "/emprestimos/nova");
  await ve(staff, "Prazo padrão de devolução não configurado");
  confere(await staff.getByRole("button", { name: "Confirmar retirada" }).isDisabled(), "botão deveria estar desabilitado");
});
await passo("Prazos", "Prazo fora da faixa (0 e 366) é rejeitado", async () => {
  await ir(staff, "/configuracoes");
  const campo = staff.getByLabel("Dias corridos para devolução");
  for (const valor of ["0", "366"]) {
    await campo.fill(valor);
    await staff.getByRole("button", { name: "Definir prazo" }).click();
    await staff.locator('input[name="dias"][aria-invalid="true"]').waitFor({ timeout: T });
  }
  confere(sql("select count(*) from configuracao_prazo_devolucao") === "0", "prazo inválido foi gravado");
});
await passo("Prazos", "Definir prazo padrão de 7 dias", async () => {
  await ir(staff, "/configuracoes");
  await staff.getByLabel("Dias corridos para devolução").fill("7");
  await staff.getByRole("button", { name: "Definir prazo" }).click();
  await toast(staff, "Prazo padrão definido em 7 dias.");
  await ve(staff, "Vigente");
});
await passo("Prazos", "Painel deixa de exibir o alerta de prazo", async () => {
  await ir(staff, "/painel");
  await heading(staff, /Bo[am] (dia|tarde|noite)|Olá/);
  await naoVe(staff, "Retiradas bloqueadas: prazo padrão não configurado");
});

// ===== Ferramentas
await passo("Ferramentas", "Formulário vazio valida todos os campos obrigatórios", async () => {
  await ir(staff, "/ferramentas/nova");
  await staff.getByRole("button", { name: "Cadastrar ferramenta" }).click();
  for (const nome of ["codigo", "nome", "categoria", "valorEstimado", "estadoConservacao"]) {
    await staff.locator(`[name="${nome}"][aria-invalid="true"]`).waitFor({ timeout: T });
  }
});
await passo("Ferramentas", "Valor zero e com 3 casas decimais são rejeitados", async () => {
  await ir(staff, "/ferramentas/nova");
  await preencherFerramenta(staff, { codigo: COD("X"), nome: "Teste", categoria: "Teste", valor: "0", estado: "Nova" });
  await staff.getByRole("button", { name: "Cadastrar ferramenta" }).click();
  await ve(staff, "O valor deve ser maior que zero.");
  await preencherFerramenta(staff, { valor: "10,123" });
  await staff.getByRole("button", { name: "Cadastrar ferramenta" }).click();
  await ve(staff, "Use até 10 dígitos e 2 casas decimais, por exemplo 1.250,00.");
  confere(sql(`select count(*) from ferramentas where codigo='${COD("X")}'`) === "0", "ferramenta inválida gravada");
});
const FERRAMENTAS = {
  fur: { codigo: COD("FUR"), nome: "Furadeira de Impacto", categoria: "Elétricas", valor: "450,00", estado: "Boa, com marcas de uso no punho." },
  ser: { codigo: COD("SER"), nome: "Serra Tico-Tico", categoria: "Elétricas", valor: "380,50", estado: "Lâmina nova." },
  cha: { codigo: COD("CHA"), nome: "Jogo de Chaves Phillips", categoria: "Manuais", valor: "89,90", estado: "Completo, 6 peças." },
  tre: { codigo: COD("TRE"), nome: "Trena a Laser", categoria: "Medição", valor: "1.250,00", estado: "Visor sem riscos." },
};
for (const [chave, f] of Object.entries(FERRAMENTAS)) {
  await passo("Ferramentas", `Cadastrar ${f.codigo} (${f.nome})`, async () => {
    estado[`id_${chave}`] = await cadastrarFerramenta(staff, f);
    await heading(staff, f.nome);
    await ve(staff, "Disponível");
  });
}
await passo("Ferramentas", "Código duplicado (409) marca o campo Código", async () => {
  await ir(staff, "/ferramentas/nova");
  await preencherFerramenta(staff, { ...FERRAMENTAS.fur, nome: "Duplicada" });
  await staff.getByRole("button", { name: "Cadastrar ferramenta" }).click();
  await ve(staff, "Este código já está em uso por outra ferramenta.");
  confere(sql(`select count(*) from ferramentas where codigo='${FERRAMENTAS.fur.codigo}'`) === "1", "duplicou no banco");
});
await passo("Ferramentas", "Ficha da ferramenta exibe dados e ações de Staff", async () => {
  requer("id_tre");
  await ir(staff, `/ferramentas/${estado.id_tre}`);
  await heading(staff, "Trena a Laser");
  const texto = await staff.locator("main").innerText();
  for (const trecho of [FERRAMENTAS.tre.codigo, "Medição", "1.250,00", "Visor sem riscos."]) {
    confere(texto.includes(trecho), `ficha sem "${trecho}"`);
  }
  await staff.getByRole("link", { name: /Editar/ }).first().waitFor({ timeout: T });
  await staff.getByRole("button", { name: "Inativar" }).waitFor({ timeout: T });
});
await passo("Ferramentas", "Edição parcial atualiza nome e valor (PATCH com versão)", async () => {
  requer("id_cha");
  const versaoAntes = Number(sql(`select versao from ferramentas where id='${estado.id_cha}'`));
  await ir(staff, `/ferramentas/${estado.id_cha}/editar`);
  await preencherFerramenta(staff, { nome: "Jogo de Chaves Phillips e Fenda", valor: "99,90" });
  await staff.getByRole("button", { name: "Salvar alterações" }).click();
  await toast(staff, `Ferramenta ${FERRAMENTAS.cha.codigo} atualizada.`);
  await urlTermina(staff, new RegExp(`/ferramentas/${estado.id_cha}$`));
  await heading(staff, "Jogo de Chaves Phillips e Fenda");
  const linha = sql(`select nome||'|'||valor_estimado||'|'||versao from ferramentas where id='${estado.id_cha}'`);
  confere(linha.startsWith("Jogo de Chaves Phillips e Fenda|99.90|"), `banco: ${linha}`);
  confere(Number(linha.split("|")[2]) === versaoAntes + 1, `versão não incrementou: ${linha}`);
});
await passo("Ferramentas", "Edição sem alterações não envia requisição", async () => {
  requer("id_cha");
  await ir(staff, `/ferramentas/${estado.id_cha}/editar`);
  await staff.getByRole("button", { name: "Salvar alterações" }).click();
  await toast(staff, "Nenhuma alteração para salvar.");
});
await passo("Ferramentas", "Conflito de versão (409) entre duas abas oferece recarregar", async () => {
  requer("id_ser");
  const aba2 = await ctxStaff.newPage();
  await ir(staff, `/ferramentas/${estado.id_ser}/editar`);
  await ir(aba2, `/ferramentas/${estado.id_ser}/editar`);
  await preencherFerramenta(staff, { estado: "Lâmina nova; base revisada." });
  await staff.getByRole("button", { name: "Salvar alterações" }).click();
  await toast(staff, "atualizada");
  paginaAtual = aba2;
  await preencherFerramenta(aba2, { nome: "Serra Tico-Tico 600W" });
  await aba2.getByRole("button", { name: "Salvar alterações" }).click();
  await ve(aba2, "Outra pessoa alterou esta ferramenta enquanto você editava");
  await aba2.getByRole("button", { name: "Recarregar dados" }).waitFor({ timeout: T });
  confere(sql(`select nome from ferramentas where id='${estado.id_ser}'`) === "Serra Tico-Tico", "a edição antiga sobrescreveu");
  await aba2.close();
});
await passo("Ferramentas", "Inativação com confirmação", async () => {
  requer("id_tre");
  await ir(staff, `/ferramentas/${estado.id_tre}`);
  await staff.getByRole("button", { name: "Inativar" }).click();
  await staff.getByRole("alertdialog").getByText("Inativar ferramenta?").waitFor({ timeout: T });
  await staff.getByRole("alertdialog").getByRole("button", { name: "Inativar" }).click();
  await toast(staff, `${FERRAMENTAS.tre.codigo} inativada.`);
  await staff.getByRole("button", { name: "Reativar" }).waitFor({ timeout: T });
  confere(sql(`select status from ferramentas where id='${estado.id_tre}'`) === "INACTIVE", "status no banco não é INACTIVE");
});
await passo("Ferramentas", "Ferramenta inativa não aparece na seleção de retirada", async () => {
  await ir(staff, "/emprestimos/nova");
  await staff.getByRole("radio", { name: new RegExp(FERRAMENTAS.fur.codigo) }).waitFor({ timeout: T });
  confere((await staff.getByRole("radio", { name: new RegExp(FERRAMENTAS.tre.codigo) }).count()) === 0, "inativa listada");
});
await passo("Ferramentas", "Filtro por status: aba Inativas mostra 1", async () => {
  await ir(staff, "/ferramentas");
  await staff.getByRole("group", { name: "Filtrar por status" }).getByRole("button", { name: /Inativas/ }).click();
  await urlTermina(staff, /status=INACTIVE/);
  await staff.locator("table").getByText(FERRAMENTAS.tre.codigo).waitFor({ timeout: T });
  confere((await staff.locator("table tbody tr").count()) === 1, "deveria listar só 1 ferramenta");
});
await passo("Ferramentas", "Reativação com confirmação", async () => {
  requer("id_tre");
  await ir(staff, `/ferramentas/${estado.id_tre}`);
  await staff.getByRole("button", { name: "Reativar" }).click();
  await staff.getByRole("alertdialog").getByRole("button", { name: "Reativar" }).click();
  await toast(staff, `${FERRAMENTAS.tre.codigo} disponível novamente.`);
  confere(sql(`select status from ferramentas where id='${estado.id_tre}'`) === "AVAILABLE", "não voltou a AVAILABLE");
});
await passo("Ferramentas", "Busca sem acento encontra categoria acentuada", async () => {
  await ir(staff, "/ferramentas");
  await staff.locator("#busca-catalogo").fill("medicao");
  await staff.locator("#busca-catalogo").press("Enter");
  await urlTermina(staff, /q=medicao/);
  await staff.locator("table").getByText(FERRAMENTAS.tre.codigo).waitFor({ timeout: T });
  confere((await staff.locator("table tbody tr").count()) === 1, "busca deveria retornar 1");
});
await passo("Ferramentas", "Filtro por categoria e limpeza de filtros", async () => {
  await ir(staff, "/ferramentas");
  await staff.locator("#filtro-categoria").selectOption("Elétricas");
  await urlTermina(staff, /categoria=El/);
  await staff.waitForFunction(() => document.querySelectorAll("table tbody tr").length === 2);
  await staff.getByRole("button", { name: "Limpar filtros" }).first().click();
  await urlTermina(staff, /^\/ferramentas$/);
  await staff.waitForFunction(() => document.querySelectorAll("table tbody tr").length === 4);
});
await passo("Ferramentas", "Busca sem resultado mostra estado vazio", async () => {
  await ir(staff, "/ferramentas?q=xyz-inexistente");
  await ve(staff, "Nenhuma ferramenta encontrada");
});
await passo("Ferramentas", "Visualização em grade (estado na URL)", async () => {
  await ir(staff, "/ferramentas");
  await staff.getByRole("button", { name: "Visualizar em grade" }).click();
  await urlTermina(staff, /vista=grade/);
  await staff.locator("article").filter({ hasText: FERRAMENTAS.fur.codigo }).waitFor({ timeout: T });
  confere((await staff.locator("table").count()) === 0, "tabela ainda visível na grade");
});
await passo("Ferramentas", "Busca do cabeçalho leva ao catálogo filtrado", async () => {
  await ir(staff, "/painel");
  await staff.locator("#busca-global").fill("trena");
  await staff.locator("#busca-global").press("Enter");
  await urlTermina(staff, /^\/ferramentas\?q=trena$/);
  await staff.locator("table").getByText(FERRAMENTAS.tre.codigo).waitFor({ timeout: T });
});
await passo("Ferramentas", "Membro vê catálogo sem ações de edição/retirada", async () => {
  await entrar(membroA, MEMBRO_A);
  await ir(membroA, "/ferramentas");
  await membroA.locator("table").getByText(FERRAMENTAS.fur.codigo).waitFor({ timeout: T });
  confere((await membroA.getByRole("link", { name: /^Editar / }).count()) === 0, "membro vê Editar");
  confere((await membroA.getByRole("link", { name: /^Registrar retirada de / }).count()) === 0, "membro vê retirada");
  await ir(membroA, `/ferramentas/${estado.id_fur}`);
  confere((await membroA.getByRole("button", { name: "Inativar" }).count()) === 0, "membro vê Inativar");
});

// ===== Empréstimos: retirada
await passo("Retirada", "Atalho do catálogo pré-seleciona a ferramenta", async () => {
  await ir(staff, "/ferramentas");
  await staff.getByRole("link", { name: `Registrar retirada de ${FERRAMENTAS.fur.codigo}` }).click();
  await urlTermina(staff, /\/emprestimos\/nova\?ferramenta=/);
  const marcado = await staff.getByRole("radio", { name: new RegExp(FERRAMENTAS.fur.codigo) }).getAttribute("aria-checked");
  confere(marcado === "true", "ferramenta não veio selecionada");
});
await passo("Retirada", "Envio vazio valida ferramenta, membro e checklist", async () => {
  await ir(staff, "/emprestimos/nova");
  await staff.getByRole("button", { name: "Confirmar retirada" }).click();
  await staff.locator('input[name="membroId"][aria-invalid="true"]').waitFor({ timeout: T });
  await staff.locator('[role="radiogroup"][aria-invalid="true"]').waitFor({ timeout: T });
  await staff.locator('textarea[aria-invalid="true"]').waitFor({ timeout: T });
  await ve(staff, 'Liste os acessórios ou marque "Nenhum".');
  confere(sql("select count(*) from emprestimos") === "0", "empréstimo criado indevidamente");
});
const CHECK_OK = { estado: "INTACT", semAvarias: true, acessorios: ["Maleta", "Broca 8 mm"] };
await passo("Retirada", "Membro inexistente (404) marca o campo ID", async () => {
  await retirada(staff, { ferramentaCodigo: FERRAMENTAS.fur.codigo, membroId: "00000000-0000-4000-8000-000000000000", checklist: CHECK_OK });
  await ve(staff, "Nenhum membro com este ID.");
  await ve(staff, "A retirada não foi confirmada");
});
await passo("Retirada", "Tomador Staff (422) é recusado", async () => {
  requer("idStaff");
  await retirada(staff, { ferramentaCodigo: FERRAMENTAS.fur.codigo, membroId: estado.idStaff, checklist: CHECK_OK });
  await ve(staff, "Este ID é de uma conta Staff. Empréstimos são só para membros.");
  confere(sql("select count(*) from emprestimos") === "0", "empréstimo criado para Staff");
});
await passo("Retirada", "Retirada confirmada gera comprovante com código e prazo", async () => {
  requer("idA");
  await retirada(staff, { ferramentaCodigo: FERRAMENTAS.fur.codigo, membroId: estado.idA, checklist: CHECK_OK });
  estado.emp1 = await codigoDoComprovante(staff);
  await toast(staff, "Retirada confirmada.");
  const texto = await staff.locator("main").innerText();
  for (const t of ["Devolver até", FERRAMENTAS.fur.codigo, FERRAMENTAS.fur.nome, "Maleta", "Broca 8 mm", "Sem avarias"]) {
    confere(texto.includes(t), `comprovante sem "${t}"`);
  }
  confere(sql(`select status||'|'||dias_prazo from emprestimos where id='${estado.emp1}'`) === "ACTIVE|7", "registro no banco");
});
await passo("Retirada", "Ferramenta passa a Emprestada e bloqueia mudança de status", async () => {
  requer("id_fur");
  await ir(staff, `/ferramentas/${estado.id_fur}`);
  await ve(staff, "Emprestada");
  await ve(staff, "Ferramenta emprestada não muda de status. Registre a devolução primeiro.");
  confere((await staff.getByRole("button", { name: "Inativar" }).count()) === 0, "Inativar disponível para emprestada");
});
await passo("Retirada", "Ferramenta emprestada sai da seleção de retirada", async () => {
  await ir(staff, "/emprestimos/nova");
  await staff.getByRole("radio", { name: new RegExp(FERRAMENTAS.ser.codigo) }).waitFor({ timeout: T });
  confere((await staff.getByRole("radio", { name: new RegExp(FERRAMENTAS.fur.codigo) }).count()) === 0, "emprestada listada");
});
await passo("Empréstimos", "Detalhe do empréstimo (Staff): régua, responsáveis, checklist e devolução", async () => {
  requer("emp1");
  await ir(staff, `/emprestimos/${estado.emp1}`);
  await heading(staff, FERRAMENTAS.fur.nome);
  await staff.getByRole("link", { name: "Registrar devolução" }).waitFor({ timeout: T });
  for (const t of ["Prazo", "Responsáveis", "Checklists de conservação"]) await heading(staff, t);
});
await passo("Retirada", "Segunda retirada para o mesmo membro (sem atraso) é aceita", async () => {
  requer("idA");
  await retirada(staff, { ferramentaCodigo: FERRAMENTAS.ser.codigo, membroId: estado.idA, checklist: { estado: "INTACT", semAvarias: true, nenhum: true } });
  estado.emp2 = await codigoDoComprovante(staff);
});

// ===== Atraso e bloqueio
await passo("Atraso", "Retroagir o prazo do empréstimo 1 no banco de teste", async () => {
  requer("emp1");
  // Controle explícito: só o empréstimo 1, só no contêiner de teste; prazo 3 dias no passado.
  const r = sql(
    `update emprestimos set data_hora_retirada = data_hora_retirada - interval '10 days', prazo_devolucao = data_hora_retirada - interval '3 days' where id='${estado.emp1}' and status='ACTIVE' returning id`,
  );
  confere(r.includes(estado.emp1), `update não afetou o empréstimo: ${r}`);
});
await passo("Atraso", "Detalhe mostra o empréstimo Em atraso", async () => {
  await ir(staff, `/emprestimos/${estado.emp1}`);
  await ve(staff, "Em atraso");
});
await passo("Atraso", "Nova retirada para membro em atraso: bloqueio 409 com pendências", async () => {
  await retirada(staff, { ferramentaCodigo: FERRAMENTAS.cha.codigo, membroId: estado.idA, checklist: CHECK_OK });
  await heading(staff, "Retirada bloqueada: membro com empréstimo em atraso");
  const painel = staff.locator('section[role="alert"]');
  const link = painel.getByRole("link", { name: /Empréstimo/ }).first();
  confere((await link.getAttribute("href")) === `/emprestimos/${estado.emp1}`, "link da pendência incorreto");
  await painel.getByText(/em atraso desde/).first().waitFor({ timeout: T });
  confere(sql(`select status from ferramentas where id='${estado.id_cha}'`) === "AVAILABLE", "ferramenta mudou de status");
});
await passo("Atraso", "Lista de acompanhados filtra Em atraso", async () => {
  await ir(staff, "/emprestimos");
  await staff.getByRole("group", { name: "Filtrar empréstimos" }).getByRole("button", { name: /Em atraso/ }).click();
  await staff.locator(`a[href="/emprestimos/${estado.emp1}"]`).first().waitFor({ timeout: T });
  confere((await staff.locator(`a[href="/emprestimos/${estado.emp2}"]`).count()) === 0, "empréstimo em dia no filtro de atraso");
});

// ===== Consulta pelo membro e 403
await passo("Permissões", "Membro abre o próprio empréstimo pelo código, sem ações de Staff", async () => {
  requer("emp1");
  await ir(membroA, "/emprestimos");
  await heading(membroA, "Meus empréstimos");
  await membroA.getByLabel("Abrir pelo código do comprovante").fill(estado.emp1);
  await membroA.getByRole("button", { name: "Abrir" }).click();
  await urlTermina(membroA, new RegExp(`/emprestimos/${estado.emp1}$`));
  await heading(membroA, FERRAMENTAS.fur.nome);
  await ve(membroA, "Em atraso");
  confere((await membroA.getByRole("link", { name: "Registrar devolução" }).count()) === 0, "membro vê Registrar devolução");
});
await passo("Permissões", "Membro não acessa a devolução (rota de Staff)", async () => {
  await ir(membroA, `/emprestimos/${estado.emp1}/devolucao`);
  await urlTermina(membroA, /^\/acesso-negado$/);
});
await passo("Permissões", "Outro membro recebe 403 ao abrir empréstimo alheio", async () => {
  await entrar(membroB, MEMBRO_B);
  await ir(membroB, `/emprestimos/${estado.emp1}`);
  await ve(membroB, "Este empréstimo não é seu");
  await naoVe(membroB, FERRAMENTAS.fur.nome);
});
await passo("Empréstimos", "Código inexistente mostra não encontrado", async () => {
  await ir(membroB, "/emprestimos/00000000-0000-4000-8000-000000000000");
  await ve(membroB, "Empréstimo não encontrado");
});

// ===== Devolução
await passo("Devolução", "Checklist de devolução destaca divergências em relação à retirada", async () => {
  requer("emp1");
  await ir(staff, `/emprestimos/${estado.emp1}/devolucao`);
  await heading(staff, `Devolução: ${FERRAMENTAS.fur.nome}`);
  await ve(staff, "Preencha o checklist de devolução para comparar.");
  const volta = staff.locator('section[aria-labelledby="titulo-volta"]');
  await preencherChecklist(staff, volta, { estado: "DEFECTIVE", avarias: "Mandril com folga.", acessorios: ["Maleta"] });
  await ve(staff, "Diferenças em relação à retirada");
  await ve(staff, /3 diferenças em relação à retirada\./);
});
await passo("Devolução", "Revisão antes da confirmação compara os dois checklists", async () => {
  await staff.getByRole("button", { name: "Revisar devolução" }).click();
  const dialogo = staff.getByRole("alertdialog");
  await dialogo.getByText("Confirmar devolução?").waitFor({ timeout: T });
  await dialogo.getByText("Há 3 diferenças em relação à retirada.").waitFor({ timeout: T });
  await dialogo.getByRole("button", { name: "Voltar e revisar" }).click();
  await dialogo.waitFor({ state: "hidden", timeout: T });
  confere(sql(`select status from emprestimos where id='${estado.emp1}'`) === "ACTIVE", "voltar não deveria registrar");
});
await passo("Devolução", "Confirmação registra a devolução e encerra o empréstimo", async () => {
  await staff.getByRole("button", { name: "Revisar devolução" }).click();
  await staff.getByRole("alertdialog").getByRole("button", { name: "Confirmar devolução" }).click();
  await urlTermina(staff, new RegExp(`/emprestimos/${estado.emp1}$`));
  await toast(staff, "Devolução registrada.");
  await ve(staff, "Devolvido");
  confere((await staff.getByRole("link", { name: "Registrar devolução" }).count()) === 0, "ainda oferece devolução");
  confere(sql(`select status from emprestimos where id='${estado.emp1}'`) !== "ACTIVE", "empréstimo continua ativo no banco");
});
await passo("Devolução", "Detalhe encerrado mostra os checklists lado a lado com diferenças", async () => {
  const texto = await staff.locator("main").innerText();
  for (const t of ["Mandril com folga.", "Broca 8 mm", "Com defeito", "Íntegra"]) confere(texto.includes(t), `sem "${t}"`);
});
await passo("Devolução", "Ferramenta devolvida volta a Disponível", async () => {
  await ir(staff, `/ferramentas/${estado.id_fur}`);
  await ve(staff, "Disponível");
  confere(sql(`select status from ferramentas where id='${estado.id_fur}'`) === "AVAILABLE", "banco não está AVAILABLE");
});
await passo("Devolução", "Devolução repetida é impedida (empréstimo já encerrado)", async () => {
  await ir(staff, `/emprestimos/${estado.emp1}/devolucao`);
  await ve(staff, "Este empréstimo já foi encerrado");
});
await passo("Atraso", "Bloqueio é liberado após a regularização", async () => {
  await retirada(staff, { ferramentaCodigo: FERRAMENTAS.cha.codigo, membroId: estado.idA, checklist: CHECK_OK });
  estado.emp3 = await codigoDoComprovante(staff);
});
await passo("Devolução", "\"Igual à retirada\" produz devolução sem diferenças", async () => {
  requer("emp2");
  await ir(staff, `/emprestimos/${estado.emp2}/devolucao`);
  await staff.getByRole("button", { name: "Igual à retirada" }).click();
  await ve(staff, "Sem diferenças em relação à retirada");
  await staff.getByRole("button", { name: "Revisar devolução" }).click();
  await staff.getByRole("alertdialog").getByRole("button", { name: "Confirmar devolução" }).click();
  await urlTermina(staff, new RegExp(`/emprestimos/${estado.emp2}$`));
  await ve(staff, "Devolvido");
});

// ===== Contas Staff
await passo("Staff", "Criação de conta Staff em Configurações", async () => {
  await ir(staff, "/configuracoes");
  const form = staff.locator("form").filter({ has: staff.getByRole("button", { name: "Criar conta Staff" }) });
  await form.getByLabel("Nome completo").fill(STAFF2.nome);
  await form.getByLabel("E-mail", { exact: true }).fill(STAFF2.email);
  await form.getByLabel("Senha", { exact: true }).fill(STAFF2.senha);
  await form.getByRole("button", { name: "Criar conta Staff" }).click();
  await ve(staff, `${STAFF2.nome} agora é Staff`);
  confere(sql(`select papel from usuarios where email='${STAFF2.email}'`) === "STAFF", "papel no banco");
});
await passo("Staff", "Conta Staff com e-mail repetido (409)", async () => {
  const form = staff.locator("form").filter({ has: staff.getByRole("button", { name: "Criar conta Staff" }) });
  await form.getByLabel("Nome completo").fill("Repetida");
  await form.getByLabel("E-mail", { exact: true }).fill(MEMBRO_A.email);
  await form.getByLabel("Senha", { exact: true }).fill(STAFF2.senha);
  await form.getByRole("button", { name: "Criar conta Staff" }).click();
  await ve(staff, "Este e-mail já tem cadastro.");
});
await passo("Staff", "Novo Staff entra e vê a navegação administrativa", async () => {
  const p = await (await novoContexto()).newPage();
  await entrar(p, STAFF2);
  await p.locator("aside").getByRole("link", { name: "Configurações" }).waitFor({ timeout: T });
  await p.context().close();
});

// ===== Sessão: expiração, adulteração, papel forjado
await passo("Sessão", "Cookie de sessão é httpOnly (inacessível ao JavaScript)", async () => {
  const c = await cookieSessao(ctxStaff);
  confere(c?.httpOnly === true, "cookie sem httpOnly");
  confere(c?.sameSite === "Lax", `sameSite=${c?.sameSite}`);
  confere(!(await staff.evaluate(() => document.cookie)).includes("mt_session"), "document.cookie expõe a sessão");
});
await passo("Sessão", "Sessão vencida redireciona ao login com aviso e preserva o destino", async () => {
  const ctx = await novoContexto();
  const p = await ctx.newPage();
  await entrar(p, MEMBRO_B);
  await trocarCookie(ctx, (s) => ({ ...s, expiraEm: new Date(Date.now() - 60_000).toISOString() }));
  await ir(p, "/ferramentas");
  await urlTermina(p, /^\/login\?next=%2Fferramentas&motivo=expirada$/);
  await ve(p, "Sua sessão expirou");
  confere(!(await cookieSessao(ctx)), "cookie vencido não foi removido");
  await ctx.close();
});
await passo("Sessão", "Token adulterado (401 da API) encerra a sessão", async () => {
  const ctx = await novoContexto();
  const p = await ctx.newPage();
  await entrar(p, MEMBRO_B);
  await trocarCookie(ctx, (s) => ({ ...s, token: s.token.slice(0, -6) + "AAAAAA" }));
  await ir(p, "/ferramentas");
  await urlTermina(p, /^\/login\?motivo=expirada$/);
  await ve(p, "Sua sessão expirou");
  confere(!(await cookieSessao(ctx)), "cookie adulterado não foi removido");
  await ctx.close();
});
await passo("Sessão", "Cookie corrompido é tratado como ausência de sessão", async () => {
  const ctx = await novoContexto();
  const p = await ctx.newPage();
  await entrar(p, MEMBRO_B);
  await trocarCookie(ctx, "nao-e-base64-json");
  await ir(p, "/painel");
  await urlTermina(p, /^\/login\?next=%2Fpainel&motivo=expirada$/);
  await ctx.close();
});
await passo("Permissões", "Papel forjado no cookie (MEMBER→STAFF) é barrado pela API (403)", async () => {
  const ctx = await novoContexto();
  const p = await ctx.newPage();
  paginaAtual = p;
  await entrar(p, MEMBRO_B);
  await trocarCookie(ctx, (s) => ({ ...s, usuario: { ...s.usuario, papel: "STAFF" } }));
  const antes = sql("select count(*) from ferramentas");
  await ir(p, "/ferramentas/nova");
  await preencherFerramenta(p, { codigo: COD("HACK"), nome: "Forjada", categoria: "Teste", valor: "1,00", estado: "Nada" });
  await p.getByRole("button", { name: "Cadastrar ferramenta" }).click();
  await ve(p, "Seu perfil não tem permissão para esta operação.");
  confere(sql("select count(*) from ferramentas") === antes, "API aceitou cadastro com papel forjado");
  await ir(p, "/configuracoes");
  await naoVe(p, "Vigente");
  await ctx.close();
});

// ===== Responsividade
const PAGINAS = () => [
  "/painel",
  "/ferramentas",
  "/ferramentas?vista=grade",
  `/ferramentas/${estado.id_fur}`,
  `/ferramentas/${estado.id_fur}/editar`,
  "/ferramentas/nova",
  "/emprestimos",
  "/emprestimos/nova",
  `/emprestimos/${estado.emp1}`,
  `/emprestimos/${estado.emp3}/devolucao`,
  "/configuracoes",
  "/perfil",
];
const medidasBusca = {};
for (const vp of ["mobile", "tablet", "desktop"]) {
  const ctx = await novoContexto(vp, vp === "mobile" ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {});
  const p = await ctx.newPage();
  await passo(`Responsivo ${VIEWPORTS[vp].width}`, "Login e cadastro sem rolagem horizontal", async () => {
    for (const r of ["/login", "/cadastro"]) {
      await ir(p, r);
      await semRolagemHorizontal(p);
    }
    await shot(p, `${vp}-cadastro`);
  });
  await passo(`Responsivo ${VIEWPORTS[vp].width}`, "Busca do cabeçalho: placeholder inteiro, sem transbordar", async () => {
    await entrar(p, STAFF);
    const m = await medirBuscaCabecalho(p);
    confere(m, "campo de busca ausente");
    const focado = await (async () => {
      await p.locator("#busca-global").focus();
      await p.waitForTimeout(350);
      return medirBuscaCabecalho(p);
    })();
    medidasBusca[vp] = { repouso: m, foco: focado };
    confere(m.placeholder === "Buscar ferramenta", `placeholder: ${m.placeholder}`);
    confere(m.cabe, `placeholder cortado: texto ${m.texto}px > área ${m.disponivel}px`);
    confere(m.direita <= m.vw && focado.direita <= focado.vw, `campo ultrapassa a tela (${m.direita}/${focado.direita} > ${m.vw})`);
    confere(!m.headerTransborda && !focado.headerTransborda, "cabeçalho transborda");
    await p.locator("#busca-global").blur();
    await shot(p, `${vp}-painel`);
  });
  await passo(`Responsivo ${VIEWPORTS[vp].width}`, "12 telas autenticadas sem rolagem horizontal", async () => {
    requer("id_fur", "emp1", "emp3");
    const falhas = [];
    for (const r of PAGINAS()) {
      await ir(p, r);
      await p.locator("main h1").first().waitFor({ timeout: T });
      try {
        await semRolagemHorizontal(p);
      } catch (e) {
        falhas.push(`${r}: ${e.message}`);
      }
    }
    confere(falhas.length === 0, falhas.join("; "));
  });
  await ctx.close();
}

// Fluxos críticos no celular (390 px)
{
  const ctx = await novoContexto("mobile", { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await passo("Mobile 390", "Gaveta de navegação abre e navega", async () => {
    await entrar(p, STAFF);
    confere(!(await p.locator("aside").isVisible()), "sidebar fixa visível no celular");
    await p.getByRole("button", { name: "Abrir menu" }).click();
    const gaveta = p.getByRole("dialog");
    await gaveta.getByRole("link", { name: "Ferramentas", exact: true }).click();
    await urlTermina(p, /^\/ferramentas$/);
    await gaveta.waitFor({ state: "hidden", timeout: T });
  });
  await passo("Mobile 390", "Catálogo vira lista (tabela oculta)", async () => {
    confere(!(await p.locator("table").isVisible()), "tabela visível no celular");
    await p.locator("ul li").filter({ hasText: FERRAMENTAS.tre.codigo }).first().waitFor({ timeout: T });
    await shot(p, "mobile-ferramentas");
  });
  await passo("Mobile 390", "Retirada completa pelo celular", async () => {
    requer("idA");
    // Membro A está em dia (emp1 e emp2 devolvidos; emp3 dentro do prazo).
    await retirada(p, { ferramentaCodigo: FERRAMENTAS.tre.codigo, membroId: estado.idA, checklist: { estado: "INTACT", semAvarias: true, acessorios: ["Estojo"] } });
    estado.emp4 = await codigoDoComprovante(p);
    await semRolagemHorizontal(p);
    await shot(p, "mobile-comprovante");
  });
  await passo("Mobile 390", "Devolução completa pelo celular", async () => {
    requer("emp4");
    await ir(p, `/emprestimos/${estado.emp4}/devolucao`);
    await p.getByRole("button", { name: "Igual à retirada" }).click();
    await p.getByRole("button", { name: "Revisar devolução" }).click();
    await shot(p, "mobile-revisao-devolucao");
    await p.getByRole("alertdialog").getByRole("button", { name: "Confirmar devolução" }).click();
    await urlTermina(p, new RegExp(`/emprestimos/${estado.emp4}$`));
    await ve(p, "Devolvido");
  });
  await passo("Mobile 390", "Tema escuro pelo menu da conta", async () => {
    await p.getByRole("button", { name: "Abrir menu" }).click();
    await p.getByRole("dialog").getByRole("button", { name: /^Conta de / }).click();
    await p.getByRole("button", { name: "Escuro" }).click();
    await p.waitForFunction(() => document.documentElement.classList.contains("dark"));
    await p.keyboard.press("Escape");
    await p.keyboard.press("Escape");
    await semRolagemHorizontal(p);
    await shot(p, "mobile-escuro");
  });
  await passo("Mobile 390", "Logout pelo celular", async () => {
    await ir(p, "/painel");
    await sair(p);
  });
  await ctx.close();
}

await browser.close();

// ---------------------------------------------------------------- relatório
const resumo = {
  total: resultados.length,
  ok: resultados.filter((r) => r.status === "OK").length,
  falhou: resultados.filter((r) => r.status === "FALHOU").length,
  naoExecutado: resultados.filter((r) => r.status === "NÃO EXECUTADO").length,
};
writeFileSync(join(OUT, "resultado.json"), JSON.stringify({ base: BASE, sufixo: SUF, resumo, medidasBusca, resultados }, null, 2));
console.log(`\nResumo: ${resumo.ok}/${resumo.total} OK, ${resumo.falhou} falharam, ${resumo.naoExecutado} não executados`);
console.log("Busca do cabeçalho:", JSON.stringify(medidasBusca, null, 1));
process.exit(resumo.falhou + resumo.naoExecutado > 0 ? 1 : 0);
