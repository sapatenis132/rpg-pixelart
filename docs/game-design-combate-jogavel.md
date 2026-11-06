# Game design — personagens jogáveis e leitura dos golpes

**Escopo:** cinco arquétipos jogáveis. **Fora do escopo:** IA, chefes, Sentinela do Eclipse, alteração de dano, hitbox, stagger/postura, recargas, extensão de combo ou dificuldade.

## Princípios pesquisados e adotados

1. **Controle previsível e feedback consistente.** A ação deve responder visualmente ao toque sem introduzir atraso fictício; preparar o ataque não deve modificar a lógica de acerto. [Principles of Virtual Sensation — Game Developer](https://www.gamedeveloper.com/design/principles-of-virtual-sensation).
2. **Antecipação, execução e recuperação.** Ler a pose do jogador é essencial para entender o risco/comprometimento de cada ação; a pose de impacto deve obedecer à janela mecânica. [12 principles for game animation — Game Developer](https://www.gamedeveloper.com/game-platforms/12-principles-for-game-animation); [Anticipation, Action, Recovery — Rivals Workshop Community Library](https://www.rivalslib.com/workshop_guide/art/anticipation_action_recovery.html).
3. **Animação em serviço da resposta.** Preparação longa em personagens do jogador pode parecer input lag. Follow-through não deve bloquear artificialmente o controle; movimentos fortes podem usar duração real para transmitir custo/benefício. [The 12 principles of animation in video games — Game Developer](https://www.gamedeveloper.com/production/the-12-principles-of-animation-in-video-games).
4. **Legibilidade no Android horizontal.** Contraste de silhueta, composição limpa e controles acessíveis, sem um mar de partículas e brilhos que esconda decisões. [Google Playables design best practices](https://developers.google.com/youtube/gaming/playables/certification/best_practices_design); [Apple — Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games).
5. **Game feel combina física, amplificação e suporte ao controle.** Só aumentar efeitos não melhora automaticamente a ação. [Designing Game Feel: A Survey — IEEE](https://doi.org/10.1109/TG.2021.3072241).

## Proposta aplicada — cinco identidades

| Arquétipo | Silhueta, vestido/gear raster | Intenção transmitida pela arma | Sinal do ataque |
| --- | --- | --- | --- |
| Guerreiro | Ombreiras metálicas, tabardo vermelho, cinto | Cortes amplos e controlados; estocadas são axiais | Antecipação → aço → recuperação sem forçar a hitbox |
| Guardião | Peitoral, pauldrons maciços, escudo | Peso, proteção frontal e pancada de escudo | O escudo possui pose própria de defesa / bash |
| Rebelde | Couro escuro, tecido assimétrico e faixa | Adaga curta com estocada, corte cruzado e corrida distintos | Pequenos quadros e rastros finos, sem virar espada |
| Arcanista | Manto azul-violeta, marcas arcanas | Cajado canaliza magia; tiros não viram cortes físicos | Orbe de carregamento no cajado antes de disparar |
| Caçador | Traje de caça, faixas, aljava | Arco perpendicular à mira, corda recuada e flecha preparada | Preparação da flecha, disparo e recuo diferenciados |

Todos os trajes são **PNG raster reais** de 128×2688 pixels (8 direções × 7 estados × 4 quadros por estado), sobrepostos às cinco raças. O formato de combinação evita copiar 25 atlas completos; mantém traços raciais reconhecíveis.

## Contrato de sincronia

- `playableAttackTiming(move,progress)` acompanha `move.impact` e retorna **resposta**, **preparação**, **contato** e **recuperação**. O código de dano e hitbox continua em `activeInterval(move)` / `meleeHitSegments` / `fireRangedMove`.
- **Jamais** usar uma animação para confirmar um golpe se ele não acertou. Efeitos de colisão continuam disparados pela lógica de impacto real.
- A roupa usa a **mesma direção, estado e quadro** do corpo. Quedas e esquivas mantêm traje sem uma sprite imóvel por cima.
- Arco/cajado usam arte de preparação no personagem apenas enquanto o projétil ainda não saiu; a flecha real é emitida pela simulação.
- Reutilizar as janelas mecânicas já aprovadas: parry, esquiva, buffer, combos e punições por spam não são alterados nesta etapa.
- Sem alterações à Sentinela ou inimigos. Toda integração permanece na PR artística experimental.

## Critérios de aceite / playtest

- Identificar em poucos pixels as cinco classes usando a **mesma raça**, lado e animação.
- Diferenciar **golpe leve × pesado**, **adaga estocada × corte**, **arco tiro único × rajada**, **cajado faísca × orbe**, **escudo bloqueio × pancada** com visual e sensação coerentes.
- Quadros não podem ficar vazios ou trocar de classe; nenhuma classe deve alterar a raça escolhida.
- Um ataque deve responder no primeiro quadro visual de entrada, sem aumentar a latência mecânica.
- Efeitos de vento ou disparo nunca devem sugerir contato físico quando o golpe erra.
- Conferir arte no criador de personagem, no treinamento e na aventura; usar 568×320, 640×360, 740×360, 854×480, 915×412 no Playwright, além de teste visual/tátil em Android real.
- No teste de regressão, comparar dano, forma de hitbox, janela de parry, esquiva, 3ª/4ª extensões de combo e frame rate com a branch principal.

## Próximas tarefas artísticas (sem inimigos)

Refinar manualmente quadros de braço/mãos e todas as poses de arma no pixel original, criar animações adicionais de respiração e transição de corrida, completar sinais de disparos múltiplos e rever contraste/cor conforme ambientes e luminosidade — **sem adicionar brilho indiscriminado**.

Esta etapa é um avanço de produção visual, não a finalização de todas as animações. Não fazer merge antes da inspeção no celular.
