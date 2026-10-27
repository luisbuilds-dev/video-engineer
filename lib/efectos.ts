// Momentos (lo que Claude marca en decisiones.json) → gráficos y efectos de sonido.
// Claude decide el QUÉ («aquí una cifra», «aquí una lista de 3 pasos»); esto decide el CÓMO suena, de forma
// consistente con el estilo y sin saturar: separación mínima entre efectos y sin repetir el mismo dos veces seguidas.

import type { TipoCamara } from "./camara";
import type { Disposicion, Enlace, Nodo } from "./diagrama";

export const ESCENAS = ["icono", "proceso", "caos-orden", "antes-despues", "ensamblar"] as const;
export type Escena = (typeof ESCENAS)[number];

export type Momento =
  | { tipo: "cifra"; desdeMs: number; hastaMs?: number; valor: number; prefijo?: string; sufijo?: string; etiqueta: string; decimales?: number }
  | { tipo: "barras"; desdeMs: number; hastaMs?: number; titulo?: string; sufijo?: string; items: { etiqueta: string; valor: number }[] }
  | { tipo: "lista"; desdeMs: number; hastaMs?: number; titulo?: string; items: { texto: string; desdeMs: number }[] }
  | { tipo: "sello"; desdeMs: number; hastaMs?: number; texto: string; tono?: "alerta" | "ok" }
  | { tipo: "ilustracion"; escena: Escena; desdeMs: number; hastaMs?: number; ordenMs?: number;
      etiquetaAntes?: string; etiquetaDespues?: string; items: { icono: string; etiqueta?: string; desdeMs: number }[] }
  | { tipo: "logos"; desdeMs: number; hastaMs?: number; titulo?: string; items: { logo: string; etiqueta?: string; desdeMs: number }[] }
  | { tipo: "diagrama"; desdeMs: number; hastaMs?: number; titulo?: string; disposicion: Disposicion; nodos: Nodo[]; enlaces?: Enlace[] }
  | { tipo: "sonido"; desdeMs: number; efecto: string }
  | { tipo: "camara"; desdeMs: number; efecto: TipoCamara; duracionMs?: number; intensidad?: number };

export type MomentoVisible = Exclude<Momento, { tipo: "sonido" } | { tipo: "camara" }>;
export type Grafico = MomentoVisible & { hastaMs: number; posicion: number; lado?: "centro" | "izquierda" | "derecha" };
export type Sonido = { desdeMs: number; archivo: string; volumenDb: number };
export type Densidad = "limpio" | "medio" | "movido";

/** Cuánto dura en pantalla cada gráfico si Claude no lo dice. */
export function duracionGrafico(m: MomentoVisible): number {
  if (m.hastaMs) return m.hastaMs - m.desdeMs;
  if (m.tipo === "cifra") return 2600;
  if (m.tipo === "barras") return 1400 + m.items.length * 700;
  if (m.tipo === "lista") return Math.max(...m.items.map((i) => i.desdeMs)) - m.desdeMs + 1800;
  if (m.tipo === "logos") return Math.max(m.desdeMs, ...m.items.map((i) => i.desdeMs)) - m.desdeMs + 2000;
  if (m.tipo === "diagrama") return Math.max(m.desdeMs, ...m.nodos.map((n) => n.desdeMs)) - m.desdeMs + 2200;
  if (m.tipo === "ilustracion") {
    if (m.escena === "proceso") return Math.max(...m.items.map((i) => i.desdeMs)) - m.desdeMs + 1800;
    if (m.escena === "caos-orden") return (m.ordenMs ?? m.desdeMs + 1200) - m.desdeMs + 2700;
    if (m.escena === "antes-despues") return 3000;
    if (m.escena === "ensamblar") return 1600 + m.items.length * 350 + 900;
    return 2200;
  }
  return 1600;
}
export const CUENTA_MS = 1100; // lo que tarda una cifra en contar hasta su valor

type Pedido = { desdeMs: number; tipo: string; prioridad: number; densidad: Densidad };
const NIVEL: Record<Densidad, number> = { limpio: 0, medio: 1, movido: 2 };

/**
 * Plan de sonido. `catalogo` = sonidos/catalogo.json (tipo → archivos). Reglas:
 *  - según la densidad del estilo entran más o menos efectos (un sello o una cifra suenan siempre);
 *  - entre dos efectos al menos `separacionMs`; si chocan, gana el de más prioridad;
 *  - del mismo tipo se alternan variantes (pop-1, pop-2…) para que no suene a bucle.
 */
export function planificarSonidos(o: {
  momentos: Momento[]; tarjetas: { desdeMs: number }[]; zooms: { desdeMs: number }[]; conGancho: boolean;
  densidad: Densidad; volumenDb: number; catalogo: { tipo: string; archivo: string }[]; separacionMs?: number;
}): Sonido[] {
  const pedidos: Pedido[] = [];
  const pide = (desdeMs: number, tipo: string, prioridad: number, densidad: Densidad) => pedidos.push({ desdeMs, tipo, prioridad, densidad });
  if (o.conGancho) pide(0, "impacto", 2, "medio");
  for (const t of o.tarjetas) pide(t.desdeMs, "whoosh", 2, "medio");
  for (const z of o.zooms) pide(z.desdeMs, "whoosh", 1, "movido");
  for (const m of o.momentos) {
    if (m.tipo === "sonido") pide(m.desdeMs, m.efecto, 5, "limpio");
    if (m.tipo === "camara" && m.efecto === "barrido") pide(m.desdeMs, "whoosh", 3, "limpio");
    if (m.tipo === "camara" && m.efecto === "glitch") pide(m.desdeMs, "glitch", 3, "medio");
    if (m.tipo === "sello") pide(m.desdeMs, "impacto", 4, "limpio");
    if (m.tipo === "cifra") {
      pide(m.desdeMs, "riser", 2, "movido");
      pide(m.desdeMs + CUENTA_MS, "impacto", 4, "limpio");
    }
    if (m.tipo === "barras") m.items.forEach((_, i) => pide(m.desdeMs + 300 + i * 450, "pop", 3, "medio"));
    if (m.tipo === "ilustracion") {
      if (m.escena === "proceso") m.items.forEach((it) => pide(it.desdeMs, "pop", 3, "limpio"));
      if (m.escena === "icono") pide(m.desdeMs, "pop", 3, "limpio");
      if (m.escena === "caos-orden") { const o = m.ordenMs ?? m.desdeMs + 1200; pide(o, "whoosh", 3, "limpio"); pide(o + 1500, "ding", 2, "medio"); }
      if (m.escena === "antes-despues") pide(m.desdeMs + 1000, "whoosh", 3, "limpio");
      if (m.escena === "ensamblar") { m.items.forEach((_, i) => pide(m.desdeMs + i * 350, "pop", 3, "medio")); pide(m.desdeMs + m.items.length * 350 + 400, "impacto", 3, "limpio"); }
    }
    if (m.tipo === "logos") m.items.forEach((it) => pide(it.desdeMs, "pop", 3, "limpio"));
    if (m.tipo === "diagrama") m.nodos.forEach((n) => pide(n.desdeMs, "pop", 3, "medio"));
    if (m.tipo === "lista") {
      m.items.forEach((it) => pide(it.desdeMs, "pop", 3, "limpio"));
      pide(Math.max(...m.items.map((i) => i.desdeMs)) + 450, "ding", 2, "medio");
    }
  }
  const sep = o.separacionMs ?? 320;
  const elegidos: Pedido[] = [];
  for (const p of pedidos.filter((p) => NIVEL[p.densidad] <= NIVEL[o.densidad]).sort((a, b) => b.prioridad - a.prioridad || a.desdeMs - b.desdeMs)) {
    // un mismo golpe (impacto, whoosh, ding…) repetido en menos de 1,5 s suena a bucle; los pops sí pueden encadenarse
    const repite = (e: Pedido) => e.tipo === p.tipo && !["pop", "tecleo"].includes(p.tipo) && Math.abs(e.desdeMs - p.desdeMs) < 1500;
    if (elegidos.every((e) => Math.abs(e.desdeMs - p.desdeMs) >= sep && !repite(e))) elegidos.push(p);
  }
  const usados = new Map<string, number>();
  return elegidos.sort((a, b) => a.desdeMs - b.desdeMs).flatMap((p) => {
    const variantes = o.catalogo.filter((c) => c.tipo === p.tipo);
    if (!variantes.length) return [];
    const n = usados.get(p.tipo) ?? 0;
    usados.set(p.tipo, n + 1);
    // los golpes suenan un poco más que los pops; todo por debajo de la voz
    const extra = p.tipo === "impacto" ? 1 : p.tipo === "pop" || p.tipo === "tecleo" ? -3 : 0;
    return [{ desdeMs: Math.max(0, Math.round(p.desdeMs)), archivo: variantes[n % variantes.length].archivo, volumenDb: o.volumenDb + extra }];
  });
}
