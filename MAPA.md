# Mapa e Eyefind do Garage V

Consulta em 7 de novembro de 2026: [GTA 5 Map / MapGenie](https://gta-5-map.com/).
O catálogo local possui 141 propriedades referenciadas, das quais 130 têm
armazenamento permanente. O mapa permite busca, filtro por tipo, zoom, arraste,
uso por teclado e filtro de garagens vinculadas à coleção. Não inclui lojas,
colecionáveis, eventos ou estacionamentos temporários.

Cada ponto conserva o link do marcador original. Propriedades móveis, como
Kosatka, não possuem marcador fixo. Propriedades novas que não constem na fonte
podem ser registradas por tipo no Eyefind, sem receber coordenadas inventadas.
Garagens antigas sem endereço vinculado continuam preservadas; o endereço pode
ser escolhido em **Editar garagem → Local no mapa**.

## Sites do Eyefind

- **Dynasty 8:** casas, apartamentos, garagens tradicionais e Eclipse Boulevard.
- **Dynasty 8 Executive:** escritórios e agências.
- **Maze Bank Foreclosures:** oficinas, fliperamas, boates, motoclubes, hangares,
  complexos, bunkers e desmanches.
- **Outros sites:** Warstock (Kosatka), Arena War, Diamond Casino, Clube Vinewood
  e depósito de veículos via SecuroServ. Não é utilizado um site fictício
  “The Iron Bank”, que não corresponde à aquisição dessas propriedades no GTA.

O Eyefind é uma interface local de seleção e cadastro. Não realiza compras
nem abre contas de jogo. Escolher um imóvel preenche o tipo, nome, localização
e capacidade do cadastro. A decoração continua personalizável depois.

Casas e garagens com tamanho confirmado têm a capacidade vinculada ao imóvel.
Escritórios, boates e Arena mostram a capacidade máxima, com as configurações
menores ainda disponíveis no formulário. Complexos têm sete vagas comuns;
Kosatka tem uma vaga para Toreador/Stromberg, sem incluir as vagas reservadas
do Sparrow e Avisa. Bunkers não recebem vagas comuns permanentes.

## Fontes e manutenção

- [Aquisição da Agência — GTA Base](https://www.gtabase.com/grand-theft-auto-v/guides/property-types/the-agency)
- [Oficinas de Tuning — GTA Base](https://www.gtabase.com/grand-theft-auto-v/guides/property-types/auto-shops)
- [Kosatka — GTA Wiki](https://gta.wiki/w/Kosatka)
- [Complexos e armazenamento — GTA Wiki](https://gta.wiki/w/Facilities)
- [Propriedades móveis — Rockstar](https://support.rockstargames.com/articles/40DXx9Wwayl0N9Hzk8x1hS/gtav-title-update-1-52-notes-ps4-xbox-one-pc)

`scripts/update-property-map.ps1` usa o cache em `.cache/mapgenie`; `-Refresh`
atualiza os dados públicos. A extração usa apenas nomes, categorias, capacidades
e coordenadas. A Arena, classificada genericamente como Auto Shop na fonte,
é separada; sua capacidade respeita as vagas comuns descritas em GARAGENS.md.
