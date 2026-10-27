import { describe, expect, it } from "vitest";
import { nms, planificarZooms, posicionSubtitulo, type Fotograma } from "../lib/vision";

const quieto = (tMs: number, cara = { x: 0.55, y: 0.3, w: 0.22, h: 0.2 }): Fotograma =>
  ({ tMs, caras: [cara], movimiento: new Array(10).fill(0) });
const fotos = Array.from({ length: 60 }, (_, i) => quieto(i * 100));

describe("visión", () => {
  it("nms se queda con la mejor de dos cajas solapadas", () => {
    const r = nms([{ x: 0, y: 0, w: 1, h: 1, score: 0.8 }, { x: 0.05, y: 0, w: 1, h: 1, score: 0.9 }, { x: 2, y: 2, w: 1, h: 1, score: 0.7 }]);
    expect(r.map((c) => c.score)).toEqual([0.9, 0.7]);
  });

  it("si la cara está donde irían los subtítulos, los mueve", () => {
    const abajo = Array.from({ length: 20 }, (_, i) => quieto(i * 100, { x: 0.3, y: 0.62, w: 0.3, h: 0.2 }));
    const y = posicionSubtitulo(abajo, 0, 2000, 0.72, 0.08);
    expect(y < 0.55 || y > 0.9).toBe(true); // ni encima de la cara (0.57–0.88 con margen)
  });

  it("si nada estorba, respeta la posición del estilo", () => {
    expect(posicionSubtitulo(fotos, 0, 2000, 0.72, 0.08)).toBe(0.72);
  });

  it("un zoom agranda la cara y los subtítulos se apartan", () => {
    const sin = posicionSubtitulo(fotos, 0, 2000, 0.64, 0.08);
    const con = posicionSubtitulo(fotos, 0, 2000, 0.64, 0.08, [{ desdeMs: 0, hastaMs: 2000, escala: 1.6, cx: 0.66, cy: 0.4 }]);
    expect(sin).toBe(0.64);
    expect(con).not.toBe(0.64);
  });

  it("propone zooms solo cuando el plano lleva quieto más del máximo", () => {
    const zooms = planificarZooms(fotos, [0, 1000, 3000, 4500, 5800], 6000,
      { maxPlanoMs: 2600, escala: 1.14, minDuracionMs: 1000, evitar: [{ desdeMs: 0, hastaMs: 1500 }] });
    expect(zooms).toHaveLength(1);
    expect(zooms[0].desdeMs).toBe(3000);
    expect(zooms[0].cx).toBeCloseTo(0.66, 2); // hacia la cara
  });
});
