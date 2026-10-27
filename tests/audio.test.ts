import { describe, expect, it } from "vitest";
import { leerCongelados, leerEbur128 } from "../lib/audio";
import { leerEstilo } from "../lib/estilo";

describe("informes de ffmpeg", () => {
  it("lee LUFS y pico del resumen de ebur128", () => {
    const salida = `[Parsed_ebur128_0] t: 9.9 M: -15.0\n[Parsed_ebur128_0] Summary:\n\n  Integrated loudness:\n    I:         -14.2 LUFS\n    Threshold: -24.5 LUFS\n\n  True peak:\n    Peak:       -1.3 dBFS`;
    expect(leerEbur128(salida)).toEqual({ lufs: -14.2, pico: -1.3 });
    expect(leerEbur128("nada")).toBeNull();
  });

  it("lee los tramos congelados", () => {
    const salida = "lavfi.freezedetect.freeze_start: 3.2\nlavfi.freezedetect.freeze_duration: 0.8\nlavfi.freezedetect.freeze_end: 4.0\nlavfi.freezedetect.freeze_start: 9.5";
    expect(leerCongelados(salida)).toEqual([{ desde: 3.2, hasta: 4 }, { desde: 9.5, hasta: Infinity }]);
  });
});

describe("estilo", () => {
  it("el estilo base es válido", () => {
    expect(leerEstilo("estilos/base-neutra.json").id).toBe("base-neutra");
  });
});
