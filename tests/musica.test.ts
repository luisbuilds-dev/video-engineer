import { describe, expect, it } from "vitest";
import { gananciaMusica, leerMomentaneo, mejorTramo } from "../lib/musica";

describe("música", () => {
  it("lee el volumen momentáneo de ebur128", () => {
    const s = "[Parsed_ebur128_0] t: 0.1  TARGET:-23 LUFS    M: -40.2 S:-120.7     I: -40.2 LUFS\n[Parsed_ebur128_0] t: 0.2  TARGET:-23 LUFS    M:-inf S:-inf";
    expect(leerMomentaneo(s)).toEqual([{ t: 0.1, lufs: -40.2 }, { t: 0.2, lufs: -70 }]);
  });

  it("elige la parte con más energía", () => {
    // canción de 60 s: tranquila salvo entre 30 y 40 s
    const m = Array.from({ length: 600 }, (_, i) => ({ t: i / 10, lufs: i >= 300 && i < 400 ? -10 : -30 }));
    expect(mejorTramo(m, 10)).toBe(30);
    expect(mejorTramo(m, 90)).toBe(0); // si el vídeo es más largo que la canción, desde el principio
  });

  it("baja la música mientras hablas y la sube en las pausas, con fundidos", () => {
    const palabras = [{ texto: "hola", desdeMs: 2000, hastaMs: 2500 }];
    expect(gananciaMusica(1000, palabras, 10000, -20, 10)).toBe(-20);
    expect(gananciaMusica(2200, palabras, 10000, -20, 10)).toBe(-30);
    expect(gananciaMusica(0, palabras, 10000, -20, 10)).toBeLessThan(-70); // empieza en silencio
    expect(gananciaMusica(9400, palabras, 10000, -20, 10)).toBeCloseTo(-20 + 20 * Math.log10(0.5), 5);
  });
});
