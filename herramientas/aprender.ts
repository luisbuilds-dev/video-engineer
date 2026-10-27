// npm run aprender -- --proyecto ID [--nota "lo que el usuario dijo"]
// Después de cada vídeo entregado: guarda lo que se decidió (y lo que el usuario cambió) en el historial del estilo
// y reescribe la sección «Tus números» de su guía, sin gastar tokens. Claude añade las notas en lenguaje natural
// (preferencias) en la guía; este script solo hace las cuentas para que la guía mejore con cada vídeo.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "../lib/config";
import { carpeta, leer, opcion, RAIZ } from "../lib/proyecto";
import type { Edicion } from "../src/tipos";

const id = opcion("proyecto");
if (!id) throw new Error("uso: npm run aprender -- --proyecto ID [--nota \"...\"]");
carpeta(id);
const edicion = leer<Edicion>(id, "edicion.json");
const decisiones = leer<{ gancho: { texto: string; categoria?: string } | null; propuesta?: unknown }>(id, "decisiones.json");
const estiloId = edicion.estilo.id;
const minutos = edicion.duracionMs / 60000;

const registro = {
  fecha: new Date().toISOString().slice(0, 10), proyecto: id, duracionS: Math.round(edicion.duracionMs / 1000),
  formato: edicion.estilo.formato.ancho > edicion.estilo.formato.alto ? "horizontal" : "vertical",
  gancho: decisiones.gancho?.texto ?? null, categoria: decisiones.gancho?.categoria ?? null,
  tarjetasMin: +(edicion.tarjetas.length / minutos).toFixed(1),
  graficos: edicion.graficos.map((g) => g.tipo), efectosMin: +(edicion.sonidos.length / minutos).toFixed(1),
  zoomsMin: +(edicion.zooms.length / minutos).toFixed(1), densidad: edicion.estilo.efectos.densidad,
  nota: opcion("nota") ?? null,
};
const historial = join(RAIZ, "estilos", `${estiloId}.historial.jsonl`);
appendFileSync(historial, JSON.stringify(registro) + "\n", "utf8");

// «Tus números»: medias de todo el historial, para que Claude proponga lo que ya sabe que te funciona
const todos = readFileSync(historial, "utf8").trim().split("\n").map((l) => JSON.parse(l) as typeof registro);
const media = (k: "tarjetasMin" | "efectosMin" | "zoomsMin" | "duracionS") => (todos.reduce((s, r) => s + r[k], 0) / todos.length).toFixed(1);
const cuenta = (xs: (string | null)[]) => Object.entries(xs.filter(Boolean).reduce<Record<string, number>>((a, x) => ({ ...a, [x!]: (a[x!] ?? 0) + 1 }), {}))
  .sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join(", ") || "—";
const numeros = [
  "## Tus números", "",
  `_Calculado de ${todos.length} vídeo(s) con este estilo; lo actualiza \`npm run aprender\`._`, "",
  `- Duración media: ${media("duracionS")} s · formato: ${cuenta(todos.map((r) => r.formato))}`,
  `- Ganchos elegidos por categoría: ${cuenta(todos.map((r) => r.categoria))}`,
  `- Por minuto: ${media("tarjetasMin")} tarjetas · ${media("efectosMin")} efectos · ${media("zoomsMin")} zooms`,
  `- Gráficos que más usas: ${cuenta(todos.flatMap((r) => r.graficos))}`,
  `- Último gancho: «${registro.gancho ?? "—"}»`,
].join("\n");

const guia = join(RAIZ, "estilos", `${estiloId}.guia.md`);
const base = existsSync(guia) ? readFileSync(guia, "utf8") : [
  `# Guía de edición · ${estiloId}`, "",
  `Lo que ${config().nombre || "el usuario"} prefiere, aprendido vídeo a vídeo. Claude la lee al empezar cada /editar.`,
  "Una preferencia que se repite 3 veces se propone como regla del estilo (con su OK).", "",
  "## Le gusta", "", "## No le gusta", "", "## Ganchos que funcionaron", "", "## Tus números", "",
].join("\n");
const actualizada = base.includes("## Tus números") ? base.replace(/## Tus números[\s\S]*$/, numeros + "\n") : `${base}\n${numeros}\n`;
writeFileSync(guia, actualizada, "utf8");
console.log(`Aprendido de ${id}: historial (${todos.length} vídeos) y «Tus números» en estilos/${estiloId}.guia.md`);
