// Disposición automática de diagramas: Claude dice qué nodos hay y qué se conecta con qué; aquí se decide dónde va cada uno.
//   flujo  — en orden, de izquierda a derecha, partiendo en filas si no caben (A → B → C)
//   radial — el primero en el centro y el resto alrededor (un concepto y sus partes)
//   arbol  — por niveles desde las raíces (lo que no recibe flechas) hacia abajo (jerarquías, causas → efectos)
// Coordenadas 0..1 dentro de la caja del diagrama (x hacia la derecha, y hacia abajo).

export const DISPOSICIONES = ["flujo", "radial", "arbol"] as const;
export type Disposicion = (typeof DISPOSICIONES)[number];
export type Nodo = { id: string; etiqueta?: string; icono?: string; logo?: string; desdeMs: number };
export type Enlace = { de: string; a: string };
export type Posicion = { id: string; x: number; y: number };

/** `porFila`: cuántos nodos caben en una fila (3 en vertical, 4-5 en horizontal). Devuelve también la proporción alto/ancho. */
export function disponer(nodos: Nodo[], enlaces: Enlace[], disposicion: Disposicion, porFila = 3): { posiciones: Posicion[]; aspecto: number } {
  if (!nodos.length) return { posiciones: [], aspecto: 0.4 };
  if (disposicion === "radial") {
    const [centro, ...resto] = nodos;
    // en elipse apaisada: cabe en un panel bajo sin encoger los nodos
    return {
      aspecto: 0.7,
      posiciones: [{ id: centro.id, x: 0.5, y: 0.5 },
        ...resto.map((n, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / resto.length; // desde arriba, en el sentido del reloj
          return { id: n.id, x: 0.5 + 0.37 * Math.cos(a), y: 0.5 + 0.34 * Math.sin(a) };
        })],
    };
  }
  if (disposicion === "arbol") {
    const entra = new Set(enlaces.map((e) => e.a));
    const nivel = new Map<string, number>();
    const cola = nodos.filter((n) => !entra.has(n.id)).map((n) => n.id);
    if (!cola.length) cola.push(nodos[0].id); // ciclo: se empieza por el primero
    cola.forEach((id) => nivel.set(id, 0));
    while (cola.length) {
      const id = cola.shift()!;
      for (const e of enlaces.filter((x) => x.de === id && !nivel.has(x.a))) { nivel.set(e.a, nivel.get(id)! + 1); cola.push(e.a); }
    }
    for (const n of nodos) if (!nivel.has(n.id)) nivel.set(n.id, 0); // sueltos arriba
    const niveles = Math.max(...nivel.values()) + 1;
    const filas = Array.from({ length: niveles }, (_, k) => nodos.filter((n) => nivel.get(n.id) === k));
    const aspecto = Math.min(1.2, 0.34 * niveles);
    return {
      aspecto,
      posiciones: filas.flatMap((fila, k) => fila.map((n, i) => ({ id: n.id, x: (i + 1) / (fila.length + 1), y: (k + 0.5) / niveles }))),
    };
  }
  // flujo: filas de `porFila`, en orden de lectura
  const filas = Math.ceil(nodos.length / porFila);
  const aspecto = Math.min(1.2, 0.34 * filas);
  return {
    aspecto,
    posiciones: nodos.map((n, i) => {
      const fila = Math.floor(i / porFila), enFila = Math.min(porFila, nodos.length - fila * porFila);
      return { id: n.id, x: ((i % porFila) + 0.5) / enFila, y: (fila + 0.5) / filas };
    }),
  };
}

/** Enlaces a dibujar: si Claude no los da en un flujo, se encadenan en orden (A → B → C). */
export function enlacesDe(nodos: Nodo[], enlaces: Enlace[] | undefined, disposicion: Disposicion): Enlace[] {
  if (enlaces?.length) return enlaces.filter((e) => nodos.some((n) => n.id === e.de) && nodos.some((n) => n.id === e.a));
  if (disposicion === "radial") return nodos.slice(1).map((n) => ({ de: nodos[0].id, a: n.id }));
  return nodos.slice(1).map((n, i) => ({ de: nodos[i].id, a: n.id }));
}

/** Segmento de flecha entre dos centros, recortado `radio` en cada extremo para no pisar los nodos (en las mismas unidades). */
export function flecha(a: { x: number; y: number }, b: { x: number; y: number }, radio: number) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  return { x1: a.x + (dx / d) * radio, y1: a.y + (dy / d) * radio, x2: b.x - (dx / d) * radio, y2: b.y - (dy / d) * radio };
}
