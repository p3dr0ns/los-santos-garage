# Ficha, fotos e captura no GTA

Clique em um carro para abrir sua ficha. A ficha mostra marca, modelo, categoria, garagem, pintura, rodas, placa e observações. Use **Editar veículo** para alterar esses dados. Os seis modelos iniciais têm marca sugerida; outros modelos podem ser cadastrados livremente.

## Galeria do seu carro

Na ficha, abra **Fotos do meu carro**. Cada ensaio tem seis posições:

1. Frente
2. Traseira
3. Lateral esquerda
4. Lateral direita
5. Cinematográfica dianteira
6. Cinematográfica traseira

Você pode enviar JPG, PNG ou WebP em cada posição (até 25 MB por arquivo), ou colar uma imagem com Ctrl+V. As imagens são reduzidas para até 1600 pixels no maior lado. Escolha **Usar capa** na foto desejada e depois **Salvar ensaio**. A capa passa a aparecer no cartão da coleção. A captura automática usa a cinematográfica dianteira como capa inicial.

Trocar ou remover uma imagem só se torna definitivo ao salvar. Cancelar mantém o ensaio anterior. Você pode salvar um ensaio incompleto e terminar depois.

As imagens ficam no **IndexedDB** do navegador, separadas dos cadastros em localStorage. Use sempre o mesmo navegador e mantenha o projeto no mesmo endereço. Limpar dados do navegador também apaga as fotos. **Exportar** baixa um arquivo JSON com as fotos; **Importar** restaura esse ensaio no carro aberto, após você conferir e salvar. A importação não substitui os campos da ficha.

## Assistente de captura no Windows

Abra **Iniciar captura.cmd** na raiz do projeto. Ele compila e abre o assistente usando o .NET Framework disponível no Windows, sem instalar dependências. O código-fonte está em `capture/CaptureAssistant.cs`.

No assistente, clique em **Abrir organizador**. Quando `capture/site-url.txt` estiver presente, ele abre a versão hospedada nesse endereço e conecta a aba ao assistente da sessão. Sem esse arquivo, abre o `index.html` local. O assistente deve continuar aberto durante o ensaio. Se reiniciá-lo, use o botão **Abrir organizador** novamente.

O site online e o arquivo local têm armazenamentos separados. Os cadastros e as fotos anteriores não são movidos automaticamente ao publicar; ensaios podem ser exportados na versão local e importados na ficha do veículo da versão online. A captura hospedada exige o assistente atualizado, em execução neste mesmo PC. Se já houver um assistente antigo aberto, feche-o e execute `Iniciar captura.cmd` para recompilar e iniciar a versão atual. O navegador pode solicitar acesso à rede local para conectar ao assistente.

O assistente não inicia o GTA nem carrega uma sessão. Abra o GTA antes, use janela sem bordas e configure a entrada de mouse como **Windows**, quando essa opção estiver disponível. Um perfil gravado depende da resolução, sensibilidade, câmera inicial e configuração de entrada usadas na calibração.

### Calibrar as seis posições uma vez

1. Escolha uma vaga fixa, deixe o carro parado e use uma câmera externa que possa ser orbitada com o mouse. Faça a calibração dentro do carro, com o mesmo veículo e posição de partida usados para definir o padrão.
2. Deixe a câmera no ponto inicial que você vai repetir antes de cada ensaio. Fique no GTA e pressione **F6**. O assistente guarda uma imagem de referência e começa a registrar os movimentos relativos do mouse.
3. Ajuste a câmera para a **frente** e pressione **F7**.
4. Continue para **traseira**, **lateral esquerda**, **lateral direita**, **cinematográfica dianteira** e **cinematográfica traseira**, nessa ordem. Pressione **F7** em cada posição. Espere a câmera ficar parada antes de marcar.
5. Na calibração, use somente movimentos do mouse para orbitar. Teclas, rolagem, movimentos do personagem/carro e mudanças de modo de câmera não são gravados.
6. Depois das seis posições, o perfil é salvo. **Ver câmera inicial** abre a referência do ponto de partida. **F9** cancela uma calibração incompleta, preservando o perfil anterior.

O perfil e a imagem inicial ficam em `%LOCALAPPDATA%\MinhaGaragemCapture`. O perfil registra os movimentos entre posições, não coordenadas internas da câmera do GTA.

### Capturar um ensaio

1. Deixe o próximo carro na mesma vaga, parado, com a mesma câmera inicial, resolução e sensibilidade da calibração. Feche menus do jogo e mantenha a iluminação semelhante.
2. No site, abra a ficha do carro e **Fotos do meu carro**.
3. Confira se o assistente está conectado e calibrado. Clique em **Preparar ensaio · iniciar com F8 no GTA**. O ensaio fica aguardando, sem mover a câmera.
4. Volte ao GTA, ajuste a câmera inicial e pressione **F8**. O assistente espera dois segundos, repete os movimentos gravados e captura a janela do jogo em cada posição. Não mova o mouse durante a execução.
5. **F9** interrompe. Se o GTA perder o foco ou mudar de resolução, o ensaio também para. Nenhum conjunto incompleto substitui suas fotos anteriores.
6. Volte ao site, confira as seis imagens recebidas e use **Salvar ensaio** para confirmar.

### Painel sobre o GTA e Alt+Tab

O assistente atualizado mostra um painel no canto superior esquerdo do GTA,
em modo janela ou janela sem bordas. Ele informa o contato recente com o site,
o perfil salvo, a etapa da calibração, as fotos concluídas e os atalhos.
O painel não recebe cliques, não entra no Alt+Tab e não ativa sua janela.
Ele é ocultado antes da imagem de referência e de cada foto, para não aparecer no ensaio.
Tela cheia exclusiva não tem suporte garantido para esse painel externo.

É possível usar Alt+Tab **antes de iniciar com F8**, enquanto o ensaio está
preparado. O reconhecimento do processo do GTA é separado do foco da janela:
voltar ao jogo faz o painel reaparecer. Durante a gravação ou reprodução dos
movimentos, sair do jogo interrompe a operação. Não há retomada automática
no meio de um movimento: volte à câmera inicial e reinicie. O perfil salvo e
as fotos já salvas no navegador são preservados.

Assistentes antigos continuam usando o botão de captura direta. A versão nova
também aceita esse protocolo, mas aguarda até 20 segundos para você voltar ao
jogo, em vez de depender de o Windows permitir uma mudança forçada de foco.
Para receber painel e F8, feche a versão anterior e execute novamente
`Iniciar captura.cmd`. O instalador/download pelo site ainda não foi implementado.

## Limites da automação

Esta implementação é uma **macro calibrada experimental**. Ela automatiza a movimentação da câmera conforme o perfil gravado e a captura da janela, mas não lê a câmera nem a posição do veículo dentro do jogo. Não reposiciona o carro na vaga, não identifica o tamanho dele por visão computacional e não garante enquadramento idêntico entre carros ou sessões. Mudanças no estado da câmera, aceleração do mouse, resolução, controles ou tamanho do veículo podem exigir nova calibração.

O posicionamento do carro e a câmera **inicial** ainda são preparo manual. Depois desse preparo, os movimentos entre as seis vistas são automáticos. Isso não equivale a reconhecer uma cena arbitrária e alinhar a câmera sozinho.

A compilação, o armazenamento, o protocolo e a interface foram verificados. A validação automatizada não movimentou a câmera do GTA: o perfil da vaga e o resultado visual da reprodução ainda precisam ser calibrados e testados no jogo. Se houver fotos pretas ou interface sobreposta, confira modo sem bordas, foco da janela e overlays antes de salvar.

## Verificação técnica

- `tests/run-checks.ps1`: usa Chrome com perfis descartáveis para verificar ficha, edição, seis fotos, persistência, capa, remoção, importação, cancelamento e fluxo do protocolo com respostas simuladas. Não usa o navegador pessoal nem envia comandos ao jogo.
- `capture/MinhaGaragemCapture.exe --self-test`: verifica perfil, serialização, estrutura de entrada, estilos passivos do painel, preparo/cancelamento e protocolo HTTP real em porta temporária. Testa token, origem HTTPS, Host, preflight e rejeição de fotos incompletas; usa perfil temporário, sem registrar atalhos nem mover o mouse.
- `--diagnostics`: consulta se o GTA foi encontrado, se está em primeiro plano/minimizado e a área da janela. Não altera o foco nem envia comandos ao jogo. Compile como console (`/target:exe`) para ver a saída desses comandos no terminal.
- O serviço escuta somente em `127.0.0.1:47831`, exige o token da sessão para suas operações e aceita o arquivo local ou a origem HTTPS exata configurada em `capture/site-url.txt`. A câmera usa [SendInput](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput), a calibração usa [Raw Input](https://learn.microsoft.com/en-us/windows/win32/inputdev/raw-input), e os atalhos usam [RegisterHotKey](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey).
