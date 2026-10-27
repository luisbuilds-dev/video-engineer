# Cuestionario de estilo (/empezar)

Claude hace estas preguntas **una a una**, en el idioma del usuario, con opciones cortas y la recomendada primero.
Con las respuestas escribe `respuestas.json` y ejecuta `npm run crear-estilo`.

| # | Pregunta | Clave en respuestas.json | Opciones |
|---|---|---|---|
| 1 | ¿Cómo te llamo? | `nombre` | texto |
| 2 | ¿De qué tratan tus vídeos y para quién? | `nicho` | texto corto (lo usa /editar para el tono de ganchos y tarjetas) |
| 3 | ¿Dónde publicas? | `formatos` | `vertical` (Reels, TikTok, Shorts) · `horizontal` (YouTube) · ambos |
| 4 | ¿Qué tono tienen? | `tono` | `didactico` · `divertido` · `energetico` · `serio` |
| 5 | ¿Tienes colores de marca? | `colores` | `{ "texto": "#FFFFFF", "resalte": "#…", "fondo": "#…", "acento": "#…" }` o `null` (Claude propone) |
| 6 | ¿Tipografías? | `fuenteSubtitulos`, `fuenteTarjetas` | una de las 13 de `lib/estilo.ts` · Claude recomienda según el tono |
| 7 | Subtítulos: ¿tamaño y cuántas palabras a la vez? | `subtitulos` | `{ "tamano": "grande" \| "mediano", "palabras": 1-8, "mayusculas": true \| false }` |
| 8 | ¿Qué ritmo de cortes? | `ritmo` | `muy-cortado` (sin aire, estilo TikTok) · `natural` (respira) |
| 9 | ¿Zooms de ritmo y efectos? | `zooms`, `efectos` | `true/false` · `limpio` · `medio` · `movido` |
| 10 | ¿Música de fondo? | `musica` | `siempre` · `a-veces` · `nunca` |
| 11 | ¿Qué creadores te gustan por cómo editan? | `referentes` | 1-3 cuentas (se guardan para aprender su estilo más adelante) |
| 13 | ¿Arriba, una barra con las secciones del vídeo y una onda que se mueve con tu voz? | `cabecera` | `{ "barra": true | false, "onda": true | false }` (recomendado: las dos en vertical, solo la barra en horizontal) |
| 12 | ¿Hay algo que nunca debe verse en tus grabaciones de pantalla? | `privado` | lista de frases: tu nombre completo, tu calle, el nombre de tu empresa o de clientes… (correos, teléfonos, tarjetas y claves ya se detectan solos) |

Recomendaciones por tono (si el usuario no sabe qué elegir):
- **didáctico** → Inter / Space Grotesk, 3 palabras, natural, efectos medio, música a veces.
- **divertido** → Poppins / Permanent Marker, 2 palabras, muy cortado, efectos movido, música siempre.
- **energético** → Anton / Bebas Neue en mayúsculas, 1-2 palabras, muy cortado, efectos movido.
- **serio** → Montserrat / DM Serif Display, 4 palabras, natural, efectos limpio, música nunca o muy baja.
