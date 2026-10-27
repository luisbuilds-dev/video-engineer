import { interpolatePath } from "@remotion/paths";
import { icons } from "lucide";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Grafico } from "../../lib/efectos";
import type { Estilo } from "../../lib/estilo";
import type { IconoGuardado } from "../../lib/iconos-externos";
import { familia } from "../fuentes";
import { suave, vidrio } from "./vidrio";

type Ilustracion = Extract<Grafico, { tipo: "ilustracion" }>;
type Props = { g: Ilustracion; frames: number; estilo: Estilo["tarjetas"]; escala: number };
const pascal = (n: string) => n.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("");
const ALERTA = "#FF8A80";

let extra: Record<string, IconoGuardado> = {};
/** Los iconos traídos de internet llegan dentro de edicion.json; el Reel los registra antes de dibujar. */
export function registrarIconos(m?: Record<string, IconoGuardado>) { extra = m ?? {}; }

/** Un icono (Lucide o guardado de internet) que se dibuja trazo a trazo (progreso 0 → 1). Los rellenos aparecen con fundido. */
export function Icono({ nombre, progreso, color, tamano }: { nombre: string; progreso: number; color: string; tamano: number }) {
  const p = Math.min(1, Math.max(0, progreso));
  const g = extra[nombre];
  if (g && !g.trazo) {
    return (
      <svg width={tamano} height={tamano} viewBox={`0 0 ${g.ancho} ${g.alto}`} color={color}
        style={{ overflow: "visible", opacity: p, transform: `scale(${0.85 + 0.15 * p})`, filter: `blur(${(1 - p) * 4}px)` }}>
        {g.elementos.map(([tag, attrs], i) => { const Tag = tag as "path"; return <Tag key={i} {...attrs} />; })}
      </svg>
    );
  }
  if (g) {
    return (
      <svg width={tamano} height={tamano} viewBox={`0 0 ${g.ancho} ${g.alto}`} color={color} fill="none"
        style={{ overflow: "visible", opacity: p > 0.02 ? 1 : 0 }}>
        {g.elementos.map(([tag, attrs], i) => {
          const Tag = tag as "path";
          return <Tag key={i} {...attrs} strokeWidth={1.5 * (g.ancho / 24)} strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />;
        })}
      </svg>
    );
  }
  const nodo = (icons as Record<string, [string, Record<string, string>][]>)[pascal(nombre)] ?? icons.CircleHelp;
  return (
    // con progreso 0 el trazo redondeado dejaría puntitos: hasta que empieza a dibujarse, invisible
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" style={{ overflow: "visible", opacity: progreso > 0.02 ? 1 : 0 }}>
      {nodo.map(([tag, attrs], i) => {
        const Tag = tag as "path";
        return <Tag key={i} {...attrs} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, Math.max(0, progreso))} />;
      })}
    </svg>
  );
}

const enMs = (frame: number, fps: number) => (frame / fps) * 1000;
const progreso = (t: number, desde: number, dur = 700) => Math.min(1, Math.max(0, (t - desde) / dur));

function Etiqueta({ texto, visible, escala, estilo, color }: { texto?: string; visible: number; escala: number; estilo: Estilo["tarjetas"]; color?: string }) {
  if (!texto) return null;
  return <div style={{ opacity: visible, transform: `translateY(${(1 - visible) * 12 * escala}px)`, fontFamily: familia(estilo.fuente),
    fontWeight: 500, fontSize: 36 * escala, color: color ?? estilo.texto, textAlign: "center", lineHeight: 1.1, marginTop: 12 * escala }}>{texto}</div>;
}

/** «icono»: el objeto del que hablas se dibuja grande, con su nombre, y late una vez al terminar. */
function EscenaIcono({ g, estilo, escala }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = enMs(frame, fps);
  const it = g.items[0];
  const latido = spring({ frame: frame - fps * 0.8, fps, config: { damping: 9 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ transform: `scale(${1 + 0.08 * latido * (1 - latido)})` }}>
        <Icono nombre={it.icono} progreso={progreso(t, 0, 800)} color={estilo.acento} tamano={260 * escala} />
      </div>
      <Etiqueta texto={it.etiqueta} visible={progreso(t, 500, 300)} escala={escala} estilo={estilo} />
    </div>
  );
}

/** «proceso»: pasos con su icono que aparecen cuando los dices, unidos por flechas que se dibujan. */
function EscenaProceso({ g, estilo, escala }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = g.desdeMs + enMs(frame, fps);
  const tam = (g.items.length > 3 ? 120 : 150) * escala;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 8 * escala }}>
      {g.items.map((it, i) => {
        // los pasos que aún no has dicho se ven tenues y ya dibujados: el panel nunca parece medio vacío
        const llega = t >= it.desdeMs - 300;
        return (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          {i > 0 && (
            <svg width={60 * escala} height={tam} viewBox="0 0 60 40" preserveAspectRatio="xMidYMid meet" style={{ marginRight: 8 * escala }}>
              <path d="M4 20 H50 M40 10 L52 20 L40 30" fill="none" stroke={estilo.texto} strokeWidth={2.5} strokeLinecap="round"
                strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={llega ? 1 - progreso(t, it.desdeMs - 300, 300) : 0} opacity={llega ? 0.8 : 0.2} />
            </svg>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: tam * 1.5,
            opacity: llega ? 1 : 0.22 }}>
            <Icono nombre={it.icono} progreso={llega ? progreso(t, it.desdeMs - 100, 600) : 1} color={t >= it.desdeMs ? estilo.acento : estilo.texto} tamano={tam} />
            <Etiqueta texto={it.etiqueta} visible={llega ? progreso(t, it.desdeMs, 300) : 1} escala={escala * 0.8} estilo={estilo} />
          </div>
        </div>
        );
      })}
    </div>
  );
}

// cable enredado y cables en orden: mismos segmentos (curvas cúbicas) para que el cambio de forma sea limpio
function cable(fila: number, enredado: boolean): string {
  const y = 95 + fila * 55, segs = 6, ancho = 600;
  let d = `M 20 ${y}`;
  for (let s = 0; s < segs; s++) {
    const x0 = 20 + (ancho / segs) * s, x1 = 20 + (ancho / segs) * (s + 1);
    const n = (k: number) => Math.sin(fila * 7.1 + s * 3.3 + k * 1.7) * 62; // desorden fijo (determinista)
    d += enredado
      ? ` C ${x0 + 60 + n(1)} ${y + n(2)} ${x1 - 120 + n(3)} ${y - 40 + n(4)} ${x1} ${y + n(5) * 0.6}`
      : ` C ${x0 + 30} ${y} ${x1 - 30} ${y} ${x1} ${y}`;
  }
  return d;
}

/** «caos-orden»: cables enredados que se desenredan, se alinean y quedan fijados (icono final). */
function EscenaCaosOrden({ g, estilo, escala }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = enMs(frame, fps);
  const orden = (g.ordenMs ?? g.desdeMs + 1200) - g.desdeMs; // cuándo empieza a ordenarse (relativo)
  const p = interpolate(t, [orden, orden + 900], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => x * x * (3 - 2 * x) });
  const temblor = p < 1 ? Math.sin(t / 60) * 3 * (1 - p) : 0;
  const colores = [estilo.acento, estilo.texto, estilo.acento];
  const fin = g.items[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Etiqueta texto={p < 0.5 ? g.etiquetaAntes : g.etiquetaDespues} visible={1} escala={escala} estilo={estilo} color={p < 0.5 ? ALERTA : estilo.acento} />
      <svg width={640 * escala} height={300 * escala} viewBox="0 0 640 300" style={{ marginTop: 10 * escala }}>
        {[0, 1, 2].map((f) => progreso(t, f * 120, 600) > 0.02 && (
          <path key={f} d={interpolatePath(p, cable(f, true), cable(f, false))} fill="none" stroke={p < 0.5 ? (f === 1 ? estilo.texto : ALERTA) : colores[f]}
            strokeWidth={5} strokeLinecap="round" transform={`translate(0 ${temblor * (f - 1)})`}
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progreso(t, f * 120, 600)} />
        ))}
        {/* bridas que fijan los cables cuando ya están en orden */}
        {[160, 320, 480].map((x, i) => (
          <rect key={i} x={x - 10} y={75} width={20} height={150} rx={8} fill="none" stroke={estilo.acento} strokeWidth={3}
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progreso(t, orden + 950 + i * 150, 300)}
            opacity={progreso(t, orden + 950 + i * 150, 300) > 0.02 ? 1 : 0} />
        ))}
      </svg>
      {fin && <div style={{ marginTop: 6 * escala }}><Icono nombre={fin.icono} progreso={progreso(t, orden + 1500, 500)} color={estilo.acento} tamano={90 * escala} /></div>}
    </div>
  );
}

/** «antes-despues»: lo de antes tachado, flecha, y lo de después resaltado. */
function EscenaAntesDespues({ g, estilo, escala }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = enMs(frame, fps);
  const [antes, despues] = g.items;
  const tam = 170 * escala;
  const columna = (it: typeof antes, desde: number, color: string, tachado: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", width: tam * 1.4 }}>
      <Icono nombre={it.icono} progreso={progreso(t, desde, 600)} color={color} tamano={tam} />
      {tachado && <svg width={tam} height={tam} viewBox="0 0 24 24" style={{ position: "absolute", top: 0 }}>
        <path d="M3 3 L21 21" stroke={ALERTA} strokeWidth={2.5} strokeLinecap="round" pathLength={1} strokeDasharray={1}
          strokeDashoffset={1 - progreso(t, desde + 600, 250)} /></svg>}
      <Etiqueta texto={it.etiqueta} visible={progreso(t, desde + 300, 300)} escala={escala * 0.85} estilo={estilo} color={color} />
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {columna(antes, 0, estilo.texto, true)}
      <svg width={90 * escala} height={60 * escala} viewBox="0 0 90 60"><path d="M6 30 H78 M64 16 L80 30 L64 44" fill="none" stroke={estilo.acento}
        strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progreso(t, 1000, 350)} /></svg>
      {columna(despues, 1300, estilo.acento, false)}
    </div>
  );
}

/** «ensamblar»: las piezas entran desde fuera, encajan juntas y se confirma con un check. */
function EscenaEnsamblar({ g, estilo, escala }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tam = 130 * escala, n = g.items.length;
  const direcciones = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const encaje = (n * 0.35 + 0.4) * fps;
  const golpe = spring({ frame: frame - encaje, fps, config: { damping: 8 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(2, n)}, ${tam * 1.2}px)`, gap: 10 * escala,
        transform: `scale(${1 + 0.06 * golpe * (1 - golpe)})` }}>
        {g.items.map((it, i) => {
          const s = spring({ frame: frame - i * 0.35 * fps, fps, config: { damping: 13 } });
          const [dx, dy] = direcciones[i % 4];
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: Math.min(1, s * 1.5),
              transform: `translate(${(1 - s) * dx * 300 * escala}px, ${(1 - s) * dy * 200 * escala}px) rotate(${(1 - s) * dx * 40}deg)` }}>
              <Icono nombre={it.icono} progreso={1} color={frame > encaje ? estilo.acento : estilo.texto} tamano={tam} />
              <Etiqueta texto={it.etiqueta} visible={s} escala={escala * 0.7} estilo={estilo} />
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8 * escala }}><Icono nombre="circle-check" progreso={progreso(enMs(frame, fps), (encaje / fps) * 1000, 450)} color={estilo.acento} tamano={80 * escala} /></div>
    </div>
  );
}

const ESCENAS = { icono: EscenaIcono, proceso: EscenaProceso, "caos-orden": EscenaCaosOrden, "antes-despues": EscenaAntesDespues, ensamblar: EscenaEnsamblar };

export function IlustracionVista(props: Props) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const { g, frames, estilo, escala } = props;
  const entrada = interpolate(frame, [0, 0.4 * fps], [0, 1], { extrapolateRight: "clamp", easing: suave });
  const salida = interpolate(frame, [frames - 8, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const Escena = ESCENAS[g.escena];
  const lado = g.lado ?? "centro";
  return (
    <AbsoluteFill style={{ alignItems: lado === "izquierda" ? "flex-start" : lado === "derecha" ? "flex-end" : "center",
      justifyContent: "center", top: (g.posicion - 0.5) * height, padding: lado === "centro" ? 0 : "0 4%" }}>
      <div style={{ opacity: entrada * salida, transform: `scale(${0.94 + 0.06 * entrada})`, ...vidrio(estilo, escala), padding: `${30 * escala}px ${34 * escala}px`, filter: `blur(${(1 - entrada) * 8}px)`,
        maxWidth: lado === "centro" ? "92%" : "46%" }}>
        <Escena {...props} />
      </div>
    </AbsoluteFill>
  );
}
