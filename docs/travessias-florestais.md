# Travessias procedurais da Floresta — catálogo de 15 salas-base

As salas de passagem são **diferentes** dos três spawns especiais (Clareira Florida, Portão Arruinado e Árvore Colossal). Cada campanha nasce em apenas um dos três spawns, escolhido pela seed. As salas florestais comuns recebem uma das quinze identidades abaixo, também conforme a seed.

| ID | Sala de passagem | Marca registrada |
| --- | --- | --- |
| `winding` | Trilha Sinuosa | Caminho com desvios e ramificações |
| `grove` | Passagem entre Árvores | Bosque mais denso com espaço aberto central |
| `fork` | Bifurcação da Mata | Ramificações e entroncamento de trilhas |
| `stream` | Travessia do Riacho | Água com travessias protegidas |
| `moss` | Trilha de Musgo | Tapetes de musgo e cogumelos |
| `fallen` | Tronco Caído | Tronco longo como obstáculo físico |
| `stones` | Passagem Pedregosa | Rochas e depósitos de pedra |
| `ferns` | Vale das Samambaias | Samambaias ladeando o caminho |
| `ring` | Círculo de Árvores | Clareira circundada por troncos com aberturas |
| `roots` | Raízes Expostas | Raízes no chão e trechos elevados |
| `marsh` | Brejo Raso | Solo encharcado, água e juncos |
| `mist` | Bosque Nebuloso | Trechos de piso enevoado |
| `fireflies` | Clareira dos Vagalumes | Clareira pontilhada por pontos de luz |
| `ridge` | Encosta de Pedra | Faixas de pedra e afloramentos |
| `hollow` | Mata Fechada | Bordas com copas densas e trilhas livres |

## Regras e garantias

- A **mesma seed** produz o mesmo conjunto de salas, vegetação, trilhas, obstáculos e saídas.
- Os obstáculos ocupam a célula de **tronco, rocha ou raiz**, não toda a copa ou desenho.
- O caminho real entre o centro e todas as saídas é protegido antes de espalhar árvores e pedras.
- A geometria verifica conectividade e abre passagens quando necessário; não gera bolsas inacessíveis.
- O centro da **Clareira Florida** e seus canteiros especiais não recebem a flora dos mapas de travessia.
- A quantidade de salas visitadas em uma partida depende da rede procedural: **não é preciso mostrar os 15 tipos em toda seed**. O catálogo amplia a diversidade entre campanhas.

## Validação

O teste `tests/ui-smoke.mjs` procura os quinze tipos ao longo de centenas de seeds, verifica conectividade e determinismo, e comprova a presença de características exclusivas nos onze tipos novos. Mapas especiais de nascimento não contam como travessias.
