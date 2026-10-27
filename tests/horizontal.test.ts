import { describe, expect, it } from "vitest";
import { ajustarZona, marca, marcasYouTube, validarCapitulos, zonaPantalla } from "../lib/horizontal";

describe("capítulos", () => {
  it("cumple las reglas de YouTube", () => {
    const ok = [{ titulo: "Intro", desdeMs: 0 }, { titulo: "Paso 1", desdeMs: 15000 }, { titulo: "Paso 2", desdeMs: 40000 }];
    expect(validarCapitulos(ok, 60000)).toEqual([]);
    expect(validarCapitulos([{ titulo: "A", desdeMs: 2000 }, { titulo: "B", desdeMs: 5000 }], 60000)).toEqual([
      "YouTube necesita al menos 3 capítulos", "el primer capítulo tiene que empezar en 0:00", "«A» dura menos de 10 s"]);
  });

  it("escribe las marcas para la descripción", () => {
    expect(marca(3_725_000)).toBe("1:02:05");
    expect(marcasYouTube([{ titulo: "Intro", desdeMs: 0 }, { titulo: "Instalar", desdeMs: 75_000 }])).toBe("00:00 Intro\n01:15 Instalar");
  });
});

describe("pantalla", () => {
  const zooms = [{ desdeMs: 1000, x: 0.5, y: 0.5, w: 0.5, h: 0.5 }];

  it("antes del primer zoom se ve entera y después se acerca con suavidad", () => {
    expect(zonaPantalla(500, zooms)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    const mitad = zonaPantalla(1300, zooms);
    expect(mitad.w).toBeCloseTo(0.75, 2);
    expect(zonaPantalla(2000, zooms)).toEqual({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
  });

  it("un zoom nunca deforma ni se sale de la pantalla", () => {
    const z = ajustarZona({ x: 0.9, y: 0.1, w: 0.2, h: 0.05 }); // misma forma que la salida → w = h
    expect(z.w).toBeCloseTo(z.h, 5);
    expect(z.w).toBeGreaterThanOrEqual(0.2);
    expect(z.x + z.w).toBeLessThanOrEqual(1);
    const vertical = ajustarZona({ x: 0.4, y: 0.4, w: 0.1, h: 0.1 }, 0.5625); // salida 9:16 sobre pantalla 16:9
    expect(vertical.w / vertical.h).toBeCloseTo(0.5625, 3);
    expect(Math.min(vertical.w, vertical.h)).toBeCloseTo(0.15, 3);
  });
});

import { partirEnCortes } from "../lib/composicion";
describe("páginas y cortes de escena", () => {
  it("una página que cruza el paso de pantalla a cámara se parte en dos", () => {
    const tk = (d: number) => ({ texto: "x ", desdeMs: d, hastaMs: d + 200 });
    const [a, b] = partirEnCortes([{ desdeMs: 0, hastaMs: 1000, tokens: [tk(0), tk(300), tk(700)] }], [500]);
    expect(a).toMatchObject({ desdeMs: 0, hastaMs: 500 });
    expect(a.tokens).toHaveLength(2);
    expect(b).toMatchObject({ desdeMs: 500, hastaMs: 1000 });
    expect(partirEnCortes([{ desdeMs: 0, hastaMs: 1000, tokens: [tk(0)] }], [500])).toHaveLength(1);
  });
});
