# VideoJogo — RPG Pixel Art

RPG de ação e exploração com cinco raças, cinco arquétipos e mapas procedurais.

Para jogar uma cópia baixada, extraia o ZIP e abra o arquivo
**index.html** no navegador. O jogo não exige instalação nem compilação.
O laboratório de mapas fica em **map-lab/index.html**.
A [galeria racial e de classes](art-preview/index.html) permite comparar
as cinco raças, as cinco classes, sete estados e oito direções.
Ative **Só silhueta** para comparar o contorno sem depender das cores.
Mantenha a pasta **assets/** junto do jogo ao extrair ou copiar os arquivos.

Teclado: WASD/setas para mover, J para ataque leve, K para pesado,
L para parry, espaço para esquiva, T para o laboratório e ? para os combos.
Os controles de toque incluem tamanho ajustável e opção canhoto.

As decisões e os ajustes desta etapa estão em
[Polimento de arte e combate](docs/polimento-arte-combate.md).
O catálogo de mapas está em [Travessias florestais](docs/travessias-florestais.md).

Para executar os testes com Node.js 22 ou superior:

    npm install --no-save playwright@1.56.1 @napi-rs/canvas@0.1.100
    node tests/combat-polish.mjs --render
    node tests/racial-integration.mjs --render
    npx playwright install --with-deps chromium
    node tests/ui-smoke.mjs

O primeiro teste executa a simulação e os canvases sem navegador.
O teste de interface verifica cinco tamanhos de tela mobile no Chromium.
O teste racial verifica 5.600 composições e compara atributos, combate,
mapas e arte dos inimigos com a versão anterior à integração.
O contexto desta integração está em
[Integração da identidade racial v6](docs/integracao-identidade-racial-v6.md).
As imagens de revisão são gravadas em **screenshots/**.
