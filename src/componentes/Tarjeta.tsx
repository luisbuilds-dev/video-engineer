import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Estilo } from "../../lib/estilo";
import { familia } from "../fuentes";
import { suave, vidrio } from "./vidrio";

/** Tarjeta de palabra clave o cifra: entra con un muelle corto y sale con un fundido, a la altura que no tapa. */
export function Tarjeta({ texto, frames, posicion, estilo, escala, lado = "centro" }: {
  texto: string; frames: number; posicion: number; estilo: Estilo["tarjetas"]; escala: number; lado?: "centro" | "izquierda" | "derecha";
}) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const entrada = interpolate(frame, [0, 9], [0, 1], { extrapolateRight: "clamp", easing: suave });
  const salida = interpolate(frame, [frames - 6, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tamano = 54 * escala;
  return (
    <AbsoluteFill style={{ alignItems: lado === "izquierda" ? "flex-start" : lado === "derecha" ? "flex-end" : "center",
      top: height * posicion - tamano * 0.9, padding: lado === "centro" ? 0 : "0 4%" }}>
      <div style={{
        transform: `translateY(${(1 - entrada) * 18 * escala}px)`, opacity: entrada * salida, filter: `blur(${(1 - entrada) * 6}px)`,
        ...vidrio(estilo, escala, 999), color: estilo.texto, display: "flex", alignItems: "center", gap: 18 * escala,
        fontFamily: familia(estilo.fuente), fontWeight: 600, fontSize: tamano, padding: `${20 * escala}px ${40 * escala}px`,
        maxWidth: "84%", lineHeight: 1.15, letterSpacing: "-0.01em",
      }}>
        <span style={{ width: 12 * escala, height: 12 * escala, borderRadius: "50%", background: estilo.acento, flex: "none" }} />
        {texto}
      </div>
    </AbsoluteFill>
  );
}
