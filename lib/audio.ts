// Lectura de los informes de ffmpeg que usa /revisar (sin depender de ffmpeg: se prueba con texto).

/** Volumen integrado (LUFS) y pico real (dBTP) del resumen de `ffmpeg -af ebur128=peak=true`. */
export function leerEbur128(salida: string): { lufs: number; pico: number } | null {
  const resumen = salida.slice(salida.lastIndexOf("Summary:"));
  const lufs = resumen.match(/I:\s+(-?[\d.]+) LUFS/);
  const pico = resumen.match(/Peak:\s+(-?[\d.]+|-inf) dBFS/);
  if (!lufs) return null;
  return { lufs: Number(lufs[1]), pico: pico ? (pico[1] === "-inf" ? -Infinity : Number(pico[1])) : NaN };
}

/** Silencios de `ffmpeg -af silencedetect`, en milisegundos (un silencio abierto al final llega hasta finMs). */
export function leerSilencios(salida: string, finMs: number): { desdeMs: number; hastaMs: number }[] {
  const inicios = [...salida.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Math.max(0, Number(m[1]) * 1000));
  const finales = [...salida.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]) * 1000);
  return inicios.map((desdeMs, i) => ({ desdeMs: Math.round(desdeMs), hastaMs: Math.round(finales[i] ?? finMs) }));
}

/** Tramos congelados de `ffmpeg -vf freezedetect`: [{desde, hasta}] en segundos. */
export function leerCongelados(salida: string): { desde: number; hasta: number }[] {
  const inicios = [...salida.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const finales = [...salida.matchAll(/freeze_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return inicios.map((desde, i) => ({ desde, hasta: finales[i] ?? Infinity }));
}
