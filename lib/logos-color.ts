// Color de un logo sobre el vidrio oscuro (sin depender de simple-icons: esto sí entra en el render).

export type Logo = { slug: string; titulo: string; hex: string; path: string };

/** Luminancia relativa (WCAG) de un color #RRGGBB o RRGGBB. */
export function luminancia(hex: string): number {
  const c = hex.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/**
 * Colores para dibujar un logo sobre el vidrio oscuro del estilo: su color de marca si se ve bien; si es demasiado oscuro
 * (GitHub, TikTok, Anthropic…), en blanco. El halo usa el color de marca solo cuando tiene luz suficiente para brillar.
 */
export function colorLogo(hex: string): { relleno: string; halo: string } {
  const l = luminancia(hex);
  if (l < 0.06) return { relleno: "#FFFFFF", halo: "rgba(255,255,255,.35)" };
  return { relleno: `#${hex}`, halo: `#${hex}99` };
}
