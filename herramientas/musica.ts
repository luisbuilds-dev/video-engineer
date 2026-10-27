// npm run musica              → lista las pistas y cuáles tienes descargadas
// npm run musica -- --si      → descarga las que falten a sonidos/musica/ (~150 MB, una vez; no se suben a git)
// Música de fondo de Kevin MacLeod (incompetech.com), CC BY 4.0: uso libre CON CRÉDITO en la descripción del post.
// Las canciones comerciales que suenan en TikTok/Instagram tienen copyright: esas se añaden dentro de la propia app.
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { RAIZ } from "../lib/proyecto";

type Catalogo = { fuente: string; credito: string; pistas: { id: string; titulo: string; animo: string; energia: number; uso: string }[] };
const cat = JSON.parse(readFileSync(join(RAIZ, "sonidos", "musica.json"), "utf8")) as Catalogo;
const DIR = join(RAIZ, "sonidos", "musica");
mkdirSync(DIR, { recursive: true });
const ruta = (id: string) => join(DIR, `${id}.mp3`);

const faltan = cat.pistas.filter((p) => !existsSync(ruta(p.id)));
for (const p of cat.pistas) {
  console.log(`${existsSync(ruta(p.id)) ? "✓" : "·"} ${p.id.padEnd(26)} ${"▮".repeat(p.energia).padEnd(5)} ${p.animo} — ${p.uso}`);
}
if (!faltan.length) console.log("\nTodas descargadas.");
else if (!process.argv.includes("--si")) console.log(`\nFaltan ${faltan.length}. Para descargarlas (~${faltan.length * 6} MB): npm run musica -- --si`);
else {
  for (const p of faltan) {
    for (let intento = 1; intento <= 3; intento++) { // el servidor a veces corta la conexión: hasta 3 intentos
      try {
        const r = await fetch(cat.fuente + encodeURIComponent(p.titulo) + ".mp3");
        if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
        await pipeline(Readable.fromWeb(r.body as never), createWriteStream(ruta(p.id) + ".parte"));
        renameSync(ruta(p.id) + ".parte", ruta(p.id)); // así una descarga cortada nunca queda como pista válida
        console.log(`↓ ${p.titulo}`);
        break;
      } catch (e) {
        if (intento === 3) console.log(`✗ ${p.titulo}: ${(e as Error).message}`);
      }
    }
  }
  console.log("\nRecuerda: al publicar, pon el crédito de la pista en la descripción (render te lo deja en credito.txt).");
}
