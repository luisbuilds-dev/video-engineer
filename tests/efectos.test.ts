import { describe, expect, it } from "vitest";
import { duracionGrafico, planificarSonidos, type Momento, type MomentoVisible } from "../lib/efectos";

const catalogo = [
  { tipo: "pop", archivo: "pop-1.wav" }, { tipo: "pop", archivo: "pop-2.wav" }, { tipo: "whoosh", archivo: "whoosh-1.wav" },
  { tipo: "impacto", archivo: "impacto-1.wav" }, { tipo: "ding", archivo: "ding-1.wav" }, { tipo: "riser", archivo: "riser-1.wav" },
  { tipo: "caja", archivo: "caja-1.wav" },
];
const lista: Momento = { tipo: "lista", desdeMs: 3000, items: [{ texto: "a", desdeMs: 3000 }, { texto: "b", desdeMs: 4000 }, { texto: "c", desdeMs: 5000 }] };
const base = { tarjetas: [], zooms: [], conGancho: false, volumenDb: -16, catalogo };

describe("efectos", () => {
  it("una lista suena con un pop por punto, alternando variantes, y un ding al final", () => {
    const s = planificarSonidos({ ...base, momentos: [lista], densidad: "medio" });
    expect(s.map((x) => `${x.desdeMs}:${x.archivo}`)).toEqual(["3000:pop-1.wav", "4000:pop-2.wav", "5000:pop-1.wav", "5450:ding-1.wav"]);
  });

  it("en estilo limpio solo suena lo esencial", () => {
    const s = planificarSonidos({ ...base, momentos: [lista], conGancho: true, densidad: "limpio" });
    expect(s.map((x) => x.archivo)).toEqual(["pop-1.wav", "pop-2.wav", "pop-1.wav"]);
  });

  it("si dos efectos chocan gana el más importante", () => {
    const s = planificarSonidos({ ...base, densidad: "movido", tarjetas: [{ desdeMs: 2000 }],
      momentos: [{ tipo: "sonido", desdeMs: 2100, efecto: "caja" }] });
    expect(s).toEqual([{ desdeMs: 2100, archivo: "caja-1.wav", volumenDb: -16 }]);
  });

  it("una cifra sube con un riser y cae con un impacto cuando termina de contar", () => {
    const s = planificarSonidos({ ...base, densidad: "movido", momentos: [{ tipo: "cifra", desdeMs: 1000, valor: 87, sufijo: "%", etiqueta: "x" }] });
    expect(s.map((x) => x.archivo)).toEqual(["riser-1.wav", "impacto-1.wav"]);
    expect(s[1].volumenDb).toBe(-15);
  });

  it("una escena caos → orden suena al ordenarse y al quedar fijada", () => {
    const s = planificarSonidos({ ...base, densidad: "medio", catalogo: [...catalogo, { tipo: "whoosh", archivo: "whoosh-2.wav" }],
      momentos: [{ tipo: "ilustracion", escena: "caos-orden", desdeMs: 1000, ordenMs: 2000, items: [{ icono: "lock", desdeMs: 0 }] }] });
    expect(s.map((x) => `${x.desdeMs}:${x.archivo}`)).toEqual(["2000:whoosh-1.wav", "3500:ding-1.wav"]);
    expect(duracionGrafico({ tipo: "ilustracion", escena: "caos-orden", desdeMs: 1000, ordenMs: 2000, items: [] })).toBe(3700);
  });

  it("calcula cuánto dura cada gráfico", () => {
    expect(duracionGrafico(lista as MomentoVisible)).toBe(3800);
    expect(duracionGrafico({ tipo: "sello", desdeMs: 0, texto: "OK" })).toBe(1600);
  });
});
