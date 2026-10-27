// npm run crear-estilo [-- --respuestas respuestas.json]
// Convierte las respuestas del cuestionario (CUESTIONARIO.md) en el estilo del usuario: uno vertical y otro horizontal
// (los que use), validados, en estado «en-prueba», más su guía inicial. Deja el vertical (o el único) en config.json.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Estilo, FUENTES } from "../lib/estilo";
import { opcion, RAIZ } from "../lib/proyecto";

type Respuestas = {
  nombre: string; nicho?: string; formatos: ("vertical" | "horizontal")[]; tono: "didactico" | "divertido" | "energetico" | "serio";
  colores?: { texto: string; resalte: string; fondo: string; acento: string } | null;
  fuenteSubtitulos?: (typeof FUENTES)[number]; fuenteTarjetas?: (typeof FUENTES)[number];
  subtitulos?: { tamano?: "grande" | "mediano"; palabras?: number; mayusculas?: boolean };
  ritmo?: "muy-cortado" | "natural"; zooms?: boolean; efectos?: "limpio" | "medio" | "movido";
  cabecera?: { barra: boolean; onda: boolean };
  musica?: "siempre" | "a-veces" | "nunca"; referentes?: string[]; idioma?: string;
};
const r = JSON.parse(readFileSync(join(RAIZ, opcion("respuestas", "respuestas.json")!), "utf8")) as Respuestas;
const slug = r.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mi-estilo";

// lo que cada tono sugiere cuando el usuario no lo eligió
const PORTONO = {
  didactico: { sub: "Inter", tar: "Space Grotesk", palabras: 3, ritmo: "natural", efectos: "medio", mayus: false },
  divertido: { sub: "Poppins", tar: "Permanent Marker", palabras: 2, ritmo: "muy-cortado", efectos: "movido", mayus: false },
  energetico: { sub: "Anton", tar: "Bebas Neue", palabras: 2, ritmo: "muy-cortado", efectos: "movido", mayus: true },
  serio: { sub: "Montserrat", tar: "DM Serif Display", palabras: 4, ritmo: "natural", efectos: "limpio", mayus: false },
} as const;
const t = PORTONO[r.tono];
const c = r.colores ?? { texto: "#FFFFFF", resalte: "#FFD84D", fondo: "#111111", acento: "#FFD84D" };
const cortado = (r.ritmo ?? t.ritmo) === "muy-cortado";
const grande = (r.subtitulos?.tamano ?? "grande") === "grande";

function estilo(formato: "vertical" | "horizontal") {
  const v = formato === "vertical";
  const base = JSON.parse(readFileSync(join(RAIZ, "estilos", v ? "base-neutra.json" : "base-horizontal.json"), "utf8"));
  return Estilo.parse({
    ...base, id: v ? slug : `${slug}-h`, estado: "en-prueba",
    subtitulos: { ...base.subtitulos, fuente: r.fuenteSubtitulos ?? t.sub, color: c.texto, resalte: c.resalte,
      tamano: Math.round(base.subtitulos.tamano * (grande ? 1.1 : 0.9)), maxPalabras: r.subtitulos?.palabras ?? t.palabras,
      mayusculas: r.subtitulos?.mayusculas ?? t.mayus },
    tarjetas: { ...base.tarjetas, fuente: r.fuenteTarjetas ?? t.tar, fondo: c.fondo, texto: c.texto, acento: c.acento },
    ritmo: { ...base.ritmo, silencioMaxMs: cortado ? 250 : 450, margenMs: cortado ? 80 : 150, velocidad: cortado && v ? 1.05 : 1,
      zooms: r.zooms ?? true, maxPlanoMs: v ? (cortado ? 2000 : 2800) : (cortado ? 3500 : 5000) },
    efectos: { densidad: r.efectos ?? t.efectos, volumenDb: v ? -22 : -24 },
    // la onda de voz encaja en vertical; en horizontal solo la barra (salvo que el usuario la pida)
    cabecera: { barra: r.cabecera?.barra ?? true, onda: v ? (r.cabecera?.onda ?? true) : (r.cabecera?.onda ?? false) },
    musica: { ...base.musica, volumenDb: r.musica === "nunca" ? -40 : base.musica.volumenDb },
  });
}

const creados = r.formatos.map((f) => estilo(f));
for (const e of creados) writeFileSync(join(RAIZ, "estilos", `${e.id}.json`), JSON.stringify(e, null, 2) + "\n", "utf8");

// guía inicial: lo que dijo en el cuestionario es lo primero que «le gusta»
const hoy = new Date().toISOString().slice(0, 10);
for (const e of creados) {
  const guia = join(RAIZ, "estilos", `${e.id}.guia.md`);
  if (existsSync(guia)) continue;
  writeFileSync(guia, [`# Guía de edición · ${e.id}`, "",
    `Lo que ${r.nombre} prefiere, aprendido vídeo a vídeo. Claude la lee al empezar cada /editar.`,
    "Una preferencia que se repite 3 veces se propone como regla del estilo (con su OK).", "",
    "## Contexto", "", `- Nicho y público: ${r.nicho ?? "—"}`, `- Tono: ${r.tono}`, `- Referentes: ${(r.referentes ?? []).join(", ") || "—"}`,
    `- Música: ${r.musica ?? "a-veces"}`, "",
    "## Le gusta", "", `- (${hoy}) ${e.subtitulos.maxPalabras} palabras por subtítulo, ${e.subtitulos.fuente}${e.subtitulos.mayusculas ? " en mayúsculas" : ""}`,
    `- (${hoy}) ritmo ${cortado ? "muy cortado, sin aire" : "natural"}; efectos ${e.efectos.densidad}`, "",
    "## No le gusta", "", "## Ganchos que funcionaron", "", "## Tus números", "", "_Aún sin vídeos._", ""].join("\n"), "utf8");
}
const configRuta = join(RAIZ, "config.json");
const config = existsSync(configRuta) ? JSON.parse(readFileSync(configRuta, "utf8")) : {};
writeFileSync(configRuta, JSON.stringify({ ...config, nombre: r.nombre, idioma: r.idioma ?? config.idioma ?? "es",
  privado: r.privado ?? config.privado ?? [], estilo: creados[0].id, estiloHorizontal: creados.find((e) => e.id.endsWith("-h"))?.id ?? null }, null, 2) + "\n", "utf8");
console.log(`Estilos creados (en prueba): ${creados.map((e) => `estilos/${e.id}.json`).join(", ")} y su guía. ` +
  `Activo: ${creados[0].id}. Se aprueban tras el primer vídeo con /estilo.`);
