// npm run sfx — fabrica el kit de efectos de sonido con ffmpeg, a partir de ondas y ruido.
// Son 100 % originales (los genera este código): se pueden distribuir con el repo sin licencias de terceros.
// Cada efecto: WAV 48 kHz estéreo, normalizado a -1 dBFS de pico; el volumen final lo pone la mezcla.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { duracionMs, ffmpeg } from "../lib/ffmpeg";
import { RAIZ } from "../lib/proyecto";

const DIR = join(RAIZ, "sonidos", "sfx");
mkdirSync(DIR, { recursive: true });

// expr: señal de aevalsrc (t en segundos); post: filtros para darle cuerpo
type Receta = { id: string; tipo: string; descripcion: string; dur: number; expr: string; post?: string };
const ruido = "(random(0)*2-1)";
const RECETAS: Receta[] = [
  { id: "whoosh-1", tipo: "whoosh", descripcion: "barrido de aire corto para entradas", dur: 0.45,
    expr: `${ruido}*sin(PI*t/0.45)^2`, post: "bandpass=f=1800:width_type=o:w=2,afade=t=in:d=0.12,afade=t=out:st=0.3:d=0.15" },
  { id: "whoosh-2", tipo: "whoosh", descripcion: "barrido grave para zooms", dur: 0.6,
    expr: `${ruido}*sin(PI*t/0.6)^3`, post: "lowpass=f=1400,highpass=f=180,afade=t=out:st=0.4:d=0.2" },
  { id: "pop-1", tipo: "pop", descripcion: "burbuja corta para puntos de lista", dur: 0.12,
    expr: "sin(2*PI*(380+2600*t)*t)*exp(-38*t)" },
  { id: "pop-2", tipo: "pop", descripcion: "clic suave", dur: 0.08, expr: "sin(2*PI*1150*t)*exp(-70*t)+0.4*" + ruido + "*exp(-160*t)" },
  { id: "impacto-1", tipo: "impacto", descripcion: "golpe grave para revelaciones", dur: 0.9,
    expr: `sin(2*PI*(55+90*exp(-9*t))*t)*exp(-4.5*t)+0.5*${ruido}*exp(-28*t)`, post: "lowpass=f=2500" },
  { id: "riser-1", tipo: "riser", descripcion: "tensión que sube antes de una revelación", dur: 1.6,
    expr: `(0.6*sin(2*PI*(200*t+380*t*t)*t)+0.4*${ruido})*(t/1.6)^2`, post: "highpass=f=120,afade=t=out:st=1.5:d=0.1" },
  { id: "ding-1", tipo: "ding", descripcion: "campana de acierto", dur: 1.0,
    expr: "(sin(2*PI*1320*t)+0.5*sin(2*PI*2640*t)+0.25*sin(2*PI*3960*t))*exp(-4*t)" },
  { id: "error-1", tipo: "error", descripcion: "zumbido de error", dur: 0.45,
    expr: "sgn(sin(2*PI*140*t))*0.6*exp(-2*t)+0.3*sin(2*PI*147*t)", post: "lowpass=f=1800,afade=t=out:st=0.35:d=0.1" },
  { id: "tictac-1", tipo: "tictac", descripcion: "tic-tac de reloj (1 s)", dur: 1.0,
    expr: "sin(2*PI*2400*t)*exp(-140*t)+sin(2*PI*1900*(t-0.5))*exp(-140*(t-0.5))*gte(t,0.5)" },
  { id: "tecleo-1", tipo: "tecleo", descripcion: "tres teclas", dur: 0.36,
    expr: `${ruido}*(exp(-90*t)+exp(-90*(t-0.12))*gte(t,0.12)+exp(-90*(t-0.25))*gte(t,0.25))`, post: "bandpass=f=3200:width_type=o:w=1.5" },
  { id: "notificacion-1", tipo: "notificacion", descripcion: "aviso de app en dos notas", dur: 0.5,
    expr: "sin(2*PI*988*t)*exp(-9*t)*lt(t,0.18)+sin(2*PI*1319*(t-0.15))*exp(-7*(t-0.15))*gte(t,0.15)" },
  { id: "caja-1", tipo: "caja", descripcion: "caja registradora (dinero)", dur: 0.9,
    expr: `0.5*${ruido}*exp(-60*t)+(sin(2*PI*2093*(t-0.08))+sin(2*PI*2637*(t-0.08)))*exp(-5*(t-0.08))*gte(t,0.08)*0.5` },
  { id: "glitch-1", tipo: "glitch", descripcion: "corte digital para cambiar de tema", dur: 0.35,
    expr: `sgn(sin(2*PI*(90+800*mod(floor(t*40),5))*t))*0.5*(1-t/0.35)+0.4*${ruido}*gt(sin(2*PI*28*t),0.3)` },
  { id: "obturador-1", tipo: "obturador", descripcion: "foto / captura", dur: 0.25,
    expr: `${ruido}*(exp(-80*t)+0.7*exp(-80*(t-0.09))*gte(t,0.09))`, post: "highpass=f=900" },
];

const catalogo = RECETAS.map((r) => {
  const archivo = `${r.id}.wav`;
  const filtros = [r.post, "apad", `atrim=0:${r.dur}`, "alimiter=limit=0.89:level=true"].filter(Boolean).join(",");
  ffmpeg(["-loglevel", "error", "-y", "-f", "lavfi", "-i", `aevalsrc='${r.expr}':s=48000:d=${r.dur}`,
    "-af", filtros, "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le",
    // sin etiquetas (versión del codificador, fechas): el mismo archivo en cualquier equipo
    "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", join(DIR, archivo)]);
  return { id: r.id, tipo: r.tipo, archivo, descripcion: r.descripcion, duracionMs: duracionMs(join(DIR, archivo)),
    origen: "sintetizado por herramientas/sintetizar-sfx.ts", licencia: "MIT (parte de este repo)" };
});
writeFileSync(join(RAIZ, "sonidos", "catalogo.json"), JSON.stringify(catalogo, null, 2) + "\n");
console.log(`${catalogo.length} efectos en sonidos/sfx/: ${catalogo.map((c) => c.id).join(", ")}`);
