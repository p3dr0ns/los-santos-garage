# Minha Garagem

Organizador local de garagens e veículos para GTA Online.

Hospedagem no GitHub Pages: [Minha Garagem](https://p3dr0ns.github.io/organizador-garagem-gta-v/).
O endereço online tem armazenamento separado do arquivo local; os dados não são transferidos automaticamente entre os dois.

## Como usar

Abra o arquivo `index.html` no navegador. Não é necessário instalar nada.

Os cadastros ficam no `localStorage` e as fotos no `IndexedDB` do navegador usado. Para manter os dados, não limpe os dados do site/navegador. Exporte os ensaios para guardar uma cópia das fotos.

## Recursos atuais

- cadastro e edição de veículos;
- exclusão e marcação de favoritos;
- cadastro de garagens e controle de vagas;
- movimentação do veículo ao alterar sua garagem;
- pesquisa e filtro por categoria;
- layout responsivo para computador e celular.
- portfólio de cada veículo ao clicar no cartão, com página própria, foto em destaque, galeria, marca, modelo e personalizações; botão para voltar à coleção e endereço `#carro/ID` para reabrir no mesmo navegador;
- referências offline do GTA Base no portfólio: preços normal e de negociação, velocidade testada, inspiração real, assentos, peso, tração, marchas e estatísticas com Overall; cobertura e coleta em [GTABASE.md](GTABASE.md);
- galeria de seis fotos próprias, escolha de capa, envio e Ctrl+V;
- exportação e importação de ensaios;
- assistente Windows para repetir movimentos de câmera calibrados e capturar seis fotos.
- catálogo offline com 617 modelos/variantes e 54 marcas de carros e motos, busca por nome e preenchimento automático de marca e categoria; detalhes em [CATALOGO.md](CATALOGO.md).
- catálogo offline de rodas por tipo e modelo, com rodas dianteira/traseira para motos; detalhes em [RODAS.md](RODAS.md).

Para a captura, abra `Iniciar captura.cmd`. A macro exige calibração e o mesmo ponto inicial no GTA; a precisão dentro do jogo ainda precisa ser validada. Veja [CAPTURA.md](CAPTURA.md) para o passo a passo e os limites.

## Publicação

`scripts/prepare-deploy.ps1` copia apenas HTML, CSS, JavaScript e os recursos usados pelo navegador para `dist/`. O workflow `.github/workflows/pages.yml` publica esse diretório usando GitHub Actions. Pages está configurado com origem GitHub Actions e a variável `ENABLE_GITHUB_PAGES=true`. Os próximos pushes para `main` serão publicados automaticamente; também é possível executar o workflow manualmente.

O repositório é público, conforme autorizado pelo proprietário, para permitir GitHub Pages no plano atual. O assistente Windows continua sendo executado no computador do usuário; não é um processo executado pelo servidor.

As imagens dos seis modelos iniciais vêm da [RAGE Multiplayer Wiki](https://wiki.rage.mp/wiki/Vehicles) e ficam em `assets/vehicles`, funcionando também offline. São aplicadas pelo nome, inclusive nos veículos já salvos. Uma URL personalizada tem prioridade sobre a imagem automática.
