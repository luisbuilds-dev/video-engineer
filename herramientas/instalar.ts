// npm run instalar            → te enseña el plan (qué falta y qué haría), sin tocar nada
// npm run instalar -- --si    → instala whisper.cpp y el modelo en ./whisper.cpp (dentro del proyecto)
// Nunca usa sudo ni instala programas del sistema: para ffmpeg te da el comando para que lo corras tú.
import { downloadWhisperModel, installWhisperCpp } from "@remotion/install-whisper-cpp";
import { config, WHISPER_DIR, WHISPER_VERSION } from "../lib/config";
import { comprobar, imprimir } from "./comprobar";

const MB = { tiny: 75, base: 142, small: 466, medium: 1500, "large-v3-turbo": 1600 } as const;
const piezas = comprobar();
const { modelo } = config();
const falta = (nombre: string) => piezas.some((p) => !p.ok && p.nombre.startsWith(nombre));

imprimir(piezas);
const plan: string[] = [];
if (falta("whisper.cpp")) plan.push(`instalar whisper.cpp ${WHISPER_VERSION} en ./whisper.cpp`);
if (falta("Modelo")) plan.push(`descargar el modelo «${modelo}» (~${MB[modelo]} MB, una sola vez)`);
const delSistema = piezas.filter((p) => !p.ok && /ffmpeg|ffprobe|git|make|Node/.test(p.nombre));

if (!plan.length) console.log("\nNo hay nada que instalar aquí.");
else if (!process.argv.includes("--si")) {
  console.log(`\nPlan:\n${plan.map((p) => `  • ${p}`).join("\n")}\nPara hacerlo: npm run instalar -- --si`);
} else {
  if (falta("whisper.cpp")) await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION, printOutput: true });
  if (falta("Modelo")) await downloadWhisperModel({ model: modelo, folder: WHISPER_DIR, printOutput: true });
  console.log("\nHecho. Comprueba con: npm run doctor");
}
if (delSistema.length) console.log("\nEsto lo instalas tú (puede pedir tu contraseña):\n" +
  delSistema.map((p) => `  • ${p.nombre}: ${p.arreglo}`).join("\n"));
