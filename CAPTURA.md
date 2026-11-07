# Prints e fotos dos carros

Uma foto já basta para a capa. No portfólio do carro, abra **Fotos do meu carro**.
Use **Enviar print**, arraste uma imagem para a área de envio ou cole com Ctrl+V.
JPG, PNG e WebP são aceitos, até 25 MB por arquivo e 2560 pixels no maior lado.
As seis posições continuam opcionais; não é necessário completar um ensaio.
Uploads e ajustes são confirmados por **Salvar fotos**. Cancelar mantém as fotos
que já estavam salvas. O recebimento por F8 tem salvamento automático explícito.

## F8 no GTA: print direto para o carro

1. Feche o assistente antigo, caso esteja aberto.
2. Execute **Iniciar captura.cmd** na pasta do projeto. Também é possível baixar
   o assistente pelo link no site, extrair o ZIP e abrir esse mesmo arquivo.
3. Clique em **Abrir site e conectar** no assistente. Escolha o carro no site e
   abra **Fotos do meu carro**.
4. Clique em **Receber prints · salvar automaticamente**. Esse botão salva
   alterações pendentes da galeria e prepara o carro para receber imagens.
5. No GTA em janela sem bordas, enquadre a câmera como quiser e pressione **F8**.
   Cada F8 faz uma única captura da área do GTA e envia para a aba selecionada.
6. O site adiciona cada print à próxima posição vazia e salva no IndexedDB. A
   primeira foto vira a capa de um carro sem fotos. **F9** ou **Pausar recebimento**
   encerram a sessão. Abrir outro carro exige pausar a sessão atual.

A macro de movimentos, a calibração F6/F7 e a repetição automática das seis
câmeras foram removidas. O assistente não movimenta mouse, teclado ou câmera.
Só captura com F8 enquanto o GTA está em primeiro plano e o site está conectado.
A galeria comporta seis imagens. Uma galeria cheia não é sobrescrita por novos
prints; remova uma foto para liberar espaço. A fila do assistente é limitada,
com confirmação após o salvamento para evitar duplicações.

Mantenha a aba aberta e o assistente em execução. O navegador pode pedir acesso
à rede local para conectar à porta 47831. Abas em segundo plano podem demorar
mais para receber imagens. Tela cheia exclusiva pode produzir imagens pretas;
use janela sem bordas. Não foi possível validar a captura com um GTA aberto nos
testes automatizados: enquadramento, overlays e resultado no jogo precisam ser
conferidos no primeiro print.

## Acabamento fotográfico

Em uma foto, use **Melhorar foto**. O editor mostra o original e a prévia lado a
lado, com controle de intensidade. Ajusta luz, contraste, saturação e nitidez
localmente no navegador, sem enviar a imagem para um serviço externo. O processo
preserva o enquadramento e não gera novos objetos ou detalhes por IA. Não recupera
informação ausente ou transforma um print ruim em uma fotografia real.

Clique em **Aplicar melhoria** e **Salvar fotos** para confirmar. O original fica
preservado, inclusive após reabrir o site. Use **Ajustar melhoria → Restaurar
original** e salve para desfazer. Exportações incluem o original das fotos com
tratamento; backups antigos continuam sendo aceitos.

## Armazenamento e publicação

Fotos ficam no IndexedDB do navegador usado no site; não são publicadas no
repositório nem sincronizadas com outros aparelhos. Limpar os dados do navegador
apaga as fotos. Exporte um backup para guardá-las. O arquivo local e o endereço
hospedado têm armazenamentos separados.

O ZIP público inclui somente o código-fonte C#, o arquivo CMD e o endereço do
site. O CMD compila com o .NET Framework do Windows, sem instalação adicional.
O servidor escuta só em 127.0.0.1, exige o token aleatório da sessão, valida Host
e limita a origem ao endereço HTTPS configurado ou ao arquivo local. Uma segunda
aba não pode armar outra sessão enquanto a primeira estiver ativa.

## Verificação

`tests/run-checks.ps1` testa galeria, persistência, print individual com salvamento
automático, deduplicação, isolamento de sessões, melhoria, restauração e versões
anteriores de backup em perfis descartáveis do Chrome. As respostas do assistente
são simuladas; o navegador pessoal e o GTA não são usados.

`capture/MinhaGaragemCapture-test.exe --self-test` testa o HTTP real em porta
temporária, token, origem, Host, preflight, fila, confirmação, exclusão da antiga
rota de macro e cancelamento, sem registrar atalhos ou capturar a tela.