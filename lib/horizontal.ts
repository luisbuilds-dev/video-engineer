// Vídeo horizontal (YouTube): capítulos y grabaciones de pantalla con zoom a lo que se nombra.

import type { Pista } from "./sensibles";

export type Capitulo = { titulo: string; desdeMs: number };
/** Burbuja de cámara sobre las grabaciones de pantalla, en px a 1080 p (la dibuja Horizontal.tsx; la composición la esquiva). */
export const BURBUJA = { lado: 460, margen: 56 };
export type Rect = { x: number; y: number; w: number; h: number }; // fracción 0..1 de la grabación de pantalla
export type ZoomPantalla = Rect & { desdeMs: number }; // a partir de desdeMs (absoluto) se enfoca esa zona
export type Pantalla = { archivo: string; desdeMs: number; hastaMs: number; inicioS: number; zooms: ZoomPantalla[];
  relacion?: number; // (ancho/alto de salida) / (ancho/alto de la grabación): 1 = misma forma
  difuminar?: Pista[]; // datos sensibles que se tapan (npm run sensibles), en segundos de la grabación
};

/** Reglas de YouTube para que los capítulos aparezcan en la barra: el primero en 0:00, al menos 3, cada uno ≥ 10 s. */
export function validarCapitulos(caps: Capitulo[], duracionMs: number): string[] {
  const errores: string[] = [];
  if (caps.length < 3) errores.push("YouTube necesita al menos 3 capítulos");
  if (caps[0]?.desdeMs !== 0) errores.push("el primer capítulo tiene que empezar en 0:00");
  caps.forEach((c, i) => {
    const fin = caps[i + 1]?.desdeMs ?? duracionMs;
    if (i > 0 && c.desdeMs <= caps[i - 1].desdeMs) errores.push(`«${c.titulo}» no está en orden`);
    if (fin - c.desdeMs < 10000) errores.push(`«${c.titulo}» dura menos de 10 s`);
  });
  return errores;
}

export function marca(ms: number): string {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const dd = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${dd(m)}:${dd(r)}` : `${dd(m)}:${dd(r)}`;
}

/** Bloque para pegar en la descripción de YouTube. */
export const marcasYouTube = (caps: Capitulo[]) => caps.map((c) => `${marca(c.desdeMs)} ${c.titulo}`).join("\n");

const suave = (x: number) => x * x * (3 - 2 * x);

/**
 * Zona de la grabación de pantalla visible en tMs: pasa de un zoom al siguiente en `transicionMs` con suavizado.
 * Sin zooms, la pantalla entera.
 */
export function zonaPantalla(tMs: number, zooms: ZoomPantalla[], transicionMs = 600): Rect {
  const entera: Rect = { x: 0, y: 0, w: 1, h: 1 };
  const orden = [...zooms].sort((a, b) => a.desdeMs - b.desdeMs);
  let previo: Rect = entera, actual: Rect = entera, desde = -Infinity;
  for (const z of orden) {
    if (z.desdeMs > tMs) break;
    previo = actual; actual = z; desde = z.desdeMs;
  }
  const p = Math.min(1, Math.max(0, (tMs - desde) / transicionMs));
  const k = suave(p);
  return { x: previo.x + (actual.x - previo.x) * k, y: previo.y + (actual.y - previo.y) * k,
    w: previo.w + (actual.w - previo.w) * k, h: previo.h + (actual.h - previo.h) * k };
}

/**
 * La zona pedida con la forma del encuadre de salida (un zoom nunca deforma) y dentro de los bordes.
 * `relacion` = (ancho/alto de la salida) ÷ (ancho/alto de la grabación): 1 si tienen la misma forma,
 * porque en coordenadas normalizadas una zona con la forma de la pantalla tiene w = h.
 */
export function ajustarZona(r: Rect, relacion = 1): Rect {
  let { w, h } = r;
  if (w / h > relacion) h = w / relacion; else w = h * relacion;
  const f = Math.min(Math.max(1, 0.15 / Math.min(w, h)), 1 / Math.max(w, h)); // mínimo 15 %, máximo la pantalla entera
  w *= f; h *= f;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  return { x: Math.min(1 - w, Math.max(0, cx - w / 2)), y: Math.min(1 - h, Math.max(0, cy - h / 2)), w, h };
}
