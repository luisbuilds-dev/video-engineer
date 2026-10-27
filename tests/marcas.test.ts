import { describe, expect, it } from "vitest";
import { disponer, enlacesDe, flecha } from "../lib/diagrama";
import { buscarLogos, colorLogo, logo } from "../lib/logos";

const n = (id: string) => ({ id, desdeMs: 0 });

describe("logos", () => {
  it("encuentra marcas por nombre aunque se escriban distinto", () => {
    expect(buscarLogos("youtube")[0].slug).toBe("youtube");
    expect(buscarLogos("Bambu Lab")[0].slug).toBe("bambulab");
    expect(logo("github")?.titulo).toBe("GitHub");
  });
  it("los logos oscuros van en blanco sobre el vidrio; los de color, en su color con halo", () => {
    expect(colorLogo("181717").relleno).toBe("#FFFFFF");
    expect(colorLogo("FF0000")).toEqual({ relleno: "#FF0000", halo: "#FF000099" });
  });
});

describe("diagramas", () => {
  it("flujo: en orden y partiendo en filas", () => {
    const { posiciones, aspecto } = disponer([n("a"), n("b"), n("c"), n("d")], [], "flujo", 3);
    expect(posiciones.map((p) => [p.x.toFixed(2), p.y.toFixed(2)])).toEqual([["0.17", "0.25"], ["0.50", "0.25"], ["0.83", "0.25"], ["0.50", "0.75"]]);
    expect(aspecto).toBeCloseTo(0.68);
  });
  it("radial: el primero en el centro y el resto alrededor desde arriba", () => {
    const { posiciones } = disponer([n("c"), n("1"), n("2")], [], "radial");
    expect(posiciones[0]).toMatchObject({ x: 0.5, y: 0.5 });
    expect(posiciones[1].x).toBeCloseTo(0.5);
    expect(posiciones[1].y).toBeCloseTo(0.16);
    expect(disponer([n("c"), n("1")], [], "radial").aspecto).toBeLessThan(0.75); // apaisado: no encoge los nodos
  });
  it("árbol: por niveles desde lo que no recibe flechas", () => {
    const { posiciones } = disponer([n("r"), n("h1"), n("h2")], [{ de: "r", a: "h1" }, { de: "r", a: "h2" }], "arbol");
    const y = Object.fromEntries(posiciones.map((p) => [p.id, p.y]));
    expect(y.r).toBeLessThan(y.h1);
    expect(y.h1).toBe(y.h2);
  });
  it("si no hay enlaces, el flujo se encadena y el radial sale del centro", () => {
    expect(enlacesDe([n("a"), n("b"), n("c")], undefined, "flujo")).toEqual([{ de: "a", a: "b" }, { de: "b", a: "c" }]);
    expect(enlacesDe([n("a"), n("b")], undefined, "radial")).toEqual([{ de: "a", a: "b" }]);
    expect(enlacesDe([n("a")], [{ de: "a", a: "x" }], "flujo")).toEqual([]); // enlaces a nodos que no existen: fuera
  });
  it("las flechas no pisan los nodos", () => {
    expect(flecha({ x: 0, y: 0 }, { x: 10, y: 0 }, 2)).toEqual({ x1: 2, y1: 0, x2: 8, y2: 0 });
  });
});
