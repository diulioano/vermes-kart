# Vermes Kart

Jogo de corrida em Three.js, com Gravataí e o protótipo de Cidreira selecionáveis.

## Rodar localmente

Com Node.js instalado:

```sh
npm run dev
```

Abra `http://127.0.0.1:8765/`. Escolha a pista no seletor do menu. Cidreira também
pode ser aberta diretamente em `http://127.0.0.1:8765/?pista=cidreira`.
Se a porta estiver ocupada, use `npm run dev -- --port 8766`.
O servidor local oferece o fallback STUN; credenciais TURN de produção continuam
sob responsabilidade do `_worker.js` existente.

## O que funciona em Cidreira

- Circuito compactado em 26%, com voltas de aproximadamente 72–76 segundos nos testes com bots.
- Fachadas em diagonal, decoração reaproveitada de Gravataí e prédio próprio da plataforma.
- Praia com palmeiras, guarda-sóis, água em faixas de profundidade e espuma animada que marca a área que empurra e desacelera.
- Caranguejos e camarões cruzam a pista; duas patrulhas a cavalo atravessam trechos planos. Param nas laterais, alternam o sentido e causam um giro curto ao colidir, respeitando altura e intervalo entre impactos.
- Dezesseis power-ups distribuídos em oito pares, fora dos saltos e das travessias.
- Solo com oito participantes, usando os pilotos, carros, itens e drift existentes.
- Centro comercial, praça da concha, orla, plataforma, praia de aterrissagem,
  dunas dos Lençóis e retorno ao centro.
- Plataforma elevada com barreiras físicas, prédio amarelo e rampa lateral.
- Salto automático da plataforma com impulso mínimo, mesmo em baixa velocidade.
- Dunas com altura real, dois saltos principais e um atalho mais estreito.
- Corte pela areia fofa na orla; os dois caminhos voltam a se unir antes da
  plataforma, sem dispensar seus checkpoints.
- Recuperação após queda, com pausa de 0,65 s; sombra, câmera e itens acompanham
  a altura. Bots seguem o caminho principal.
- Fachadas e marcos gerados a partir das referências fornecidas.

Multiplayer em Cidreira fica para a próxima etapa.
O online permanece disponível em Gravataí. As voltas medidas com bots normais
ficaram aproximadamente entre 72 e 76 segundos; pilotagem humana, boosts e
dificuldade alteram esse tempo. A geometria é um protótipo para ajuste no jogo.

## Onde mexer

### Poder Bandeira do Brasil

Qualquer piloto, carro e posição tem **2% de chance por caixa** de receber a
Bandeira do Brasil. Ao usar, todos os outros corredores ainda na disputa
rodam, incluindo bots e jogadores distantes ou no ar; quem usou fica imune.
O giro usa a duração-base de 1,5 s, ajustada pelo peso como os demais impactos.
O ícone segue os itens desenhados em canvas, e bandeiras temporárias aparecem
sobre os atingidos. No online, o host aplica o efeito e sincroniza o novo item,
os giros, as bandeiras e o aviso. Os índices dos quatro itens anteriores foram
preservados. `assets/bandeira.js` contém a regra e a arte do ícone.

`npm run test:bandeira` verifica raridade por posição, HUD, uso por humanos e
bots, imunidade, serialização e limpeza nas duas pistas.
`npm run test:bandeira:online` abre duas sessões com conexão real e testa o uso
por um cliente via teclado. `TEST_BASE_URL` permite executar esse teste no site
publicado. Esse teste cria uma sala temporária e encerra as sessões ao terminar.

### Convites para sala online

Na sala, **COMPARTILHAR SALA** abre o compartilhamento do aparelho com código,
pista e link. Sem suporte, copia o convite completo; se o navegador bloquear a
cópia, mostra o texto selecionado para copiar manualmente. **COPIAR** continua
copiando apenas o código. O link `?sala=ABCDE` (com `pista=cidreira` quando
necessário) procura a sala e abre a escolha de piloto e carro. A entrada só é
confirmada depois dessa escolha. A lógica está em `assets/convite.js` e pode
ser verificada com `npm run test:convite` (APIs nativas e conexão simuladas).

### Vectra Brasil nº 22

O Chevrolet Vectra Elegan. 2.0 MPFI 8V Flexpower MEC 2010 aparece como
**Vectra 2010** no seletor. A pintura usa verde, amarelo, azul e branco, com o
número 22. É liberado após três vitórias, junto do Dihl e do Golf, e pode ser
usado com qualquer piloto. Seu dono é o **Pai do Guz**, piloto criado a partir da
foto fornecida, também liberado após três vitórias. Atributos: velocidade 8,
aceleração 6, curva 6 e peso 8.

Os cinco ângulos estão em `sprites/carros/vectra_*.png`, nos três quadros
esperados pelo carregador. A folha original e o prompt de geração estão em
`arte/conceitos/vectra-brasil-22-*`. O teste `npm run test:vectra` verifica
bloqueio com zero e duas vitórias, liberação pela terceira vitória real,
carregamento dos sprites e aceleração nas duas pistas.

A vista traseira do Vectra foi compactada de 107 para 89 px de altura, mantendo
128 px de largura e os três quadros do carregador.

### Cercas de Gravataí

As cercas de madeira e arame de Morungava possuem colisão nos segmentos
efetivamente desenhados. `assets/cercas.js` usa a posição, orientação e largura
de cada plano do cenário. A varredura do raio do carro impede atravessamentos
com turbo, permite deslizar nas laterais e preserva as aberturas. Saltos acima
da altura da cerca continuam possíveis. `npm run test:cercas` cobre os extremos,
deslizamento, altas velocidades e colisões reais nas duas faces de cada tipo.

Para preparar a publicação no projeto Pages existente, execute
`node tools/build-publicacao.mjs`. A pasta gerada contém apenas arquivos usados
pelo jogo; sprites, módulos de Cidreira e bundle recebem nomes com hash para
renovar o cache. O manifesto fica em `.codex/verification/publicacao.json`.
Publique a pasta indicada com `npx wrangler@4 pages deploy <pasta> --project-name
vermes-kart --branch main --commit-dirty=true`.

| Arquivo | Responsabilidade |
| --- | --- |
| `assets/cidreira/track.js` | Pontos de controle, setores, largura, alturas, atalhos e checkpoints |
| `assets/cidreira/physics.js` | Eixo vertical, rampas, aterrissagem, recuperação e direção dos bots |
| `assets/cidreira/scene.js` | Terreno, mar, pista, plataforma, barreiras e posição das artes |
| `assets/cidreira/traffic.js` | Movimento, pausas e colisão das travessias |
| `assets/cidreira/sprites.js` | Cache de imagens, recorte em memória e quadros de animação |
| `assets/cidreira/water.js` | Água, textura em movimento e faixas de espuma |
| `assets/cidreira/index.js` | Integração: seletor, câmera, itens, partículas e nome do setor |
| `assets/cidreira/picker.css` | Aparência do seletor e da identificação do setor |
| `cenario/cidreira/` | Sprites dos marcos; fachadas em `comercios/` |
| `arte/conceitos/` | Mapa aprovado, conceitos e referência de construção |
| `tools/serve.mjs` | Servidor de desenvolvimento local |
| `tools/smoke-cidreira.cjs` | Verificação no navegador com a física real do jogo |
| `tools/integrate-cidreira.py` | Registro das conexões pontuais feitas no bundle original |

Os pontos do traçado usam `[x, y, altura, setor]`. No renderizador, `x` e `y` do
traçado viram `x` e `z`; a altura vira o eixo vertical `y`. Os carros mantêm os
nomes de coordenadas do motor existente. O setor `voo` descreve a trajetória para
IA e checkpoints e **não cria uma superfície dirigível** sobre o mar.

Ao ajustar o circuito, mantenha as entradas e saídas dos atalhos entre checkpoints
compartilhados. O checkpoint no final da plataforma e o da aterrissagem são
obrigatórios. A detecção do piso e a construção do terreno compartilham os mesmos
dados de altura.

### Limite da refatoração

Só existe o jogo compilado: `assets/jogo.js` contém o motor, bibliotecas e lógica
anterior empacotados. Preservamos essas bibliotecas e a pista de Gravataí. O novo
código foi separado em módulos ES, que recebem os construtores de Three.js já
presentes no bundle; não há outra cópia do motor nem dependência de produção nova.

`tools/integrate-cidreira.py` serve para auditar/reaplicar a integração sobre uma
cópia **original** do jogo. Não execute novamente sobre o bundle já adaptado: os
marcadores são verificados e a reaplicação é recusada. Para mudanças normais em
Cidreira, edite diretamente os módulos acima. O backup anterior à implementação
fica em `.codex/backups/antes-cidreira-20261103-163010/`.

## Verificação

```sh
npm install
npx playwright install chromium
npm run check
npm test
```

O teste abre seu próprio servidor temporário e Chromium headless. Verifica:

- travessias nas duas direções, pausas, colisões, intervalo entre impactos e passagem aérea;
- distribuição das caixas em áreas dirigíveis, afastadas de saltos e travessias;
- carregamento das artes e execução sem erros no navegador;
- oito carros completando os checkpoints e os três saltos do caminho principal;
- duração da volta com bots normais e tela de resultado real;
- salto da plataforma partindo em baixa velocidade;
- corte de chegada sem ganho de volta e recuperação na praia após queda;
- os dois atalhos retornando legalmente ao trajeto, sem recuperação forçada;
- conclusão com passos de física de 50 ms;
- regressão de Gravataí, troca de pista, menu com 390 px e aceleração real pelo teclado.

As capturas ficam em `.codex/verification/`. O modo `?debug` expõe `window.vermes`
para inspeção; `?auto` também faz o carro humano seguir a IA. Esses recursos não
aparecem no menu normal. Multiplayer entre máquinas e direção manual prolongada
não são cobertos por esses testes automatizados.
