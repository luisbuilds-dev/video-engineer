// Cabecera del vídeo (arriba): barra de secciones que cronometra y onda que reacciona a tu voz.
// Todo se calcula aquí, antes del render: el render solo dibuja números (rápido y siempre igual).

export type Seccion = { titulo: string; desdeMs: number; hastaMs: number };

/** Secciones con su final; menos de 2 no tienen sentido como barra. */
export function secciones(lista: { titulo: string; desdeMs: number }[], duracionMs: number): Seccion[] {
  const orden = [...lista].sort((a, b) => a.desdeMs - b.desdeMs).filter((s) => s.desdeMs < duracionMs);
  if (orden.length < 2) return [];
  return orden.map((s, i) => ({ titulo: s.titulo, desdeMs: s.desdeMs, hastaMs: orden[i + 1]?.desdeMs ?? duracionMs }));
}

/** En qué sección va el vídeo y cuánto lleva de ella (0..1). */
export function progresoSeccion(tMs: number, s: Seccion[]): { actual: number; dentro: number } {
  const i = Math.max(0, s.findIndex((x) => tMs >= x.desdeMs && tMs < x.hastaMs));
  const x = s[i];
  return { actual: i, dentro: x ? Math.min(1, Math.max(0, (tMs - x.desdeMs) / (x.hastaMs - x.desdeMs))) : 0 };
}

/** Lee el volumen RMS por fotograma que imprime ffmpeg (astats + ametadata=print). */
export function leerRms(log: string): number[] {
  return [...log.matchAll(/lavfi\.astats\.Overall\.RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === "-inf" ? -120 : Number(m[1])));
}

/**
 * De decibelios por fotograma a alturas 0..1 para la onda: −50 dB o menos es silencio, −10 dB es lo más alto.
 * Sube rápido (ataque) y baja despacio (caída), como un vúmetro: así la onda «respira» con la voz en lugar de parpadear.
 */
export function nivelesOnda(db: number[], opciones = { suelo: -50, techo: -10, caida: 0.18 }): number[] {
  let nivel = 0;
  return db.map((d) => {
    const objetivo = Math.min(1, Math.max(0, (d - opciones.suelo) / (opciones.techo - opciones.suelo)));
    nivel = objetivo > nivel ? objetivo : nivel + (objetivo - nivel) * opciones.caida;
    return +nivel.toFixed(3);
  });
}

/**
 * Altura de cada barra de la onda simétrica en un fotograma: más alta en el centro, más baja hacia los extremos, con una
 * variación por barra que cambia con el tiempo (determinista: el mismo fotograma siempre da lo mismo).
 */
export function barrasOnda(nivel: number, frame: number, n = 31): number[] {
  const mitad = (n - 1) / 2;
  return Array.from({ length: n }, (_, i) => {
    const d = Math.abs(i - mitad) / mitad; // 0 en el centro, 1 en los extremos
    const forma = 0.25 + 0.75 * Math.cos((d * Math.PI) / 2) ** 1.5;
    const k = Math.min(i, n - 1 - i); // simétrica: misma variación a ambos lados
    const vaiven = 0.65 + 0.35 * Math.abs(Math.sin(frame * 0.37 + k * 1.7) * Math.cos(frame * 0.21 + k * 0.9));
    return Math.max(0.06, nivel * forma * vaiven);
  });
}
