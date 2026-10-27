// Matemática de los cortes: qué partes del crudo se quedan y dónde caen las palabras después de cortar.
// Todo en milisegundos. Sin dependencias: es lo que cubren los tests.

export type Palabra = { texto: string; desdeMs: number; hastaMs: number };
export type Tramo = { desdeMs: number; hastaMs: number };

/**
 * Tiempos de cada palabra a partir de su CENTRO (la marca DTW de whisper.cpp, que es la fiable) y de los
 * silencios reales del audio. El inicio y el final que da Whisper se estiran sobre las pausas; aquí el límite
 * entre dos palabras es el punto medio de sus centros, salvo que entre ellas haya un silencio: entonces la
 * primera acaba donde empieza el silencio y la segunda empieza donde acaba.
 */
export function alinear(centros: { texto: string; centroMs: number }[], silencios: Tramo[], duracionMs: number,
  bordeMs = 250): Palabra[] {
  const limite = (a: number, b: number): [number, number] => {
    const s = silencios.find((x) => x.desdeMs >= a && x.hastaMs <= b);
    if (s) return [s.desdeMs, s.hastaMs];
    const m = Math.round((a + b) / 2);
    return [m, m];
  };
  const fuera = (ms: number, haciaAtras: boolean) => { // si un borde cae dentro de un silencio, se lleva a su orilla
    const s = silencios.find((x) => ms > x.desdeMs && ms < x.hastaMs);
    return s ? (haciaAtras ? s.hastaMs : s.desdeMs) : ms;
  };
  return centros.map((p, i) => {
    const desde = i === 0 ? fuera(Math.max(0, p.centroMs - bordeMs), true) : limite(centros[i - 1].centroMs, p.centroMs)[1];
    const hasta = i === centros.length - 1 ? fuera(Math.min(duracionMs, p.centroMs + bordeMs), false)
      : limite(p.centroMs, centros[i + 1].centroMs)[0];
    return { texto: p.texto, desdeMs: Math.min(desde, p.centroMs), hastaMs: Math.max(hasta, p.centroMs + 1) };
  });
}

/** Une tramos que se tocan o se solapan y los ordena. */
export function unir(tramos: Tramo[]): Tramo[] {
  const orden = tramos.filter((t) => t.hastaMs > t.desdeMs).sort((a, b) => a.desdeMs - b.desdeMs);
  const salida: Tramo[] = [];
  for (const t of orden) {
    const ultimo = salida.at(-1);
    if (ultimo && t.desdeMs <= ultimo.hastaMs) ultimo.hastaMs = Math.max(ultimo.hastaMs, t.hastaMs);
    else salida.push({ ...t });
  }
  return salida;
}

/** Silencios entre palabras más largos que maxMs (candidatos a cortar). */
export function silencios(palabras: Palabra[], maxMs: number): Tramo[] {
  const out: Tramo[] = [];
  for (let i = 1; i < palabras.length; i++) {
    const hueco = palabras[i].desdeMs - palabras[i - 1].hastaMs;
    if (hueco > maxMs) out.push({ desdeMs: palabras[i - 1].hastaMs, hastaMs: palabras[i].desdeMs });
  }
  return out;
}

/**
 * Tramos que se conservan: cada palabra aprobada con su margen de aire, quitando los silencios largos.
 * `aprobadas` son los índices de las palabras que se quedan (Claude propone, tú apruebas el texto).
 */
export function conservar(palabras: Palabra[], aprobadas: number[], margenMs: number, duracionMs: number): Tramo[] {
  const tramos = aprobadas
    .map((i) => palabras[i])
    .filter(Boolean)
    .map((p) => ({ desdeMs: Math.max(0, p.desdeMs - margenMs), hastaMs: Math.min(duracionMs, p.hastaMs + margenMs) }));
  return unir(tramos);
}

/**
 * Quita de los tramos los silencios REALES del audio (medidos con ffmpeg silencedetect), dejando `margenMs` de
 * aire a cada lado. Hace falta porque Whisper alarga el final de una palabra hasta que empieza la siguiente.
 */
export function restarSilencios(tramos: Tramo[], silenciosAudio: Tramo[], margenMs: number): Tramo[] {
  let salida = tramos.map((t) => ({ ...t }));
  for (const s of silenciosAudio) {
    const quitar = { desdeMs: s.desdeMs + margenMs, hastaMs: s.hastaMs - margenMs };
    if (quitar.hastaMs <= quitar.desdeMs) continue;
    salida = salida.flatMap((t) => {
      if (quitar.hastaMs <= t.desdeMs || quitar.desdeMs >= t.hastaMs) return [t];
      const trozos: Tramo[] = [];
      if (quitar.desdeMs > t.desdeMs) trozos.push({ desdeMs: t.desdeMs, hastaMs: quitar.desdeMs });
      if (quitar.hastaMs < t.hastaMs) trozos.push({ desdeMs: quitar.hastaMs, hastaMs: t.hastaMs });
      return trozos;
    });
  }
  return salida.filter((t) => t.hastaMs - t.desdeMs >= 40); // fuera migajas de menos de un fotograma
}

/** Dónde cae un instante del crudo en el vídeo cortado (null si cae en una parte que se quitó). */
export function remapear(ms: number, tramos: Tramo[]): number | null {
  let acumulado = 0;
  for (const t of tramos) {
    if (ms < t.desdeMs) return null;
    if (ms <= t.hastaMs) return acumulado + (ms - t.desdeMs);
    acumulado += t.hastaMs - t.desdeMs;
  }
  return null;
}

/** Las palabras aprobadas con sus tiempos en el vídeo ya cortado. */
export function palabrasCortadas(palabras: Palabra[], aprobadas: number[], tramos: Tramo[]): Palabra[] {
  const salida: Palabra[] = [];
  for (const p of aprobadas.map((i) => palabras[i]).filter(Boolean)) {
    // el inicio cuenta desde el primer tramo que toca la palabra (si empezaba en un silencio quitado)
    const tramo = tramos.find((t) => p.hastaMs > t.desdeMs && p.desdeMs < t.hastaMs);
    if (!tramo) continue;
    const desde = remapear(Math.max(p.desdeMs, tramo.desdeMs), tramos)!;
    // el final no pasa del tramo: Whisper a veces lo estira por encima de una pausa o del final del audio
    const hasta = remapear(Math.min(p.hastaMs, tramo.hastaMs), tramos)!;
    salida.push({ texto: p.texto, desdeMs: desde, hastaMs: Math.max(hasta, desde + 1) });
  }
  return salida;
}

export function duracion(tramos: Tramo[]): number {
  return tramos.reduce((s, t) => s + (t.hastaMs - t.desdeMs), 0);
}
