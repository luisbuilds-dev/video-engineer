import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const hook = (tool_name: string, tool_input: object) =>
  spawnSync("node", [".claude/hooks/proteger.mjs"], { input: JSON.stringify({ tool_name, tool_input }), encoding: "utf8" }).status;

describe("hook proteger", () => {
  it("bloquea borrar, mover o sobrescribir un crudo", () => {
    expect(hook("Bash", { command: "rm proyectos/x/crudo.mp4" })).toBe(2);
    expect(hook("Bash", { command: "mv proyectos/x/crudo.mov /tmp/" })).toBe(2);
    expect(hook("Bash", { command: "ffmpeg -i a.mp4 > proyectos/x/crudo.mp4" })).toBe(2);
    expect(hook("Write", { file_path: "proyectos/x/crudo.mp4" })).toBe(2);
  });

  it("bloquea borrados recursivos fuera de las carpetas de trabajo", () => {
    expect(hook("Bash", { command: "rm -rf proyectos" })).toBe(2);
    expect(hook("Bash", { command: "Remove-Item C:\\Users\\me\\Videos -Recurse" })).toBe(2);
  });

  it("deja trabajar con normalidad", () => {
    expect(hook("Bash", { command: "npm run render -- --proyecto x" })).toBe(0);
    expect(hook("Bash", { command: "rm -rf out" })).toBe(0);
    expect(hook("Write", { file_path: "proyectos/x/edicion.json" })).toBe(0);
    expect(hook("Bash", { command: "ffmpeg -i proyectos/x/crudo.mp4 -vn audio.wav" })).toBe(0);
  });
});
