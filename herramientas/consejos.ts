// npm run consejos -- --proyecto ID
// Puntuación de retención (0-100) y lo que falla, medido sobre el vídeo editado: arranque, gancho, ritmo inicial,
// re-gancho, tramos planos, duración, muletillas y llamada a la acción. Escribe consejos.json; /consejos lo explica.
import { carpeta, escribir, leer, opcion } from "../lib/proyecto";
import type { Palabra } from "../lib/tiempos";
import { puntuacion, senales } from "../lib/viralidad";
import type { Edicion } from "../src/tipos";

const id = opcion("proyecto");
if (!id) throw new Error("uso: npm run consejos -- --proyecto ID");
carpeta(id);
const e = leer<Edicion>(id, "edicion.json");
const { palabras } = leer<{ palabras: Palabra[] }>(id, "cortadas.json");
let movimiento: number[] = [];
try { movimiento = leer<{ movimiento: number }[]>(id, "ritmo.json").map((r) => r.movimiento); } catch { /* sin analizar */ }

const cambios = [...e.tarjetas, ...e.graficos, ...e.zooms, ...(e.camara ?? []).map((c) => ({ desdeMs: c.desdeMs, hastaMs: c.desdeMs + c.duracionMs }))];
const lista = senales({ palabras, duracionMs: e.duracionMs, vertical: e.estilo.formato.alto > e.estilo.formato.ancho,
  conGancho: !!e.gancho, cambios, movimiento });
const nota = puntuacion(lista);
escribir(id, "consejos.json", { puntuacion: nota, senales: lista });
console.log(`Retención estimada: ${nota}/100`);
for (const s of lista.sort((a, b) => Number(a.ok) - Number(b.ok) || b.peso - a.peso)) {
  console.log(`${s.ok ? "✓" : "✗"} ${s.id}: ${s.detalle}${s.ok ? "" : `\n    → ${s.consejo}`}`);
}
