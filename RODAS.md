# Catálogo de rodas

Em **Editar / Adicionar veículo → Personalizações e observações**, escolha primeiro o **Tipo da roda** e depois o **Modelo da roda**. O modelo só é liberado depois da escolha do tipo e é obrigatório se você selecionar uma categoria do catálogo.

O catálogo é local e funciona sem internet. Inclui **361 entradas de nomes em 14 listas**, contando as listas dianteira e traseira das motos separadamente:

- Esportivas, Muscle, Lowrider, SUV, Off-road e Tuning.
- Motos, com roda dianteira e traseira independentes.
- Luxo / High End, Benny's Original e Benny's Bespoke.
- Formula / Open Wheel, Rua / Street e Pista / Track.

Há também **Originais do veículo** e **Não informado**. Os modelos usam os nomes do catálogo em inglês. Ao trocar o tipo, o modelo anterior é limpo para não registrar uma combinação de categorias diferentes. A escolha aparece na ficha e é restaurada ao editar o veículo.

Descrições anteriores, como “Esportivas pretas”, continuam disponíveis como **Personalizado (cadastro anterior)**. Elas só são substituídas se você escolher outra opção. A cor das rodas pode ser registrada nas observações.

## Fonte e critérios

- [GtaHash — catálogo de rodas](https://gtahash.com/vehicle-mods/wheels), listas completas de cada categoria, consultadas em 6 de novembro de 2026.
- Referência complementar: [Cfx.re — lista de rodas e tipos](https://forum.cfx.re/t/list-of-all-wheels-for-gta-v-fivem-vehicles-and-a-small-guide-how-to-use-it-in-your-scripts/2787964).

Variantes internas que usam o mesmo nome dentro de uma categoria são agrupadas. Os códigos de modelos da fonte são preservados como referências no arquivo local. Variações de pneu ou acabamento que não alteram o nome não aparecem como rodas repetidas. A lista registra o projeto do usuário; não afirma que cada roda esteja disponível para todo modelo de veículo no GTA.

O catálogo está em `assets/wheel-catalog.js`. Para regenerá-lo a partir da fonte, execute `scripts/update-wheels.ps1`. Esse script lê todas as páginas das categorias e grava apenas nomes e referências factuais das rodas, sem baixar imagens ou modelos 3D.
