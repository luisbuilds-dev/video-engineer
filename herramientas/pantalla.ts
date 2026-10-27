// npm run pantalla -- --proyecto ID --video RUTA [--nombre p1] [--cada 4]
// Prepara una grabación de pantalla: la copia normalizada al proyecto (pantalla-<nombre>.mp4) y hace UNA hoja de control con un
// fotograma cada N segundos y una cuadrícula de 10×10, para que Claude elija a qué zona hacer zoom sin ver el vídeo.
// Coordenadas: x e y de 0 a 1 desde la esquina superior izquierda; cada celda de la cuadrícula mide 0,1.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { duracionMs, ffmpeg } from "../lib/ffmpeg";
import { carpeta, opcion } from "../lib/proyecto";

const id = opcion("proyecto"), video = opcion("video"), nombre = opcion("nombre", "p1")!;
if (!id || !video) throw new Error("uso: npm run pantalla -- --proyecto ID --video RUTA [--nombre p1] [--cada 4]");
if (!existsSync(video)) throw new Error(`no encuentro ${video}`);
const dir = carpeta(id);
const destino = join(dir, `pantalla-${nombre}.mp4`);
// normalizada: 30 fotogramas por segundo constantes y sin fotogramas B. Las grabaciones de OBS o del móvil suelen ir a
// fotogramas variables, y así el render, el OCR y el difuminado ven exactamente el mismo fotograma en el mismo instante.
ffmpeg(["-loglevel", "error", "-y", "-i", video, "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "fast",
  "-bf", "0", "-an", "-movflags", "+faststart", destino]);
const total = duracionMs(destino) / 1000;
const cada = Number(opcion("cada", String(Math.max(2, Math.ceil(total / 12)))));
const n = Math.min(12, Math.ceil(total / cada));
ffmpeg(["-loglevel", "error", "-y", "-i", destino, "-vf",
  `fps=1/${cada},scale=640:-2,drawgrid=w=iw/10:h=ih/10:t=1:c=yellow@0.55,tile=3x${Math.ceil(n / 3)}:padding=6:color=white`,
  "-frames:v", "1", "-q:v", "4", join(dir, `pantalla-${nombre}.jpg`)]);
console.log(`pantalla-${nombre}.mp4 (${total.toFixed(0)} s) y su hoja pantalla-${nombre}.jpg: ` +
  `${n} fotogramas, uno cada ${cada} s (en orden: ${Array.from({ length: n }, (_, i) => `${i * cada}s`).join(", ")}).`);
