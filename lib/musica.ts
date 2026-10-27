// Música de fondo: qué trozo de la canción usar y a qué volumen en cada instante.
import type { Palabra } from "./tiempos";

/** Volumen momentáneo (LUFS cada 100 ms) del informe de `ffmpeg -af ebur128`: [{t, lufs}]. */
export function leerMomentaneo(salida: string): { t: number; lufs: number }[] {
  return [...salida.matchAll(/t:\s*([\d.]+)\s+TARGET:[^M]*M:\s*(-?[\d.]+|-inf)/g)]
    .map((m) => ({ t: Number(m[1]), lufs: m[2] === "-inf" ? -70 : Number(m[2]) }));
}

/**
 * Dónde empezar la canción para que el vídeo caiga en su parte con más energía: la ventana de `duracionS` con
 * más volumen medio, sin el primer 4 % (las intros suelen ser flojas). Devuelve el inicio en segundos.
 */
export function mejorTramo(momentaneo: { t: number; lufs: number }[], duracionS: number): number {
  const fin = momentaneo.at(-1)?.t ?? 0;
  if (fin <= duracionS) return 0;
  let mejor = 0, energia = -Infinity;
  for (let inicio = Math.floor(fin * 0.04); inicio + duracionS <= fin; inicio += 0.5) {
    const v = momentaneo.filter((m) => m.t >= inicio && m.t < inicio + duracionS);
    const media = v.reduce((s, m) => s + m.lufs, 0) / (v.length || 1);
    if (media > energia) { energia = media; mejor = inicio; }
  }
  return mejor;
}

/**
 * Ganancia (dB) de la música en el instante tMs: `volumenDb` cuando no hablas y `bajaDb` menos mientras hablas
 * (ducking con ataque de 120 ms y relevo de 350 ms), con fundido de entrada de 0,6 s y de salida de 1,2 s.
 */
export function gananciaMusica(tMs: number, palabras: Palabra[], duracionMs: number, volumenDb: number, bajaDb: number): number {
  const habla = palabras.some((p) => tMs >= p.desdeMs - 120 && tMs <= p.hastaMs + 350);
  let db = volumenDb - (habla ? bajaDb : 0);
  const entrada = Math.min(1, tMs / 600), salida = Math.min(1, Math.max(0, (duracionMs - tMs) / 1200));
  const fundido = Math.min(entrada, salida);
  if (fundido < 1) db += 20 * Math.log10(Math.max(fundido, 0.001));
  return db;
}
