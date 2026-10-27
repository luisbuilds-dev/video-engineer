import { describe, expect, it } from "vitest";
import { cajaEn, cedulaRD, posicionEn, detectar, enmascarar, luhn, seguir, type PalabraOcr } from "../lib/sensibles";

// una línea de OCR a partir de un texto: cada palabra mide 10 px por carácter
function linea(texto: string, y = 100): PalabraOcr[] {
  let x = 0;
  return texto.split(" ").map((t) => { const p = { texto: t, x0: x, y0: y, x1: x + t.length * 10, y1: y + 20 }; x += (t.length + 1) * 10; return p; });
}
const tipos = (texto: string, privado: string[] = []) => detectar([linea(texto)], 1920, 1080, privado).map((h) => `${h.tipo}:${h.texto}`);

describe("datos sensibles", () => {
  it("Luhn y cédula dominicana", () => {
    expect(luhn("4111111111111111")).toBe(true);
    expect(luhn("4111111111111112")).toBe(false);
    expect(cedulaRD("00113918205")).toBe(true);
    expect(cedulaRD("00113918204")).toBe(false);
  });

  it("encuentra correos, tarjetas, cédulas, teléfonos e IPs aunque vengan partidos", () => {
    expect(tipos("Escríbeme a ana.prueba@example.com mañana")).toEqual(["correo:ana.prueba@example.com"]);
    expect(tipos("Visa 4111 1111 1111 1111 caduca")).toEqual(["tarjeta:4111 1111 1111 1111"]);
    expect(tipos("Cédula 001-1391820-5")).toEqual(["cedula:001-1391820-5"]);
    expect(tipos("Llámame al (809) 555-1234 hoy")).toEqual(["telefono:(809) 555-1234"]);
    expect(tipos("servidor 192.168.1.20 listo")).toEqual(["ip:192.168.1.20"]);
  });

  it("encuentra claves de API, con prefijo conocido o por su aspecto", () => {
    // claves inventadas y compuestas por partes: ningún escáner de secretos debe confundirlas con reales
    expect(tipos("export KEY=" + ["sk", "ant", "api03", "AbCdEf123456GhIjKl"].join("-"))[0]).toMatch(/^clave:sk-ant-api03/);
    expect(tipos("token " + ["ghp", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4"].join("_"))[0]).toMatch(/^clave:ghp_/);
    expect(tipos("valor x7Gq2LmP9vR4tY8wZ1kN3bH6cJ5dF0sA")).toEqual(["clave:x7Gq2LmP9vR4tY8wZ1kN3bH6cJ5dF0sA"]);
  });

  it("lo que sigue a «contraseña:» y las frases privadas del usuario", () => {
    expect(tipos("Contraseña: perro azul 22")).toEqual(["etiqueta:perro azul 22"]);
    expect(tipos("Hola, soy Ana Pérez y hoy", ["ana perez"])).toEqual(["privado:Ana Pérez"]);
  });

  it("suma los trozos de un correo o una clave que el OCR partió", () => {
    // «cliente» y «prueba@…» separados por 2 px (el OCR se comió el punto)
    const l = [{ texto: "Correo", x0: 0, y0: 0, x1: 60, y1: 20 }, { texto: "cliente", x0: 200, y0: 0, x1: 270, y1: 20 },
      { texto: "prueba@example.com", x0: 272, y0: 0, x1: 450, y1: 20 }];
    const [h] = detectar([l], 1000, 100);
    expect(h.tipo).toBe("correo");
    expect(h.x).toBeCloseTo(0.2);
    expect(tipos("Crear una cuenta Acceder")).toEqual([]);
  });

  it("si el OCR junta etiqueta y dato en una palabra, tapa solo el dato", () => {
    const [h] = detectar([[{ texto: "Contraseña:Verano26", x0: 0, y0: 0, x1: 190, y1: 20 }]], 1000, 100);
    expect(h.tipo).toBe("etiqueta");
    expect(h.x * 1000).toBeCloseTo(110); // «Contraseña:» = 11 de 19 caracteres
    expect((h.x + h.w) * 1000).toBeCloseTo(190);
  });

  it("antes de verlo y si lo pierde, sigue la velocidad del dato en vez de congelarlo", () => {
    const p = { tipo: "ip", desde: 0, hasta: 9, puntos: [{ t: 1, x: 0, y: 0.5, w: 0.1, h: 0.02 }, { t: 2, x: 0, y: 0.4, w: 0.1, h: 0.02 }] };
    expect(posicionEn(0.8, p).y).toBeCloseTo(0.52);
    expect(posicionEn(2.3, p).y).toBeCloseTo(0.37);
    expect(posicionEn(5, p).y).toBeCloseTo(0.35); // como mucho 0,5 s de extrapolación
  });

  it("no tapa texto normal, números cortos, versiones ni enlaces", () => {
    expect(tipos("La impresión 3D desde 1981 cuesta 250 dólares")).toEqual([]);
    expect(tipos("versión 4.0.537 en https://www.remotion.dev/docs/renderer/render-media")).toEqual([]);
    expect(tipos("número 1234567890123")).toEqual([]); // 13 dígitos sin Luhn válido
  });

  it("sigue el dato mientras la página se desplaza y es conservador con los bordes", () => {
    const h = (y: number) => ({ tipo: "correo", texto: "a@b.co", x: 0.1, y, w: 0.1, h: 0.02 });
    const pistas = seguir([
      { t: 0, hallazgos: [] }, { t: 1, hallazgos: [h(0.5)] }, { t: 2, hallazgos: [h(0.4)] },
      { t: 3, hallazgos: [] }, // el OCR falla una vez: la pista sigue
      { t: 4, hallazgos: [h(0.2)] }, { t: 5, hallazgos: [] }, { t: 6, hallazgos: [] },
    ], 10);
    expect(pistas).toHaveLength(1);
    expect(pistas[0]).toMatchObject({ desde: 0, hasta: 6 });
    expect(posicionEn(1.5, pistas[0]).y).toBeCloseTo(0.45);
    // la caja cubre lo que el dato recorre en ±0,15 s: de 0,435 a 0,465 (+ su alto)
    const c = cajaEn(1.5, pistas[0], 0.15)!;
    expect(c.y).toBeCloseTo(0.435);
    expect(c.y + c.h).toBeCloseTo(0.465 + 0.02);
    expect(cajaEn(1.5, pistas[0], 0)!.y).toBeCloseTo(0.45);
    expect(cajaEn(6.04, pistas[0])).not.toBeNull(); // margen también al final
    expect(cajaEn(7, pistas[0])).toBeNull();
    expect(enmascarar("ana@correo.com")).toBe("an********");
  });

  it("la caja cubre solo las palabras del dato, en fracciones", () => {
    const [h] = detectar([linea("correo: a@b.co fin")], 1000, 500);
    expect(h).toMatchObject({ tipo: "correo", x: 0.08, y: 0.2, w: 0.06, h: 0.04 });
  });
});
