// Efectos de cámara sobre el vídeo: qué transformación y qué filtros tiene la imagen en cada instante.
// Función pura (se prueba sin renderizar); la composición solo la aplica.

export const EFECTOS_CAMARA = ["sacudida", "flash", "glitch", "zoom-suave", "zoom-salida", "blanco-negro",
  "vineta", "latido", "desenfoque", "barrido"] as const;
export type TipoCamara = (typeof EFECTOS_CAMARA)[number];
export type EfectoCamara = { efecto: TipoCamara; desdeMs: number; duracionMs: number; intensidad?: number };

/** Duración por defecto de cada efecto (ms). */
export const DURACION: Record<TipoCamara, number> = {
  sacudida: 350, flash: 220, glitch: 300, "zoom-suave": 3000, "zoom-salida": 600, "blanco-negro": 1500,
  vineta: 1500, latido: 400, desenfoque: 500, barrido: 300,
};

export type Estado = {
  escala: number; dx: number; dy: number; rot: number; // dx/dy en fracción del ancho/alto
  blur: number; gris: number; flash: number; vineta: number; tono: number; contraste: number;
};
export const NEUTRO: Estado = { escala: 1, dx: 0, dy: 0, rot: 0, blur: 0, gris: 0, flash: 0, vineta: 0, tono: 0, contraste: 1 };

const suave = (x: number) => x * x * (3 - 2 * x); // ease in-out
// ruido determinista (el render de Remotion es por fotogramas sueltos: nada de Math.random)
const ruido = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };

/** Estado de la cámara en el instante tMs, combinando todos los efectos activos. */
export function estadoCamara(tMs: number, efectos: EfectoCamara[]): Estado {
  const e = { ...NEUTRO };
  for (const ef of efectos) {
    const p = (tMs - ef.desdeMs) / ef.duracionMs; // progreso 0..1
    if (p < 0 || p >= 1) continue;
    const k = ef.intensidad ?? 1;
    const f = Math.floor(tMs / 33); // un valor nuevo por fotograma a 30 fps
    switch (ef.efecto) {
      case "sacudida": { // temblor que se apaga: para golpes y sellos
        const a = 0.018 * k * (1 - p);
        e.dx += ruido(f) * a; e.dy += ruido(f + 7) * a; e.rot += ruido(f + 13) * 1.2 * k * (1 - p);
        break;
      }
      case "flash": e.flash = Math.max(e.flash, 0.85 * k * (1 - p)); break; // destello blanco que se desvanece
      case "glitch": { // saltos laterales y de color a golpes, para cambios de tema
        const on = ruido(f) > -0.2 ? 1 : 0;
        e.dx += on * ruido(f + 3) * 0.03 * k; e.tono += on * 90 * k; e.contraste *= 1 + on * 0.35 * k;
        break;
      }
      case "zoom-suave": e.escala *= 1 + 0.08 * k * suave(p); break; // acercamiento lento (Ken Burns)
      case "zoom-salida": e.escala *= 1 + 0.25 * k * (1 - suave(p)); break; // de cerca a plano normal
      case "blanco-negro": e.gris = Math.max(e.gris, Math.min(1, p * 6, (1 - p) * 6)); break;
      case "vineta": e.vineta = Math.max(e.vineta, 0.75 * k * Math.min(1, p * 5, (1 - p) * 5)); break; // foco en el centro
      case "latido": e.escala *= 1 + 0.06 * k * Math.sin(Math.PI * p); break; // pulso para una cifra o un remate
      case "desenfoque": e.blur = Math.max(e.blur, 18 * k * (1 - suave(p))); break; // entra desenfocado y se aclara
      case "barrido": { // transición de látigo: sale por la izquierda y entra por la derecha
        e.dx += p < 0.5 ? -0.45 * suave(p * 2) : 0.45 * (1 - suave((p - 0.5) * 2));
        e.blur = Math.max(e.blur, 22 * Math.sin(Math.PI * p));
        break;
      }
    }
  }
  return e;
}
