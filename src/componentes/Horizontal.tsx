import { AbsoluteFill, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Estilo } from "../../lib/estilo";
import { BURBUJA, zonaPantalla, type Pantalla } from "../../lib/horizontal";
import { cajaEn } from "../../lib/sensibles";
import { familia } from "../fuentes";
import { suave } from "./vidrio";

/** Tarjeta de capítulo: el plano se desenfoca y oscurece, y encima entra el título con una línea fina que crece. */
export function CapituloVista({ numero, titulo, frames, estilo, escala }: {
  numero: number; titulo: string; frames: number; estilo: Estilo["tarjetas"]; escala: number;
}) {
  const frame = useCurrentFrame();
  const velo = interpolate(frame, [0, 8, frames - 8, frames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const texto = interpolate(frame, [4, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });
  const linea = interpolate(frame, [10, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });
  return (
    <AbsoluteFill style={{ opacity: velo, backdropFilter: `blur(${28 * escala}px) brightness(.55)`, background: `${estilo.fondo}8C`,
      justifyContent: "center", paddingLeft: "10%", fontFamily: familia(estilo.fuente), color: estilo.texto }}>
      <div style={{ opacity: texto, transform: `translateY(${(1 - texto) * 16 * escala}px)`, filter: `blur(${(1 - texto) * 8}px)` }}>
        <div style={{ fontSize: 28 * escala, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: estilo.acento }}>
          Capítulo {String(numero).padStart(2, "0")}
        </div>
        <div style={{ fontSize: 92 * escala, fontWeight: 600, maxWidth: "78%", lineHeight: 1.04, letterSpacing: "-0.03em", marginTop: 18 * escala }}>{titulo}</div>
        <div style={{ width: 220 * escala * linea, height: 2 * escala, background: estilo.acento, marginTop: 34 * escala, opacity: 0.8 }} />
      </div>
    </AbsoluteFill>
  );
}

/**
 * Grabación de pantalla a pantalla completa, con zooms suaves a la zona de la que hablas y los datos sensibles difuminados.
 * El difuminado vive dentro del mismo contenedor que la grabación: acompaña a los zooms sin cálculos aparte.
 */
export function PantallaVista({ p }: { p: Pantalla }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const z = zonaPantalla(p.desdeMs + (frame / fps) * 1000, p.zooms);
  const t = p.inicioS + frame / fps; // segundo de la grabación
  // con objectFit contain, la grabación ocupa solo una parte del contenedor si su forma no es la de salida
  const r = p.relacion ?? 1;
  const enCaja = (b: { x: number; y: number; w: number; h: number }) => r >= 1
    ? { x: 0.5 - 0.5 / r + b.x / r, y: b.y, w: b.w / r, h: b.h }
    : { x: b.x, y: 0.5 - 0.5 * r + b.y * r, w: b.w, h: b.h * r };
  // cajas a tapar en este instante, en px del contenedor, con margen del 45 % de su alto (el OCR las da muy justas)
  const cajas = (p.difuminar ?? []).map((d) => cajaEn(t, d)).filter((c) => c !== null).map((c) => {
    const m = c.h * 0.45;
    const b = enCaja({ x: c.x - m * (height / width), y: c.y - m, w: c.w + 2 * m * (height / width), h: c.h + 2 * m });
    return { x: b.x * width, y: b.y * height, w: b.w * width, h: b.h * height };
  });
  const video = { src: staticFile(p.archivo), startFrom: Math.round(p.inicioS * fps), muted: true };
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: "0 0", transform: `scale(${1 / z.w}, ${1 / z.h}) translate(${-z.x * 100}%, ${-z.y * 100}%)` }}>
        <OffthreadVideo {...video} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        {cajas.map((b, i) => <Difuminado key={i} caja={b} video={video} ancho={width} alto={height} />)}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/**
 * Un dato difuminado: una ventana a la misma grabación con filter: blur() (backdrop-filter no desenfoca el vídeo en el
 * render), con los bordes fundidos por una máscara de degradado. Se ve texto borroso, no una placa.
 * El núcleo (la caja con su margen) queda totalmente cubierto; el fundido va por fuera.
 */
function Difuminado({ caja: b, video, ancho, alto }: { caja: { x: number; y: number; w: number; h: number };
  video: { src: string; startFrom: number; muted: boolean }; ancho: number; alto: number }) {
  const f = Math.max(6, b.h * 0.5); // ancho del fundido
  const radio = Math.max(7, b.h * 0.32); // suficiente para que no se lea, sin borrar la forma del texto
  const borde = (dir: string) => `linear-gradient(${dir}, transparent 0, #000 ${f}px, #000 calc(100% - ${f}px), transparent 100%)`;
  const mascara = `${borde("to right")}, ${borde("to bottom")}`;
  return (
    <div style={{ position: "absolute", left: b.x - f, top: b.y - f, width: b.w + 2 * f, height: b.h + 2 * f, overflow: "hidden",
      maskImage: mascara, WebkitMaskImage: mascara, maskComposite: "intersect", WebkitMaskComposite: "source-in" }}>
      <OffthreadVideo {...video} style={{ position: "absolute", left: -(b.x - f), top: -(b.y - f), width: ancho, height: alto,
        maxWidth: "none", objectFit: "contain", filter: `blur(${radio}px)`, transform: "scale(1.0001)" }} />
    </div>
  );
}

/** Tú en una burbuja sobre la pantalla (formato flotante), encuadrada en tu cara: aparece y se desvanece con suavidad. */
export function Burbuja({ video, cx, cy, escala, frames }: { video: string; cx: number; cy: number; escala: number; frames: number }) {
  const frame = useCurrentFrame();
  const entra = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp", easing: suave });
  const sale = interpolate(frame, [frames - 10, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const v = entra * sale;
  const lado = BURBUJA.lado * escala;
  return (
    <AbsoluteFill style={{ alignItems: "flex-end", justifyContent: "flex-end", padding: BURBUJA.margen * escala }}>
      <div style={{ width: lado, height: lado, borderRadius: "50%", overflow: "hidden", opacity: v,
        transform: `translateY(${(1 - v) * 24 * escala}px) scale(${0.94 + 0.06 * v})`, filter: `blur(${(1 - v) * 10}px)`,
        border: `${2 * escala}px solid rgba(255,255,255,.55)`, boxShadow: `0 ${24 * escala}px ${70 * escala}px rgba(0,0,0,.4)` }}>
        <OffthreadVideo src={staticFile(video)} muted
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${cx * 100}% ${cy * 100}%`, transform: "scale(1.45)",
            transformOrigin: `${cx * 100}% ${cy * 100}%` }} />
      </div>
    </AbsoluteFill>
  );
}
