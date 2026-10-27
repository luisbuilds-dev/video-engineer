import { loadFont as anton } from "@remotion/google-fonts/Anton";
import { loadFont as archivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as barlowCondensed } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as bebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as bricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as dmSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as jetbrains } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as montserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as oswald } from "@remotion/google-fonts/Oswald";
import { loadFont as permanentMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as poppins } from "@remotion/google-fonts/Poppins";
import { loadFont as spaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import type { FUENTES } from "../lib/estilo";

type Nombre = (typeof FUENTES)[number];
// Cada fuente se descarga solo la primera vez que el estilo la usa (alfabeto latino, todos sus pesos)
const cargadores: Record<Nombre, () => { fontFamily: string }> = {
  Inter: () => inter("normal", { subsets: ["latin"] }),
  Anton: () => anton("normal", { subsets: ["latin"] }),
  Montserrat: () => montserrat("normal", { subsets: ["latin"] }),
  "Bebas Neue": () => bebas("normal", { subsets: ["latin"] }),
  Poppins: () => poppins("normal", { subsets: ["latin"] }),
  Oswald: () => oswald("normal", { subsets: ["latin"] }),
  "Archivo Black": () => archivoBlack("normal", { subsets: ["latin"] }),
  "Barlow Condensed": () => barlowCondensed("normal", { subsets: ["latin"] }),
  "Space Grotesk": () => spaceGrotesk("normal", { subsets: ["latin"] }),
  "Bricolage Grotesque": () => bricolage("normal", { subsets: ["latin"] }),
  "DM Serif Display": () => dmSerif("normal", { subsets: ["latin"] }),
  "Permanent Marker": () => permanentMarker("normal", { subsets: ["latin"] }),
  "JetBrains Mono": () => jetbrains("normal", { subsets: ["latin"] }),
};
const cargadas = new Map<Nombre, string>();

export function familia(nombre: Nombre): string {
  if (!cargadas.has(nombre)) cargadas.set(nombre, cargadores[nombre]().fontFamily);
  return cargadas.get(nombre)!;
}
