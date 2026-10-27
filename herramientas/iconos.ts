// npm run iconos -- cable printer tornillo        busca en los iconos del sistema (Lucide + los guardados) y, si hay pocos, en internet
// npm run iconos -- --guardar tabler:printer-3d impresora-3d   descarga ese icono de internet y lo deja en el sistema
// npm run iconos -- --logo bambu youtube          logos reales de marcas (Simple Icons): el «slug» va en «logo»
// Claude traduce lo que dice el usuario («impresora» → printer) y elige entre los resultados.
// Los nombres que imprime son los que van en decisiones.json («icono»).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { icons } from "lucide";
import { elegir, licenciaValida, nombreLocal, sanear, type Coleccion, type IconoGuardado } from "../lib/iconos-externos";
import { RAIZ } from "../lib/proyecto";

const API = "https://api.iconify.design";
export const CARPETA = join(RAIZ, "iconos");
const kebab = (n: string) => n.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();
const LUCIDE = [...new Set(Object.keys(icons).map(kebab))];

/** Iconos guardados desde internet (iconos/<nombre>.json). */
export function guardados(): Record<string, IconoGuardado> {
  if (!existsSync(CARPETA)) return {};
  return Object.fromEntries(readdirSync(CARPETA).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(CARPETA, f), "utf8")) as IconoGuardado).map((i) => [i.nombre, i]));
}
export const NOMBRES = [...new Set([...LUCIDE, ...Object.keys(guardados())])].sort();

export function buscar(termino: string, max = 12): string[] {
  const t = termino.toLowerCase();
  return NOMBRES.filter((n) => n.includes(t)).sort((a, b) => a.length - b.length).slice(0, max);
}

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return (await r.json()) as T;
}

/** Busca en Iconify y devuelve solo los que se pueden usar (licencia libre, un color). */
export async function buscarEnInternet(termino: string): Promise<{ id: string; licencia: string }[]> {
  const r = await json<{ icons: string[]; collections: Record<string, Coleccion> }>(`${API}/search?query=${encodeURIComponent(termino)}&limit=64`);
  return elegir(r.icons, r.collections).map((id) => ({ id, licencia: r.collections[id.split(":")[0]].license?.spdx ?? "" }));
}

/** Descarga `prefijo:nombre`, comprueba licencia, sanea el SVG y lo guarda como iconos/<nombre>.json. */
export async function guardar(id: string, nombre = id.split(":")[1], forzar = false): Promise<IconoGuardado> {
  const [prefijo, icono] = id.split(":");
  if (!prefijo || !icono) throw new Error("el icono va como colección:nombre (p. ej. tabler:printer-3d)");
  const local = nombreLocal(nombre);
  if (LUCIDE.includes(local)) throw new Error(`«${local}» ya existe en Lucide: usa ese o elige otro nombre`);
  const ruta = join(CARPETA, `${local}.json`);
  if (existsSync(ruta) && !forzar) throw new Error(`«${local}» ya está guardado (añade --forzar para reemplazarlo)`);
  const col = (await json<Record<string, Coleccion>>(`${API}/collections?prefixes=${prefijo}`))[prefijo];
  if (!licenciaValida(col)) throw new Error(`${id}: la licencia (${col?.license?.title ?? "desconocida"}) no permite usarlo sin más, o es a color`);
  const datos = await json<{ width?: number; height?: number; icons: Record<string, { body: string; width?: number; height?: number }> }>(
    `${API}/${prefijo}.json?icons=${icono}`);
  const i = datos.icons?.[icono];
  if (!i) throw new Error(`${id}: no existe`);
  const limpio = sanear(i.body);
  if (!limpio) throw new Error(`${id}: trae elementos que no son formas simples; elige otro`);
  const g: IconoGuardado = { nombre: local, origen: id, licencia: col!.license!.spdx!, autor: col!.author?.name ?? col!.name,
    url: col!.license?.url ?? col!.author?.url, ancho: i.width ?? datos.width ?? 24, alto: i.height ?? datos.height ?? 24, ...limpio };
  mkdirSync(CARPETA, { recursive: true });
  writeFileSync(ruta, JSON.stringify(g, null, 1) + "\n", "utf8");
  escribirCreditos();
  return g;
}

/** iconos/CREDITOS.md: de dónde sale cada icono guardado y con qué licencia (va en el repo y en NOTICE). */
function escribirCreditos() {
  const filas = Object.values(guardados()).sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map((i) => `- **${i.nombre}**: \`${i.origen}\`, ${i.autor}, ${i.licencia}${i.url ? ` (${i.url})` : ""}`);
  writeFileSync(join(CARPETA, "CREDITOS.md"), `# Iconos añadidos desde Iconify\n\nCada uno conserva la licencia de su colección.\n\n${filas.join("\n")}\n`, "utf8");
}

if (process.argv[1]?.includes("iconos")) {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const g = args.indexOf("--guardar");
  if (args.includes("--logo")) {
    const { buscarLogos } = await import("../lib/logos");
    for (const t of args.filter((a) => a !== "--logo")) console.log(`${t}: ${buscarLogos(t).map((l) => `${l.slug} (${l.titulo})`).join(", ") || "(ninguna marca con ese nombre)"}`);
  } else if (g >= 0) {
    const i = await guardar(args[g + 1], args[g + 2]?.startsWith("--") ? undefined : args[g + 2], args.includes("--forzar"));
    console.log(`✓ guardado «${i.nombre}» (${i.origen}, ${i.licencia}, ${i.trazo ? "de trazo: se dibuja" : "relleno: aparece con fundido"})`);
  } else if (!args.length) {
    console.log(`${NOMBRES.length} iconos en el sistema. Uso: npm run iconos -- palabra [palabra…]  |  --guardar coleccion:nombre [nombre]`);
  } else {
    for (const t of args) {
      const locales = buscar(t);
      console.log(`${t}: ${locales.join(", ") || "(nada en el sistema)"}`);
      if (locales.length >= 3 && !args.includes("--internet")) continue;
      try {
        const fuera = await buscarEnInternet(t);
        if (fuera.length) console.log(`  en internet: ${fuera.map((f) => `${f.id} (${f.licencia})`).join(", ")}\n  → npm run iconos -- --guardar ${fuera[0].id} ${nombreLocal(t)}`);
        else console.log("  en internet: nada con licencia libre; prueba un sinónimo en inglés");
      } catch (e) { console.log(`  (sin conexión con Iconify: ${(e as Error).message})`); }
    }
  }
}
