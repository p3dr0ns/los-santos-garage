async function checkCollectionPlus(check) {
  const snapshot=structuredClone(data),key=STORAGE_KEY,stored=localStorage.getItem(key),profilesRaw=localStorage.getItem(PROFILE_KEY),originalProfileId=sessionProfileId;
  const recoveryRaw=localStorage.getItem(`${key}-recovery`),known=new Map(storageSession.known),undo=[...storageSession.undo];
  const rejects=value=>{try{parseCollectionBackup(JSON.stringify(value));return false;}catch{return true;}};
  const previousTheme=localStorage.getItem(WORKSHOP_THEME_KEY);
  try {
    // Other tests restore localStorage directly; establish the known baseline explicitly.
    storageSession.known.set(key,stored);storageSession.blocked=false;storageSession.undo=[];
    data={garages:[{id:"plus-a",name:"JDM",type:"garage",capacity:10,tags:["Drift"]},{id:"plus-b",name:"Destino",type:"garage",capacity:10}],vehicles:[
      {id:"plus-v1",name:"Zentorno",catalogId:"zentorno",brand:"Pegassi",category:"Super",garageId:"plus-a",favorite:false},
      {id:"plus-v2",name:"Zentorno",catalogId:"zentorno",brand:"Pegassi",category:"Super",garageId:null},
      {id:"plus-v3",name:"Adder",catalogId:"adder",brand:"Truffade",category:"Super",garageId:"plus-a"},
      {id:"plus-v4",name:"Sedã customizado",brand:"Minha marca",category:"Sedã",garageId:null}
    ]};selectedGarage=null;currentFilter="vehicles";saveData();
    check("coleção sem controles de configuração no cabeçalho",!$('.collection-toolbar #collectionProfile') && !$('.topbar #installApp') && $('#settingsSection').hidden && !$('#backupPanel').getClientRects().length && !$('#backupReminder').getClientRects().length);
    $('[data-filter="settings"]').click();
    check("configurações reúnem perfis aplicativo e backup",!$('#settingsSection').hidden && $('#settingsSection').contains($('#collectionProfile')) && $('#settingsSection').contains($('#installApp')) && $('#settingsSection').contains($('#backupPanel')) && $('.collection-toolbar').hidden && $('.top-actions').hidden && $('#vehicleSection').hidden && document.activeElement.id==='pageTitle');
    check("configurações cabem na tela",document.documentElement.scrollWidth<=innerWidth+1 && $('#settingsSection').scrollWidth<=$('#settingsSection').clientWidth+1);
    const collectionBeforeTheme=JSON.stringify(data);
    for(const theme of WORKSHOP_THEMES) {
      $(`[data-workshop-choice="${theme.id}"]`).click();
      check(`tema ${theme.id} muda identidade e persiste`,document.documentElement.dataset.workshopTheme===theme.id && localStorage.getItem(WORKSHOP_THEME_KEY)===theme.id && $('#lsgBrandBanner').getAttribute('aria-label').includes(theme.name) && $$('[data-workshop-choice][aria-pressed=true]').length===1);
      check(`seletor ${theme.id} cabe no celular`,document.documentElement.scrollWidth<=innerWidth+1 && $('#workshopThemeChoices').scrollWidth<=$('#workshopThemeChoices').clientWidth+1);
    }
    check("trocar tema preserva coleção e decorações",JSON.stringify(data)===collectionBeforeTheme);
    const themeBeforeInvalid=document.documentElement.dataset.workshopTheme;
    check("tema desconhecido não é aplicado",!applyWorkshopTheme('invalid') && document.documentElement.dataset.workshopTheme===themeBeforeInvalid);
    const originalThemeSet=Storage.prototype.setItem;
    try {Storage.prototype.setItem=function(){throw new Error('Full');};check("falha ao salvar tema mantém preferência anterior",!applyWorkshopTheme('bennys') && document.documentElement.dataset.workshopTheme===themeBeforeInvalid);}finally{Storage.prototype.setItem=originalThemeSet;}
    localStorage.setItem(WORKSHOP_THEME_KEY,'invalid');check("preferência desconhecida usa Garage V",readWorkshopTheme().id==='garage-v');
    localStorage.setItem(WORKSHOP_THEME_KEY,'lsc');applyWorkshopTheme(readWorkshopTheme().id,false);
    check("escolha anterior de oficina é preservada",readWorkshopTheme().id==='lsc' && $('.brand-logo').getAttribute('src')==='assets/logo-los-santos-customs.png');
    localStorage.setItem(WORKSHOP_THEME_KEY,'garage-v');applyWorkshopTheme('garage-v',false);
    await $('.lsg-banner-logo').decode();
    $('[data-filter="all"]').click();
    check("logo Garage V carrega e aparece no tema padrão",$('.lsg-banner-logo').naturalWidth>0 && $('.lsg-banner-logo').getClientRects().length>0 && (innerWidth<=760 || $('.brand-logo').getClientRects().length>0));
    $('[data-filter="settings"]').click();
    const stalePreview=previewBackupFile({name:'anterior.json',size:10,text:()=>new Promise(resolve=>setTimeout(()=>resolve(JSON.stringify(makeCollectionBackup())),30))});
    $('[data-filter="vehicles"]').click();await stalePreview;
    check("sair das configurações invalida restauração pendente",pendingCollectionBackup===null && $('#restoreBackup').disabled && $('#settingsSection').hidden && !$('.top-actions').hidden);
    for(const view of ['all','garages','favorites']) {
      $(`[data-filter="${view}"]`).click();
      check(`desejos e comparação ficam fora de ${view}`,$('.collection-toolbar').hidden && !$('#openWishlist').getClientRects().length && !$('#openCompare').getClientRects().length);
    }
    $('[data-filter="vehicles"]').click();
    check("aba veículos oferece desejos e comparação",!$('.collection-toolbar').hidden && $('#openWishlist').getClientRects().length>0 && $('#openCompare').getClientRects().length>0);
    $("#searchInput").value="seda";renderVehicles();check("busca ignora acentos",$("#vehicleResultCount").textContent==="1");$("#searchInput").value="";
    $("#vehicleScope").value="unassigned";renderVehicles();check("filtro sem garagem",$$('.vehicle-card').length===2);
    $("#vehicleScope").value="duplicates";renderVehicles();check("filtro de modelos repetidos",$$('.vehicle-card').length===2 && $$('.vehicle-card').every(c=>c.getAttribute('aria-label').includes('Zentorno')));
    $("#vehicleScope").value="all";$("#vehicleBrandFilter").value="Truffade";renderVehicles();check("filtro por marca",$$('.vehicle-card').length===1);$("#vehicleBrandFilter").value="all";
    $("#vehicleSort").value="name";renderVehicles();check("ordenação alfabética",$$('.vehicle-card')[0].dataset.vehicleId==="plus-v3");
    $("#vehicleSort").value="price-desc";renderVehicles();check("preço ausente fica ao final",$$('.vehicle-card').at(-1).dataset.vehicleId==="plus-v4");
    data.vehicles[0].favorite=true;saveData();$("#undoCollection").click();check("desfazer restaura alteração anterior",!data.vehicles[0].favorite && JSON.parse(localStorage.getItem(key)).vehicles[0].favorite===false);
    openVehicleDialog('plus-v1');$('#deleteVehicleButton').click();$('#confirmDeleteVehicle').click();$('#undoCollection').click();check("desfazer recupera veículo excluído",data.vehicles.some(v=>v.id==='plus-v1'));
    transferBatch(new Set(['plus-v1']),'plus-b');$('#undoCollection').click();check("desfazer recupera garagem de transferência",data.vehicles.find(v=>v.id==='plus-v1').garageId==='plus-a');
    openProject('plus-v1');$('#purchasePrice').value='123456';$('#modificationCost').value='2500';$('#purchaseForm').requestSubmit();
    $('#taskName').value='Motor nível 4';$('#taskCost').value='10000';$('#taskForm').requestSubmit();
    check("tuning salva tarefa e orçamento",data.vehicles[0].tuning.length===1 && $('#projectBudget').textContent.includes('10.000'));
    const checkbox=$('[data-task-toggle]');checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));
    check("tarefa concluída entra no custo real",getActualCost(data.vehicles[0])===135956);
    check("custo real não altera valor de catálogo",getVehicleValuation([data.vehicles[0]]).total===VEHICLE_REFERENCE.zentorno.price);
    $('#projectDialog').close();
    const goal={id:'plus-goal',name:'Todos os Pegassi',type:'brand',value:'Pegassi',target:null};data.goals=[goal];
    const progress=goalProgress(goal);check("meta conta modelos únicos",progress.count===1 && progress.total===vehicleModels.filter(m=>m.brand==='Pegassi').length);
    check("meta de garagem usa capacidade",goalProgress({type:'garage',value:'plus-a'}).total===10);
    $('#openGoals').click();$('#goalName').value='Minha garagem';$('#goalType').value='garage';renderGoalOptions();$('#goalValue').value='plus-a';$('#goalTarget').value='2';$('#goalForm').requestSubmit();
    check("criar meta pelo formulário",data.goals.length===2 && data.goals[1].target===2);
    check("metas cabem na tela",$('#goalsDialog').scrollWidth<=$('#goalsDialog').clientWidth+1);$('#goalsDialog').close();
    const parsed=parseCollectionBackup(JSON.stringify(makeCollectionBackup()));
    check("backup preserva custos tuning e metas",parsed.vehicles[0].purchasePrice===123456 && parsed.vehicles[0].tuning[0].done && parsed.goals.length===2);
    const invalid=structuredClone(makeCollectionBackup());invalid.data.vehicles[0].purchasePrice=-1;check("backup rejeita custo negativo",rejects(invalid));
    invalid.data.vehicles[0].purchasePrice=0;invalid.data.vehicles[0].tuning[0].done='sim';check("backup rejeita tarefa malformada",rejects(invalid));
    invalid.data.vehicles[0].tuning=[];invalid.data.goals[0].target=0;check("backup rejeita meta inválida",rejects(invalid));
    const image=await createGarageImage('plus-a');check("imagem compartilhável contém PNG válido",image.blob.type==='image/png' && image.blob.size>1000 && image.canvas.width===1200);
    // A storage event must stop a stale tab from overwriting changes.
    const foreign=structuredClone(data);foreign.vehicles[0].name='Versão da outra aba';const foreignRaw=JSON.stringify(foreign);localStorage.setItem(key,foreignRaw);
    window.dispatchEvent(new StorageEvent('storage',{key,newValue:foreignRaw}));
    check("outra aba bloqueia gravação",!saveData() && localStorage.getItem(key)===foreignRaw && !$('#storageNotice').hidden);
    $('#loadOtherTab').click();check("carregar outra aba resolve conflito",data.vehicles[0].name==='Versão da outra aba' && !storageSession.blocked);
    $('[data-filter="settings"]').click();$('#previewRecovery').click();
    const previewDeadline=Date.now()+5000;while(!pendingCollectionBackup && Date.now()<previewDeadline)await new Promise(resolve=>setTimeout(resolve,20));
    check("versão anterior pode ser conferida sem substituir coleção",pendingCollectionBackup && $('#restoreBackup').disabled && data.vehicles[0].name==='Versão da outra aba');$('[data-filter="vehicles"]').click();
    // Malformed stored data never silently replaces a collection.
    localStorage.setItem(`${key}-recovery`,JSON.stringify(data));localStorage.setItem(key,'{"garages":{}}');
    const recovered=loadData();check("armazenamento malformado não quebra inicialização",recovered.vehicles.length===4 && storageSession.blocked);
    check("original danificado permanece preservado",localStorage.getItem(key)==='{"garages":{}}');
    $('#recoverCollection').click();check("recuperação explícita restaura cópia válida",!storageSession.blocked && JSON.parse(localStorage.getItem(key)).vehicles.length===4 && localStorage.getItem(`${key}-preserved`)==='{"garages":{}}');
    const originalSet=Storage.prototype.setItem,before=localStorage.getItem(key);
    try{Storage.prototype.setItem=function(){throw new Error('QuotaExceededError');};check("falha ao salvar mantém versão persistida",!saveData() && localStorage.getItem(key)===before);}finally{Storage.prototype.setItem=originalSet;}
    const active=readProfiles().active;$('#manageProfiles').click();$('#profileName').value='Personagem 2 · PC';$('#profileForm').requestSubmit();
    const created=readProfiles().active;check("novo perfil inicia vazio",created!==active && data.vehicles.length===0 && data.garages.length===0);
    data.vehicles.push({id:'profile-test',name:'Sultan',category:'Esportivo'});saveData();
    $('#undoCollection').click();check("primeira alteração também pode ser desfeita",data.vehicles.length===0);data.vehicles.push({id:'profile-test',name:'Sultan',category:'Esportivo'});saveData();
    switchProfile(active);check("perfil original mantém seus dados",data.vehicles.length===4);
    const otherProfiles=readProfiles();otherProfiles.active=created;localStorage.setItem(PROFILE_KEY,JSON.stringify(otherProfiles));window.dispatchEvent(new StorageEvent('storage',{key:PROFILE_KEY}));
    check("troca de perfil em outra aba não muda coleção desta aba",readProfiles().active===active && STORAGE_KEY===key && !storageSession.blocked);
    switchProfile(created);check("perfil secundário mantém dados isolados",data.vehicles.length===1 && data.vehicles[0].id==='profile-test');
    switchProfile(active);localStorage.removeItem(profileStorageKey(created));localStorage.removeItem(`${profileStorageKey(created)}-recovery`);
    check("perfil e ferramentas cabem em celular",document.documentElement.scrollWidth<=innerWidth+1);
  } finally {
    if(previousTheme===null)localStorage.removeItem(WORKSHOP_THEME_KEY);else localStorage.setItem(WORKSHOP_THEME_KEY,previousTheme);
    applyWorkshopTheme(readWorkshopTheme().id,false);
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    if(profilesRaw===null)localStorage.removeItem(PROFILE_KEY);else localStorage.setItem(PROFILE_KEY,profilesRaw);
    STORAGE_KEY=key;
    sessionProfileId=originalProfileId;
    if(stored===null)localStorage.removeItem(key);else localStorage.setItem(key,stored);
    if(recoveryRaw===null)localStorage.removeItem(`${key}-recovery`);else localStorage.setItem(`${key}-recovery`,recoveryRaw);
    storageSession.known=known;storageSession.known.set(key,stored);storageSession.undo=undo;storageSession.blocked=false;storageSession.notice='';
    applyCollectionState(snapshot);
  }
}
