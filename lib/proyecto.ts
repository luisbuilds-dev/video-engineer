// Cada reel es una carpeta proyectos/<id>/ con todo lo suyo. El crudo original nunca se modifica.
//   crudo.<ext>        tu grabación (copia; el original se queda donde estaba)
//   audio.wav          16 kHz mono para transcribir
//   palabras.json      transcripción palabra a palabra del crudo
//   aprobadas.json     índices de las palabras que se quedan (el texto que apruebas en /limpiar)
//   limpio.mp4         crudo sin silencios ni repeticiones
//   edicion.json       lo que se dibuja: palabras recolocadas, tarjetas, gancho y estilo
//   salida.mp4         el reel final · revision.jpg la hoja de control de /revisar
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const RAIZ = resolve(import.meta.dirname, "..");

export function carpeta(id: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(id)) throw new Error(`id de proyecto inválido: ${id} (minúsculas, números y guiones)`);
  const c = join(RAIZ, "proyectos", id);
  mkdirSync(c, { recursive: true });
  return c;
}

export function leer<T>(id: string, archivo: string): T {
  const ruta = join(carpeta(id), archivo);
  if (!existsSync(ruta)) throw new Error(`falta ${archivo} en proyectos/${id}`);
  return JSON.parse(readFileSync(ruta, "utf8")) as T;
}

export function escribir(id: string, archivo: string, datos: unknown): string {
  const ruta = join(carpeta(id), archivo);
  writeFileSync(ruta, JSON.stringify(datos, null, 2) + "\n", "utf8");
  return ruta;
}

/** Argumento --nombre valor de la línea de órdenes. */
export function opcion(nombre: string, defecto?: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : defecto;
}
