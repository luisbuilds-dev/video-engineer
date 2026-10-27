// Métricas de retención de un vídeo ya editado. Todo medible, sin opiniones: Claude las convierte en consejos.
// Referencias de formato corto (Reels, TikTok, Shorts): la gente decide en ~1-3 s si se queda, y cada tramo de
// varios segundos sin cambio visual ni sonoro es un punto típico de abandono.
import type { Palabra } from "./tiempos";

export type Senal = { id: string; ok: boolean; peso: number; detalle: string; consejo: string };

const RELLENO = /^(eh+|em+|este|o sea|pues|bueno|um+|uh+|like|ehm+|mmm+)[,.]?$/i;
const CTA = /(comenta|coment[aá]|s[ií]gueme|guarda|comparte|link|enlace|suscr[ií]bete|follow|comment|save|share)/i;

export function senales(o: {
  palabras: Palabra[]; duracionMs: number; vertical: boolean; conGancho: boolean;
  cambios: { desdeMs: number; hastaMs: number }[]; // tarjetas, gráficos, zooms y efectos de cámara
  movimiento: number[]; // movimiento medio por segundo (ritmo.json)
}): Senal[] {
  const { palabras, duracionMs, vertical } = o;
  const seg = duracionMs / 1000;
  const primera = palabras[0]?.desdeMs ?? duracionMs;
  const en3 = palabras.filter((p) => p.desdeMs < 3000).length / 3;
  const relleno = palabras.filter((p) => RELLENO.test(p.texto)).length;
  const final = palabras.filter((p) => p.desdeMs > duracionMs - 6000).map((p) => p.texto).join(" ");
  const regancho = o.cambios.some((c) => c.desdeMs >= 2500 && c.desdeMs <= 10000);
  // tramos planos: segundos seguidos sin ningún cambio y con poco movimiento
  const planos: [number, number][] = [];
  let inicio = -1;
  for (let s = 0; s <= Math.ceil(seg); s++) {
    const t = s * 1000;
    const pasa = o.cambios.some((c) => t >= c.desdeMs - 500 && t <= c.hastaMs) || (o.movimiento[s] ?? 0) > 0.12 || s >= seg;
    if (!pasa && inicio < 0) inicio = s;
    if (pasa && inicio >= 0) { if (s - inicio >= 3) planos.push([inicio, s]); inicio = -1; }
  }
  const [min, max] = vertical ? [12, 45] : [120, 900];
  return [
    { id: "arranque", ok: primera <= 400, peso: 20, detalle: `la primera palabra llega a los ${(primera / 1000).toFixed(1)} s`,
      consejo: "Empieza a hablar en el primer fotograma: cada décima en silencio al inicio pierde gente." },
    { id: "gancho-visual", ok: o.conGancho, peso: 15, detalle: o.conGancho ? "hay texto de gancho al inicio" : "no hay texto de gancho",
      consejo: "Pon un texto de gancho en el primer segundo: muchos ven sin sonido." },
    { id: "ritmo-inicial", ok: en3 >= 2.3, peso: 15, detalle: `${en3.toFixed(1)} palabras por segundo en los 3 primeros segundos`,
      consejo: "Los 3 primeros segundos tienen que ir rápidos: recorta pausas o empieza por la frase más fuerte." },
    { id: "regancho", ok: regancho, peso: 10, detalle: regancho ? "hay un cambio visual entre los 3 y 10 s" : "nada cambia entre los 3 y 10 s",
      consejo: "Mete un re-gancho entre el segundo 3 y el 10 (tarjeta, cifra, zoom o «pero aquí viene lo raro»)." },
    { id: "planos", ok: planos.length === 0, peso: 15,
      detalle: planos.length ? `tramos sin cambios: ${planos.map(([a, b]) => `${a}–${b} s`).join(", ")}` : "ningún tramo de 3 s sin cambios",
      consejo: "En los tramos planos añade un zoom, una tarjeta o un gráfico: ahí es donde la gente desliza." },
    { id: "duracion", ok: seg >= min && seg <= max, peso: 10, detalle: `dura ${seg.toFixed(0)} s (ideal ${min}–${max} s)`,
      consejo: seg > max ? "Es largo para el formato: corta lo que no sume a la promesa del gancho." : "Es muy corto: asegúrate de cumplir la promesa del gancho." },
    { id: "relleno", ok: relleno === 0, peso: 5, detalle: `${relleno} muletillas`, consejo: "Quita las muletillas que quedan en /limpiar." },
    { id: "cta", ok: CTA.test(final), peso: 10, detalle: CTA.test(final) ? "hay llamada a la acción al final" : "no hay llamada a la acción al final",
      consejo: "Cierra con una acción concreta: «comenta X y te lo mando», «guárdalo para luego»." },
  ];
}

export const puntuacion = (s: Senal[]) => Math.round((s.filter((x) => x.ok).reduce((a, x) => a + x.peso, 0) / s.reduce((a, x) => a + x.peso, 0)) * 100);
