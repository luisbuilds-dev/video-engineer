import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CUENTA_MS, type Grafico } from "../../lib/efectos";
import type { Estilo } from "../../lib/estilo";
import { familia } from "../fuentes";
import { IlustracionVista } from "./Ilustraciones";
import { MarcasVista } from "./Marcas";
import { Panel } from "./Panel";

type Props = { g: Grafico; frames: number; estilo: Estilo["tarjetas"]; escala: number };

/** Cifra que cuenta desde 0 hasta su valor y se queda latiendo una vez. */
function Cifra({ g, frames, estilo, escala }: Props & { g: Extract<Grafico, { tipo: "cifra" }> }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cuenta = interpolate(frame, [0, (CUENTA_MS / 1000) * fps], [0, 1], { extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 });
  const latido = spring({ frame: frame - (CUENTA_MS / 1000) * fps, fps, config: { damping: 8 } });
  const valor = (g.valor * cuenta).toFixed(g.decimales ?? (Number.isInteger(g.valor) ? 0 : 1));
  return (
    <Panel frames={frames} posicion={g.posicion} escala={escala} estilo={estilo} lado={g.lado} ancho={0.7}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 150 * escala, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, color: estilo.acento,
          transform: `scale(${1 + 0.06 * latido * (1 - latido)})`, fontVariantNumeric: "tabular-nums" }}>
          {g.prefijo}{Number(valor).toLocaleString("es")}{g.sufijo}
        </div>
        <div style={{ fontSize: 38 * escala, fontWeight: 500, opacity: 0.72, marginTop: 10 * escala }}>{g.etiqueta}</div>
      </div>
    </Panel>
  );
}

/** Barras horizontales que crecen una tras otra, con su valor. */
function Barras({ g, frames, estilo, escala }: Props & { g: Extract<Grafico, { tipo: "barras" }> }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...g.items.map((i) => i.valor), 1);
  return (
    <Panel frames={frames} posicion={g.posicion} escala={escala} estilo={estilo} lado={g.lado}>
      {g.titulo && <div style={{ fontSize: 30 * escala, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.6, marginBottom: 20 * escala }}>{g.titulo}</div>}
      {g.items.map((it, i) => {
        const p = spring({ frame: frame - (0.3 + i * 0.45) * fps, fps, config: { damping: 18 } });
        return (
          <div key={i} style={{ marginBottom: 16 * escala }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40 * escala, fontWeight: 500 }}>
              <span>{it.etiqueta}</span><span style={{ color: estilo.acento }}>{Math.round(it.valor * p)}{g.sufijo}</span>
            </div>
            <div style={{ height: 10 * escala, background: "rgba(255,255,255,.10)", borderRadius: 5 * escala, marginTop: 6 * escala }}>
              <div style={{ width: `${(it.valor / max) * 100 * p}%`, height: "100%", borderRadius: 5 * escala,
                background: i === 0 ? estilo.acento : estilo.texto, opacity: i === 0 ? 1 : 0.75 }} />
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

/** Lista que se va marcando: cada punto aparece cuando lo dices, con un check que se dibuja. */
function Lista({ g, frames, estilo, escala }: Props & { g: Extract<Grafico, { tipo: "lista" }> }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = g.desdeMs + (frame / fps) * 1000;
  return (
    <Panel frames={frames} posicion={g.posicion} escala={escala} estilo={estilo} lado={g.lado}>
      {g.titulo && <div style={{ fontSize: 30 * escala, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.6, marginBottom: 18 * escala }}>{g.titulo}</div>}
      {g.items.map((it, i) => {
        const p = spring({ frame: ((t - it.desdeMs) / 1000) * fps, fps, config: { damping: 14 } });
        const trazo = interpolate(p, [0.3, 1], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 * escala, fontSize: 48 * escala, fontWeight: 500,
            opacity: t >= it.desdeMs ? p : 0.18, transform: `translateX(${(1 - Math.min(p, 1)) * -20 * escala}px)`, margin: `${10 * escala}px 0` }}>
            <svg width={46 * escala} height={46 * escala} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10.5" fill="none" stroke={t >= it.desdeMs ? estilo.acento : "rgba(255,255,255,.3)"} strokeWidth="1.2" />
              <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke={estilo.acento} strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round" strokeDasharray="24" strokeDashoffset={t >= it.desdeMs ? trazo : 24} />
            </svg>
            <span>{it.texto}</span>
          </div>
        );
      })}
    </Panel>
  );
}

/** Sello de suspenso («CONFIRMADO», «SIMULADO», «ERROR»): cae girado con un golpe. */
function Sello({ g, frames, escala, estilo }: Props & { g: Extract<Grafico, { tipo: "sello" }> }) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const golpe = spring({ frame, fps, config: { damping: 10, mass: 0.5, stiffness: 220 } });
  const salida = interpolate(frame, [frames - 8, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const color = g.tono === "ok" ? "#7EE2A8" : "#FF8A80";
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: (g.posicion - 0.5) * height }}>
      <div style={{
        transform: `rotate(-4deg) scale(${1.6 - 0.6 * golpe})`, opacity: Math.min(1, golpe * 1.4) * salida,
        border: `${3 * escala}px solid ${color}`, color, borderRadius: 18 * escala, padding: `${12 * escala}px ${36 * escala}px`,
        fontFamily: familia(estilo.fuente), fontWeight: 600, fontSize: 84 * escala, letterSpacing: 10 * escala,
        textTransform: "uppercase", background: "rgba(10,10,12,.45)", backdropFilter: `blur(${16 * escala}px)`,
      }}>{g.texto}</div>
    </AbsoluteFill>
  );
}

export function GraficoVista(props: Props) {
  const { g } = props;
  if (g.tipo === "cifra") return <Cifra {...props} g={g} />;
  if (g.tipo === "barras") return <Barras {...props} g={g} />;
  if (g.tipo === "ilustracion") return <IlustracionVista {...props} g={g} />;
  if (g.tipo === "logos" || g.tipo === "diagrama") return <MarcasVista {...props} g={g} />;
  if (g.tipo === "lista") return <Lista {...props} g={g} />;
  return <Sello {...props} g={g} />;
}
