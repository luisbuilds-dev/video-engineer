import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Estilo } from "../../lib/estilo";
import { familia } from "../fuentes";

/** Texto del gancho en los primeros segundos: lo que hace que alguien deje de hacer scroll. */
export function Gancho({ texto, frames, estilo, escala = 1, posicion = 0.2, pantallas = [] }: {
  texto: string; frames: number; escala?: number; posicion?: number; pantallas?: { desdeMs: number; hastaMs: number }[]; estilo: Estilo["gancho"] & { fuente: Estilo["subtitulos"]["fuente"]; resalte: string };
}) {
  const frame = useCurrentFrame();
  const { height, fps } = useVideoConfig();
  const placa = pantallas.some((x) => x.desdeMs < (frames / fps) * 1000);
  const opacidad = interpolate(frame, [0, 4, frames - 6, frames], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 10], [24, 0], { extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 4 });
  const nitidez = interpolate(frame, [0, 10], [10, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", top: height * posicion - estilo.tamano * escala }}>
      <div style={{
        opacity: opacidad, transform: `translateY(${y * escala}px)`, filter: `blur(${nitidez}px)`, fontFamily: familia(estilo.fuente), fontWeight: 700,
        fontSize: estilo.tamano * escala, color: "#FFFFFF", textAlign: "center", lineHeight: 1.04, maxWidth: "84%", letterSpacing: "-0.025em",
        textShadow: `0 ${4 * escala}px ${30 * escala}px rgba(0,0,0,.55)`, ...(placa ? { background: "rgba(12,13,16,.62)", backdropFilter: `blur(${18 * escala}px)`, borderRadius: 22 * escala, padding: `${10 * escala}px ${26 * escala}px` } : {}),
      }}>
        {texto.split(/(\*[^*]+\*)/).map((trozo, i) =>
          trozo.startsWith("*") ? <span key={i} style={{ color: estilo.resalte }}>{trozo.slice(1, -1)}</span> : trozo)}
      </div>
    </AbsoluteFill>
  );
}
