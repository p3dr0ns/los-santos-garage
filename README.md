# Minha Garagem

Organizador local de garagens e veículos para GTA Online.

Versão hospedada privada: [Minha Garagem](https://minha-garagem-gta-p3dr0ns.pedrolucasgelitati.chatgpt.site).
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
- ficha de cada veículo com marca, modelo e personalizações;
- galeria de seis fotos próprias, escolha de capa, envio e Ctrl+V;
- exportação e importação de ensaios;
- assistente Windows para repetir movimentos de câmera calibrados e capturar seis fotos.
- catálogo offline com 617 modelos/variantes e 54 marcas de carros e motos, busca por nome e preenchimento automático de marca e categoria; detalhes em [CATALOGO.md](CATALOGO.md).
- catálogo offline de rodas por tipo e modelo, com rodas dianteira/traseira para motos; detalhes em [RODAS.md](RODAS.md).

Para a captura, abra `Iniciar captura.cmd`. A macro exige calibração e o mesmo ponto inicial no GTA; a precisão dentro do jogo ainda precisa ser validada. Veja [CAPTURA.md](CAPTURA.md) para o passo a passo e os limites.

## Publicação

`scripts/prepare-deploy.ps1` copia apenas HTML, CSS, JavaScript e os recursos usados pelo navegador para `dist/`. A configuração da hospedagem fica em `.openai/hosting.json`. O assistente Windows continua sendo executado no computador do usuário; não é um processo executado pelo servidor.

As imagens dos seis modelos iniciais vêm da [RAGE Multiplayer Wiki](https://wiki.rage.mp/wiki/Vehicles) e ficam em `assets/vehicles`, funcionando também offline. São aplicadas pelo nome, inclusive nos veículos já salvos. Uma URL personalizada tem prioridade sobre a imagem automática.
