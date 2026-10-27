// Reencuadre automático: qué parte del vídeo original se ve cuando su forma no coincide con la de salida
// (vertical → YouTube, YouTube → Reel). La cara SIEMPRE completa, con aire arriba, y una «cámara» que se mueve
// con suavidad: no persigue cada movimiento (zona muerta) y cuando se mueve lo hace sin saltos.
import type { Fotograma } from "./vision";

export type Ventana = { tMs: number; x: number; y: number; w: number; h: number }; // fracciones del original

/** Caja que hay que ver entera en cada fotograma: la cara principal con pelo, barbilla y algo de hombros. */
function sujeto(f: Fotograma) {
  const c = [...f.caras].filter((x) => (x.score ?? 1) > 0.85).sort((a, b) => b.w * b.h - a.w * a.h)[0];
  if (!c) return null;
  return { cx: c.x + c.w / 2, cy: c.y + c.h / 2, w: c.w * 1.6, h: c.h * 2.1 };
}

/**
 * Ventanas de recorte (una por fotograma analizado) para pasar de `ancho×alto` a la proporción `salida` (ancho/alto).
 * Si la proporción coincide, devuelve el vídeo entero.
 */
export function reencuadrar(fotos: Fotograma[], ancho: number, alto: number, salida: number,
  opciones: { zonaMuerta?: number; suavizado?: number; alturaOjos?: number; maxSujeto?: number; centroX?: number } = {}): Ventana[] {
  // centroX: dónde va la cara en horizontal (0,5 = centro; en 16:9 se usa el tercio izquierdo y queda un lado libre para gráficos)
  const op = { zonaMuerta: 0.08, suavizado: 0.12, alturaOjos: 0.38, maxSujeto: 0.75, centroX: 0.5, ...opciones };
  const fuente = ancho / alto;
  if (Math.abs(fuente - salida) < 0.01 || !fotos.length) return fotos.map((f) => ({ tMs: f.tMs, x: 0, y: 0, w: 1, h: 1 }));
  // tamaño de la ventana en fracciones del original: la mayor que cabe con la forma de salida
  let w = fuente > salida ? salida / fuente : 1;
  let h = fuente > salida ? 1 : fuente / salida;
  // sin acercarse de más: el sujeto (mediana de todo el vídeo, para que el tamaño no cambie) ocupa como mucho maxSujeto del alto.
  // Si para eso la ventana sale del original, lo que sobra se rellena con el propio vídeo desenfocado (lo dibuja el Reel).
  const altos = fotos.map(sujeto).filter((s): s is NonNullable<typeof s> => !!s).map((s) => s.h).sort((a, b) => a - b);
  if (altos.length) {
    const mediana = altos[Math.floor(altos.length / 2)];
    const k = Math.min(1 / h, Math.max(1, mediana / (h * op.maxSujeto))); // nunca más que el alto completo del original
    w *= k; h *= k;
  }
  // objetivo por fotograma: cara a `alturaOjos` del alto de la ventana y centrada en horizontal
  const objetivos = fotos.map((f) => {
    const s = sujeto(f);
    return s ? { x: s.cx - w * op.centroX, y: s.cy - h * op.alturaOjos } : null;
  });
  // huecos sin cara: se mantiene el último objetivo conocido (o el primero que aparezca)
  const primero = objetivos.find(Boolean) ?? { x: (1 - w) / 2, y: (1 - h) / 2 };
  let ultimo = primero;
  const completos = objetivos.map((o) => (o ? (ultimo = o) : ultimo));
  // dentro del original; si la ventana es más ancha (o alta) que él, puede sobresalir pero sin dejarlo a un lado
  const entre = (v: number, a: number, b: number) => Math.min(Math.max(a, b), Math.max(Math.min(a, b), v));
  const limita = (x: number, y: number) => ({ x: entre(x, 0, 1 - w), y: entre(y, 0, 1 - h) });

  // cámara: solo se mueve si el objetivo sale de la zona muerta, y entonces lo sigue suavizando
  const salidaV: Ventana[] = [];
  let cam = limita(completos[0].x, completos[0].y);
  fotos.forEach((f, i) => {
    const o = limita(completos[i].x, completos[i].y);
    const dx = o.x - cam.x, dy = o.y - cam.y;
    if (Math.abs(dx) > op.zonaMuerta * w || Math.abs(dy) > op.zonaMuerta * h) {
      cam = { x: cam.x + dx * op.suavizado, y: cam.y + dy * op.suavizado };
    }
    // la cara nunca puede quedar cortada: si se sale por un borde, la ventana la recoge en el acto
    const s = sujeto(f);
    if (s) {
      // si el sujeto no cabe entero en la ventana, se centra en él
      cam.x = s.w <= w ? Math.min(s.cx - s.w / 2, Math.max(s.cx + s.w / 2 - w, cam.x)) : s.cx - w / 2;
      cam.y = s.h <= h ? Math.min(s.cy - s.h / 2, Math.max(s.cy + s.h / 2 - h, cam.y)) : s.cy - h / 2;
    }
    cam = limita(cam.x, cam.y);
    salidaV.push({ tMs: f.tMs, x: +cam.x.toFixed(4), y: +cam.y.toFixed(4), w: +w.toFixed(4), h: +h.toFixed(4) });
  });
  return salidaV;
}

/** Ventana en un instante cualquiera (interpolación lineal entre las calculadas). */
export function ventanaEn(tMs: number, v: Ventana[]): Ventana {
  if (!v.length) return { tMs, x: 0, y: 0, w: 1, h: 1 };
  if (tMs <= v[0].tMs) return v[0];
  for (let i = 1; i < v.length; i++) {
    if (tMs <= v[i].tMs) {
      const p = (tMs - v[i - 1].tMs) / (v[i].tMs - v[i - 1].tMs);
      return { tMs, x: v[i - 1].x + (v[i].x - v[i - 1].x) * p, y: v[i - 1].y + (v[i].y - v[i - 1].y) * p, w: v[i].w, h: v[i].h };
    }
  }
  return v[v.length - 1];
}
