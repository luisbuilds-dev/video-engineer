import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Grafico } from "../../lib/efectos";
import type { Estilo } from "../../lib/estilo";
import { familia } from "../fuentes";
import { suave, vidrio } from "./vidrio";

/** Panel común: entra con muelle, sale con fundido, centrado a la altura que no tapa la cara. */
export function Panel({ frames, posicion, escala, estilo, children, ancho = 0.84, lado = "centro" }: {
  frames: number; posicion: number; escala: number; estilo: Estilo["tarjetas"]; children: React.ReactNode; ancho?: number;
  lado?: Grafico["lado"];
}) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const entrada = interpolate(frame, [0, 0.4 * fps], [0, 1], { extrapolateRight: "clamp", easing: suave });
  const salida = interpolate(frame, [frames - 8, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: lado === "izquierda" ? "flex-start" : lado === "derecha" ? "flex-end" : "center",
      justifyContent: "center", top: (posicion - 0.5) * height, padding: lado === "centro" ? 0 : "0 4%" }}>
      <div style={{
        width: `${(lado === "centro" ? ancho : 0.44 / 0.92) * 100}%`, transform: `translateY(${(1 - entrada) * 24 * escala}px)`, filter: `blur(${(1 - entrada) * 8}px)`,
        opacity: entrada * salida, ...vidrio(estilo, escala), color: estilo.texto,
        padding: `${36 * escala}px ${42 * escala}px`, fontFamily: familia(estilo.fuente), letterSpacing: "-0.01em",
      }}>{children}</div>
    </AbsoluteFill>
  );
}

