# GTA Base como fonte complementar

Análise em 7 de novembro de 2026 para o organizador de garagens.

Fonte: https://www.gtabase.com/grand-theft-auto-v/vehicles/

O catálogo atual usa os dados extraídos do jogo para nomes, fabricantes,
classes e códigos internos. O GTA Base complementa essa base com informações
de aquisição, armazenamento, personalização e desempenho. A quantidade total
de veículos do site não é diretamente comparável à do catálogo: o site também
inclui aeronaves, barcos e outras classes fora do escopo do organizador.

## Informações disponíveis na fonte

| Campo | Utilidade no organizador |
| --- | --- |
| Preço normal no GTA Online e preço especial, quando houver | Planejar compras; separar do valor efetivamente pago pelo jogador |
| Loja ou método de aquisição | Saber onde conseguir o modelo |
| Tipo de armazenamento | Identificar veículos pessoais e veículos com armazenamento específico |
| Oficinas compatíveis | Saber onde personalizar o modelo |
| Velocidade máxima testada em km/h | Comparar desempenho com condições de teste explícitas |
| Tempo de volta | Comparar desempenho no mesmo circuito e configuração |
| Lugares e tração | Complementar a ficha técnica |
| Recursos especiais e conversões | Registrar compatibilidade por variante e plataforma, após conferência individual |
| Atualização e plataformas | Distinguir disponibilidade entre versões do jogo |

## Exemplo conferido: Pegassi Zentorno

Fonte: https://www.gtabase.com/grand-theft-auto-v/vehicles/pegassi-zentorno

- Código de modelo: `zentorno`, correspondente ao identificador do catálogo local.
- Preço normal no GTA Online: GTA$ 725.000.
- Compra: Legendary Motorsport.
- Armazenamento: garagem de veículos pessoais.
- Personalização: Los Santos Customs; a página também informa oficina de veículos em propriedade.
- Lugares: 2; tração integral (AWD).
- Velocidade testada com melhorias completas: 196,74 km/h.
- Tempo de volta informado: 1:00.878.

O site atribui os testes de desempenho a Broughy1322. A velocidade extraída
dos arquivos do jogo é outro indicador e não deve ocupar o mesmo campo.

## Critérios para incorporar dados

- Associar pela identificação exata do modelo e da variante, preferindo o código interno quando disponível. Não montar URLs automaticamente pelo nome: a página do Zentorno inclui o fabricante no endereço.
- Guardar URL da ficha e data da consulta por registro. Campos não conferidos permanecem desconhecidos.
- Manter condições de teste junto dos números; separar configurações normais, HSW e Drift quando aplicáveis.
- Tratar preço como referência consultada, pois promoções e disponibilidade podem mudar.
- Separar especificações do modelo das personalizações textuais e valores registrados pelo usuário.
- Usar dados locais para preservar o funcionamento offline. A consulta realizada não estabelece uma API pública ou integração automática.

## Dados incorporados ao portfólio

`assets/vehicle-reference.js` guarda referências associadas por código interno
exato. Os veículos já cadastrados também recebem os dados do catálogo, sem
alterar os dados de cadastro do usuário. Os campos disponíveis são:

- preço normal do GTA Online e preço de negociação em GTA$;
- velocidade máxima testada em km/h, com melhorias completas e sem HSW;
- inspiração em veículos da vida real;
- assentos, massa em kg, tração e marchas;
- pontuações de velocidade, aceleração, frenagem e dirigibilidade, com barras
  de 0 a 100, além do Overall publicado pela fonte.

A pontuação de velocidade não representa km/h. O Overall é importado como
publicado, sem recalcular a média dos valores arredondados. O preço de
negociação pode exigir desbloqueio. Promoções e disponibilidade podem variar;
conversões podem envolver custos adicionais. Campos ausentes permanecem
`null` e aparecem como “Não informado”; zero é preservado quando publicado.
Cada registro tem URL individual e data da consulta.

## Coleta e cobertura

Execute `powershell -ExecutionPolicy Bypass -File scripts/update-vehicle-reference.ps1`.
O coletor descobre URLs pelo sitemap público do GTA Base, consulta as fichas
sequencialmente com intervalo mínimo de três segundos e interrompe em HTTP
429 ou 403. HTML e datas ficam em `.cache/gtabase/` (ignorado pelo Git), para
retomar sem repetir downloads. `-Refresh` atualiza o sitemap e as fichas; use
apenas quando for necessário renovar os dados.
`-CacheOnly` reprocessa os arquivos já baixados sem acessar a rede.
`-Urls @('https://www.gtabase.com/vehicles/grand-theft-auto-v/tampa-gt', 'https://www.gtabase.com/grand-theft-auto-v/vehicles/benefactor-dubsta-2')` restringe a atualização às fichas indicadas.

Tampa GT (`tampa4`) e Dubsta 2 (`dubsta2`) tiveram suas fichas conferidas em
7 de novembro de 2026. O Dubsta 2 passou a ter registro separado do Dubsta comum,
com preço normal de GTA$ 70.000; Tampa GT permanece em GTA$ 1.311.000.

Na coleta de 7 de novembro de 2026, foram consultadas as **840 fichas** do
sitemap, sem bloqueios nessa rodada. **596 dos 618 modelos** do catálogo
receberam referências. Os **22 pendentes são configurações Drift** sem
correspondência específica nas fichas consultadas. A fonte trata Drift Tuning
como uma modificação que altera o desempenho; os números da configuração
comum não são aplicados automaticamente a esses registros.

Listas explícitas de códigos de modelo são separadas e associadas aos códigos
agrupados do catálogo. Fichas individuais de variantes têm preferência sobre
fichas genéricas Arena. A fonte lista Future Shock Issi e Nightmare Issi na
ficha comum Issi (Arena); os dois registros indicam essa origem compartilhada.
O Uranus LozSpeed informa `uranus1` no site e `uranus` no catálogo: esse único
caso foi associado por nome completo e fabricante exatos, e mantém o código
original da fonte. Metadados de associação permitem revisar essas decisões.

O relatório `assets/vehicle-reference-report.json` registra a cobertura do
catálogo, modelos pendentes, páginas sem correspondência, associações ambíguas
e erros de consulta. Ter um registro no novo formato não significa que a
fonte publicou todos os campos, especialmente preço de negociação.
O catálogo inclui carros e motos; aeronaves, barcos e veículos fora dele não
são acrescentados automaticamente. Variantes sem código correspondente não
herdam os dados de outra variante. Não há consulta ao site durante o uso.

A extração está em `scripts/parse-vehicle-reference.ps1`. Os testes usam
fragmentos das fichas reais do Sentinel GTS e do Zentorno, verificando preços,
velocidade testada, especificações, estatísticas, campos ausentes e zero.
