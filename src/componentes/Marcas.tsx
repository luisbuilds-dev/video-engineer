import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { disponer, enlacesDe, flecha } from "../../lib/diagrama";
import type { Grafico } from "../../lib/efectos";
import type { Estilo } from "../../lib/estilo";
import { colorLogo, type Logo } from "../../lib/logos-color";
import { familia } from "../fuentes";
import { Icono } from "./Ilustraciones";
import { Panel } from "./Panel";
import { suave } from "./vidrio";

type Props = { g: Grafico; frames: number; estilo: Estilo["tarjetas"]; escala: number };
const ALTO_MAX = 620; // px a 1080 p: un diagrama nunca ocupa más (en 16:9 no cabría con la cara)

let logos: Record<string, Logo> = {};
/** Los logos que usa el vídeo llegan dentro de edicion.json; el Reel los registra antes de dibujar. */
export function registrarLogos(m?: Record<string, Logo>) { logos = m ?? {}; }

const aparece = (tMs: number, desdeMs: number, dur = 450) =>
  interpolate(tMs, [desdeMs, desdeMs + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });

/** Un logo de marca dentro de un cuadrado de 24 unidades, con su color (o blanco si es oscuro) y un halo suave. */
function Glifo({ slug, tamano, visible }: { slug: string; tamano: number; visible: number }) {
  const l = logos[slug];
  if (!l) return null;
  const { relleno, halo } = colorLogo(l.hex);
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" style={{ overflow: "visible", opacity: visible,
      transform: `scale(${0.8 + 0.2 * visible})`, filter: `blur(${(1 - visible) * 6}px) drop-shadow(0 0 ${tamano * 0.18}px ${halo})` }}>
      <path d={l.path} fill={relleno} />
    </svg>
  );
}

/** «logos»: las marcas de las que hablas, una tras otra cuando las nombras, en su color y con halo. */
function Logos({ g, frames, estilo, escala }: Props & { g: Extract<Grafico, { tipo: "logos" }> }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = g.desdeMs + (frame / fps) * 1000;
  const tam = (g.items.length > 3 ? 96 : 124) * escala;
  return (
    <Panel frames={frames} posicion={g.posicion} escala={escala} estilo={estilo} lado={g.lado} ancho={Math.min(0.84, 0.24 + g.items.length * 0.18)}>
      {g.titulo && <div style={{ fontSize: 30 * escala, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.6,
        textAlign: "center", marginBottom: 26 * escala }}>{g.titulo}</div>}
      <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "flex-start", gap: 24 * escala }}>
        {g.items.map((it, i) => {
          const v = aparece(t, it.desdeMs);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * escala }}>
              <Glifo slug={it.logo} tamano={tam} visible={v} />
              <div style={{ fontSize: 32 * escala, fontWeight: 500, opacity: 0.85 * v }}>{it.etiqueta ?? logos[it.logo]?.titulo}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** «diagrama»: nodos (icono, logo o solo texto) que aparecen al decirlos y flechas que se dibujan hacia ellos. */
function Diagrama({ g, frames, estilo, escala }: Props & { g: Extract<Grafico, { tipo: "diagrama" }> }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = g.desdeMs + (frame / fps) * 1000;
  const enlaces = enlacesDe(g.nodos, g.enlaces, g.disposicion);
  const { posiciones, aspecto } = disponer(g.nodos, enlaces, g.disposicion);
  // todo en unidades de un lienzo de 1000 de ancho: se escala entero con el panel
  const W = 1000, H = W * aspecto, R = g.disposicion === "radial" ? 92 : 84;
  const pos = new Map(posiciones.map((p) => [p.id, { x: p.x * W, y: p.y * H }]));
  const desde = new Map(g.nodos.map((n) => [n.id, n.desdeMs]));
  return (
    <Panel frames={frames} posicion={g.posicion} escala={escala} estilo={estilo} lado={g.lado}>
      {g.titulo && <div style={{ fontSize: 30 * escala, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.6,
        textAlign: "center", marginBottom: 18 * escala }}>{g.titulo}</div>}
      <svg viewBox={`-20 -20 ${W + 40} ${H + 60}`} style={{ width: "100%", maxHeight: (ALTO_MAX - 120) * escala, display: "block", overflow: "visible" }}>
        <defs>
          <marker id="punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
            <path d="M1 1 L9 5 L1 9" fill="none" stroke={estilo.texto} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        {enlaces.map((e, i) => {
          const a = pos.get(e.de)!, b = pos.get(e.a)!;
          const f = flecha(a, b, R + 14);
          // la flecha se dibuja cuando aparece el nodo al que llega
          const p = aparece(t, (desde.get(e.a) ?? g.desdeMs) - 250, 400);
          return <line key={i} x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke={estilo.texto} strokeWidth={2.2} strokeOpacity={0.55}
            strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} markerEnd={p > 0.95 ? "url(#punta)" : undefined} />;
        })}
        {g.nodos.map((n, i) => {
          const c = pos.get(n.id)!;
          const v = aparece(t, n.desdeMs);
          const central = g.disposicion === "radial" && i === 0;
          const icono = R * 1.05;
          return (
            <g key={n.id} opacity={v} transform={`translate(${c.x} ${c.y}) scale(${0.85 + 0.15 * v})`}>
              <circle r={R} fill={central ? `${estilo.acento}22` : "rgba(255,255,255,.06)"} stroke={central ? estilo.acento : "rgba(255,255,255,.28)"}
                strokeWidth={central ? 2.4 : 1.6} />
              {(n.logo || n.icono) && (
                <g transform={`translate(${-icono / 2} ${-icono / 2})`}>
                  {n.logo ? <Glifo slug={n.logo} tamano={icono} visible={1} />
                    : <Icono nombre={n.icono!} progreso={aparece(t, n.desdeMs, 700)} color={central ? estilo.acento : estilo.texto} tamano={icono} />}
                </g>
              )}
              {n.etiqueta && (
                <text y={!(n.logo || n.icono) ? 14 : g.disposicion === "radial" && c.y < H / 2 - 1 ? -R - 22 : R + 52} textAnchor="middle" fill={estilo.texto} fontFamily={familia(estilo.fuente)}
                  fontSize={n.logo || n.icono ? 44 : 40} fontWeight={500}>{n.etiqueta}</text>
              )}
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

export function MarcasVista(props: Props) {
  const { g } = props;
  if (g.tipo === "logos") return <Logos {...props} g={g} />;
  if (g.tipo === "diagrama") return <Diagrama {...props} g={g} />;
  return null;
}
