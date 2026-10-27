import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { estadoCamara } from "../lib/camara";
import { ventanaEn } from "../lib/encuadre";
import { gananciaMusica } from "../lib/musica";
import { GraficoVista } from "./componentes/Graficos";
import { Burbuja, CapituloVista, PantallaVista } from "./componentes/Horizontal";
import { Gancho } from "./componentes/Gancho";
import { Cabecera } from "./componentes/Cabecera";
import { Subtitulos } from "./componentes/Subtitulos";
import { Tarjeta } from "./componentes/Tarjeta";
import type { Edicion } from "./tipos";
import { registrarIconos } from "./componentes/Ilustraciones";
import { registrarLogos } from "./componentes/Marcas";

/** El vídeo con sus zooms: de golpe (2 fotogramas) hacia tu cara cuando el plano lleva quieto demasiado. */
function VideoConZooms({ props }: { props: Edicion }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * 1000;
  const z = props.zooms.find((x) => t >= x.desdeMs && t < x.hastaMs);
  let escala = 1, cx = 0.5, cy = 0.4;
  if (z) {
    const dentro = ((t - z.desdeMs) / 1000) * fps;
    escala = interpolate(dentro, [0, 2], [1, z.escala], { extrapolateRight: "clamp" });
    cx = z.cx; cy = z.cy;
  }
  if (props.estilo.ritmo.zoomEntrada && frame < fps * 0.5) { // gancho visual: el primer medio segundo se acerca
    escala = interpolate(frame, [0, fps * 0.5], [1.18, 1], { extrapolateRight: "clamp" });
  }
  // efectos de cámara (sacudida, flash, glitch, zooms suaves, blanco y negro, viñeta, latido, desenfoque, barrido)
  const c = estadoCamara(t, props.camara);
  const v = ventanaEn(t, props.encuadre ?? []);
  const filtros = [c.blur > 0.1 && `blur(${c.blur}px)`, c.gris > 0 && `grayscale(${c.gris})`,
    c.tono !== 0 && `hue-rotate(${c.tono}deg)`, c.contraste !== 1 && `contrast(${c.contraste})`].filter(Boolean).join(" ");
  return (
    <>
      <AbsoluteFill style={{
        overflow: "hidden", transformOrigin: `${cx * 100}% ${cy * 100}%`,
        transform: `translate(${c.dx * 100}%, ${c.dy * 100}%) rotate(${c.rot}deg) scale(${escala * c.escala})`,
        filter: filtros || undefined,
      }}>
        {/* si la ventana es más grande que el original, lo que sobra es el propio vídeo desenfocado */}
        {(v.w > 1.001 || v.h > 1.001) && <OffthreadVideo src={staticFile(props.video)} muted style={{
          position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.15)",
          filter: "blur(56px) brightness(.72) saturate(1.15)",
        }} />}
        {/* reencuadre: la ventana del original que sigue a la cara llena el fotograma (con los bordes desvanecidos si sobresale) */}
        <OffthreadVideo src={staticFile(props.video)} style={{
          position: "absolute", width: `${100 / v.w}%`, height: `${100 / v.h}%`,
          left: `${(-v.x / v.w) * 100}%`, top: `${(-v.y / v.h) * 100}%`, objectFit: "cover",
          maskImage: v.w > 1.001 ? "linear-gradient(to right, transparent, #000 16%, #000 84%, transparent)"
            : v.h > 1.001 ? "linear-gradient(to bottom, transparent, #000 16%, #000 84%, transparent)" : undefined,
        }} />
      </AbsoluteFill>
      {c.vineta > 0 && <AbsoluteFill style={{ background: `radial-gradient(ellipse at ${cx * 100}% ${cy * 100}%, transparent 35%, rgba(0,0,0,${c.vineta}) 100%)` }} />}
      {c.flash > 0 && <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: c.flash }} />}
    </>
  );
}

export function Reel(props: Edicion) {
  const { fps, width, height } = useVideoConfig();
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  const { estilo } = props;
  registrarIconos(props.iconos);
  registrarLogos(props.logos);
  const escala = Math.min(width, height) / 1080; // mismas proporciones en vertical y horizontal
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <VideoConZooms props={props} />
      {props.pantallas.map((p, i) => (
        <Sequence key={`p${i}`} from={f(p.desdeMs)} durationInFrames={Math.max(1, f(p.hastaMs - p.desdeMs))} layout="none">
          <PantallaVista p={p} />
          <Burbuja video={props.video} cx={props.burbuja.cx} cy={props.burbuja.cy} escala={escala} frames={Math.max(1, f(p.hastaMs - p.desdeMs))} />
        </Sequence>
      ))}
      {estilo.subtitulos.activo && <Subtitulos paginas={props.paginas} estilo={estilo.subtitulos} escala={escala} pantallas={props.pantallas} />}
      {estilo.tarjetas.activo && props.tarjetas.map((t, i) => {
        const frames = Math.max(1, f(Math.min(t.hastaMs - t.desdeMs, estilo.tarjetas.duracionMaxMs)));
        return (
          <Sequence key={i} from={f(t.desdeMs)} durationInFrames={frames} layout="none">
            <Tarjeta texto={t.texto} frames={frames} posicion={t.posicion} estilo={estilo.tarjetas} escala={escala} lado={t.lado} />
          </Sequence>
        );
      })}
      {props.graficos.map((g, i) => {
        const frames = Math.max(1, f(g.hastaMs - g.desdeMs));
        return (
          <Sequence key={`g${i}`} from={f(g.desdeMs)} durationInFrames={frames} layout="none">
            <GraficoVista g={g} frames={frames} estilo={estilo.tarjetas} escala={escala} />
          </Sequence>
        );
      })}
      <Cabecera secciones={props.secciones ?? []} onda={props.onda ?? null} estilo={estilo} escala={escala} pantallas={props.pantallas} />
      {props.capitulos.filter((c) => c.desdeMs > 0).map((c, i) => (
        <Sequence key={`c${i}`} from={f(c.desdeMs)} durationInFrames={f(1300)} layout="none">
          <CapituloVista numero={i + 2} titulo={c.titulo} frames={f(1300)} estilo={estilo.tarjetas} escala={escala} />
        </Sequence>
      ))}
      {props.musica && (() => {
        const m = props.musica;
        const palabras = props.paginas.flatMap((p) => p.tokens);
        return <Audio src={staticFile(m.archivo)} startFrom={Math.round(m.inicioS * fps)}
          volume={(fr) => 10 ** (gananciaMusica((fr / fps) * 1000, palabras, props.duracionMs, m.volumenDb, m.bajaDb) / 20)} />;
      })()}
      {props.sonidos.map((s, i) => (
        <Sequence key={`s${i}`} from={f(s.desdeMs)} layout="none">
          <Audio src={staticFile(`sfx/${s.archivo}`)} volume={10 ** (s.volumenDb / 20)} />
        </Sequence>
      ))}
      {estilo.gancho.activo && props.gancho && (
        <Sequence durationInFrames={f(estilo.gancho.duracionMs)} layout="none">
          <Gancho texto={props.gancho.texto} posicion={props.gancho.posicion} frames={f(estilo.gancho.duracionMs)} escala={escala}
            pantallas={props.pantallas}
            estilo={{ ...estilo.gancho, fuente: estilo.subtitulos.fuente, resalte: estilo.subtitulos.resalte }} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}
