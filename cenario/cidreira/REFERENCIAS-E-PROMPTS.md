# Cidreira landmark sprites

Generated using built-in image_gen, 2026-11-03. Separate static pixel-art PNGs; not yet wired into the game.

Files: concha-frente-v1.png, camarao-frente-v1.png, camarao-34-v1.png.

Style references: project cenario/loja.png (523x256), cenario/portico.png (650x256).

Photographic references:
- Acoustic shell: https://commons.wikimedia.org/wiki/File:Concha_ac%C3%BAstica_de_Cidreira.jpg — Alinekichler, 2025-04-28, CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0/ . Pixel-art adaptation of architectural form and coloring; no photo background included. Attribution retained here.
- Shrimp statue: https://pe-no-mar.webnode.page/locacoes-cidreira/ — photograph used as visual reference for monument; blank board intentionally omits lettering.

QA: all outputs RGBA with transparent pixels and complete visible landmarks. Acoustic shell still has faint low-opacity outer halo despite image-tool cleanup attempts. Generated sprites are higher-resolution source assets; no resizing or production integration performed. Two shrimp images depict the same photographed statue from two angles, not two different verified monuments.

Prompts:

concha-frente-v1
Use case: stylized-concept. Generate one isolated transparent-background PIXEL ART scenery sprite for Vermes Kart: Cidreira's real acoustic shell, FRONT VIEW. Image 1 loja.png and image 2 portico.png are style references ONLY: match their restrained medium-density pixel clusters, dark stepped outlines, frontal billboard-sprite projection, architectural detail and limited color ramp shading. Their source sizes are 523x256 and 650x256: avoid extremely coarse 16x16 icon style and avoid smooth illustration. Image 3 concha-foto.jpg is the architectural reference: preserve the very tall sweeping concrete shell canopy, broad asymmetrical curved arch, mustard pale golden-yellow outer rim, deep navy blue recessed interior, light blue horizontal stage deck at mid-height, lower built-in tourism-office volume with central double doors and horizontal windows either side. Pale sandy concrete side walls with simplified blue coastal mural and green reeds/flowers around lower portion. View building straight front-on as a static roadside billboard sprite, subtly visible top surfaces like loja.png, NOT isometric, no exaggerated perspective. Adapt photographic angle into frontal readable silhouette, keeping the unusual high shell and lower office recognizably Cidreira rather than a generic half-circle concert bandstand. Show the COMPLETE building down to its foundation, and modest built-in entrance steps, all as ONE asset. No added benches or accessories, no people, no cars, no sky, no ground plane, no surrounding plaza, no trees, no music notes, no captions, NO text or lettering anywhere including on mural/doors. Treat photo as shape reference, do not copy its background. Consistent afternoon light from upper left, pixel shadows to lower right within object; no detached drop shadow. Crisp pixel-art edges, compact palette, no blur or painterly gradients. Actual alpha transparent background, not a painted checkerboard. Fit whole building centered within canvas with at least 12 percent clear transparent margin on every side. Single sprite, not sprite sheet.

Edit image 1, the acoustic shell sprite. Preserve the building EXACTLY: silhouette, color palette, navy recessed canopy, yellow rim, blue stage deck, lower office doors/windows, coastal mural and pixel-art shading. Change ONLY the isolation and framing. REMOVE ALL OUTER GLOW / HAZE / AMBIENT SHADOW surrounding the building. There must be no golden cloud above it, no blue/green or black mist at sides and bottom. Every pixel outside the actual building silhouette must be fully alpha transparent. Building solid surfaces must be fully opaque; transparency only outside silhouette. Keep crisp hard pixel-art outlines. Fit the entire building centered WITHIN central 70 percent of canvas, giving generous genuinely transparent margin at least 15 percent along every side. No ground plane, no floating shadow, no added content, no text. Maintain frontal sprite perspective and existing details. Output one clean transparent PNG static scenery asset, not a mockup.

BACKGROUND REMOVAL / CLEAN CUTOUT TASK ONLY. Extract the pixel-art acoustic-shell BUILDING from this image. Completely delete the diffuse golden, blue, green and black glow around the building. The glow is BACKGROUND and MUST be removed. Keep only the sharply outlined building silhouette, from top yellow canopy to bottom concrete foundation. Every exterior pixel, all four margins and below building must have alpha 0. Building interior must be alpha 255. No mist or semi-transparent outer shadow. Do not add any shading outside silhouette. Preserve the exact existing pixel-art building unchanged. No new background. Actual fully transparent PNG. This is a crisp game sprite cutout, not a sticker with glow. Keep current generous framing.

---

camarao-frente-v1
Use case: stylized-concept. Generate ONE transparent-background pixel-art STATIC SCENERY STATUE for Vermes Kart, Cidreira orange shrimp welcome monument FRONT VIEW. Reference images 1 loja.png and 2 portico.png define pixel cluster density, crisp dark stepped outlines, limited palette, subtle architectural sprite projection and shading. Image 3 camarao-foto.jpg defines the actual monument, NOT a cooked curled shrimp. Preserve its tall vertical orange tapered head ending in pointed rostrum, two bulging round eyes, friendly sculpted open smile, broad horizontal abdominal segments, multiple slender outstretched orange arms, small feet and curved tail near ground. On image LEFT it holds a tall surfboard-shaped white sign with turquoise border. Preserve the surfboard silhouette but leave its entire face BLANK white: user requests NO text or labels. Preserve small weathered pale concrete rectangular plinth under feet and board. This must read as a fixed painted concrete town statue, not a living creature or animated cartoon character; do not add outfits, food, utensils, cake or holiday decorations. The cake in background photo belongs to a street decoration, not the statue: OMIT it. Front-on billboard scenery sprite like existing project assets, full statue and entire plinth visible, generous minimum 12 percent transparent empty margins on all sides, including around every arm and head. One statue, no extra views, no sprite sheet. Consistent summer-afternoon upper-left lighting, lower-right pixel shadows within object. Crisp medium-detail genuine pixel art, no smooth photoreal shading or painterly texture, no blurry outlines. Genuine alpha transparency around object AND gaps between arms and board, no sky/road/ground plane, NO ambient glow, no colored halo, no detached cast shadow, no backdrop, no checkerboard painted into artwork, no captions, lettering, numbers, watermark or branding.

---

camarao-34-v1
Create another separate transparent PNG scenery sprite of the SAME Cidreira shrimp statue in image 1, this time a subtle THREE-QUARTER VIEW rotated about 25 degrees, seeing front and its right side, not a full side profile. This is a static painted orange concrete monument with the identical vertical pointed head, bulging eyes, smiling mouth, segmented upright body, multiple outstretched arms, small dark feet, curled ground-level tail, blank white surfboard with turquoise edge and pale concrete rectangular plinth. Keep all design features, all proportions, same dark pixel outlines, pixel density and palette as image 1; image 2 is the real photographic shape reference. Match afternoon light upper left. The board stays fully visible beside the body. SINGLE statue only, no sprite sheet, no alternative poses, no animation. Fit the COMPLETE object INCLUDING all fingers, tail and plinth within the CENTRAL 70 percent of the image: generously empty transparent margins on ALL four sides, at least 15 percent of canvas width/height. Genuinely alpha-transparent background and gaps; absolutely no colored glow, no haze, no background, no floor plane, no detached shadow, no labels or text. Image 3 loja.png provides project style consistency; prioritize its medium-detail crisp clustered pixel art over smooth rendering.


## Polimento da pista — 2026-11-03

- `plataforma-predio-v2.png`: nova fachada isolada baseada na fotografia fornecida da plataforma, usando `cenario/loja.png` como referência de linguagem pixel art. Prédio ocre baixo, platibanda azul, janelas escuras e chaminés; fundo transparente.
- `caranguejo-v1.png`: caranguejo laranja em três quartos, contornos escuros, sombras em blocos e transparência. Instâncias na praia se movem lateralmente; sem colisão com carros.
- As imagens originais geradas são preservadas. O carregador recorta margens e aplica alphaTest em memória.


## Palmeiras e travessias — 2026-11-03

Criados com imagegen integrado, usando `cenario/motoboy_lado.png` como referência de contornos, sombreado em blocos e perspectiva lateral. Todos com transparência.

- `palmeira-v1.png`: palmeira inteira, tronco curvo e copa verde, cenário costeiro brasileiro.
- `policial-cavalo-v1.png`: dois quadros lado a lado de patrulheiro de uniforme verde-oliva e capacete sobre cavalo castanho, andando para a direita; poses alternadas das pernas. O carregador divide as duas células e conserva uma base comum; o movimento inverso espelha o sprite.
- `camarao-animal-v1.png`: camarão pequeno de perfil, antenas longas, cauda e patas, sem acessórios nem pedestal. Distinto das estátuas existentes.
- Concha e estátuas preservam suas artes; tamanho, ângulo e posicionamento foram revistos para leitura na câmera de corrida.
