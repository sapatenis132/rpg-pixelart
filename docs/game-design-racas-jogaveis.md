# Game design — Identidade e leitura das cinco raças jogáveis

**Escopo da etapa:** humanos, elfos, orcs, anões e pequeninos, com
compatibilidade para todos os cinco arquétipos e todas as animações.
**Não inclui:** inimigos, Sentinela do Eclipse, IA, novas habilidades,
novos bônus raciais, alteração de colisão ou do balanceamento.

## Princípios da pesquisa

A teoria de animação para jogos destaca **leitura, fluidez, sensação,
contexto e elegância**: o personagem precisa permanecer legível
pela câmera real e as animações devem se subordinar ao controle do
jogador, não apenas à beleza do movimento. Fonte: [The Five Fundamentals
of Game Animation — GDC/Routledge, capítulo 4](https://www.routledge.com/rsc/downloads/GDC_2020_FreeBook.pdf).

Em jogos com sprites pequenos, uma silhueta bem resolvida deve comunicar
a identidade do personagem mesmo se toda sua arte for substituída
por preto. Proporções, gestos e volumes devem ser legíveis em diferentes
ângulos, e animações não podem mudar o colisor ou prejudicar resposta
aos comandos. Fonte: [12 Principles for Game Animation —
Game Developer](https://www.gamedeveloper.com/game-platforms/12-principles-for-game-animation)
e [The 12 Principles of Animation in Video Games —
Game Developer](https://www.gamedeveloper.com/production/the-12-principles-of-animation-in-video-games).

A identidade racial não deve limitar a escolha de profissão: **cada
uma das cinco raças pode usar qualquer uma das cinco classes**.
Silhueta da espécie, equipamento da profissão e características
individuais são camadas distintas de autoria de arte.

## Direção de arte por raça

| Raça | Forma reconhecível sem cor | Caminhada (visual) | Postura de ataque (visual) |
| --- | --- | --- | --- |
| Humano | Estatura intermediária, cabelo e orelhas assimétricos, corpo equilibrado | Referência neutra | Avanço equilibrado |
| Elfo | Corpo alto e estreito, orelhas longas em triângulo, cabelo que acompanha o contorno | Passos suaves, pouca oscilação | Avanço de torso discreto, preservando precisão |
| Orc | Linha dos ombros larga, maxilar largo e presas, antebraços fortes | Cadência pesada, contato marcado | Projeção corporal mais acentuada, sem alcance adicional |
| Anão | Pescoço/torso robustos, barba ampla com tranças, botas largas, pernas curtas | Centro de massa baixo e passos firmes | Base plantada, menor deslocamento visual |
| Pequenino | Corpo curto, cabeça relativamente maior, pés largos e cabelo levantado | Cadência rápida, menor alcance visual | Movimento ágil e vivo, sem vantagem mecânica adicional |

**Nota:** esses são arquétipos de *silhueta visual* e não regras de
personalidade: qualquer raça pode escolher qualquer classe, objetivo
e comportamento. Não pressupor que um Orc é agressivo ou que todo Elfo
precisa ser mago.

## Recursos raster criados

- `assets/sprites/playable/races/{human,elf,orc,dwarf,halfling}.png`
  — cinco spritesheets de **128 × 2688**, cada um com 8 direções,
  7 estados e 4 quadros por direção/estado (**224 quadros por raça**).
  Mantêm as bases anteriores e refinam o contorno, cabeça, barba,
  presas, orelhas, ombros, pernas e pés.
- `assets/sprites/playable/race-traits/{race}.png` — cinco folhas
  adicionais com traços anatômicos em pixels, sincronizadas à folha
  do corpo, para que detalhes distintivos continuem aparecendo
  **sobre roupas e armaduras**.
- A classe é renderizada no meio: **corpo racial → traje da classe →
  detalhe racial**. Assim, Elfos não perdem as orelhas e Anões não
  perdem a barba ao escolher Guardião, Rebelde ou Arcanista.
- O criador de personagem mostra a aparência e resume a silhueta
  ao lado dos bônus já existentes. A galeria permite testar
  **5 raças × 5 classes × 7 estados × 8 direções**.
- Modo interativo **“Só silhueta”** na galeria para avaliar o
  contorno sem cores; as artes compartilham a técnica de pixels
  nítidos sem filtragem.

## Física e game feel

Os valores originais de raça, dano físico/mágico, PV, mana, experiência,
sorte, esquiva e velocidade foram preservados. As novas configurações
`RACE_VISUAL_LANGUAGE` controlam **apenas** cadência visual de
caminhada, oscilação e deslocamento expressivo da pose de ataque.
Esses valores não entram no cálculo de movimento real, alcance,
hitbox, recargas, invulnerabilidade, dano ou postura.

A arte do ataque usa a mesma função `characterMotion` já vinculada
às janelas mecânicas. O jogador recebe resposta imediatamente, sem
quadros extras artificiais de preparação. A nova anatomia não aumenta
o colisor, o alcance nem o tamanho físico do personagem.

Durante falha de carregamento dos PNGs refinados, o renderizador
volta ao atlas racial anterior. Imagens são compartilhadas e carregadas
uma vez, adequadas à execução no navegador Android.

## Critérios de aceite

1. As **cinco silhuetas** devem ser distintas em frente, perfil e
   costas quando convertidas a uma cor só.
2. Todos os estados de movimento, guarda, esquiva, dano, queda e
   finalização devem conter sprites visíveis nos oito ângulos.
3. Traços principais devem se manter na composição de todas as
   25 combinações de raça e arquétipo; o equipamento não pode apagar
   a anatomia principal do personagem.
4. O criador de personagem deve mostrar os sprites reais e os
   efeitos raciais já aprovados, sem estatísticas inventadas.
5. A câmera e os coliso﻿res permanecem iguais; testar contornos
   de troncos, posição dos pés no piso isométrico e oclusão por árvores.
6. Testar as cinco resoluções horizontais do projeto e inspecionar
   legibilidade e FPS em Android físico antes de integrar.

## Trabalho artístico futuro

Refinar manualmente dedos/mãos, gestos culturais opcionais que não
estereotipem espécies, cabelo e barba em mais quadros, opções
cosméticas independentes de atributos e variações de armadura que
respeitem anatomias pequenas ou robustas. A diferença de raça
deve ser reconhecível mesmo quando o equipamento é idêntico.

**Nesta etapa não modificar nem a Sentinela nem os demais inimigos.**
