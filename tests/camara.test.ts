import { describe, expect, it } from "vitest";
import { estadoCamara, NEUTRO } from "../lib/camara";

describe("efectos de cámara", () => {
  it("fuera de su ventana un efecto no hace nada", () => {
    expect(estadoCamara(5000, [{ efecto: "sacudida", desdeMs: 1000, duracionMs: 350 }])).toEqual(NEUTRO);
  });

  it("la sacudida se apaga sola y es determinista", () => {
    const ef = [{ efecto: "sacudida" as const, desdeMs: 0, duracionMs: 400 }];
    const a = estadoCamara(30, ef), b = estadoCamara(30, ef), fin = estadoCamara(390, ef);
    expect(a).toEqual(b); // mismo fotograma, mismo resultado (Remotion renderiza en paralelo)
    expect(Math.abs(fin.dx)).toBeLessThan(Math.abs(a.dx) + 1e-9 || 1);
    expect(Math.abs(fin.dx)).toBeLessThanOrEqual(0.018 * 0.1);
  });

  it("el flash empieza fuerte y desaparece", () => {
    const ef = [{ efecto: "flash" as const, desdeMs: 1000, duracionMs: 200 }];
    expect(estadoCamara(1000, ef).flash).toBeCloseTo(0.85);
    expect(estadoCamara(1190, ef).flash).toBeLessThan(0.1);
  });

  it("los zooms se combinan multiplicando", () => {
    const e = estadoCamara(3000, [{ efecto: "zoom-suave", desdeMs: 0, duracionMs: 3000 }, { efecto: "latido", desdeMs: 2800, duracionMs: 400 }]);
    expect(e.escala).toBeCloseTo(1.06, 5); // el zoom suave ya terminó en 3000 y el latido está en p = 0.5 → su máximo
    const m = estadoCamara(2999, [{ efecto: "zoom-suave", desdeMs: 0, duracionMs: 3000 }]);
    expect(m.escala).toBeCloseTo(1.08, 2);
  });

  it("el barrido sale y vuelve a su sitio", () => {
    const ef = [{ efecto: "barrido" as const, desdeMs: 0, duracionMs: 300 }];
    expect(estadoCamara(140, ef).dx).toBeCloseTo(-0.44, 1); // a mitad sale por la izquierda…
    expect(estadoCamara(160, ef).dx).toBeGreaterThan(0.4); // …y entra por la derecha (el salto lo oculta el desenfoque)
    expect(Math.abs(estadoCamara(299, ef).dx)).toBeLessThan(0.01);
  });
});
