// De las decisiones de Claude (gancho, tarjetas) + lo que se vio en el vídeo (analisis.json) a edicion.json:
// páginas de subtítulos con su altura, tarjetas que no tapan la cara y zooms donde el plano se queda quieto.
import { createTikTokStyleCaptions } from "@remotion/captions";
import type { Estilo } from "./estilo";
import type { Palabra } from "./tiempos";
import { DURACION, type EfectoCamara } from "./camara";
import { CUENTA_MS, duracionGrafico, planificarSonidos, type Grafico, type Momento, type MomentoVisible, type Sonido } from "./efectos";
import { ajustarZona, BURBUJA, validarCapitulos, type Capitulo, type Pantalla } from "./horizontal";
import { centroCara, planificarZooms, posicionSubtitulo, type Fotograma, type Ocupado, type Zoom } from "./vision";
import { reencuadrar, type Ventana } from "./encuadre";
import { disponer, enlacesDe } from "./diagrama";
import { secciones } from "./cabecera";

export type Pagina = { desdeMs: number; hastaMs: number; posicion: number; tokens: Palabra[]; lado?: Lado };
export type Lado = "centro" | "izquierda" | "derecha";
export type TarjetaColocada = { texto: string; desdeMs: number; hastaMs: number; posicion: number; lado?: Lado };

export function paginar(palabras: Palabra[], estilo: Estilo["subtitulos"], duracionMs: number): Omit<Pagina, "posicion">[] {
  const captions = palabras.map((p, i) => ({
    text: (i === 0 ? "" : " ") + (estilo.mayusculas ? p.texto.toUpperCase() : p.texto),
    startMs: p.desdeMs, endMs: p.hastaMs, timestampMs: (p.desdeMs + p.hastaMs) / 2, confidence: null,
    pageBreakAfter: /[.?!…]["»”)]?$/.test(p.texto), // una página nunca mezcla el final de una frase con la siguiente
  }));
  const { pages } = createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: estilo.maxPalabras * 280,
    breakOnSilenceAfterMilliseconds: 600 });
  return pages.map((p, i) => ({
    desdeMs: p.startMs,
    hastaMs: Math.min(duracionMs, i + 1 < pages.length ? pages[i + 1].startMs : p.startMs + p.durationMs + 300),
    tokens: p.tokens.map((t) => ({ texto: t.text, desdeMs: t.fromMs, hastaMs: t.toMs })),
  }));
}

export function componer(opciones: {
  palabras: Palabra[]; duracionMs: number; estilo: Estilo; fotos: Fotograma[]; altoPx: number;
  tarjetas: { texto: string; desdeMs: number; hastaMs: number }[]; gancho: { texto: string } | null;
  momentos?: Momento[]; catalogo?: { tipo: string; archivo: string }[];
  capitulos?: Capitulo[]; pantallas?: Pantalla[]; relacionPantalla?: Record<string, number>;
  fuente?: { ancho: number; alto: number }; // tamaño del vídeo original (si su forma no es la de salida, se reencuadra)
  secciones?: { titulo: string; desdeMs: number }[]; // para la barra de arriba (si no, los capítulos)
}) {
  const { palabras, duracionMs, estilo, fotos: fotosFuente, altoPx, tarjetas, gancho, momentos: pedidos = [], catalogo = [],
    capitulos = [], pantallas: pantallasPedidas = [], relacionPantalla = {} } = opciones;
  const { ancho } = estilo.formato;
  // reencuadre: la ventana del original que se ve sigue a la cara; a partir de aquí todo se mide en la imagen de salida
  const fuente = opciones.fuente ?? { ancho, alto: altoPx };
  // en 16:9 la cara va al tercio izquierdo: el lado derecho queda libre para gráficos y subtítulos
  const encuadre = reencuadrar(fotosFuente, fuente.ancho, fuente.alto, ancho / altoPx, { centroX: ancho > altoPx ? 0.34 : 0.5 });
  const fotosVideo = fotosFuente.map((f, i) => aVentana(f, encuadre[i]));
  // grabaciones de pantalla: zooms con la forma del encuadre; mientras se ven, lo que hay que proteger es la burbuja
  const pantallas: Pantalla[] = pantallasPedidas.map((p) => ({ ...p, relacion: relacionPantalla[p.archivo] ?? 1,
    zooms: p.zooms.map((z) => ({ ...ajustarZona(z, relacionPantalla[p.archivo] ?? 1), desdeMs: z.desdeMs })) }));
  const escalaB = Math.min(ancho, altoPx) / 1080;
  const ladoB = BURBUJA.lado * escalaB, finB = (BURBUJA.lado + BURBUJA.margen) * escalaB;
  const burbujaCaja = { w: ladoB / ancho, h: ladoB / altoPx, x: 1 - finB / ancho, y: 1 - finB / altoPx };
  const enPantalla = (t: number) => pantallas.some((p) => t >= p.desdeMs && t < p.hastaMs);
  const fotos = fotosVideo.map((f) => (enPantalla(f.tMs) ? { ...f, caras: [burbujaCaja], movimiento: f.movimiento.map(() => 0) } : f));
  const burbuja = centroCara(fotosFuente, 0, duracionMs); // la burbuja muestra el original entero
  // cada capítulo (salvo el primero) entra con un whoosh
  const momentos: Momento[] = [...pedidos, ...capitulos.filter((c) => c.desdeMs > 0).map((c) => ({ tipo: "sonido" as const, desdeMs: c.desdeMs, efecto: "whoosh" }))];
  const escala = Math.min(estilo.formato.ancho, estilo.formato.alto) / 1080; // mismas proporciones en 16:9 y 9:16
  // una página no cruza el paso entre grabación de pantalla y cámara: detrás cambia todo (burbuja ↔ cara)
  const paginasBase = partirEnCortes(paginar(palabras, estilo.subtitulos, duracionMs), pantallas.flatMap((p) => [p.desdeMs, p.hastaMs]));
  // alto en px a 1080 p: los diagramas según su disposición (cuántas filas o niveles salen)
  const altoDiagrama = (m: Extract<MomentoVisible, { tipo: "diagrama" }>) =>
    Math.min(620, 170 + disponer(m.nodos, enlacesDe(m.nodos, m.enlaces, m.disposicion), m.disposicion).aspecto * 760);
  const altoGrafico = (m: MomentoVisible) => ((m.tipo === "diagrama" ? altoDiagrama(m) : m.tipo === "logos" ? 300 : m.tipo === "ilustracion" ? (m.escena === "caos-orden" ? 520 : m.escena === "proceso" ? 340 : 420)
    : m.tipo === "cifra" ? 300 : m.tipo === "sello" ? 220
    : 170 + ("items" in m ? m.items.length * 96 : 0)) * escala) / altoPx;
  const altoSub = (estilo.subtitulos.tamano * escala * 1.15 * 2) / altoPx; // hasta 2 líneas
  const altoTarjeta = (64 * escala * 1.1 + 44 * escala) / altoPx;
  const altoGancho = (estilo.gancho.tamano * escala * 1.05 * 2) / altoPx;
  const momentosVisibles = momentos.filter((m): m is MomentoVisible => m.tipo !== "sonido" && m.tipo !== "camara")
    .map((m) => ({ ...m, hastaMs: Math.min(duracionMs, m.desdeMs + duracionGrafico(m)) }));

  const evitar = [...(gancho && estilo.gancho.activo ? [{ desdeMs: 0, hastaMs: estilo.gancho.duracionMs }] : []), ...tarjetas, ...momentosVisibles, ...pantallas];
  const zooms: Zoom[] = estilo.ritmo.zooms
    ? planificarZooms(fotosVideo, paginasBase.map((p) => p.desdeMs), duracionMs,
      { maxPlanoMs: estilo.ritmo.maxPlanoMs, escala: 1.14, minDuracionMs: 1400, evitar })
    : [];

  // Se coloca por orden de importancia: gancho → gráficos → tarjetas → subtítulos. Cada uno esquiva la cara,
  // los gestos y TODO lo que ya se colocó y está en pantalla a la vez (así nunca se pisan dos textos).
  const ocupados: Ocupado[] = [];
  // cabecera: la barra de secciones y la onda viven arriba todo el vídeo; nada se coloca encima
  const barra = estilo.cabecera.barra ? secciones(opciones.secciones?.length ? opciones.secciones : capitulos, duracionMs) : [];
  const altoCabecera = cabeceraPx(estilo.cabecera.onda, barra.length > 0) * escala / altoPx;
  if (altoCabecera > 0) ocupados.push({ desdeMs: 0, hastaMs: duracionMs, y: 0, h: altoCabecera, x: 0, w: 1 });
  const ANCHO = { x: 0.06, w: 0.88 };
  const colocar = (desdeMs: number, hastaMs: number, preferida: number, alto: number, anterior?: number, columna = ANCHO) => {
    const y = posicionSubtitulo(fotos, desdeMs, hastaMs, preferida, alto, zooms, anterior, ocupados, columna);
    ocupados.push({ desdeMs, hastaMs, y: y - alto / 2, h: alto, ...columna });
    return y;
  };
  // En horizontal sobra ancho: gráficos y tarjetas van en la columna contraria a la cara, a media pantalla
  const horizontal = estilo.formato.ancho > estilo.formato.alto;
  const ladoLibre = (desdeMs: number, hastaMs: number): Lado => {
    if (!horizontal) return "centro";
    return centroCara(fotosVideo, desdeMs, hastaMs).cx > 0.5 ? "izquierda" : "derecha";
  };
  const columnaDe = (lado: Lado) => (lado === "izquierda" ? { x: 0.04, w: 0.44 } : lado === "derecha" ? { x: 0.52, w: 0.44 } : ANCHO);
  const ganchoColocado = gancho && estilo.gancho.activo
    ? { ...gancho, posicion: colocar(0, estilo.gancho.duracionMs, 0.2, altoGancho) } : gancho ? { ...gancho, posicion: 0.2 } : null;
  const graficos: Grafico[] = momentosVisibles.map((m) => {
    const lado = ladoLibre(m.desdeMs, m.hastaMs);
    return { ...m, lado, posicion: colocar(m.desdeMs, m.hastaMs, horizontal ? 0.45 : 0.3, altoGrafico(m), undefined, columnaDe(lado)) } as Grafico;
  });
  const colocadas: TarjetaColocada[] = tarjetas.map((t) => {
    const lado = ladoLibre(t.desdeMs, t.hastaMs);
    return { ...t, lado, posicion: colocar(t.desdeMs, t.hastaMs, estilo.tarjetas.posicion, altoTarjeta, undefined, columnaDe(lado)) };
  });
  const paginas: Pagina[] = [];
  // en horizontal, si la cara es grande (plano cerrado) los subtítulos también van al lado libre
  const caraGrande = horizontal && fotosVideo.some((f) => f.caras.some((c) => c.w > 0.22));
  for (const p of paginasBase) {
    const lado = caraGrande && !enPantalla(p.desdeMs) ? ladoLibre(p.desdeMs, p.hastaMs) : "centro";
    paginas.push({ ...p, lado, posicion: colocar(p.desdeMs, p.hastaMs, estilo.subtitulos.posicion, altoSub * (lado === "centro" ? 1 : 1.6),
      paginas.at(-1)?.posicion, columnaDe(lado)) });
  }
  const sonidos: Sonido[] = planificarSonidos({ momentos, tarjetas: colocadas, zooms, conGancho: !!ganchoColocado,
    densidad: estilo.efectos.densidad, volumenDb: estilo.efectos.volumenDb, catalogo });
  const camara = efectosCamara(momentos, estilo.efectos.densidad);
  return { paginas, tarjetas: colocadas, zooms, gancho: ganchoColocado, graficos, sonidos, camara, capitulos, pantallas, burbuja, encuadre, secciones: barra,
    avisos: capitulos.length ? validarCapitulos(capitulos, duracionMs) : [] };
}

/** Efectos de cámara: los que Claude pidió + los que acompañan a cada momento según la densidad del estilo. */
export function efectosCamara(momentos: Momento[], densidad: "limpio" | "medio" | "movido"): EfectoCamara[] {
  const nivel = { limpio: 0, medio: 1, movido: 2 }[densidad];
  const out: EfectoCamara[] = [];
  const pon = (efecto: EfectoCamara["efecto"], desdeMs: number, minimo: number, intensidad = 1) => {
    if (nivel >= minimo) out.push({ efecto, desdeMs, duracionMs: DURACION[efecto], intensidad });
  };
  for (const m of momentos) {
    if (m.tipo === "camara") out.push({ efecto: m.efecto, desdeMs: m.desdeMs, duracionMs: m.duracionMs ?? DURACION[m.efecto], intensidad: m.intensidad });
    if (m.tipo === "sello") { pon("sacudida", m.desdeMs + 60, 1); pon("flash", m.desdeMs, 2, 0.6); }
    if (m.tipo === "cifra") pon("latido", m.desdeMs + CUENTA_MS, 1);
    if (m.tipo === "sonido" && m.efecto === "glitch") pon("glitch", m.desdeMs, 1);
    if (m.tipo === "sonido" && m.efecto === "error") pon("sacudida", m.desdeMs, 1, 0.6);
    if (m.tipo === "sonido" && m.efecto === "obturador") pon("flash", m.desdeMs, 1, 0.7);
  }
  return out.sort((a, b) => a.desdeMs - b.desdeMs);
}

/** Pasa caras y movimiento de un fotograma del original a coordenadas de la ventana reencuadrada. */
function aVentana(f: Fotograma, v: Ventana): Fotograma {
  if (v.w === 1 && v.h === 1) return f;
  const caras = f.caras.map((c) => ({ ...c, x: (c.x - v.x) / v.w, y: (c.y - v.y) / v.h, w: c.w / v.w, h: c.h / v.h }));
  const n = f.movimiento.length;
  const movimiento = f.movimiento.map((_, j) => f.movimiento[Math.min(n - 1, Math.floor((v.y + v.h * (j + 0.5) / n) * n))] ?? 0);
  return { ...f, caras, movimiento };
}

/** Parte las páginas que cruzan un corte de escena: las palabras de antes y las de después van en páginas distintas. */
export function partirEnCortes<P extends { desdeMs: number; hastaMs: number; tokens: Palabra[] }>(paginas: P[], cortes: number[]): P[] {
  return paginas.flatMap((p) => {
    const corte = cortes.find((c) => c > p.desdeMs && c < p.hastaMs);
    if (corte === undefined) return [p];
    const antes = p.tokens.filter((t) => t.desdeMs < corte), despues = p.tokens.filter((t) => t.desdeMs >= corte);
    if (!antes.length || !despues.length) return [p];
    return partirEnCortes([{ ...p, hastaMs: corte, tokens: antes }, { ...p, desdeMs: corte, tokens: despues }], cortes);
  });
}

/** Alto de la cabecera en px a 1080 p (lo mismo que dibuja src/componentes/Cabecera.tsx). */
export function cabeceraPx(onda: boolean, barra: boolean): number {
  if (!onda && !barra) return 0;
  return CABECERA.margen + (barra ? CABECERA.barra : 0) + (onda ? CABECERA.onda : 0) + 16;
}
export const CABECERA = { margen: 34, barra: 54, onda: 64 };
