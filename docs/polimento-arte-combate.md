# Polimento de arte e combate — 6 de novembro de 2026

Esta etapa melhora a leitura dos personagens e a resposta dos controles,
com um ajuste inicial de risco/recompensa do arco. A base é o commit
d0080798aae887ac19fa75676c72a3185a48d42c de sapatenis132/rpg-pixelart.

## Direção de arte

- Os cinco arquétipos agora têm figurinos próprios, aplicados às cinco raças:
  ombreiras e correia do Guerreiro, armadura e tabardo do Guardião, lenço e
  bolsas do Rebelde, túnica longa do Arcanista e aljava do Caçador.
- Pele, orelhas, cabelo, barba e proporções continuam definidos pela raça.
- Cada combinação possui um atlas de caminhada e outro de ataque: oito
  direções, quatro quadros, células de 32×48 pixels. Há 800 poses de ataque
  nas 25 combinações de raça e arquétipo.
- Preparação, impacto, continuação e recuperação escolhem quadros distintos
  de acordo com o instante de impacto da arma.
- As armas, a corda do arco e o escudo são rasterizados antes da ampliação,
  usando a mesma grade visual do personagem. A mira continua livre.
- Os pés do herói ficam alinhados à sombra e ao chão, em vez de deslocados
  para baixo na arena.
- A Árvore Colossal mantém sua composição e suas posições. Suas raízes
  visuais agora têm curvas afiladas, casca, musgo e sombra pixel art,
  com cache limitado. Nenhum colisor ou caminho foi acrescentado.

## Controles e ritmo

Antes, toques adicionais podiam apagar um ataque que já estava na fila.
Agora o primeiro comando aceito é preservado. A fila continua limitada a
um ataque e as durações dos golpes continuam iguais.

Há tolerância de 40 ms antes da abertura da janela e uma fila nos últimos
120 ms da recuperação. O comando aguarda a recuperação terminar; isso
não cancela a animação nem aumenta a velocidade de ataque.

A barra de compasso mostra a evolução da animação e sinaliza o comando
agendado. O aviso de extensão usa o nome do golpe da arma atual.
Extensões corpo a corpo continuam exigindo um finalizador que acertou.

## Balanceamento inicial do arco

O arco recompensa abrir espaço. O multiplicador de dano é:

| Distância do disparo ao alvo, em unidades de mundo | Dano |
| --- | --- |
| Até 1,2 | 80% |
| 2,2 | 95% |
| A partir de 3,2 | 110% |

A progressão entre 1,2 e 3,2 é linear. A distância usa a origem da flecha;
andar para trás depois de disparar não aumenta o dano.
Dispersão e perfuração continuam relevantes: nem toda flecha de um leque
atinge o mesmo alvo, especialmente à distância.

Exemplos para um Humano sem talentos:

- Flecha Veloz: 9 pontos junto ao alvo ou 12 com espaço.
- Tiro Triplo: 24 pontos perto, caso as três flechas atinjam.
- Faísca do cajado: os mesmos 10 pontos, sem custo de mana.

O dano à postura continua distribuído pelos projéteis da salva.
Esta é uma base para testes de sensação e dificuldade; não significa
que todas as combinações de raça, arma e talentos tenham balanceamento final.

## Feedback

Cada projétil continua causando dano, mas clarão, som forte e pausa de
impacto são aplicados uma vez por salva. O número de dano é somado por
alvo para reduzir a sobreposição. Os contatos seguintes têm um efeito menor.

## Regras preservadas

O spawn continua automático pela seed. As três salas especiais da Floresta
continuam distintas das 15 travessias. A Clareira Florida, a geometria dos
mapas, os saves, as hitboxes das armas e os controles mobile foram mantidos.
O comportamento e o conteúdo do Sentinela do Eclipse não foram reformulados.

## Verificação

O teste tests/combat-polish.mjs executa a simulação e os canvases reais com
um DOM mínimo. Verifica combos nas cinco armas, comandos duplicados,
recuperação, dano por distância, origem do disparo, rajadas, mana e todos
os quadros dos novos figurinos. Ele não verifica CSS ou layout mobile.

O teste tests/ui-smoke.mjs verifica o navegador real em cinco telas
horizontais e agora também cobre a fila e os novos atlas. O workflow do
GitHub executa ambos e guarda as capturas.

Também foi feita uma comparação com a base: os mundos e as geometrias
de nascimento de 24 seeds permaneceram idênticos.
