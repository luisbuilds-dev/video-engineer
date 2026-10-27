// config.json (lo crea /empezar): cómo te llamas, en qué idioma hablas en tus reels y qué modelo de Whisper usar.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { RAIZ } from "./proyecto";

export const WHISPER_VERSION = "1.5.5"; // la que Remotion recomienda: soporta marcas de tiempo por palabra
export const WHISPER_DIR = join(RAIZ, "whisper.cpp");
export const MODELOS = ["tiny", "base", "small", "medium", "large-v3-turbo"] as const;
export type Modelo = (typeof MODELOS)[number];

export type Config = { nombre: string; idioma: string; modelo: Modelo; estilo: string; estiloHorizontal?: string | null;
  privado?: string[] }; // privado: frases que nunca deben verse en pantalla (tu nombre completo, tu calle…)
const DEFECTO: Config = { nombre: "", idioma: "es", modelo: "small", estilo: "base-neutra" };

export function config(): Config {
  const ruta = join(RAIZ, "config.json");
  return existsSync(ruta) ? { ...DEFECTO, ...JSON.parse(readFileSync(ruta, "utf8")) } : DEFECTO;
}
