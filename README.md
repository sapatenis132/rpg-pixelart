# VideoJogo — RPG Pixel Art

RPG de ação e exploração com cinco raças, cinco arquétipos e mapas procedurais.

Para jogar uma cópia baixada, extraia o ZIP e abra o arquivo
**index.html** no navegador. O jogo não exige instalação nem compilação.
O laboratório de mapas fica em **map-lab/index.html**.

Teclado: WASD/setas para mover, J para ataque leve, K para pesado,
L para parry, espaço para esquiva, T para o laboratório e ? para os combos.
Os controles de toque incluem tamanho ajustável e opção canhoto.

As decisões e os ajustes desta etapa estão em
[Polimento de arte e combate](docs/polimento-arte-combate.md).
O catálogo de mapas está em [Travessias florestais](docs/travessias-florestais.md).

Para executar os testes com Node.js 22 ou superior:

    npm install --no-save playwright@1.56.1 @napi-rs/canvas@0.1.100
    node tests/combat-polish.mjs --render
    npx playwright install --with-deps chromium
    node tests/ui-smoke.mjs

O primeiro teste executa a simulação e os canvases sem navegador.
O segundo verifica o jogo em cinco tamanhos de tela mobile no Chromium.
As imagens de revisão são gravadas em **screenshots/**.
