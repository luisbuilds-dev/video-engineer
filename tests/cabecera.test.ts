import { describe, expect, it } from "vitest";
import { barrasOnda, leerRms, nivelesOnda, progresoSeccion, secciones } from "../lib/cabecera";

describe("barra de secciones", () => {
  it("cada sección acaba donde empieza la siguiente; con menos de 2 no hay barra", () => {
    const s = secciones([{ titulo: "B", desdeMs: 5000 }, { titulo: "A", desdeMs: 0 }], 9000);
    expect(s).toEqual([{ titulo: "A", desdeMs: 0, hastaMs: 5000 }, { titulo: "B", desdeMs: 5000, hastaMs: 9000 }]);
    expect(secciones([{ titulo: "A", desdeMs: 0 }], 9000)).toEqual([]);
  });
  it("cronometra: sección actual y cuánto lleva", () => {
    const s = secciones([{ titulo: "A", desdeMs: 0 }, { titulo: "B", desdeMs: 4000 }], 8000);
    expect(progresoSeccion(1000, s)).toEqual({ actual: 0, dentro: 0.25 });
    expect(progresoSeccion(6000, s)).toEqual({ actual: 1, dentro: 0.5 });
  });
});

describe("onda de voz", () => {
  it("lee el RMS de ffmpeg (también el silencio total)", () => {
    expect(leerRms("lavfi.astats.Overall.RMS_level=-23.5\nx\nlavfi.astats.Overall.RMS_level=-inf")).toEqual([-23.5, -120]);
  });
  it("sube de golpe y baja despacio, entre 0 y 1", () => {
    const n = nivelesOnda([-120, -10, -120, -120]);
    expect(n[0]).toBe(0);
    expect(n[1]).toBe(1);
    expect(n[2]).toBeCloseTo(0.82, 2);
    expect(n[3]).toBeLessThan(n[2]);
  });
  it("barras simétricas, más altas en el centro y deterministas", () => {
    const b = barrasOnda(1, 10);
    expect(b).toHaveLength(31);
    expect(b[0]).toBeCloseTo(b[30]);
    expect(b[15]).toBeGreaterThan(b[0]);
    expect(barrasOnda(1, 10)).toEqual(b);
    expect(Math.min(...barrasOnda(0, 3))).toBeCloseTo(0.06); // en silencio queda una línea fina, no desaparece
  });
});
