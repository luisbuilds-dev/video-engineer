// Logos reales de marcas (Simple Icons, CC0: más de 3.000, sin conexión). Solo se usan para nombrar una marca de la que
// hablas (uso nominativo); las marcas siguen siendo de sus dueños. El render no carga la librería entera: componer copia
// a edicion.json solo los logos que usa el vídeo.
import * as si from "simple-icons";

import type { Logo } from "./logos-color";
export { colorLogo, luminancia, type Logo } from "./logos-color";

const TODOS: Logo[] = Object.entries(si)
  .filter(([k, v]) => k.startsWith("si") && typeof v === "object" && v && "path" in v)
  .map(([, v]) => { const i = v as { slug: string; title: string; hex: string; path: string }; return { slug: i.slug, titulo: i.title, hex: i.hex, path: i.path }; });
const PORSLUG = new Map(TODOS.map((l) => [l.slug, l]));

const normaliza = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

export function logo(slug: string): Logo | undefined {
  return PORSLUG.get(slug);
}

/** Busca por nombre de marca («bambu lab», «YouTube»): primero exactos, luego los que empiezan igual, luego los que lo contienen. */
export function buscarLogos(termino: string, max = 8): Logo[] {
  const t = normaliza(termino);
  if (!t) return [];
  const puntua = (l: Logo) => {
    const a = normaliza(l.titulo), b = l.slug;
    if (a === t || b === t) return 0;
    if (a.startsWith(t) || b.startsWith(t)) return 1;
    if (a.includes(t) || b.includes(t)) return 2;
    return 9;
  };
  return TODOS.map((l) => [puntua(l), l] as const).filter(([p]) => p < 9)
    .sort((a, b) => a[0] - b[0] || a[1].titulo.length - b[1].titulo.length).slice(0, max).map(([, l]) => l);
}

