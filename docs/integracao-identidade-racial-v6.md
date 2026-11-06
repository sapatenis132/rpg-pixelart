# Integração da identidade racial v6

O criador forneceu a atualização racial como base para a continuação do
polimento. A origem é a PR #37, commit
61e7daa9ab9fd92c07c1c31f4b05547d77966149. A integração parte da versão
publicada na PR #38, commit feb6b56f4ab2299a2922ce50b7f7082835645324.

## Arte reaproveitada

Foram incorporados os sprites, a galeria, a documentação e o acabamento
ambiental já produzidos na PR #37. A arte principal dos heróis agora usa
os cinco atlas raciais de 128×2688 pixels: sete estados, oito direções e
quatro quadros, totalizando 224 quadros por raça.

A composição usada no render é corpo racial → traje do arquétipo →
traços anatômicos. As 25 combinações preservam orelhas, cabelo, barba,
presas e proporções. A mesma composição é usada nos rastros de esquiva.
O gerador menor da primeira rodada continua disponível como fallback.

A galeria em art-preview/index.html conserva a comparação de raça,
classe, animação e direção, incluindo o modo Só silhueta.
Os recursos históricos de inimigos continuam disponíveis no catálogo;
o jogo preserva o render anterior dos inimigos e da Sentinela.

## Compatibilidade com o polimento publicado

A fila de um comando, a tolerância dos toques, a recuperação e os
ajustes de feedback da PR #38 foram preservados. O arco mantém o
balanceamento já publicado, e o cajado continua sem consumo de mana.
Nenhum atributo racial, dano, postura, cooldown, alcance ou hitbox foi
rebalanceado nesta integração.

Foi corrigida uma prioridade exclusivamente visual: um ataque aceito
continua mostrando ataque/finalização enquanto a proteção passiva ou
uma reação visual anterior ainda está ativa. Esses timers não são
consumidos nem alterados pela seleção da pose.

O alinhamento dos pés e as raízes pixel art da rodada anterior foram
preservados. A geração procedural, as entradas, os caminhos e os saves
continuam com a mesma lógica.

## Entrega dos PNGs

Os 50 PNGs foram recomprimidos sem perda: de 9.884.070 para 392.065
bytes, cerca de 96% a menos. O procedimento preserva dimensões, paleta,
transparência e todos os scanlines descomprimidos. O script reproduzível
fica em scripts/optimize_sprite_pngs.py.

## Verificação

- tests/combat-polish.mjs mantém os testes de filas, combos, projéteis,
  mana e balanceamento da primeira rodada.
- tests/racial-integration.mjs verifica as 5.600 composições e todos
  os pixels opacos da camada anatômica. Compara cinco silhuetas em
  frente, perfil e costas usando a mesma classe.
- O teste confirma que o render principal usa corpo, traje e anatomia
  v6 em todas as 25 combinações.
- O contrato before-racial-v6.json registra a configuração aprovada,
  os atributos das 25 combinações, os pixels dos inimigos e os
  resultados de 24 seeds antes da integração. Futuras mudanças de
  balanceamento devem atualizar esse contrato de forma intencional.
- tests/ui-smoke.mjs reúne a bateria da PR #37 e as regressões da PR #38:
  assets, animações, galeria, mapa, silhuetas e cinco telas mobile.

Os testes mobile são automatizados no Chromium. Não foi feita
verificação em um aparelho Android físico neste ambiente.
