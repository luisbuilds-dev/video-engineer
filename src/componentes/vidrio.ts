import type { Estilo } from "../../lib/estilo";

/** Superficie común del estilo base: vidrio oscuro translúcido, borde de un pelo y sombra difusa. */
export const vidrio = (estilo: Estilo["tarjetas"], escala: number, radio = 28) => ({
  background: `${estilo.fondo}A6`,
  backdropFilter: `blur(${22 * escala}px) saturate(140%)`,
  border: `${1.5 * escala}px solid rgba(255,255,255,.14)`,
  boxShadow: `0 ${18 * escala}px ${54 * escala}px rgba(0,0,0,.28)`,
  borderRadius: radio * escala,
});

/** Curva de salida suave (sin rebote): lo elegante entra decidido y se posa. */
export const suave = (t: number) => 1 - (1 - t) ** 4;
