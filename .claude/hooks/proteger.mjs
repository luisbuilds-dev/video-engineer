// Antes de cada Bash, Write o Edit: bloquea lo que podría destruir tus grabaciones.
//   • borrar, mover o sobrescribir un crudo.* dentro de proyectos/
//   • borrados recursivos fuera de las carpetas de trabajo (out/, node_modules/)
// Salir con 2 bloquea la acción y le explica a Claude por qué (Claude Code lee stderr).
import { readFileSync } from "node:fs";

const entrada = JSON.parse(readFileSync(0, "utf8") || "{}");
const { tool_name: herramienta, tool_input: datos = {} } = entrada;
const bloquear = (motivo) => { process.stderr.write(`Bloqueado por proteger.mjs: ${motivo}`); process.exit(2); };

const CRUDO = /crudo\.[a-z0-9]{2,4}\b/i;
if (herramienta === "Write" || herramienta === "Edit") {
  if (CRUDO.test(datos.file_path ?? "")) bloquear("el crudo es tu grabación original y no se modifica.");
}
if (herramienta === "Bash") {
  const orden = String(datos.command ?? "");
  const destructiva = /\b(rm|del|erase|rmdir|mv|move|Remove-Item|ri|truncate)\b/i.test(orden);
  if (destructiva && CRUDO.test(orden)) bloquear("no se borra ni se mueve un crudo.");
  const recursivo = /\brm\s+-[a-z]*r|\bRemove-Item\b.*-Recurse|\brmdir\s+\/s/i.test(orden);
  if (recursivo && !/\b(out|node_modules|dist)\b/.test(orden)) {
    bloquear("borrado recursivo fuera de out/ o node_modules/. Si de verdad hace falta, pídeselo al usuario.");
  }
  if (/>\s*\S*crudo\./i.test(orden)) bloquear("no se sobrescribe un crudo con una redirección.");
}
process.exit(0);
