# Catálogo interno de carros e motos

Análise de fonte complementar para fichas técnicas, aquisição e desempenho: [GTA Base](GTABASE.md).

O catálogo local em `assets/vehicle-catalog.js` contém **618 nomes/variantes** e **54 fabricantes**. Funciona abrindo o `index.html`, sem servidor e sem internet. A pesquisa mostra variantes por nome, nome em português e aliases, sem diferenciar acentos ou maiúsculas.

No cadastro, digite parte de um nome, como **Sentinel**, **Sultan** ou **Bati**. Escolha o resultado com o mouse ou use as setas e Enter. O modelo, a marca e a categoria são preenchidos juntos. Selecionar uma marca manualmente limita a pesquisa àquele fabricante; “Selecione uma marca” retira esse filtro.

O campo de marca inclui os fabricantes de carros e motos do catálogo, inclusive Übermacht e Överflöd com seus acentos. Veículos cuja fonte não informa fabricante continuam sem marca presumida. Marcas personalizadas de cadastros antigos são preservadas na edição.

## Abrangência e variantes

- Carros compactos, sedãs, SUVs, cupês, muscle, esportivos, clássicos, super, off-road, vans e fórmula; motos e quadriciclos dessas classes.
- Sem aviões, helicópteros, barcos, bicicletas, trens, reboques, ônibus ou caminhões de carga das classes industrial/comercial/serviço.
- Modelos com nomes diferentes, conversões Benny's, blindados e variantes Drift aparecem separadamente. O Sentinel inclui Sentinel, XS, XS4, Classic, Classic Widebody, GTS e as versões Drift presentes na fonte.
- Códigos internos com o mesmo nome, fabricante e categoria são agrupados. Todos os códigos continuam como aliases de pesquisa. Assim, versões de cenário não aparecem repetidas com nomes idênticos.
- Exceção: **Dubsta 2** (`dubsta2`) fica separado do Dubsta comum (`dubsta`), conforme a ficha específica do GTA Base, com imagem, preço e referência próprios. Cadastros anteriores com nome explícito “Dubsta 2” e ID agrupado são reconhecidos como a variante correta.
- Os nomes principais seguem os nomes em inglês do jogo, com a correção de Sentinel Classic e a forma já utilizada no aplicativo, Kuruma Blindado. Os nomes em português da fonte também são pesquisáveis.
- Você pode cadastrar um modelo que ainda não esteja no catálogo preenchendo o nome e a categoria manualmente. A imagem é obtida automaticamente do GTA Base para modelos reconhecidos. Não há envio de fotos pessoais.

## Fonte e versão

Dados factuais extraídos do GTA V por [DurtyFree / Pleb Masters — GTA V Data Dumps](https://github.com/DurtyFree/gta-v-data-dumps), arquivo [vehicles.json](https://github.com/DurtyFree/gta-v-data-dumps/blob/b8f9dfaee5139fe372f264df4030506d1450fd8a/vehicles.json).

- Revisão fixada: `b8f9dfaee5139fe372f264df4030506d1450fd8a`.
- Versão informada pela fonte: GTA V v3717.0 / GTA Online 1.72.
- Consulta: 6 de novembro de 2026.
- Referência complementar para variantes: [Cfx.re — Vehicle Models](https://docs.fivem.net/docs/game-references/vehicle-references/vehicle-models/).

A cobertura corresponde a essa versão da fonte; carros de atualizações posteriores precisam de uma atualização do catálogo. Para reproduzir a base, execute `scripts/update-catalog.ps1`. Para atualizar de uma nova revisão, altere o hash e os metadados no script, gere o arquivo novamente e execute as verificações do catálogo.
