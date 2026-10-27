import { describe, expect, it } from "vitest";
import { elegir, licenciaValida, nombreLocal, sanear } from "../lib/iconos-externos";

const col = (spdx: string, extra = {}) => ({ name: "x", license: { spdx }, palette: false, ...extra });

describe("iconos de internet", () => {
  it("solo licencias libres y de un color", () => {
    expect(licenciaValida(col("MIT"))).toBe(true);
    expect(licenciaValida(col("CC-BY-NC-4.0"))).toBe(false);
    expect(licenciaValida(col("MIT", { palette: true }))).toBe(false);
    expect(licenciaValida(undefined)).toBe(false);
  });

  it("prefiere los de trazo y descarta los que no se pueden usar", () => {
    const r = elegir(["mdi:printer-3d", "raro:printer", "tabler:printer"],
      { mdi: col("Apache-2.0"), raro: col("GPL-3.0"), tabler: col("MIT", { tags: ["Uses Stroke"] }) });
    expect(r).toEqual(["tabler:printer", "mdi:printer-3d"]);
  });

  it("sanea el SVG: hereda atributos de <g> y pone el color del vídeo", () => {
    const s = sanear('<g fill="none" stroke="#123456" stroke-width="2"><path d="M1 1h2"/><circle cx="4" cy="4" r="1"/></g>')!;
    expect(s.trazo).toBe(true);
    expect(s.elementos).toEqual([["path", { fill: "none", stroke: "currentColor", strokeWidth: "2", d: "M1 1h2" }],
      ["circle", { fill: "none", stroke: "currentColor", strokeWidth: "2", cx: "4", cy: "4", r: "1" }]]);
    expect(sanear('<path fill="currentColor" d="M0 0h4v4z"/>')!.trazo).toBe(false);
  });

  it("rechaza scripts, enlaces y elementos raros", () => {
    expect(sanear('<script>alert(1)</script>')).toBeNull();
    expect(sanear('<path d="M0 0" onload="x()"/>')).toBeNull();
    expect(sanear('<path fill="url(#a)" d="M0 0"/>')).toBeNull();
    expect(sanear('<use href="#a"/>')).toBeNull();
  });

  it("nombres locales limpios", () => {
    expect(nombreLocal("Impresora 3D")).toBe("impresora-3d");
    expect(nombreLocal("Cañón")).toBe("canon");
  });
});
