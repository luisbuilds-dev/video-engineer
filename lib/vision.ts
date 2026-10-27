// Lo que el ingeniero «ve» del vídeo y las decisiones que salen de ahí. Funciones puras (se prueban sin vídeo).
// Coordenadas normalizadas 0..1 sobre el fotograma ORIGINAL (x hacia la derecha, y hacia abajo).

export type Caja = { x: number; y: number; w: number; h: number; score?: number };
export type Fotograma = { tMs: number; caras: Caja[]; movimiento: number[] }; // movimiento: 10 franjas horizontales 0..1
export type Zoom = { desdeMs: number; hastaMs: number; escala: number; cx: number; cy: number };

export const FRANJAS = 10;

export function iou(a: Caja, b: Caja): number {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
}

/** Supresión de no máximos: de las cajas que se solapan se queda la de más puntuación. */
export function nms(cajas: Caja[], umbral = 0.3): Caja[] {
  const orden = [...cajas].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const salida: Caja[] = [];
  for (const c of orden) if (salida.every((s) => iou(s, c) < umbral)) salida.push(c);
  return salida;
}

/** La caja que hay que proteger de los subtítulos: la cara ampliada (pelo, barbilla, gesto) y, si hay zoom, aumentada. */
function protegida(cara: Caja, zoom?: Zoom): Caja {
  // la caja del detector va de cejas a barbilla: se amplía para proteger también el pelo y algo de cuello
  let c = { x: cara.x - cara.w * 0.15, y: cara.y - cara.h * 0.5, w: cara.w * 1.3, h: cara.h * 1.8 };
  if (zoom) {
    const z = zoom.escala;
    c = { x: zoom.cx + (c.x - zoom.cx) * z, y: zoom.cy + (c.y - zoom.cy) * z, w: c.w * z, h: c.h * z };
  }
  return c;
}

const zoomEn = (zooms: Zoom[], t: number) => zooms.find((z) => t >= z.desdeMs && t < z.hastaMs);

/**
 * Altura (centro del texto, 0..1) para una página de subtítulos que se ve entre desdeMs y hastaMs.
 * Prueba posiciones candidatas y elige la que menos tapa: la cara pesa mucho, el movimiento (manos, gestos) un poco,
 * y alejarse de la posición del estilo, un poco más.
 */
export type Ocupado = { desdeMs: number; hastaMs: number; y: number; h: number; x?: number; w?: number }; // ya colocado

const cruzaX = (a: { x: number; w: number }, b: { x: number; w: number }) => a.x < b.x + b.w && b.x < a.x + a.w;

/** columna: franja horizontal donde va el elemento (por defecto casi todo el ancho; en 16:9 los gráficos van a un lado). */
export function posicionSubtitulo(fotos: Fotograma[], desdeMs: number, hastaMs: number, preferida: number,
  altoTexto: number, zooms: Zoom[] = [], anterior?: number, ocupados: Ocupado[] = [], columna = { x: 0.06, w: 0.88 }): number {
  const candidatas = [...new Set([preferida, anterior ?? preferida, 0.12, 0.2, 0.3, 0.5, 0.62, 0.72, 0.82, 0.88].map((v) => +v.toFixed(2)))];
  // solo los fotogramas de la página (sin margen: justo antes puede haber otra escena, p. ej. la pantalla con la burbuja);
  // si la página es tan corta que no cae ninguno, el más cercano
  let ventana = fotos.filter((f) => f.tMs >= desdeMs && f.tMs < hastaMs);
  if (!ventana.length && fotos.length) ventana = [fotos.reduce((a, b) => (Math.abs(b.tMs - desdeMs) < Math.abs(a.tMs - desdeMs) ? b : a))];
  if (!ventana.length) return preferida;
  const encima = ocupados.filter((o) => o.hastaMs > desdeMs && o.desdeMs < hastaMs && cruzaX(columna, { x: o.x ?? 0, w: o.w ?? 1 }));
  let mejor = preferida, coste = Infinity;
  for (const y of candidatas) {
    const banda = { ...columna, y: y - altoTexto / 2, h: altoTexto };
    if (banda.y < 0.04 || banda.y + banda.h > 0.96) continue;
    // pisar otro texto ya colocado (con 1 % de aire) es casi prohibido: pesa 4 veces más que rozar la cara
    const pisa = Math.max(0, ...encima.map((o) =>
      Math.max(0, Math.min(banda.y + banda.h, o.y + o.h + 0.01) - Math.max(banda.y, o.y - 0.01)) / banda.h));
    let tapa = 0, mueve = 0;
    for (const f of ventana) {
      const z = zoomEn(zooms, f.tMs);
      for (const c of f.caras) {
        const p = protegida(c, z);
        if (!cruzaX(banda, p)) continue; // la cara está en otra columna
        const solape = Math.max(0, Math.min(banda.y + banda.h, p.y + p.h) - Math.max(banda.y, p.y));
        tapa = Math.max(tapa, solape / banda.h);
      }
      const a = Math.max(0, Math.floor(banda.y * FRANJAS)), b = Math.min(FRANJAS - 1, Math.floor((banda.y + banda.h) * FRANJAS));
      for (let i = a; i <= b; i++) mueve += f.movimiento[i] ?? 0;
    }
    // inercia: cambiar de altura entre páginas seguidas distrae, así que moverse cuesta (solo compensa si tapaba)
    const c = pisa * 400 + tapa * 100 + (mueve / ventana.length) * 20 + Math.abs(y - preferida) * 8 + (anterior === undefined ? 0 : Math.abs(y - anterior) * 25);
    if (c < coste) { coste = c; mejor = y; }
  }
  return mejor;
}

/** Centro medio de la cara principal (la más grande) en una ventana; por defecto, el centro del encuadre. */
export function centroCara(fotos: Fotograma[], desdeMs: number, hastaMs: number): { cx: number; cy: number } {
  const caras = fotos.filter((f) => f.tMs >= desdeMs && f.tMs <= hastaMs && f.caras.length)
    .map((f) => [...f.caras].sort((a, b) => b.w * b.h - a.w * a.h)[0]);
  if (!caras.length) return { cx: 0.5, cy: 0.4 };
  return { cx: caras.reduce((s, c) => s + c.x + c.w / 2, 0) / caras.length, cy: caras.reduce((s, c) => s + c.y + c.h / 2, 0) / caras.length };
}

/**
 * Ritmo: tramos «planos» (sin cortes de tarjeta ni zoom y con poco movimiento) más largos que maxPlanoMs.
 * Ahí el espectador se aburre: se proponen zooms de golpe (punch-in) en el inicio de las frases que caen dentro.
 */
export function planificarZooms(fotos: Fotograma[], inicios: number[], duracionMs: number, opciones = {
  maxPlanoMs: 2600, escala: 1.14, minDuracionMs: 1400, evitar: [] as { desdeMs: number; hastaMs: number }[],
}): Zoom[] {
  const zooms: Zoom[] = [];
  let ultimoCambio = 0, activo = false;
  const ocupado = (t: number) => opciones.evitar.some((e) => t >= e.desdeMs - 200 && t <= e.hastaMs);
  for (const t of inicios) {
    if (t - ultimoCambio < opciones.maxPlanoMs || ocupado(t)) continue;
    // cambio de encuadre: si estaba ampliado vuelve al plano normal, si no, amplía hacia la cara
    const siguiente = inicios.find((x) => x > t + opciones.minDuracionMs) ?? duracionMs;
    if (!activo) zooms.push({ desdeMs: t, hastaMs: Math.min(siguiente, duracionMs), escala: opciones.escala, ...centroCara(fotos, t, siguiente) });
    activo = !activo;
    ultimoCambio = t;
  }
  return zooms;
}

/** Informe de ritmo por segundo: movimiento medio, palabras por segundo y si hay cara. */
export function informeRitmo(fotos: Fotograma[], palabras: { desdeMs: number }[], duracionMs: number) {
  const segundos = Math.ceil(duracionMs / 1000);
  return Array.from({ length: segundos }, (_, s) => {
    const fs = fotos.filter((f) => f.tMs >= s * 1000 && f.tMs < (s + 1) * 1000);
    const mov = fs.length ? fs.reduce((a, f) => a + f.movimiento.reduce((x, y) => x + y, 0) / FRANJAS, 0) / fs.length : 0;
    return { segundo: s, movimiento: +mov.toFixed(3), palabras: palabras.filter((p) => p.desdeMs >= s * 1000 && p.desdeMs < (s + 1) * 1000).length,
      cara: fs.some((f) => f.caras.length) };
  });
}
