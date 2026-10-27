import type { EfectoCamara } from "../lib/camara";
import type { Capitulo, Pantalla } from "../lib/horizontal";
import type { Pagina, TarjetaColocada } from "../lib/composicion";
import type { Grafico, Sonido } from "../lib/efectos";
import type { Estilo } from "../lib/estilo";
import type { Zoom } from "../lib/vision";
import type { Ventana } from "../lib/encuadre";
import type { IconoGuardado } from "../lib/iconos-externos";
import type { Logo } from "../lib/logos-color";
import type { Seccion } from "../lib/cabecera";

/** Lo que dibuja la composición (proyectos/<id>/edicion.json, lo escribe npm run componer). */
export type Edicion = {
  video: string; // archivo dentro de la carpeta del proyecto (p. ej. "limpio.mp4")
  duracionMs: number;
  paginas: Pagina[];
  tarjetas: TarjetaColocada[];
  zooms: Zoom[];
  camara: EfectoCamara[];
  graficos: Grafico[];
  sonidos: Sonido[];
  capitulos: Capitulo[];
  pantallas: Pantalla[];
  burbuja: { cx: number; cy: number };
  secciones?: Seccion[]; // barra de arriba
  onda?: number[] | null; // nivel de la voz por fotograma (0..1)
  logos?: Record<string, Logo>; // logos de marca que usa este vídeo
  iconos?: Record<string, IconoGuardado>; // iconos traídos de internet que usa este vídeo
  encuadre: Ventana[]; // qué parte del original se ve en cada momento (vacío o 1×1 = todo)
  musica: { archivo: string; inicioS: number; volumenDb: number; bajaDb: number; credito: string } | null;
  gancho: { texto: string; posicion: number } | null;
  estilo: Estilo;
};
