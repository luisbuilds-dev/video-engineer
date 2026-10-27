// Iconos que no están en Lucide: se buscan en Iconify (más de 200.000, de cientos de colecciones), se quedan solo los de
// licencia libre y de un color, se sanea el SVG (solo formas, nada de scripts ni enlaces) y se guardan en iconos/<nombre>.json
// con su licencia y autor. A partir de ahí son iconos del sistema como cualquier otro.

/** Licencias que dejan usar el icono en un vídeo (comercial incluido). CC BY pide crédito: va en iconos/CREDITOS.md. */
export const LICENCIAS_OK = ["MIT", "ISC", "Apache-2.0", "CC0-1.0", "BSD-2-Clause", "BSD-3-Clause", "CC-BY-4.0"];
/** Colecciones con el mismo aire que Lucide (trazo fino, 24 px): se proponen antes. */
const PREFERIDAS = ["lucide", "lucide-lab", "tabler", "iconoir", "ph", "hugeicons", "carbon", "mdi", "material-symbols"];

export type Elemento = [string, Record<string, string>];
export type IconoGuardado = {
  nombre: string; origen: string; licencia: string; autor: string; url?: string;
  ancho: number; alto: number; trazo: boolean; elementos: Elemento[];
};
export type Coleccion = { name: string; author?: { name: string; url?: string }; license?: { spdx?: string; title?: string; url?: string };
  palette?: boolean; tags?: string[] };

export function licenciaValida(c?: Coleccion): boolean {
  return !!c && !c.palette && LICENCIAS_OK.includes(c.license?.spdx ?? "");
}

/** Ordena los resultados de una búsqueda de Iconify: fuera los de licencia dudosa o a color; primero los de trazo y las colecciones preferidas. */
export function elegir(iconos: string[], colecciones: Record<string, Coleccion>, max = 8): string[] {
  const puntua = (id: string) => {
    const c = colecciones[id.split(":")[0]];
    const p = PREFERIDAS.indexOf(id.split(":")[0]);
    return (c?.tags?.includes("Uses Stroke") ? 0 : 100) + (p < 0 ? 50 : p) + (/(filled|solid|bold|duotone)/.test(id) ? 30 : 0);
  };
  return iconos.filter((id) => licenciaValida(colecciones[id.split(":")[0]])).sort((a, b) => puntua(a) - puntua(b)).slice(0, max);
}

const FORMAS = new Set(["path", "circle", "rect", "line", "polyline", "polygon", "ellipse"]);
const ATRIBUTOS = new Set(["d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points", "transform",
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill-rule", "clip-rule", "opacity", "fill-opacity", "stroke-opacity"]);
const camel = (a: string) => a.replace(/-([a-z])/g, (_, l) => l.toUpperCase());

/**
 * Del `body` SVG de Iconify a una lista de formas con sus atributos (los de <g> se heredan).
 * Devuelve null si trae algo que no sea una forma simple (scripts, enlaces, máscaras, degradados…): mejor no usarlo.
 */
export function sanear(body: string): { elementos: Elemento[]; trazo: boolean } | null {
  const pila: Record<string, string>[] = [{}];
  const elementos: Elemento[] = [];
  const etiqueta = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g;
  let resto = body;
  for (const m of body.matchAll(etiqueta)) {
    resto = resto.replace(m[0], "");
    const [, cierra, tag, cuerpo, sola] = m;
    if (cierra) { if (tag === "g") pila.pop(); continue; }
    const attrs: Record<string, string> = {};
    for (const [, k, v] of cuerpo.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
      if (!ATRIBUTOS.has(k) || /url\(|javascript:/i.test(v)) return null; // atributos desconocidos o con enlaces: fuera
      attrs[camel(k)] = v;
    }
    if (tag === "g") { if (!sola) pila.push({ ...pila.at(-1), ...attrs }); continue; }
    if (!FORMAS.has(tag)) return null;
    elementos.push([tag, { ...pila.at(-1), ...attrs }]);
  }
  if (resto.trim() || !elementos.length) return null; // texto suelto o nada dibujable
  const trazo = elementos.every(([, a]) => a.fill === "none" || (a.stroke && a.stroke !== "none" && a.fill !== "currentColor"));
  // el color lo pone el vídeo: se quita el de origen
  for (const [, a] of elementos) {
    if (a.stroke && a.stroke !== "none") a.stroke = "currentColor";
    if (a.fill && a.fill !== "none") a.fill = "currentColor";
  }
  return { elementos, trazo };
}

/** Nombre local válido: minúsculas, números y guiones. */
export const nombreLocal = (n: string) => n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
