// npm run componer -- --proyecto ID
// decisiones.json (lo que Claude decidió: gancho y tarjetas) + cortadas.json + analisis.json + tu estilo
// → edicion.json: subtítulos que no te tapan, tarjetas colocadas y zooms donde el plano se queda quieto.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ffmpeg } from "../lib/ffmpeg";
import { leerMomentaneo, mejorTramo } from "../lib/musica";
import { marcasYouTube, type Capitulo, type Pantalla } from "../lib/horizontal";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import type { Momento } from "../lib/efectos";
import type { Sensibles } from "../lib/sensibles";
import { buscar, guardados, NOMBRES } from "./iconos";
import { buscarLogos, logo, type Logo } from "../lib/logos";
import { componer } from "../lib/composicion";
import { leerRms, nivelesOnda } from "../lib/cabecera";
import { config } from "../lib/config";
import { leerEstilo } from "../lib/estilo";
import { carpeta, escribir, leer, opcion, RAIZ } from "../lib/proyecto";
import type { Palabra } from "../lib/tiempos";
import type { Fotograma } from "../lib/vision";

const id = opcion("proyecto");
if (!id) throw new Error("uso: npm run componer -- --proyecto ID");
carpeta(id);
const { palabras, duracionMs } = leer<{ palabras: Palabra[]; duracionMs: number }>(id, "cortadas.json");
const { fotogramas, alto, ancho } = leer<{ fotogramas: Fotograma[]; alto: number; ancho: number }>(id, "analisis.json");
const decisiones = leer<{ formato?: "vertical" | "horizontal"; gancho: { texto: string } | null; tarjetas: { texto: string; desdeMs: number; hastaMs: number }[];
  momentos?: Momento[]; musica?: { pista: string } | null; capitulos?: Capitulo[];
  pantallas?: (Omit<Pantalla, "archivo"> & { nombre: string })[]; secciones?: { titulo: string; desdeMs: number }[] }>(id, "decisiones.json");
// el formato de SALIDA lo dice decisiones.json («formato»), porque se puede grabar en vertical y publicar en YouTube;
// si no lo dice, el del original. Horizontal → tu estilo horizontal (o el base); vertical → tu estilo de siempre
const formato = decisiones.formato ?? (ancho > alto ? "horizontal" : "vertical");
const porDefecto = formato === "horizontal" ? config().estiloHorizontal ?? "base-horizontal" : config().estilo;
const estilo = leerEstilo(join(RAIZ, "estilos", `${opcion("estilo", porDefecto)}.json`));
if ((estilo.formato.ancho > estilo.formato.alto ? "horizontal" : "vertical") !== formato)
  throw new Error(`el estilo «${estilo.id}» es ${formato === "horizontal" ? "vertical" : "horizontal"} y el vídeo se pidió ${formato}`);
const catalogo = JSON.parse(readFileSync(join(RAIZ, "sonidos", "catalogo.json"), "utf8")) as { tipo: string; archivo: string }[];
// un icono que no existe se vería como un hueco: mejor parar y sugerir los parecidos
for (const m of decisiones.momentos ?? []) {
  if (m.tipo !== "ilustracion") continue;
  for (const it of m.items) {
    if (!NOMBRES.includes(it.icono)) throw new Error(`no existe el icono «${it.icono}». Parecidos: ${buscar(it.icono.split("-")[0]).join(", ") || "ninguno"}. Búscalo en internet con npm run iconos -- ${it.icono} --internet y guárdalo con --guardar`);
  }
}

// logos de marca: los que no existan paran aquí con sugerencias; los que sí, viajan dentro de edicion.json
const slugs = (decisiones.momentos ?? []).flatMap((m) => m.tipo === "logos" ? m.items.map((i) => i.logo)
  : m.tipo === "diagrama" ? m.nodos.flatMap((n) => (n.logo ? [n.logo] : [])) : []);
const logos: Record<string, Logo> = {};
for (const s of new Set(slugs)) {
  const l = logo(s);
  if (!l) throw new Error(`no existe el logo «${s}». Parecidos: ${buscarLogos(s).map((x) => x.slug).join(", ") || "ninguno"} (npm run iconos -- --logo nombre)`);
  logos[s] = l;
}
// los iconos de los nodos de diagrama también tienen que existir
for (const m of decisiones.momentos ?? []) {
  if (m.tipo !== "diagrama") continue;
  for (const n of m.nodos) if (n.icono && !NOMBRES.includes(n.icono)) throw new Error(`no existe el icono «${n.icono}». Parecidos: ${buscar(n.icono.split("-")[0]).join(", ") || "ninguno"}`);
}
const extra = guardados();
const iconos = Object.fromEntries((decisiones.momentos ?? []).flatMap((m) => (m.tipo === "ilustracion" ? m.items.map((i) => i.icono)
  : m.tipo === "diagrama" ? m.nodos.flatMap((n) => (n.icono ? [n.icono] : [])) : []))
  .filter((n) => extra[n]).map((n) => [n, extra[n]]));

// grabaciones de pantalla: forma de cada una respecto a la salida, para que los zooms no deformen
const pantallas = (decisiones.pantallas ?? []).map((p) => ({ ...p, archivo: `pantalla-${p.nombre}.mp4` }));
// datos sensibles: ninguna grabación de pantalla entra sin haberse analizado y sin que el usuario haya decidido qué se difumina
const rutaSensibles = join(carpeta(id), "sensibles.json");
const sensibles = existsSync(rutaSensibles) ? JSON.parse(readFileSync(rutaSensibles, "utf8")) as Sensibles : null;
for (const p of pantallas) {
  if (!sensibles?.archivos[p.archivo]) throw new Error(`${p.archivo} no se ha analizado en busca de datos sensibles: ejecuta npm run sensibles -- --proyecto ${id}`);
  if (!sensibles.decision) throw new Error("hay datos sensibles pendientes: pregunta al usuario si los difumina y guarda su respuesta con npm run sensibles -- --difuminar si|no");
  const { difuminar, excepto } = sensibles.decision;
  (p as Pantalla).difuminar = difuminar ? sensibles.archivos[p.archivo].pistas.filter((x) => !excepto.includes(x.tipo)) : [];
}
const relacionPantalla: Record<string, number> = {};
for (const p of pantallas) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0",
    join(carpeta(id), p.archivo)], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`falta ${p.archivo}: prepárala con npm run pantalla`);
  const [w, h] = r.stdout.trim().split(",").map(Number);
  relacionPantalla[p.archivo] = (estilo.formato.ancho / estilo.formato.alto) / (w / h);
}
const { paginas, tarjetas, zooms, gancho, graficos, sonidos, camara, capitulos, burbuja, encuadre, secciones, avisos, pantallas: pantallasColocadas } = componer({
  palabras, duracionMs, estilo, fotos: fotogramas, altoPx: estilo.formato.alto, tarjetas: decisiones.tarjetas, gancho: decisiones.gancho,
  momentos: decisiones.momentos ?? [], catalogo, capitulos: decisiones.capitulos ?? [], pantallas, relacionPantalla, fuente: { ancho, alto }, secciones: decisiones.secciones });
if (capitulos.length) writeFileSync(join(carpeta(id), "capitulos.txt"), marcasYouTube(capitulos) + "\n", "utf8");
for (const a of avisos) console.log(`⚠ capítulos: ${a}`);
// la composición solo ve la carpeta del proyecto: los efectos que suenan se copian a proyectos/<id>/sfx/
mkdirSync(join(carpeta(id), "sfx"), { recursive: true });
for (const a of new Set(sonidos.map((s) => s.archivo))) copyFileSync(join(RAIZ, "sonidos", "sfx", a), join(carpeta(id), "sfx", a));
// onda de voz: volumen de cada fotograma (300 muestras por fotograma), suavizado como un vúmetro
const fps = estilo.formato.fps;
const onda = estilo.cabecera.onda ? nivelesOnda(leerRms(ffmpeg(["-nostats", "-i", join(carpeta(id), "limpio.mp4"), "-map", "0:a:0", "-af",
  `aresample=${fps * 300},asetnsamples=n=300:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level`, "-f", "null", "-"]))) : null;
// música de fondo: el trozo con más energía de la pista elegida, y el crédito para la descripción del post
let musica = null;
if (decisiones.musica?.pista) {
  const cat = JSON.parse(readFileSync(join(RAIZ, "sonidos", "musica.json"), "utf8"));
  const pista = cat.pistas.find((p: { id: string }) => p.id === decisiones.musica!.pista);
  const origen = join(RAIZ, "sonidos", "musica", `${decisiones.musica.pista}.mp3`);
  if (!pista || !existsSync(origen)) throw new Error(`no tengo la pista «${decisiones.musica.pista}». Mira npm run musica`);
  copyFileSync(origen, join(carpeta(id), "musica.mp3"));
  const inicioS = mejorTramo(leerMomentaneo(ffmpeg(["-nostats", "-i", origen, "-af", "ebur128", "-f", "null", "-"])), duracionMs / 1000);
  const credito = cat.credito.replace("{titulo}", pista.titulo);
  writeFileSync(join(carpeta(id), "credito.txt"), credito + "\n", "utf8");
  musica = { archivo: "musica.mp3", inicioS, volumenDb: estilo.musica.volumenDb, bajaDb: estilo.musica.bajaDb, credito };
}
escribir(id, "edicion.json", { video: "limpio.mp4", duracionMs, paginas, tarjetas, zooms, camara, gancho, graficos, sonidos, musica,
  capitulos, pantallas: pantallasColocadas, burbuja, encuadre, iconos, logos, secciones, onda, estilo });

const movidas = paginas.filter((p) => p.posicion !== estilo.subtitulos.posicion).length;
console.log(`edicion.json: ${paginas.length} páginas de subtítulos (${movidas} movidas para no taparte), ` +
  `${tarjetas.length} tarjetas, ${graficos.length} gráficos, ${sonidos.length} sonidos, ${camara.length} efectos de cámara y ${zooms.length} zooms ` +
  `(vídeo de ${alto} px de alto).` + (musica ? `\nMúsica: desde el segundo ${musica.inicioS} · crédito en credito.txt` : ""));
