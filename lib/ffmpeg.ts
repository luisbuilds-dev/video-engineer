// Llamadas a ffmpeg/ffprobe. Siempre con lista de argumentos (sin shell): igual en Windows, macOS y Linux.
import { spawnSync } from "node:child_process";
import { renameSync } from "node:fs";
import { leerEbur128, leerSilencios } from "./audio";

/** Ejecuta ffmpeg y devuelve su stderr (ahí escribe sus informes). Lanza un error con el final del log si falla. */
export function ffmpeg(args: string[]): string {
  const r = spawnSync("ffmpeg", ["-hide_banner", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`no encuentro ffmpeg (${r.error.message}). Ejecuta npm run doctor`);
  if (r.status !== 0) throw new Error(`ffmpeg falló:\n${(r.stderr ?? "").slice(-1200)}`);
  return r.stderr ?? "";
}

export function duracionMs(archivo: string): number {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", archivo], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffprobe no pudo leer ${archivo}: ${r.stderr}`);
  return Math.round(Number(r.stdout.trim()) * 1000);
}

/** Volumen integrado del archivo (LUFS) y pico real. */
export function medir(archivo: string): { lufs: number; pico: number } | null {
  return leerEbur128(ffmpeg(["-nostats", "-i", archivo, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-"]));
}

/** Silencios reales del audio más largos que minMs (por debajo de -35 dB). */
export function silenciosAudio(archivo: string, minMs: number, finMs: number) {
  return leerSilencios(ffmpeg(["-nostats", "-i", archivo, "-af", `silencedetect=noise=-35dB:d=${minMs / 1000}`, "-f", "null", "-"]), finMs);
}

/**
 * Normaliza el volumen a `lufs` (loudnorm en dos pasadas, lineal: no cambia la dinámica de tu voz).
 * Si el limitador de picos no deja llegar al objetivo (voz con picos fuertes), repite en modo dinámico.
 * El vídeo se copia sin recodificar.
 */
export function normalizar(entrada: string, salida: string, lufs: number): void {
  const filtro = `loudnorm=I=${lufs}:TP=-1.5:LRA=11`;
  const audio = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", salida];
  const informe = ffmpeg(["-i", entrada, "-af", `${filtro}:print_format=json`, "-f", "null", "-"]);
  const m = JSON.parse(informe.slice(informe.lastIndexOf("{"), informe.lastIndexOf("}") + 1));
  ffmpeg(["-loglevel", "error", "-y", "-i", entrada, "-c:v", "copy", "-af",
    `${filtro}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
      `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`, ...audio]);
  // En clips cortos (menos de ~10 s) loudnorm se queda corto: se corrige la diferencia con ganancia y un
  // limitador a -1,5 dBTP para que la subida no produzca picos que distorsionen
  const r = medir(salida);
  if (r && Math.abs(r.lufs - lufs) > 0.5) {
    const ganancia = (lufs - r.lufs).toFixed(2);
    const temporal = salida.replace(/\.mp4$/, ".tmp.mp4");
    ffmpeg(["-loglevel", "error", "-y", "-i", salida, "-c:v", "copy", "-af",
      `volume=${ganancia}dB,alimiter=limit=0.84:level=false`, ...audio.slice(0, -1), temporal]);
    renameSync(temporal, salida);
  }
}
