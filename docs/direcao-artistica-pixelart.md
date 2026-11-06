# Direção artística 2D pixel art — contrato v1

## Objetivo
Transformar **todo** o RPG isométrico em pixel art autêntica, usando
imagens raster e animações por quadros, com leitura em celulares horizontais.
A câmera continua isométrica **2D**, não precisa simular modelagem ou iluminação
3D. Não alterar dano, postura, janela de parry, combos, hitboxes, movimento,
transições entre salas, seeds ou estados de campanha sem testes específicos.

## Implementado nesta ramificação
- `assets/sprites/actors/{human,elf,orc,dwarf,halfling}.png`: spritesheets
  PNG indexados, **128×768**, fundos transparentes, pixels definidos.
- Célula de ator **32×48**. Direções (linhas 0 a 7): diagonal frente
  direita, frente, diagonal frente esquerda, perfil esquerdo, diagonal
  costas esquerda, costas, diagonal costas direita e perfil direito.
- Cada linha tem **4 quadros** horizontais. Linhas 0–7: locomoção; linhas
  8–15: ação/ataque visual independente. A seleção do quadro de ataque
  acompanha o progresso da animação de combate *sem* afetar a hitbox real.
- O pivô da personagem é o apoio dos pés no terreno e não o centro da cabeça.
- `assets/sprites/legacy/`: 6 atlases existentes de personagens/inimigos e
  4 tiles de terreno extraídos do JavaScript embutido.
- Carregamento de imagens externo, com sprites antigos como fallback para raças.
- Caminhos da floresta: pequenos tiles rasterizados 64×32 reutilizados
  por cache; seeds continuam controlando as variações.
- Marcadores de saída com símbolos pixelados, sem esfera verde 3D.
- Interface principal e laboratório: contornos e superfícies mais retangulares.
- Teste de carregamento dos cinco PNG nas cinco resoluções horizontais.

## Regras definitivas de arte
1. **Sprites são arquivos**. Personagens, criaturas, armas, props, tiles e
   efeitos permanentes devem usar PNG indexado ou RGBA; nunca depender
   apenas de `fillRect` em tempo real para formar o personagem.
2. **Sem suavização.** `imageSmoothingEnabled = false`, `image-rendering:
   pixelated`, movimento visual arredondado a pixels quando apropriado.
3. **Escala global coerente.** Personagens menores que copas e estruturas
   altas; presença visual independente da colisão de troncos/chão.
4. **Silhuetas distintas.** Raça, profissão e inimigo identificáveis em
   miniaturas e durante o combate. Mostrar equipamento de forma legível.
5. **Paletas limitadas**, contorno e sombras desenhados em pixels;
   evitar blur, gradientes volumétricos, esferas, polígonos lisos e
   sombras gaussianas na camada do mundo.
6. **Profundidade 2D por Y-sorting** e suporte a oclusão por copas,
   arcos, rochas e raízes; não mover o sprite para cima da vegetação
   independentemente da posição.
7. **Animações autorais por função**: idle, caminhada, corrida,
   ataques leves/pesados, transições e finalizadores únicos por
   arma, defesa, parry, esquiva, dano, morte e interações.
8. **Cenário por família**: terreno, água, trilha, raízes, ruínas,
   vegetação de passagem, flores protegidas e estruturas de spawn.
9. **Performance Android**: carregamento uma vez, cache de tiles,
   atlas compartilhado e renderização de quadros sem criar objetos
   gráficos por frame.
10. **Sem retrabalho de gameplay**: área visível de corte, tiro e
    partículas deve corresponder ao movimento/hitbox existente.

## Próximos lotes artísticos
**Lote 2 — combate visual:** criar sheets externas para inimigos, Sentinela,
armas por arquétipo e 6+ estados de animação. Trocar linhas, círculos e
curvas desenhados por armas e FX pixelados. Não mexer na física de impacto.

**Lote 3 — mundo:** atlas de tiles de chão por bioma, árvores e flora com
mais detalhes, rochas, água, pontes, raízes e estruturas. Usar as 15+
travessias planejadas para testar variação e densidade. Corrigir spawn
obstruído e pontos de saída mantendo o Y-sort.

**Lote 4 — interface e polimento:** painéis, inventário, mapa, fontes,
ícones, indicadores e controles com unidade gráfica; testes reais de
legibilidade e FPS no celular.

## Verificação
Rode `node tests/ui-smoke.mjs` após instalar Playwright e Chromium.
O teste não substitui inspeção visual em celular e aprovação artística.
Este documento é diretriz de produção: não significa que todos os lotes
já foram concluídos.
