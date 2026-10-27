// npm run sensibles -- --proyecto ID [--camara]                    analiza y pregunta
// npm run sensibles -- --proyecto ID --difuminar si|no [--excepto ip,telefono]   guarda lo que decidió el usuario
// Lee con OCR cada grabación de pantalla del proyecto (y, con --camara, también tu vídeo) y localiza datos que no deben
// verse: correos, teléfonos, cédulas, tarjetas, cuentas, claves de API, IPs, lo que sigue a «contraseña:» y las frases
// privadas de config.json («privado»). Deja sensibles.json y una hoja sensibles.jpg con cada dato marcado en rojo para
// que el USUARIO decida (Claude no la mira ni repite los datos: solo el tipo y dos letras). Nada se difumina sin su «sí»;
// componer espera esa decisión y revisar comprueba después que lo difuminado no se lee.
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { config } from "../lib/config";
import { duracionMs, ffmpeg } from "../lib/ffmpeg";
import { leerVideo } from "../lib/ocr";
import { carpeta, escribir, leer, opcion } from "../lib/proyecto";
import { detectar, enmascarar, posicionEn, seguir, type Sensibles } from "../lib/sensibles";

const id = opcion("proyecto");
if (!id) throw new Error("uso: npm run sensibles -- --proyecto ID [--camara] | --difuminar si|no [--excepto tipo,tipo]");
const dir = carpeta(id);

// 2.º paso: guardar la respuesta del usuario sin volver a leer nada
const respuesta = opcion("difuminar");
if (respuesta) {
  if (!["si", "no"].includes(respuesta)) throw new Error("--difuminar si | no");
  const s = leer<Sensibles>(id, "sensibles.json");
  s.decision = { difuminar: respuesta === "si", excepto: (opcion("excepto") ?? "").split(",").map((t) => t.trim()).filter(Boolean) };
  escribir(id, "sensibles.json", s);
  console.log(respuesta === "si"
    ? `Se difuminarán${s.decision.excepto.length ? ` todos menos: ${s.decision.excepto.join(", ")}` : " todos"}. Siguiente: npm run componer`
    : "No se difumina nada (decisión del usuario). Siguiente: npm run componer");
  process.exit(0);
}

const privado = config().privado ?? [];
const archivos = readdirSync(dir).filter((f) => /^pantalla-.+\.mp4$/.test(f));
if (process.argv.includes("--camara") && existsSync(join(dir, "limpio.mp4"))) archivos.push("limpio.mp4");
if (!archivos.length) { console.log("No hay grabaciones de pantalla en el proyecto: nada que revisar."); process.exit(0); }

const resultado: Sensibles = { decision: null, archivos: {} };
const porTipo = new Map<string, { n: number; muestra: string }>();
const marcas: { archivo: string; t: number }[] = [];
for (const archivo of archivos) {
  const ruta = join(dir, archivo);
  console.log(`${archivo}: leyendo…`);
  const lecturas = await leerVideo(ruta, join(dir, ".ocr"), { fps: 6 });
  const muestras = lecturas.map((l) => ({ t: l.t, hallazgos: detectar(l.lineas, l.ancho, l.alto, privado) }));
  const pistas = seguir(muestras, duracionMs(ruta) / 1000);
  resultado.archivos[archivo] = { ancho: lecturas[0]?.ancho ?? 0, alto: lecturas[0]?.alto ?? 0, pistas };
  for (const p of pistas) {
    const m = muestras.flatMap((x) => x.hallazgos).find((h) => h.tipo === p.tipo);
    const t = porTipo.get(p.tipo) ?? { n: 0, muestra: m ? enmascarar(m.texto) : "" };
    porTipo.set(p.tipo, { ...t, n: t.n + 1 });
    marcas.push({ archivo, t: p.puntos[0].t });
  }
}
// nada que difuminar: no hay nada que preguntar
if (!porTipo.size) resultado.decision = { difuminar: true, excepto: [] };
escribir(id, "sensibles.json", resultado);
if (!porTipo.size) { console.log("No se ve ningún dato sensible. Siguiente: npm run componer"); process.exit(0); }

// hoja para el usuario: hasta 6 instantes, con cada dato visible en ese momento recuadrado en rojo
const temporal = join(dir, ".sensibles");
rmSync(temporal, { recursive: true, force: true });
mkdirSync(temporal, { recursive: true });
const elegidas = marcas.filter((m, i) => marcas.findIndex((x) => x.archivo === m.archivo && Math.abs(x.t - m.t) < 0.5) === i).slice(0, 6);
elegidas.forEach((m, i) => {
  const { ancho, alto, pistas } = resultado.archivos[m.archivo];
  const cajas = pistas.filter((p) => m.t >= p.desde && m.t <= p.hasta).map((p) => posicionEn(m.t, p))
    .map((c) => `drawbox=x=${Math.round(c.x * ancho) - 6}:y=${Math.round(c.y * alto) - 6}:w=${Math.round(c.w * ancho) + 12}:h=${Math.round(c.h * alto) + 12}:color=red:t=4`);
  ffmpeg(["-loglevel", "error", "-y", "-ss", m.t.toFixed(3), "-i", join(dir, m.archivo), "-frames:v", "1",
    "-vf", [...cajas, "scale=640:-2"].join(","), join(temporal, `${i + 1}.png`)]);
});
ffmpeg(["-loglevel", "error", "-y", "-i", join(temporal, "%d.png"), "-vf",
  `tile=${Math.min(3, elegidas.length)}x${Math.ceil(elegidas.length / 3)}:padding=6:color=white`, "-frames:v", "1", "-q:v", "3", join(dir, "sensibles.jpg")]);
rmSync(temporal, { recursive: true, force: true });

// solo los tipos: un mismo dato puede salir en dos pistas (si el OCR lo pierde un rato) y contar inflaría la cifra
console.log("\nVeo datos que quizá no quieras mostrar:");
for (const [tipo, { muestra }] of porTipo) console.log(`  · ${tipo} (${muestra})`);
console.log(`Están marcados en rojo en proyectos/${id}/sensibles.jpg.\n` +
  `PREGUNTA AL USUARIO si los difumina (todos, ninguno o todos menos algún tipo) y guarda la respuesta con\n` +
  `  npm run sensibles -- --proyecto ${id} --difuminar si [--excepto tipo,tipo]   |   --difuminar no`);
