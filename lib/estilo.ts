// El estilo de edición: todo lo que decide cómo se ve y suena un reel. Se guarda en estilos/<id>.json.
// Claude lo ajusta contigo (/estilo); los scripts y la composición solo lo leen.
import { readFileSync } from "node:fs";
import { z } from "zod";

export const FUENTES = ["Inter", "Anton", "Montserrat", "Bebas Neue", "Poppins", "Oswald", "Archivo Black", "Barlow Condensed",
  "Space Grotesk", "Bricolage Grotesque", "DM Serif Display", "Permanent Marker", "JetBrains Mono"] as const;
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "color en formato #RRGGBB");

export const Estilo = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  estado: z.enum(["en-prueba", "aprobado"]),
  formato: z.object({ ancho: z.number().int(), alto: z.number().int(), fps: z.number().int().min(24).max(60) }),
  subtitulos: z.object({
    activo: z.boolean(),
    fuente: z.enum(FUENTES),
    peso: z.number().int().min(400).max(900),
    tamano: z.number().min(24).max(160),
    color,
    resalte: color,
    contorno: color,
    grosorContorno: z.number().min(0).max(0.15).default(0.07), // fracción del tamaño de letra; 0 = solo sombra
    posicion: z.number().min(0.1).max(0.9), // 0 = arriba, 1 = abajo
    maxPalabras: z.number().int().min(1).max(8),
    mayusculas: z.boolean(),
  }),
  tarjetas: z.object({
    activo: z.boolean(),
    fuente: z.enum(FUENTES),
    fondo: color,
    texto: color,
    acento: color,
    posicion: z.number().min(0.1).max(0.9),
    duracionMaxMs: z.number().int().min(600).max(6000),
  }),
  gancho: z.object({ activo: z.boolean(), duracionMs: z.number().int().min(800).max(5000), tamano: z.number().min(40).max(200) }),
  ritmo: z.object({
    silencioMaxMs: z.number().int().min(100).max(2000), // silencios más largos se cortan
    margenMs: z.number().int().min(0).max(500), // aire que se deja antes y después de cada frase
    velocidad: z.number().min(1).max(1.3),
    zooms: z.boolean().default(true), // zoom de golpe cuando el plano lleva quieto más de maxPlanoMs
    maxPlanoMs: z.number().int().min(1200).max(8000).default(2600),
    zoomEntrada: z.boolean().default(true), // el primer medio segundo entra con un zoom: gancho visual
  }),
  audio: z.object({ lufs: z.number().min(-23).max(-9) }),
  musica: z.object({
    volumenDb: z.number().min(-40).max(-6), // volumen de la música cuando no hablas
    bajaDb: z.number().min(0).max(30), // cuánto baja mientras hablas
  }).default({ volumenDb: -18, bajaDb: 12 }),
  efectos: z.object({
    densidad: z.enum(["limpio", "medio", "movido"]), // cuántos efectos de sonido entran
    volumenDb: z.number().min(-30).max(-6), // volumen de los efectos respecto a la voz
  }).default({ densidad: "medio", volumenDb: -22 }),
  cabecera: z.object({
    barra: z.boolean(), // barra de secciones arriba que cronometra (si el vídeo tiene 2 o más secciones o capítulos)
    onda: z.boolean(), // onda simétrica que reacciona a la voz
  }).default({ barra: true, onda: false }),
});
export type Estilo = z.infer<typeof Estilo>;

export function leerEstilo(ruta: string): Estilo {
  return Estilo.parse(JSON.parse(readFileSync(ruta, "utf8")));
}
