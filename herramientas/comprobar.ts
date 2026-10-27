// Comprobaciones compartidas por el doctor y el instalador. Solo leen: no instalan ni cambian nada.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config, WHISPER_DIR } from "../lib/config";
import { RAIZ } from "../lib/proyecto";

export type Pieza = { nombre: string; ok: boolean; detalle: string; arreglo?: string };
const so = process.platform; // win32 | darwin | linux

function existe(cmd: string, args = ["-version"]): string | null {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  return r.error || r.status !== 0 ? null : (r.stdout || r.stderr).split("\n")[0].trim();
}

const instalarCon = (win: string, mac: string, linux: string) => (so === "win32" ? win : so === "darwin" ? mac : linux);

export function comprobar(): Pieza[] {
  const mayor = Number(process.versions.node.split(".")[0]);
  const piezas: Pieza[] = [
    { nombre: "Node.js 20+", ok: mayor >= 20, detalle: `v${process.versions.node}`,
      arreglo: "instala Node 24 LTS desde https://nodejs.org" },
    { nombre: "Dependencias (npm ci)", ok: existsSync(join(RAIZ, "node_modules", "remotion")), detalle: "node_modules",
      arreglo: "npm ci" },
  ];
  for (const bin of ["ffmpeg", "ffprobe"]) {
    const v = existe(bin);
    piezas.push({ nombre: bin, ok: !!v, detalle: v ?? "no encontrado",
      arreglo: instalarCon("winget install Gyan.FFmpeg (y abre una terminal nueva)", "brew install ffmpeg", "sudo apt install ffmpeg") });
  }
  if (so !== "win32") { // en macOS y Linux whisper.cpp se compila: hace falta git, make y un compilador
    for (const [bin, args] of [["git", ["--version"]], ["make", ["--version"]]] as const) {
      const v = existe(bin, [...args]);
      piezas.push({ nombre: bin, ok: !!v, detalle: v ?? "no encontrado",
        arreglo: so === "darwin" ? "xcode-select --install" : "sudo apt install build-essential git" });
    }
  }
  const whisper = existsSync(WHISPER_DIR);
  piezas.push({ nombre: "whisper.cpp", ok: whisper, detalle: whisper ? "whisper.cpp/" : "sin instalar", arreglo: "npm run instalar -- --si" });
  const { modelo } = config();
  const modelos = whisper ? readdirSync(WHISPER_DIR).filter((f) => f.startsWith("ggml-") && f.endsWith(".bin")) : [];
  const tiene = modelos.includes(`ggml-${modelo}.bin`);
  piezas.push({ nombre: `Modelo de Whisper «${modelo}»`, ok: tiene, detalle: tiene ? `ggml-${modelo}.bin` : "sin descargar",
    arreglo: "npm run instalar -- --si" });
  piezas.push({ nombre: "Tu configuración (config.json)", ok: existsSync(join(RAIZ, "config.json")), detalle: "nombre, idioma, estilo",
    arreglo: "escribe /empezar en Claude Code" });
  return piezas;
}

export function imprimir(piezas: Pieza[]): void {
  for (const p of piezas) console.log(`${p.ok ? "✓" : "✗"} ${p.nombre} · ${p.detalle}${p.ok || !p.arreglo ? "" : `\n    → ${p.arreglo}`}`);
}
