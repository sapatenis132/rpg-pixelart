# Pixel art v7 — arco e revisão integral

Esta revisão parte da identidade racial v6 publicada na PR #39. O pedido
inclui agora todos os recursos existentes, inclusive inimigos e Sentinela.

## Cobertura

Todos os **50 PNGs** receberam alterações de pixels, mantendo as dimensões
e a organização dos atlas. São 6.543 células de arte, incluindo camadas
de anatomia/roupa e alternativas de carregamento.

- Cinco raças e cinco classes: olhos legíveis, planos de rosto e mãos,
  mechas de cabelo, barba segmentada, presas, dobras, rebites e costuras.
  As silhuetas raciais e as 25 combinações permanecem.
- Cinco inimigos, incluindo a Sentinela: novos trajes, armaduras e rostos,
  silhuetas e poses próprias. O jogo passa a usar os mesmos atlas de sete
  estados vistos na galeria, com armas separadas do corpo.
- Nove equipamentos: lâminas chanfradas, punhos, escudo, cristal do cajado,
  machado e arco redesenhados em resolução nativa.
- Oito efeitos: flechas, orbes e impactos com contorno, núcleo e pixels
  de dissipação. Trilhas de corte afuniladas; mira e avisos rasterizados.
- Ambiente: seis árvores, 17 famílias de piso com quatro variantes,
  16 props, quatro pisos antigos e desenhos de fallback. Folhagem em
  massas, casca, pedras, água, tábuas, tufos e flores com luz coerente.
- Marcos e pequenos objetos: arco arruinado, tronco colossal, raízes,
  pilares, decorações dos biomas, NPC/baú de teste e os 33 ícones do editor.

## Correção do arco

O eixo local +X coincide com a projeção do disparo. Os braços do arco
ficam à frente da corda. Os dois extremos da corda permanecem presos às
pontas; o ponto central recua em V para o atirador durante a preparação.
A cauda da flecha acompanha esse ponto e sua ponta aponta para +X.
Após a soltura a flecha deixa de aparecer encaixada. O renderizador e a
galeria usam a mesma folha de equipamentos, com corda como camada separada.

## Contratos e reprodução

Não foram alterados dano, mana, atributos raciais, velocidade física,
hitboxes, janelas de defesa, combos, IA, colisões ou geração por seed.
O apoio dos pés dos novos inimigos segue o pivô 44 de seus atlas.

Fontes de arte em `scripts/art/`: `equipment.mjs`, `refine-enemies.mjs`,
`refine-world.mjs` e `refine-playable.mjs`. O último refina uma fonte v6
e usa um marcador PNG para impedir aplicar a revisão duas vezes; para
reproduzir do zero, restaurar os PNGs da PR #39 antes de executá-lo.
Os outros geradores são determinísticos. Após gerar, executar
`python scripts/optimize_sprite_pngs.py` para compressão sem perda.

## Verificação

`tests/art-polish.mjs` confere dimensões e pixels de todos os PNGs,
células visíveis e regressões da corda/flecha nas oito direções e em
32 casos de disparo, além de 1.184 renderizações de inimigos no jogo. `tests/racial-integration.mjs` confere 5.600
composições, anatomia sobre a roupa, silhuetas, atributos e 24 seeds.
As antigas assinaturas de pixels dos inimigos deixam de ser um requisito
porque a revisão da arte deles é intencional; sua configuração de
combate continua comparada à mesma referência publicada.

O workflow também executa testes de combate e testes reais no Chromium
em cinco telas horizontais, além de capturar jogo, galeria e editor.
As verificações técnicas não medem preferência estética nem substituem
a avaliação de fluidez e legibilidade em um aparelho Android físico.
