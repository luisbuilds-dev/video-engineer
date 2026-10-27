import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { barrasOnda, progresoSeccion, type Seccion } from "../../lib/cabecera";
import { CABECERA } from "../../lib/composicion";
import type { Estilo } from "../../lib/estilo";
import { familia } from "../fuentes";

/**
 * Arriba: la barra de secciones (la actual brilla y se va llenando: cronometra) y debajo la onda simétrica de tu voz.
 * Mide lo mismo que reserva la composición (CABECERA), así nada se coloca encima.
 */
export function Cabecera({ secciones, onda, estilo, escala, pantallas = [] }: { secciones: Seccion[]; onda: number[] | null; estilo: Estilo; escala: number;
  pantallas?: { desdeMs: number; hastaMs: number }[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!secciones.length && !onda) return null;
  const t = (frame / fps) * 1000;
  const entra = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const { actual, dentro } = progresoSeccion(t, secciones);
  const { acento, texto, fuente } = estilo.tarjetas;
  // sobre una grabación de pantalla (fondos claros) la cabecera lleva un degradado oscuro detrás, que entra y sale suave
  const sobrePantalla = Math.max(0, ...pantallas.map((p) => interpolate(t, [p.desdeMs - 200, p.desdeMs, p.hastaMs, p.hastaMs + 200], [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: CABECERA.margen * escala, opacity: entra, fontFamily: familia(fuente) }}>
      {sobrePantalla > 0 && <AbsoluteFill style={{ height: (CABECERA.margen + CABECERA.barra + (onda ? CABECERA.onda : 0) + 60) * escala, opacity: sobrePantalla,
        background: "linear-gradient(to bottom, rgba(10,10,12,.72), rgba(10,10,12,.45) 60%, transparent)" }} />}
      {secciones.length > 0 && (
        <div style={{ display: "flex", gap: 10 * escala, width: "86%", height: CABECERA.barra * escala }}>
          {secciones.map((s, i) => {
            const lleno = i < actual ? 1 : i === actual ? dentro : 0;
            return (
              <div key={i} style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 21 * escala, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: texto,
                  opacity: i === actual ? 0.95 : 0.45, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  textShadow: `0 ${2 * escala}px ${10 * escala}px rgba(0,0,0,.5)`, marginBottom: 10 * escala }}>{s.titulo}</div>
                <div style={{ height: 4 * escala, borderRadius: 2 * escala, background: "rgba(255,255,255,.22)", overflow: "hidden" }}>
                  <div style={{ width: `${lleno * 100}%`, height: "100%", background: i === actual ? acento : "rgba(255,255,255,.7)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {onda && <Onda nivel={onda[Math.min(onda.length - 1, frame)] ?? 0} frame={frame} color={texto} acento={acento} escala={escala} />}
    </AbsoluteFill>
  );
}

/** Barras simétricas que crecen con tu voz; en los picos el centro toma el color de acento. */
function Onda({ nivel, frame, color, acento, escala }: { nivel: number; frame: number; color: string; acento: string; escala: number }) {
  const alto = (CABECERA.onda - 16) * escala;
  const barras = barrasOnda(nivel, frame);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 * escala, height: CABECERA.onda * escala, marginTop: 4 * escala }}>
      {barras.map((b, i) => {
        const centro = Math.abs(i - (barras.length - 1) / 2) < 4;
        return <div key={i} style={{ width: 4 * escala, height: Math.max(3 * escala, b * alto), borderRadius: 2 * escala,
          background: centro && nivel > 0.6 ? acento : color, opacity: 0.55 + 0.4 * b }} />;
      })}
    </div>
  );
}
