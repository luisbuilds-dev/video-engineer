// Datos que no deben verse en un vídeo: se buscan en el texto que el OCR lee en cada fotograma de una grabación de pantalla.
// Trabaja por líneas (un teléfono o una tarjeta suelen venir partidos en varias «palabras») y devuelve la caja de lo que hay que tapar.

export type PalabraOcr = { texto: string; x0: number; y0: number; x1: number; y1: number }; // px del fotograma
export type Hallazgo = { tipo: string; texto: string; x: number; y: number; w: number; h: number }; // fracciones 0..1

/** Algoritmo de Luhn: tarjetas de crédito (y evita tapar cualquier número largo). */
export function luhn(digitos: string): boolean {
  let suma = 0;
  for (let i = 0; i < digitos.length; i++) {
    let d = +digitos[digitos.length - 1 - i];
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    suma += d;
  }
  return digitos.length >= 12 && suma % 10 === 0;
}

/** Cédula dominicana: 11 dígitos con dígito verificador (Luhn con pesos 1,2 sobre los 10 primeros). */
export function cedulaRD(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos)) return false;
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    let d = +digitos[i] * (i % 2 ? 2 : 1);
    if (d > 9) d -= 9;
    suma += d;
  }
  return (10 - (suma % 10)) % 10 === +digitos[10];
}

const soloDigitos = (s: string) => s.replace(/\D/g, "");
/** Cadena con pinta de clave: larga, mezcla letras y números, sin espacios y con mucha variedad de caracteres. */
function pareceClave(s: string): boolean {
  if (s.length < 24 || /\s/.test(s) || !/[a-zA-Z]/.test(s) || !/\d/.test(s)) return false;
  if (/^https?:|\.(com|org|net|es|do|io)\b|\//i.test(s)) return false; // enlaces y rutas no
  return new Set(s).size >= 14;
}

type Patron = { tipo: string; re: RegExp; valida?: (m: string) => boolean };
const PATRONES: Patron[] = [
  { tipo: "correo", re: /[\w.+-]+@[\w-]+(\.[\w-]+)+/g },
  { tipo: "clave", re: /\b(sk-(ant-)?[\w-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,}|xox[abprs]-[\w-]{10,}|AKIA[0-9A-Z]{16}|AIza[\w-]{30,}|eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,})/g },
  { tipo: "tarjeta", re: /\b\d(?:[ -]?\d){12,18}\b/g, valida: (m) => luhn(soloDigitos(m)) },
  { tipo: "cedula", re: /\b\d{3}-?\d{7}-?\d\b/g, valida: (m) => cedulaRD(soloDigitos(m)) || /^\d{3}-\d{7}-\d$/.test(m) },
  { tipo: "iban", re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g },
  { tipo: "telefono", re: /(?:\+\d{1,3}[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g },
  { tipo: "ip", re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
];
// palabras tras las que lo que sigue en la línea es secreto (contraseñas, números de cuenta, direcciones)
// (con «:» o «=» detrás: «Crear una cuenta» en un menú no es una etiqueta)
const ETIQUETAS = /\b(contrase[ñn]a|password|passwd|clave|pin|token|secret|cuenta|account|acct|direcci[oó]n|address)\b\s*[:=]\s*/i;

export type Punto = { t: number; x: number; y: number; w: number; h: number }; // t en segundos del vídeo de pantalla
export type Pista = { tipo: string; desde: number; hasta: number; puntos: Punto[] };
/** proyectos/<id>/sensibles.json: lo encontrado y lo que decidió el usuario (null = aún no se le ha preguntado). */
export type Sensibles = {
  decision: null | { difuminar: boolean; excepto: string[] };
  archivos: Record<string, { ancho: number; alto: number; pistas: Pista[] }>;
};

/**
 * Une los hallazgos de cada muestra en pistas que siguen al dato (si la página se desplaza, la caja lo acompaña).
 * Conservador a propósito: la pista empieza en la muestra ANTERIOR a la primera que lo vio (pudo aparecer en medio),
 * aguanta una muestra sin verlo (el OCR a veces falla) y termina en la muestra en que ya no está.
 */
export function seguir(muestras: { t: number; hallazgos: Hallazgo[] }[], fin: number): Pista[] {
  type Abierta = Pista & { clave: string; fallos: number };
  const abiertas: Abierta[] = [], cerradas: Pista[] = [];
  const centro = (p: { x: number; y: number; w: number; h: number }) => [p.x + p.w / 2, p.y + p.h / 2];
  muestras.forEach((m, i) => {
    const anterior = i ? muestras[i - 1].t : 0;
    const usadas = new Set<Abierta>();
    for (const h of m.hallazgos) {
      const clave = `${h.tipo}|${normaliza(h.texto).replace(/\s/g, "")}`;
      const [cx, cy] = centro(h);
      // la misma pista: mismo dato (o mismo tipo y muy cerca, por si el OCR leyó distinto un carácter)
      // dónde debería estar cada pista ahora si sigue moviéndose igual (la página puede estar desplazándose)
      const prevista = (a: Abierta) => centro(posicionEn(m.t, a));
      const candidata = abiertas.filter((a) => !usadas.has(a) && (a.clave === clave || (a.tipo === h.tipo && (() => {
        const [ax, ay] = prevista(a);
        return Math.abs(ax - cx) < 0.05 && Math.abs(ay - cy) < 0.05;
      })()))).sort((a, b) => Math.hypot(...prevista(a).map((v, k) => v - [cx, cy][k])) -
        Math.hypot(...prevista(b).map((v, k) => v - [cx, cy][k])))[0];
      const punto = { t: m.t, x: h.x, y: h.y, w: h.w, h: h.h };
      if (candidata) { candidata.puntos.push(punto); candidata.fallos = 0; usadas.add(candidata); }
      else { const n: Abierta = { tipo: h.tipo, clave, desde: anterior, hasta: fin, puntos: [punto], fallos: 0 }; abiertas.push(n); usadas.add(n); }
    }
    for (const a of [...abiertas]) {
      if (usadas.has(a)) continue;
      if (++a.fallos >= 2) {
        abiertas.splice(abiertas.indexOf(a), 1);
        cerradas.push({ tipo: a.tipo, desde: a.desde, hasta: m.t, puntos: a.puntos });
      }
    }
  });
  return [...cerradas, ...abiertas.map((a) => ({ tipo: a.tipo, desde: a.desde, hasta: fin, puntos: a.puntos }))].sort((a, b) => a.desde - b.desde);
}

/**
 * Caja que tapa una pista en el segundo t del render: la unión de por donde pasa el dato entre t − margen y t + margen
 * Mientras la página se mueve la banda se estira unos píxeles; parada, queda ajustada.
 */
export function cajaEn(t: number, p: Pista, margen = 0.05): Punto | null {
  if (t < p.desde - margen || t > p.hasta + margen) return null;
  const tiempos = [t - margen, t, t + margen, ...p.puntos.map((q) => q.t).filter((q) => Math.abs(q - t) < margen)]
    .map((q) => Math.min(p.hasta, Math.max(p.desde, q)));
  const cajas = tiempos.map((q) => posicionEn(q, p));
  const x0 = Math.min(...cajas.map((c) => c.x)), y0 = Math.min(...cajas.map((c) => c.y));
  const x1 = Math.max(...cajas.map((c) => c.x + c.w)), y1 = Math.max(...cajas.map((c) => c.y + c.h));
  return { t, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Posición del dato en el segundo t (interpola entre muestras; fuera de ellas, la más cercana). */
export function posicionEn(t: number, p: Pista): Punto {
  const ps = p.puntos;
  // fuera de las muestras: se sigue la velocidad del dato (como mucho 0,5 s), no se congela donde se vio por última vez
  const sigue = (a: Punto, b: Punto, base: Punto): Punto => {
    const dt = Math.max(-0.5, Math.min(0.5, t - base.t)), d = b.t - a.t || 1;
    return { ...base, t, x: base.x + ((b.x - a.x) / d) * dt, y: base.y + ((b.y - a.y) / d) * dt };
  };
  if (t <= ps[0].t) return ps.length > 1 ? sigue(ps[0], ps[1], ps[0]) : ps[0];
  if (t > ps[ps.length - 1].t) return ps.length > 1 ? sigue(ps[ps.length - 2], ps[ps.length - 1], ps[ps.length - 1]) : ps[ps.length - 1];
  for (let i = 1; i < ps.length; i++) {
    if (t <= ps[i].t) {
      const k = (t - ps[i - 1].t) / (ps[i].t - ps[i - 1].t);
      const a = ps[i - 1], b = ps[i];
      return { t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: Math.max(a.w, b.w), h: Math.max(a.h, b.h) };
    }
  }
  return ps[ps.length - 1];
}

/** Para enseñar qué se encontró sin volver a mostrar el dato: «co***». */
export const enmascarar = (s: string) => `${s.slice(0, 2)}${"*".repeat(Math.max(3, Math.min(8, s.length - 2)))}`;

const normaliza = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Busca datos sensibles en las líneas de un fotograma.
 * `privado`: frases del usuario que nunca deben verse (su nombre completo, su calle, el nombre de un cliente…).
 */
export function detectar(lineas: PalabraOcr[][], ancho: number, alto: number, privado: string[] = []): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  for (const palabras of lineas) {
    if (!palabras.length) continue;
    // texto de la línea y, para cada carácter, de qué palabra viene
    let texto = "";
    const deQuien: number[] = [];
    palabras.forEach((p, i) => {
      if (i) { texto += " "; deQuien.push(-1); }
      texto += p.texto;
      for (const _ of p.texto) deQuien.push(i);
    });
    const tapa = (tipo: string, desde: number, hasta: number) => {
      const idx = [...new Set(deQuien.slice(desde, hasta).filter((i) => i >= 0))];
      if (!idx.length) return;
      // si el dato empieza o acaba a mitad de una palabra («Contraseña:Verano2026!» leída junta), se recorta por caracteres
      const inicio = (i: number) => deQuien.indexOf(i);
      const primera = idx[0], ultima = idx.at(-1)!;
      const delante = desde - inicio(primera), detras = inicio(ultima) + palabras[ultima].texto.length - hasta;
      // el OCR a veces parte un correo o una clave en dos («cliente | prueba@…»): se suman los trozos pegados a ambos lados
      if (tipo === "correo" || tipo === "clave") {
        const pegada = (a: PalabraOcr, b: PalabraOcr) => b.x0 - a.x1 < 0.45 * (a.y1 - a.y0) && /^[\w.+@-]+$/.test(a.texto + b.texto);
        while (idx[0] > 0 && pegada(palabras[idx[0] - 1], palabras[idx[0]])) idx.unshift(idx[0] - 1);
        while (idx.at(-1)! < palabras.length - 1 && pegada(palabras[idx.at(-1)!], palabras[idx.at(-1)! + 1])) idx.push(idx.at(-1)! + 1);
      }
      const ps = idx.map((i) => palabras[i]);
      let x0 = Math.min(...ps.map((p) => p.x0)), x1 = Math.max(...ps.map((p) => p.x1));
      const y0 = Math.min(...ps.map((p) => p.y0)), y1 = Math.max(...ps.map((p) => p.y1));
      if (delante > 0 && idx[0] === primera) { const p = palabras[primera]; x0 = p.x0 + ((p.x1 - p.x0) * delante) / p.texto.length; }
      if (detras > 0 && idx.at(-1) === ultima) { const p = palabras[ultima]; x1 = p.x1 - ((p.x1 - p.x0) * detras) / p.texto.length; }
      hallazgos.push({ tipo, texto: texto.slice(desde, hasta), x: x0 / ancho, y: y0 / alto, w: (x1 - x0) / ancho, h: (y1 - y0) / alto });
    };
    const ocupado: [number, number][] = [];
    const libre = (a: number, b: number) => !ocupado.some(([x, y]) => a < y && b > x);
    for (const p of PATRONES) {
      for (const m of texto.matchAll(p.re)) {
        const a = m.index!, b = a + m[0].length;
        if (!libre(a, b) || (p.valida && !p.valida(m[0]))) continue;
        ocupado.push([a, b]);
        tapa(p.tipo, a, b);
      }
    }
    // claves sueltas sin prefijo conocido
    let pos = 0;
    for (const p of palabras) {
      const a = texto.indexOf(p.texto, pos), b = a + p.texto.length;
      pos = b;
      if (libre(a, b) && pareceClave(p.texto)) { ocupado.push([a, b]); tapa("clave", a, b); }
    }
    // lo que va después de «contraseña:», «cuenta:»… hasta el final de la línea
    const e = ETIQUETAS.exec(texto);
    if (e && e.index + e[0].length < texto.length) tapa("etiqueta", e.index + e[0].length, texto.length);
    // frases privadas del usuario (sin importar mayúsculas ni tildes)
    const n = normaliza(texto);
    for (const frase of privado) {
      const f = normaliza(frase.trim());
      if (!f) continue;
      for (let i = n.indexOf(f); i >= 0; i = n.indexOf(f, i + 1)) tapa("privado", i, i + f.length);
    }
  }
  return hallazgos;
}
