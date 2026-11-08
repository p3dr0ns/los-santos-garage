async function checkCollectionTools(check) {
  const previous = data, previousStorage = localStorage.getItem(STORAGE_KEY), previousFilter=currentFilter, previousGarage=selectedGarage;
  const rejected = value => {try {parseCollectionBackup(typeof value === 'string' ? value : JSON.stringify(value)); return false;}catch{return true;}};
  const fits = id => $(id).scrollWidth <= $(id).clientWidth + 1;
  try {
    selectedGarage=null;currentFilter='all';
    data={garages:[
      {id:'tools-a',name:'JDM',type:'garage',capacity:10,tags:['JDM','Drift']},
      {id:'tools-b',name:'Clássicos',type:'garage',capacity:2,tags:['Clássicos']},
      {id:'tools-c',name:'Drift',type:'garage',capacity:6,tags:['drift']},
      {id:'tools-d',name:'Sem tema',type:'garage',capacity:2,tags:[]},
      {id:'tools-mc',name:'Motoclube',type:'biker_clubhouse',capacity:10}
    ],vehicles:[
      {id:'tools-v1',name:'Zentorno',catalogId:'zentorno',category:'Super',garageId:'tools-a',favorite:true,paint:'Prata',plate:'LS 01',notes:'Coleção pessoal',wheelType:'sport',wheelModel:'Inferno',wheels:'Esportivas · Inferno',parking:{garageId:'tools-a',slot:4}},
      {id:'tools-v2',name:'Adder',catalogId:'adder',category:'Super',garageId:'tools-a',parking:{garageId:'tools-a',slot:7}},
      {id:'tools-v3',name:'Elegy RH8',catalogId:'elegy2',category:'Esportivo',garageId:'tools-b',parking:{garageId:'tools-b',slot:1}},
      {id:'tools-v4',name:'Modelo personalizado',category:'Esportivo',garageId:null}
    ],wishlist:[]};
    render();
    $('#garageThemeFilter').value='tag:drift';$('#garageThemeFilter').dispatchEvent(new Event('change'));
    check('tema filtra garagens ignorando caixa e mantendo coleção intacta',$$('.garage-card').length===2 && data.garages.length===5 && data.vehicles.length===4);
    $('#garageThemeFilter').value='tag:classicos';$('#garageThemeFilter').dispatchEvent(new Event('change'));
    check('tema com acento aparece uma única vez e filtra corretamente',$$('.garage-card').length===1 && $$('.garage-card')[0].dataset.garageId==='tools-b' && $$('#garageThemeFilter option').filter(option=>option.value==='tag:drift').length===1);
    $('#garageThemeFilter').value='untagged';$('#garageThemeFilter').dispatchEvent(new Event('change'));
    check('filtro sem tema inclui garagens sem tags',$$('.garage-card').length===2);
    $('#garageThemeFilter').value='all';$('#garageThemeFilter').dispatchEvent(new Event('change'));
    $('#openWishlist').click();
    check('lista de desejos começa vazia e acessível',$('#wishlistDialog').open && $('#wishlistBudget').textContent==='GTA$ 0' && $('#wishlistCount').textContent==='0');
    $('#wishlistModel').value=toolModelLabel(vehicleModels.find(model=>model.id==='adder'));$('#wishlistForm').requestSubmit();
    check('adicionar desejo persiste modelo sem criar veículo',wishIds()[0]==='adder' && data.vehicles.length===4 && JSON.parse(localStorage.getItem(STORAGE_KEY)).wishlist[0]==='adder');
    check('modelo já possuído não entra no orçamento',getWishlistBudget().count===0 && $('#wishlistItems [data-buy-wish]').disabled);
    addWishlistModel('tampa4');
    const tampa=vehicleModels.find(model=>model.id==='tampa4');
    if (!tampa) {addWishlistModel('turismor');}
    const unowned=wishIds().find(id=>!ownsModel(id));
    check('orçamento soma somente modelos ainda não comprados',getWishlistBudget().count===1 && getWishlistBudget().total===VEHICLE_REFERENCE[unowned].price && $('#wishlistCount').textContent==='1');
    const count=wishIds().length;addWishlistModel(unowned);
    check('desejo repetido não duplica preço ou cadastro',wishIds().length===count && getWishlistBudget().count===1);
    check('reabrir mantém os modelos da lista de desejos',loadData().wishlist.length===wishIds().length);
    const missing=vehicleModels.find(model=>!VEHICLE_REFERENCE[model.id]);addWishlistModel(missing.id);
    check('desejo sem preço é sinalizado como total parcial',getWishlistBudget().missing===1 && $('#wishlistBudgetNote').textContent.includes('total parcial'));
    $(`[data-remove-wish="${missing.id}"]`).click();
    check('remover desejo atualiza orçamento e armazenamento',!wishIds().includes(missing.id) && JSON.parse(localStorage.getItem(STORAGE_KEY)).wishlist.length===count);
    const wishState=JSON.stringify(wishIds());$('#wishlistModel').value='inexistente-xpto';$('#wishlistForm').requestSubmit();
    check('desejo inválido não altera lista',JSON.stringify(wishIds())===wishState);
    check('lista de desejos cabe na tela',fits('#wishlistDialog'));
    $(`[data-buy-wish="${unowned}"]`).click();
    check('cadastrar compra abre formulário preenchido e mantém desejo até salvar',$('#vehicleDialog').open && !$('#wishlistDialog').open && selectedCatalogModelId===unowned && wishIds().includes(unowned));
    $('#vehicleForm').requestSubmit();
    check('salvar compra desconta modelo do orçamento',ownsModel(unowned) && getWishlistBudget().count===0 && $('#wishlistCount').textContent==='0');
    closeVehiclePortfolio();
    $('#openCompare').click();$('#compareModelA').value='Zentorno';$('#compareModelB').value='Adder';renderComparison();
    check('comparação mostra dois modelos, preço, velocidade e quatro estatísticas',$$('.comparison-cars img').length===2 && $('.comparison-table').textContent.includes('km/h') && $('.comparison-table').textContent.includes('Frenagem') && $$('.comparison-table tbody tr').length===11);
    const priceRow=$('.comparison-table tbody tr');
    check('comparação destaca menor preço',priceRow.querySelectorAll('.comparison-best').length===1 && priceRow.textContent.includes('725.000'));
    $('#compareModelB').value='Zentorno';renderComparison();
    check('comparação não aceita o mesmo modelo duas vezes',!$('.comparison-table') && $('#compareHint').textContent.includes('diferentes'));
    $('#compareModelB').value=toolModelLabel(missing);renderComparison();
    check('comparação de modelo sem ficha não inventa valores',$('.comparison-table').textContent.includes('Não informado') && $('.comparison-table').textContent.includes('Sem ficha específica'));
    check('comparação cabe na tela',fits('#compareDialog'));$('#compareDialog').close();
    $('#openBatchMove').click();$('#batchSource').value='tools-a';renderBatchVehicles();
    $('#batchSelectAll').click();
    const sourceIds=new Set(batchSelection);
    check('selecionar resultados escolhe só os veículos da origem',sourceIds.size===(data.vehicles.filter(vehicle=>vehicle.garageId==='tools-a').length) && !sourceIds.has('tools-v3'));
    check('destino sem vagas suficientes é bloqueado',Boolean(batchMoveProblem(new Set(['tools-v1','tools-v2']),'tools-b')) && [...$('#batchDestination').options].find(option=>option.value==='tools-b').disabled);
    const batchBefore=JSON.stringify(data.vehicles);
    check('transferência lotada é atômica',!transferBatch(new Set(['tools-v1','tools-v2']),'tools-b') && JSON.stringify(data.vehicles)===batchBefore);
    check('motoclube não recebe carros',batchMoveProblem(new Set(['tools-v1']),'tools-mc').includes('motocicletas'));
    data.garages.push({id:'tools-special',name:'Especiais',type:'warehouse_vehicle',capacity:8});
    data.vehicles.push({id:'tools-special-v',name:'Ruiner 2000',catalogId:'ruiner2',category:'Muscle',garageId:null});
    check('depósito permite modelo especial e bloqueia carro comum',!batchMoveProblem(new Set(['tools-special-v']),'tools-special') && Boolean(batchMoveProblem(new Set(['tools-v1']),'tools-special')));
    data.garages.pop();data.vehicles.pop();
    $('#clearBatchSelection').click();
    $('#batchSearch').value='Zentorno';renderBatchVehicles();$('#batchSelectAll').click();$('#batchSearch').value='Adder';renderBatchVehicles();$('#batchSelectAll').click();
    check('seleção persiste ao mudar busca sem selecionar carros ocultos',batchSelection.size===2 && $('#batchSelectAll').checked);
    $('#batchDestination').value='tools-c';$('#batchDestination').dispatchEvent(new Event('change'));
    $('#batchMoveForm').requestSubmit();
    const moved=data.vehicles.filter(vehicle=>['tools-v1','tools-v2'].includes(vehicle.id));
    check('transferência confirmada move todos e fecha diálogo',!$('#batchMoveDialog').open && moved.every(vehicle=>vehicle.garageId==='tools-c'));
    check('transferência define vagas únicas e preserva personalizações',new Set(moved.map(vehicle=>vehicle.parking.slot)).size===2 && moved[0].favorite && moved[0].paint==='Prata' && moved[0].notes==='Coleção pessoal' && moved[0].wheelModel==='Inferno');
    check('transferência persiste destinos e deixa demais carros intactos',JSON.parse(localStorage.getItem(STORAGE_KEY)).vehicles.find(vehicle=>vehicle.id==='tools-v1').garageId==='tools-c' && data.vehicles.find(vehicle=>vehicle.id==='tools-v3').parking.slot===1);
    check('selecionar carros já no destino não duplica ocupação',!transferBatch(new Set(['tools-v1','tools-v2']),'tools-c'));
    check('destino inexistente e ID removido não alteram dados',!transferBatch(new Set(['missing']),'tools-c') && !transferBatch(new Set(['tools-v1']),'missing'));
    const beforeFailure=JSON.stringify(data), originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key===STORAGE_KEY)throw new DOMException('Full','QuotaExceededError');return originalSetItem.call(this,key,value);};
    try {
      check('falha ao mover em lote restaura todos os carros',!transferBatch(new Set(['tools-v1','tools-v2']),'tools-a') && JSON.stringify(data)===beforeFailure);
      const wishes=JSON.stringify(wishIds());
      check('falha ao adicionar desejo preserva lista',!addWishlistModel('dominator') && JSON.stringify(wishIds())===wishes);
    } finally {Storage.prototype.setItem=originalSetItem;}
    $('#openBatchMove').click();check('transferência cabe na tela',fits('#batchMoveDialog'));$('#batchMoveDialog').close();
    const backup=makeCollectionBackup();
    check('backup tem formato versionado e todos os dados atuais',backup.format==='los-santos-garage' && backup.version===1 && backup.data.garages.length===5 && backup.data.vehicles.length===data.vehicles.length && backup.data.wishlist.length===wishIds().length);
    const decoded=parseCollectionBackup(JSON.stringify(backup));
    check('restauração preserva tags, posições, favoritos, rodas e desejos',decoded.garages[0].tags.includes('JDM') && decoded.vehicles[0].parking.slot===data.vehicles[0].parking.slot && decoded.vehicles[0].favorite && decoded.vehicles[0].wheelModel==='Inferno' && decoded.wishlist[0]==='adder');
    check('backup antigo sem desejos é aceito',parseCollectionBackup(JSON.stringify({garages:[],vehicles:[]})).wishlist.length===0);
    check('backup aceita coleção vazia',parseCollectionBackup(JSON.stringify({format:'los-santos-garage',version:1,data:{garages:[],vehicles:[],wishlist:[]}})).vehicles.length===0);
    check('JSON corrompido, formato errado e versão futura são rejeitados',rejected('{broken') && rejected({format:'outro',version:1,data:backup.data}) && rejected({...backup,version:99}) && rejected({foo:1}));
    const duplicate=structuredClone(backup);duplicate.data.vehicles.push(duplicate.data.vehicles[0]);
    check('backup rejeita IDs duplicados',rejected(duplicate));
    const unsafe=structuredClone(backup);unsafe.data.vehicles[0].id='\"><img src=x onerror=alert(1)>';
    check('backup rejeita identificadores que quebrariam o HTML',rejected(unsafe));
    const dangling=structuredClone(backup);dangling.data.vehicles[0].garageId='missing';
    check('backup rejeita veículo ligado a garagem inexistente',rejected(dangling));
    const badTags=structuredClone(backup);badTags.data.garages[0].tags=[{}];
    check('backup rejeita campos de tipo inválido',rejected(badTags));
    const badWish=structuredClone(backup);badWish.data.wishlist=['modelo-inexistente'];
    check('backup rejeita desejos sem modelo reconhecido',rejected(badWish));
    check('backup rejeita arquivo acima de 10 MB',rejected(' '.repeat(10*1024*1024+1)));
    const collided=structuredClone(backup);collided.data.vehicles[1].parking=collided.data.vehicles[0].parking;
    const repaired=parseCollectionBackup(JSON.stringify(collided));
    check('restauração resolve colisão de vagas sem perder veículos',repaired.vehicles.length===data.vehicles.length && new Set(repaired.vehicles.filter(vehicle=>vehicle.garageId==='tools-c').map(vehicle=>vehicle.parking.slot)).size===2);
    $('[data-filter="settings"]').click();
    const beforeImport=JSON.stringify(data);
    await previewBackupFile(new File([JSON.stringify(backup)],'colecao.json',{type:'application/json'}));
    check('prévia de arquivo válido não altera dados',JSON.stringify(data)===beforeImport && pendingCollectionBackup && !$('#confirmBackupReplace').disabled && $('#restoreBackup').disabled);
    check('restaurar exige confirmação explícita',!restoreCollectionBackup() && JSON.stringify(data)===beforeImport);
    await previewBackupFile(new File(['invalid'],'invalido.json',{type:'application/json'}));
    check('arquivo inválido limpa prévia e bloqueia restauração',pendingCollectionBackup===null && $('#confirmBackupReplace').disabled && $('#restoreBackup').disabled && $('#backupPreview').textContent.includes('JSON válido'));
    const outdated={name:'anterior.json',size:10,text:()=>new Promise(resolve=>setTimeout(()=>resolve(JSON.stringify(backup)),20))};
    const oldRead=previewBackupFile(outdated);
    await previewBackupFile(new File(['invalid'],'novo.json',{type:'application/json'}));await oldRead;
    check('leitura antiga não substitui prévia do último arquivo selecionado',pendingCollectionBackup===null && $('#backupPreview').textContent.includes('JSON válido'));
    await previewBackupFile(new File([JSON.stringify(backup)],'colecao.json',{type:'application/json'}));
    $('#confirmBackupReplace').checked=true;$('#confirmBackupReplace').dispatchEvent(new Event('change'));
    Storage.prototype.setItem=function(key,value){if(key===STORAGE_KEY)throw new DOMException('Full','QuotaExceededError');return originalSetItem.call(this,key,value);};
    try {check('falha de armazenamento na restauração preserva coleção e prévia',!restoreCollectionBackup() && JSON.stringify(data)===beforeImport && !$('#settingsSection').hidden && pendingCollectionBackup);}finally{Storage.prototype.setItem=originalSetItem;}
    check('backup nas configurações cabe na tela',fits('#backupPanel'));
    check('restaurar confirmação válida aplica dados e retorna à coleção',restoreCollectionBackup() && $('#settingsSection').hidden && JSON.parse(localStorage.getItem(STORAGE_KEY)).vehicles.length===backup.data.vehicles.length);
    const exported=[];const createUrl=URL.createObjectURL, revokeUrl=URL.revokeObjectURL, click=HTMLAnchorElement.prototype.click;
    URL.createObjectURL=function(blob){exported.push(blob);return createUrl.call(URL,blob);};HTMLAnchorElement.prototype.click=function(){exported.push(this.download);};
    try {$('#exportBackup').click();check('exportação cria JSON baixável com a coleção completa',exported[0] instanceof Blob && exported[1].startsWith('los-santos-garage-') && JSON.parse(await exported[0].text()).data.vehicles.length===data.vehicles.length);}finally{URL.createObjectURL=createUrl;URL.revokeObjectURL=revokeUrl;HTMLAnchorElement.prototype.click=click;}
  } finally {
    for(const id of ['wishlistDialog','compareDialog','batchMoveDialog','vehicleDialog']) if($("#"+id).open)$("#"+id).close();
    if(!$('#vehicleDetailsDialog').hidden)closeVehiclePortfolio();
    data=previous;selectedGarage=previousGarage;currentFilter=previousFilter;batchSelection.clear();
    $('#garageThemeFilter').value='all';$('#searchInput').value='';$('#categoryFilter').value='all';
    if(previousStorage===null)localStorage.removeItem(STORAGE_KEY);else localStorage.setItem(STORAGE_KEY,previousStorage);
    render();dismissToast();
  }
}
