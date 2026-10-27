import { describe, expect, it } from "vitest";
import { reencuadrar, ventanaEn } from "../lib/encuadre";
import type { Fotograma } from "../lib/vision";

const cara = (tMs: number, x: number, y = 0.3, w = 0.2) => ({ tMs, caras: [{ x, y, w, h: 0.11, score: 1 }], movimiento: [] }) as Fotograma;

describe("reencuadre", () => {
  it("si la forma coincide, se ve el vídeo entero", () => {
    expect(reencuadrar([cara(0, 0.4)], 1080, 1920, 1080 / 1920)[0]).toMatchObject({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("de vertical a horizontal: ventana del ancho completo y la cara entera dentro", () => {
    const fotos = Array.from({ length: 30 }, (_, i) => cara(i * 100, 0.55, 0.3));
    const v = reencuadrar(fotos, 1080, 1920, 16 / 9);
    const u = v.at(-1)!;
    expect(u.w).toBe(1);
    expect(u.h).toBeCloseTo((1080 / 1920) / (16 / 9), 3);
    // la cara (0.3 → 0.41 de alto) y su margen caben enteros en la ventana
    expect(u.y).toBeLessThanOrEqual(0.3 - 0.11 * 0.55 + 0.001);
    expect(u.y + u.h).toBeGreaterThanOrEqual(0.41);
  });

  it("no persigue cada movimiento pequeño (zona muerta) pero nunca deja la cara fuera", () => {
    const fotos = [...Array.from({ length: 10 }, (_, i) => cara(i * 100, 0.4, 0.4, 0.1)), ...Array.from({ length: 10 }, (_, i) => cara(1000 + i * 100, 0.41, 0.4, 0.1))];
    const v = reencuadrar(fotos, 1920, 1080, 9 / 16);
    expect(v[10].x).toBe(v[9].x); // 1 % de movimiento: la cámara no se mueve
    const lejos = reencuadrar([cara(0, 0.1, 0.4, 0.1), cara(100, 0.75, 0.4, 0.1)], 1920, 1080, 9 / 16);
    const u = lejos[1];
    expect(u.x).toBeLessThanOrEqual(0.72 + 0.001); // borde izquierdo de la cara (con margen) dentro
    expect(u.x + u.w).toBeGreaterThanOrEqual(0.88 - 0.001); // borde derecho dentro
  });

  it("interpola entre ventanas", () => {
    const v = [{ tMs: 0, x: 0, y: 0, w: 0.5, h: 1 }, { tMs: 100, x: 0.2, y: 0, w: 0.5, h: 1 }];
    expect(ventanaEn(50, v).x).toBeCloseTo(0.1);
  });
});
