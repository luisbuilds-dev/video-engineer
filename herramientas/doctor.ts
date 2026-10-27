// npm run doctor — revisa tu instalación (solo lee; no instala nada). Sale con 1 si falta algo.
import { comprobar, imprimir } from "./comprobar";

const piezas = comprobar();
imprimir(piezas);
const faltan = piezas.filter((p) => !p.ok);
console.log(faltan.length ? `\nFaltan ${faltan.length}. Arréglalas con lo que dice cada flecha.` : "\nTodo listo.");
process.exit(faltan.length ? 1 : 0);
