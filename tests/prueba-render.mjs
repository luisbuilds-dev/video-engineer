// Prueba de punta a punta sin Whisper (para el CI): crudo sintético con una pausa de 2 s →
// cortar (pausa real medida en el audio) → analizar → componer → render con Remotion → revisión. Sale con 1 si algo falla.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const dir = "proyectos/ci";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const ff = (...a) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a]);
// 1 s de tono, 2 s de silencio, 2 s de tono: la pausa tiene que desaparecer
ff("-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30:duration=5",
  "-f", "lavfi", "-i", "sine=f=330:d=1,apad=pad_dur=2[a];sine=f=330:d=2[b];[a][b]concat=n=2:v=0:a=1",
  "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", `${dir}/crudo.mp4`);
ff("-i", `${dir}/crudo.mp4`, "-vn", "-ac", "1", "-ar", "16000", `${dir}/audio.wav`);
const palabras = [["uno", 100, 500], ["dos", 500, 950], ["tres", 3050, 3500], ["cuatro", 3500, 4000], ["cinco", 4000, 4900]]
  .map(([texto, desdeMs, hastaMs]) => ({ texto, desdeMs, hastaMs }));
writeFileSync(`${dir}/palabras.json`, JSON.stringify({ duracionMs: 5000, crudo: "crudo.mp4", palabras }));
writeFileSync(`${dir}/aprobadas.json`, JSON.stringify([0, 1, 2, 3, 4]));

const tsx = (script) => execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", script, "--proyecto", "ci"], { stdio: "inherit" });
tsx("herramientas/cortar.ts");
const cortadas = JSON.parse(readFileSync(`${dir}/cortadas.json`, "utf8"));
if (cortadas.duracionMs > 3600) throw new Error(`la pausa no se cortó: ${cortadas.duracionMs} ms`);
writeFileSync(`${dir}/decisiones.json`, JSON.stringify({ gancho: { texto: "Prueba *de CI*" },
  tarjetas: [{ texto: "Prueba", desdeMs: 2300, hastaMs: 3000 }] }));
tsx("herramientas/analizar.ts"); // detector de caras + movimiento, fotograma a fotograma
tsx("herramientas/componer.ts");
tsx("herramientas/render.ts");
tsx("herramientas/revisar.ts"); // sale con 1 si el volumen, los congelados o los negros no cumplen
console.log(`OK: ${cortadas.duracionMs} ms tras cortar la pausa, render y revisión correctos`);
