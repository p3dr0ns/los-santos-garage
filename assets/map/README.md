# Mapa de Los Santos e Blaine County

121 blocos de 256 × 256 pixels, camada Atlas, nível 5, da configuração pública
do [GTA 5 Map / MapGenie](https://gta-5-map.com/), consultada em 07/11/2026.
Arte do mapa: GTA V / Rockstar Games; camada e georreferenciamento: MapGenie.

Padrão de origem: `https://tiles.mapgenie.io/games/gta5/los-santos/atlas/5/{x}/{y}.png`.
Os arquivos são mantidos locais para que o mapa funcione offline.

As posições de `../property-locations.js` vêm do endpoint público de dados do
mapa (`/api/v1/maps/27/data`). Coordenadas virtuais da projeção da fonte são
convertidas para a grade de pixels original, sem estimar posições por bairro.
Não são coordenadas geográficas reais.

A aplicação desenha apenas seus próprios marcadores filtrados de propriedades
com armazenamento permanente. Lojas, eventos e colecionáveis não são incluídos.
Imóveis sem vagas comuns podem aparecer no catálogo Eyefind, mas não no mapa.
