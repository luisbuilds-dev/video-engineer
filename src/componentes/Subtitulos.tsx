import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import type { Pagina } from "../../lib/composicion";
import type { Estilo } from "../../lib/estilo";
import { familia } from "../fuentes";

/** Subtítulos por páginas ya colocadas (npm run componer decide la altura de cada una para no taparte). */
export function Subtitulos({ paginas, estilo, escala, pantallas = [] }: { paginas: Pagina[]; estilo: Estilo["subtitulos"]; escala: number;
  pantallas?: { desdeMs: number; hastaMs: number }[] }) {
  const { fps } = useVideoConfig();
  return (
    <>
      {paginas.map((p, i) => (
        <Sequence key={i} from={Math.round((p.desdeMs / 1000) * fps)} layout="none"
          durationInFrames={Math.max(1, Math.round(((p.hastaMs - p.desdeMs) / 1000) * fps))}>
          <PaginaVista pagina={p} estilo={estilo} escala={escala} placa={pantallas.some((x) => p.desdeMs < x.hastaMs && p.hastaMs > x.desdeMs)} />
        </Sequence>
      ))}
    </>
  );
}

function PaginaVista({ pagina, estilo, escala, placa }: { pagina: Pagina; estilo: Estilo["subtitulos"]; escala: number; placa: boolean }) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const ahoraMs = pagina.desdeMs + (frame / fps) * 1000;
  const tamano = estilo.tamano * escala;
  const borde = tamano * estilo.grosorContorno;
  const sombra = Math.max(2, tamano / 14);
  return (
    <AbsoluteFill style={{ alignItems: pagina.lado === "izquierda" ? "flex-start" : pagina.lado === "derecha" ? "flex-end" : "center",
      top: height * pagina.posicion - tamano * 0.6, padding: !pagina.lado || pagina.lado === "centro" ? 0 : "0 4%" }}>
      <div style={{
        fontFamily: familia(estilo.fuente), fontWeight: estilo.peso, fontSize: tamano, lineHeight: 1.1,
        textAlign: "center", whiteSpace: "pre-wrap", maxWidth: pagina.lado && pagina.lado !== "centro" ? "44%" : "88%", WebkitTextStroke: borde ? `${borde}px ${estilo.contorno}` : undefined, letterSpacing: "-0.01em",
        ...(placa ? { background: "rgba(12,13,16,.62)", backdropFilter: `blur(${18 * escala}px)`, borderRadius: 22 * escala, padding: `${10 * escala}px ${26 * escala}px` } : {}),
        paintOrder: "stroke fill", textShadow: `0 ${sombra * 0.5}px ${sombra * 2.5}px rgba(0,0,0,.55), 0 0 ${sombra}px rgba(0,0,0,.25)`,
      }}>
        {pagina.tokens.map((t, i) => (
          <span key={i} style={{ color: ahoraMs >= t.desdeMs && ahoraMs < t.hastaMs ? estilo.resalte : estilo.color }}>{t.texto}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
}
