# Minha Garagem

Organizador de garagens e veículos para GTA Online.

Site: [Minha Garagem](https://p3dr0ns.github.io/organizador-garagem-gta-v/).

Abra `index.html` no navegador ou acesse o site publicado. Os cadastros ficam no
`localStorage` do navegador. O arquivo local e o site possuem armazenamento separado.

## Recursos

- Cadastro e edição de veículos, favoritos e busca por modelo, marca e categoria.
- Catálogo de 618 modelos/variantes e 54 marcas; veja [CATALOGO.md](CATALOGO.md).
- Imagem automática do GTA Base nos cartões, cadastro e ficha. As imagens ficam
  locais para uso offline. Fotos pessoais e URLs antigas não são utilizadas.
- Ficha com preços, desempenho, inspiração real e especificações técnicas;
  veja [GTABASE.md](GTABASE.md).
- Valor total da coleção e dos veículos de cada garagem, pelo preço normal do
  catálogo GTA Base. Inclui carros repetidos e veículos sem garagem no total
  geral. Não inclui modificações ou descontos. Preços ausentes são sinalizados
  como total parcial; não são tratados como veículos gratuitos.
- Registro textual de pintura, rodas, placa e observações. Não há editor visual,
  upload de fotos, captura de prints ou galeria pessoal.
- Catálogo de rodas por tipo e modelo; veja [RODAS.md](RODAS.md).
- Cadastro, edição e remoção de garagens e tags de tema. Cada unidade do Eclipse
  Towers tem 10 vagas, sem exigir número do apartamento. Use o nome da garagem
  para diferenciar as unidades, se quiser.
- Ao abrir uma garagem, aparecem apenas os veículos guardados nela.
- Vista 2D com vagas numeradas, fotos de referência e posições salvas por veículo.
  Selecione um carro e use **Trocar posição**; escolher uma vaga ocupada troca os
  dois carros. Garagens maiores são divididas em setores de até 10 vagas.
  Vagas livres permitem cadastrar um veículo diretamente naquela posição.
  A opção **Lista** mantém a visualização em cartões. O mapa é ilustrativo,
  sem reprodução 3D do interior do GTA e sem alterar a organização dentro do jogo.
- Remover uma garagem mantém seus veículos como **Sem garagem**, para realocação posterior.
- Layout responsivo para computador e celular.

## Imagens

As imagens são obtidas das páginas individuais do
[catálogo do GTA Base](https://www.gtabase.com/grand-theft-auto-v/vehicles/).
`assets/vehicle-images.js` registra a origem e o caminho de cada imagem.
Variantes Drift sem ficha específica compartilham a imagem do modelo base, com
essa identificação na ficha. Modelos personalizados sem correspondência no
catálogo exibem uma ilustração padrão, sem solicitar imagem ao usuário.

`scripts/update-vehicle-images.ps1` extrai as URLs dos metadados das páginas
armazenadas em `.cache/gtabase`, baixa as imagens com concorrência limitada e
interrompe novas solicitações caso a fonte retorne 403 ou 429.

## Validação e publicação

Execute `tests/run-checks.ps1` para validar o catálogo, navegação, cadastros e garagens
no Chrome para computador e celular. `scripts/prepare-deploy.ps1` prepara os arquivos
em `dist/`, removendo artefatos antigos.

Cada alteração deve ser publicada. O push em `main` aciona
`.github/workflows/pages.yml`, que publica `dist/` no GitHub Pages.
