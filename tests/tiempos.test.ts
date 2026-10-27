import { describe, expect, it } from "vitest";
import { alinear, conservar, duracion, palabrasCortadas, remapear, restarSilencios, silencios, unir, type Palabra } from "../lib/tiempos";

const p = (texto: string, desdeMs: number, hastaMs: number): Palabra => ({ texto, desdeMs, hastaMs });
// «hola [silencio 2 s] esto eh es un reel»: se quita el silencio y la muletilla «eh»
const crudo = [p("hola", 0, 400), p("esto", 2400, 2700), p("eh", 2800, 3000), p("es", 3600, 3800),
  p("un", 3850, 4000), p("reel", 4050, 4500)];

describe("tiempos", () => {
  it("une tramos solapados y en orden", () => {
    expect(unir([{ desdeMs: 500, hastaMs: 900 }, { desdeMs: 0, hastaMs: 600 }, { desdeMs: 1000, hastaMs: 1200 }]))
      .toEqual([{ desdeMs: 0, hastaMs: 900 }, { desdeMs: 1000, hastaMs: 1200 }]);
  });

  it("encuentra los silencios largos", () => {
    expect(silencios(crudo, 350)).toEqual([{ desdeMs: 400, hastaMs: 2400 }, { desdeMs: 3000, hastaMs: 3600 }]);
  });

  it("conserva las palabras aprobadas con su margen y quita lo demás", () => {
    const tramos = conservar(crudo, [0, 1, 3, 4, 5], 100, 5000);
    expect(tramos).toEqual([{ desdeMs: 0, hastaMs: 500 }, { desdeMs: 2300, hastaMs: 2800 }, { desdeMs: 3500, hastaMs: 4600 }]);
    expect(duracion(tramos)).toBe(2100);
  });

  it("recoloca las palabras en el vídeo cortado, sin huecos ni solapes", () => {
    const tramos = conservar(crudo, [0, 1, 3, 4, 5], 100, 5000);
    const final = palabrasCortadas(crudo, [0, 1, 3, 4, 5], tramos);
    expect(final.map((x) => x.texto)).toEqual(["hola", "esto", "es", "un", "reel"]);
    expect(final[1]).toEqual(p("esto", 600, 900)); // 500 ms del primer tramo + 100 de margen
    for (let i = 1; i < final.length; i++) expect(final[i].desdeMs).toBeGreaterThanOrEqual(final[i - 1].hastaMs);
    expect(remapear(1500, tramos)).toBeNull(); // dentro del silencio cortado
  });

  it("quita los silencios reales del audio aunque Whisper estire las palabras", () => {
    // Whisper dice que «hola» dura hasta 2400 ms, pero el audio está en silencio de 450 a 2300
    const estirada = [p("hola", 0, 2400), p("adiós", 2400, 2900)];
    const tramos = restarSilencios(conservar(estirada, [0, 1], 100, 3000), [{ desdeMs: 450, hastaMs: 2300 }], 100);
    expect(tramos).toEqual([{ desdeMs: 0, hastaMs: 550 }, { desdeMs: 2200, hastaMs: 3000 }]);
    const final = palabrasCortadas(estirada, [0, 1], tramos);
    expect(final).toEqual([p("hola", 0, 550), p("adiós", 750, 1250)]);
  });

  it("alinea las palabras con sus centros DTW y los silencios reales", () => {
    // caso real de la prueba: «by hand. [pausa 1,6–4,1 s] This tool»
    const centros = [{ texto: "by", centroMs: 1260 }, { texto: "hand.", centroMs: 1620 },
      { texto: "This", centroMs: 4200 }, { texto: "tool", centroMs: 4420 }];
    const palabras = alinear(centros, [{ desdeMs: 1622, hastaMs: 4060 }], 6000);
    expect(palabras).toEqual([p("by", 1010, 1440), p("hand.", 1440, 1622), p("This", 4060, 4310), p("tool", 4310, 4670)]);
    for (const w of palabras) expect(w.hastaMs <= 1622 || w.desdeMs >= 4060).toBe(true); // nada dentro de la pausa
  });

  it("no pierde la última palabra si su final pasa del audio", () => {
    const fin = [p("final", 1000, 1600)];
    const tramos = conservar(fin, [0], 100, 1500);
    expect(palabrasCortadas(fin, [0], tramos)).toEqual([p("final", 100, 600)]);
  });
});
