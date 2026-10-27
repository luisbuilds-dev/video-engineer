import { describe, expect, it } from "vitest";
import { puntuacion, senales } from "../lib/viralidad";

const pal = (texto: string, desdeMs: number) => ({ texto, desdeMs, hastaMs: desdeMs + 250 });
const rapido = Array.from({ length: 60 }, (_, i) => pal(i === 59 ? "comenta" : "palabra", 100 + i * 330));

describe("viralidad", () => {
  it("un vídeo con buen arranque, cambios y CTA saca 100", () => {
    const cambios = [0, 3000, 6000, 9000, 12000, 15000, 18000].map((d) => ({ desdeMs: d, hastaMs: d + 2000 }));
    const s = senales({ palabras: rapido, duracionMs: 20000, vertical: true, conGancho: true, cambios, movimiento: [] });
    expect(puntuacion(s)).toBe(100);
  });

  it("detecta arranque lento, tramos planos y falta de CTA", () => {
    const lento = [pal("bueno", 1500), ...Array.from({ length: 20 }, (_, i) => pal("x", 2000 + i * 900))];
    const s = senales({ palabras: lento, duracionMs: 20000, vertical: true, conGancho: false, cambios: [], movimiento: [] });
    const falla = s.filter((x) => !x.ok).map((x) => x.id);
    expect(falla).toEqual(expect.arrayContaining(["arranque", "gancho-visual", "ritmo-inicial", "regancho", "planos", "relleno", "cta"]));
    expect(puntuacion(s)).toBeLessThan(20);
  });
});
