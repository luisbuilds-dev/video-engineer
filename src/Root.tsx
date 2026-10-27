import { Composition } from "remotion";
import base from "../estilos/base-neutra.json";
import type { Estilo } from "../lib/estilo";
import { Reel } from "./Reel";
import type { Edicion } from "./tipos";

// Valores de ejemplo solo para `npm run estudio`; en un render real llegan de proyectos/<id>/edicion.json.
const ejemplo: Edicion = {
  video: "demo.mp4",
  duracionMs: 6000,
  paginas: [],
  tarjetas: [],
  zooms: [],
  camara: [],
  graficos: [],
  sonidos: [],
  musica: null,
  capitulos: [],
  pantallas: [],
  burbuja: { cx: 0.5, cy: 0.4 },
  gancho: { texto: "Edita tus reels *sin editor*", posicion: 0.2 },
  estilo: base as Estilo,
};

export function Root() {
  return (
    <Composition
      id="Video"
      component={Reel}
      defaultProps={ejemplo}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={180}
      calculateMetadata={({ props }) => ({
        fps: props.estilo.formato.fps,
        width: props.estilo.formato.ancho,
        height: props.estilo.formato.alto,
        durationInFrames: Math.max(1, Math.ceil((props.duracionMs / 1000) * props.estilo.formato.fps)),
      })}
    />
  );
}
