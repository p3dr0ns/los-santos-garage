// Collection planning and local data controls. No account or external data storage.
const plus = { projectId: null, installPrompt: null, shareBlob: null, shareSequence: 0 };
const plusMoney = value => `GTA$ ${Number(value || 0).toLocaleString("pt-BR", {maximumFractionDigits:2})}`;
const plusEscape = value => toolAttr(value);
const downloadFile = (blob, name) => {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function plusDialog(id, title, body) {
  document.body.insertAdjacentHTML("beforeend", `<dialog id="${id}" class="plus-dialog" aria-labelledby="${id}Title"><div class="dialog-form"><div class="dialog-heading"><h2 id="${id}Title">${title}</h2><button type="button" class="icon-button" data-plus-close="${id}" aria-label="Fechar">×</button></div>${body}</div></dialog>`);
}
$("#settingsProfileControls").insertAdjacentHTML("beforeend", `<label>Coleção / personagem<select id="collectionProfile" aria-label="Coleção ativa"></select></label><button type="button" class="secondary-button" id="manageProfiles">Gerenciar perfis</button>`);
$("#settingsAppControls").insertAdjacentHTML("beforeend", `<button type="button" class="secondary-button" id="installApp" hidden>Instalar aplicativo</button><span id="offlineStatus" class="tool-hint" role="status"></span>`);
$(".vehicle-display-tools").insertAdjacentHTML("beforeend", `<button type="button" class="secondary-button" id="undoCollection" title="Desfazer última alteração na coleção" disabled>Desfazer</button>`);
$(".collection-toolbar").insertAdjacentHTML("beforebegin", `<section class="plus-notice" id="storageNotice" role="status" hidden><p id="storageNoticeText"></p><button type="button" class="secondary-button" id="reviewStorageSettings">Revisar nas configurações</button></section>`);
$("#settingsSection").append($("#backupPanel"));
$("#backupPanel").hidden=false;
$("#backupPanel .dialog-form").insertAdjacentHTML("afterbegin", `<section class="plus-notice" id="backupReminder" hidden><p>Proteja esta coleção: baixe um backup. As cópias locais também podem ser apagadas ao limpar os dados do navegador.</p></section><section class="plus-notice" id="settingsStorageActions" hidden><p id="settingsStorageText"></p><div class="plus-actions"><button type="button" class="secondary-button" id="downloadLocalCopy">Baixar minha cópia</button><button type="button" class="secondary-button" id="downloadStoredCopy">Baixar original salvo</button><button type="button" class="secondary-button" id="loadOtherTab">Carregar versão salva</button><button type="button" class="secondary-button" id="recoverCollection">Recuperar última versão válida</button></div></section>`);
$(".collection-toolbar").insertAdjacentHTML("beforeend", `<button type="button" class="secondary-button" id="openGoals">Metas da coleção</button>`);
$(".stats").insertAdjacentHTML("afterend", `<p class="plus-cost" id="actualCollectionCost"></p>`);
$("#vehicleGrid").insertAdjacentHTML("beforebegin", `<div class="plus-filters"><label>Mostrar<select id="vehicleScope"><option value="all">Todos os veículos</option><option value="unassigned">Sem garagem</option><option value="duplicates">Modelos repetidos</option><option value="projects">Com projeto de tuning</option></select></label><label>Marca<select id="vehicleBrandFilter"><option value="all">Todas as marcas</option></select></label><label>Ordenar por<select id="vehicleSort"><option value="recent">Ordem de cadastro</option><option value="name">Nome (A–Z)</option><option value="brand">Marca (A–Z)</option><option value="price-desc">Preço de catálogo: maior</option><option value="price-asc">Preço de catálogo: menor</option><option value="paid-desc">Gasto registrado: maior</option></select></label></div>`);
$("#garageDetailActions").insertAdjacentHTML("beforeend", `<button type="button" class="secondary-button" id="shareGarage">Compartilhar garagem</button>`);
$("#detailsNotes").insertAdjacentHTML("afterend", `<section class="plus-cost"><h2>Compra e projeto de tuning</h2><p id="vehicleProjectSummary"></p><button type="button" class="secondary-button" id="openVehicleProject">Editar custos e modificações</button></section>`);
$("#settingsOfflineControls").insertAdjacentHTML("beforeend", `<section class="backup-panel"><h3>Imagens e mapa offline</h3><p class="tool-hint">O aplicativo salva as imagens visitadas automaticamente. Para levar todo o catálogo e o mapa para um lugar sem internet, baixe as imagens agora (aproximadamente 110 MB). Isso não substitui o backup da coleção.</p><button type="button" class="secondary-button" id="prepareOffline">Baixar imagens para uso offline</button><p class="tool-hint" id="offlineDownloadStatus" role="status"></p></section>`);
$("#backupPanel .dialog-form").insertAdjacentHTML("beforeend", `<section class="backup-panel"><h3>Versão local anterior</h3><p class="tool-hint">Confira a cópia anterior à última gravação, mesmo depois de reabrir o navegador. A prévia usa a confirmação de restauração acima. Uma nova gravação atualiza essa cópia.</p><button type="button" class="secondary-button" id="previewRecovery">Conferir versão anterior</button></section>`);

plusDialog("profilesDialog", "Perfis da coleção", `<p class="tool-hint">Cada perfil tem seus próprios veículos, garagens, desejos e metas. O backup exporta o perfil ativo. Crie um perfil para cada personagem ou plataforma.</p><form id="profileForm"><label>Nome do novo perfil<input id="profileName" required maxlength="100" placeholder="Ex.: Personagem 2 · PS5"></label><button class="primary-button">Criar perfil vazio</button></form><form id="renameProfileForm"><label>Renomear perfil ativo<input id="profileRename" required maxlength="100"></label><button class="secondary-button">Salvar nome</button></form><p id="profileError" class="plus-error" role="status"></p>`);
plusDialog("projectDialog", "Compra e projeto de tuning", `<h3 id="projectVehicleName"></h3><form id="purchaseForm"><label>Preço pago pelo veículo (GTA$)<input id="purchasePrice" type="number" min="0" max="10000000000" step="0.01" placeholder="Não informado"></label><label>Outras modificações já pagas (GTA$)<input id="modificationCost" type="number" min="0" max="10000000000" step="0.01" placeholder="Não informado"></label><p class="tool-hint">Inclua aqui gastos anteriores que não estão nas tarefas abaixo. Tarefas concluídas são somadas automaticamente; não registre o mesmo gasto duas vezes.</p><button class="primary-button">Salvar custos</button></form><p id="projectBudget" class="tool-hint" role="status"></p><h3>Modificações planejadas</h3><div id="projectTasks"></div><form id="taskForm"><label>Modificação<input id="taskName" required maxlength="150" placeholder="Ex.: Motor nível 4"></label><label>Orçamento (GTA$)<input id="taskCost" type="number" min="0" max="10000000000" step="0.01" required></label><button class="secondary-button">Adicionar modificação</button></form><p id="projectError" class="plus-error" role="status"></p>`);
plusDialog("goalsDialog", "Metas da coleção", `<p class="tool-hint">Complete marcas, categorias ou a ocupação de uma garagem. Marcas e categorias contam modelos diferentes; cópias repetidas não aumentam o progresso.</p><div id="collectionGoals"></div><form id="goalForm"><label>Nome da meta<input id="goalName" required maxlength="150" placeholder="Ex.: Todos os Pegassi"></label><label>Tipo<select id="goalType"><option value="brand">Completar uma marca</option><option value="category">Completar uma categoria</option><option value="garage">Preencher uma garagem</option></select></label><label>Objetivo<select id="goalValue" required></select></label><label>Quantidade desejada (opcional)<input id="goalTarget" type="number" min="1" max="20000" step="1" placeholder="Vazio: todos os modelos ou vagas"></label><button class="primary-button">Criar meta</button></form><p id="goalError" class="plus-error" role="status"></p>`);
plusDialog("shareDialog", "Compartilhar garagem", `<p class="tool-hint">A imagem contém o nome da garagem, o tema e seus veículos. Confira antes de compartilhar.</p><p id="shareStatus" role="status"></p><canvas id="garageShareCanvas" aria-label="Prévia da imagem da garagem"></canvas><div class="plus-actions"><button type="button" class="primary-button" id="downloadGarageImage" disabled>Baixar imagem PNG</button><button type="button" class="secondary-button" id="nativeShareGarage" hidden>Compartilhar imagem</button></div>`);
document.addEventListener("click", event => { const button=event.target.closest("[data-plus-close]"); if(button) $("#"+button.dataset.plusClose).close(); });

function getActualCost(vehicle) {
  return (vehicle.purchasePrice || 0) + (vehicle.modificationCost || 0) + (vehicle.tuning || []).filter(t => t.done).reduce((sum,t) => sum+t.cost,0);
}
function modelIdentity(vehicle) { return findCatalogVehicle(vehicle.name,vehicle.catalogId)?.id || normalizeVehicleText(`${vehicle.brand || ""} ${vehicle.name}`); }
function catalogPrice(vehicle) { const model=findCatalogVehicle(vehicle.name,vehicle.catalogId),price=model?VEHICLE_REFERENCE[model.id]?.price:null; return moneyValue(price)?price:null; }
function organizeVehicles(vehicles) {
  if (!$("#vehicleScope")) return vehicles;
  const scope=$("#vehicleScope").value, brand=$("#vehicleBrandFilter").value;
  const counts=new Map(); data.vehicles.forEach(v=>counts.set(modelIdentity(v),(counts.get(modelIdentity(v))||0)+1));
  const result=vehicles.filter(v=>(scope!=="unassigned" || !getGarage(v.garageId)) && (scope!=="duplicates" || counts.get(modelIdentity(v))>1) && (scope!=="projects" || v.tuning?.length) && (brand==="all" || getBrand(v)===brand));
  const sort=$("#vehicleSort").value;
  if(sort==="name" || sort==="brand") result.sort((a,b)=>(sort==="name"?a.name:getBrand(a)).localeCompare(sort==="name"?b.name:getBrand(b),"pt-BR") || a.name.localeCompare(b.name,"pt-BR"));
  if(sort==="paid-desc") result.sort((a,b)=>getActualCost(b)-getActualCost(a));
  if(sort.startsWith("price-")) result.sort((a,b)=>{const pa=catalogPrice(a),pb=catalogPrice(b);return pa==null?(pb==null?0:1):pb==null?-1:sort==="price-asc"?pa-pb:pb-pa;});
  return result;
}
function renderStorageNotice() {
  $("#storageNotice").hidden=!storageSession.blocked || currentFilter==="settings";
  $("#storageNoticeText").textContent=storageSession.notice;
  $("#settingsStorageActions").hidden=!storageSession.blocked;
  $("#settingsStorageText").textContent=storageSession.notice;
  $("#undoCollection").disabled=storageSession.blocked || !storageSession.undo.length;
}
function renderEnhancements() {
  if (!$("#collectionProfile")) return;
  const profiles=readProfiles();
  $("#collectionProfile").replaceChildren(...profiles.items.map(p=>new Option(p.name,p.id)));
  $("#collectionProfile").value=profiles.active;
  const brandSelect=$("#vehicleBrandFilter"), previous=brandSelect.value;
  brandSelect.replaceChildren(new Option("Todas as marcas","all"),...[...new Set(data.vehicles.map(getBrand))].sort((a,b)=>a.localeCompare(b,"pt-BR")).map(b=>new Option(b,b)));
  brandSelect.value=[...brandSelect.options].some(o=>o.value===previous)?previous:"all";
  const known=data.vehicles.filter(v=>v.purchasePrice!=null || v.modificationCost!=null || v.tuning?.some(t=>t.done));
  $("#actualCollectionCost").hidden=currentFilter!=="all";
  $("#actualCollectionCost").textContent=`Gastos registrados: ${plusMoney(data.vehicles.reduce((s,v)=>s+getActualCost(v),0))} · ${known.length} de ${data.vehicles.length} veículos com custos informados. Valor de catálogo exibido separadamente acima.`;
  let lastBackup=0; try { lastBackup=Number(localStorage.getItem(`${STORAGE_KEY}-backup-at`)) || 0; } catch {}
  $("#backupReminder").hidden=!data.vehicles.length || Date.now()-lastBackup < 7*86400000;
  renderStorageNotice();
}
for (const id of ["vehicleScope","vehicleBrandFilter","vehicleSort"]) $("#"+id).addEventListener("change",renderVehicles);
$("#reviewStorageSettings").addEventListener("click",()=>{$('[data-filter="settings"]').click();$("#settingsStorageActions").scrollIntoView({block:"center"});});
$("#exportBackup").addEventListener("click",()=>{try{localStorage.setItem(`${STORAGE_KEY}-backup-at`,String(Date.now()));renderEnhancements();}catch{}});
function offlineImagePaths() {
  const paths=[...Object.values(VEHICLE_IMAGES),...Object.values(PROPERTY_IMAGES),...Object.values(INTERIOR_IMAGES)].map(i=>i.image);
  Object.values(garageTypes).forEach((type,index)=>paths.push(`assets/blips/${type.icon||Object.keys(garageTypes)[index]}.png`));
  // Only the shipped blips are needed; special types reuse the garage/warehouse icons.
  return [...new Set(paths.filter(Boolean).concat(Array.from({length:121},(_,i)=>`assets/map/${Math.floor(i/11)}-${i%11}.png`)))];
}
$("#prepareOffline").addEventListener("click",async()=>{
  const button=$("#prepareOffline"),status=$("#offlineDownloadStatus");
  if(location.protocol==="file:" || !("serviceWorker" in navigator)){status.textContent="Abra o site publicado para preparar o acesso offline.";return;}
  button.disabled=true;
  try{
    await navigator.serviceWorker.ready;const cache=await caches.open("lsg-images-v1"),paths=offlineImagePaths();let completed=0;
    const queue=[...paths];
    const workers=await Promise.allSettled(Array.from({length:4},async()=>{while(queue.length){const path=queue.shift();if(!(await cache.match(path))){const response=await fetch(path);if(!response.ok)throw new Error("Falha ao baixar uma imagem. Tente novamente com internet.");await cache.put(path,response);}completed++;status.textContent=`${completed}/${paths.length} imagens disponíveis offline.`;}}));
    const failure=workers.find(result=>result.status==="rejected");if(failure)throw failure.reason;
    status.textContent="Catálogo, fachadas, interiores e mapa prontos para uso offline.";
  }catch(error){status.textContent=error.name==="QuotaExceededError"?"Espaço insuficiente. As imagens já baixadas foram mantidas.":"Download interrompido. Verifique a conexão e o espaço do navegador; tente novamente para continuar.";}
  finally{button.disabled=false;}
});
$("#downloadLocalCopy").addEventListener("click",()=>downloadFile(new Blob([JSON.stringify(makeCollectionBackup(),null,2)],{type:"application/json"}),"colecao-desta-aba.json"));
$("#downloadStoredCopy").addEventListener("click",()=>{try{downloadFile(new Blob([localStorage.getItem(STORAGE_KEY)||""],{type:"application/json"}),"colecao-original.json");}catch{showToast("Não foi possível ler o armazenamento.","error");}});
$("#previewRecovery").addEventListener("click",async()=>{
  try{const raw=localStorage.getItem(`${STORAGE_KEY}-recovery`);if(raw===null)throw new Error("Ainda não há uma versão anterior neste perfil.");await previewBackupFile(new File([raw],"versao-local-anterior.json",{type:"application/json"}));$("#backupPreview").scrollIntoView({block:"center"});}
  catch(error){$("#backupPreview").textContent=error.message;resetBackupPreview();}
});
function applyCollectionState(next) {
  document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  if(typeof closeVehiclePortfolio==="function") closeVehiclePortfolio();
  data=next; selectedGarage=null; currentFilter="all";setActiveNav("all");
  $("#searchInput").value="";$("#categoryFilter").value="all";$("#garageThemeFilter").value="all";
  $("#vehicleScope").value="all";$("#vehicleBrandFilter").value="all";$("#vehicleSort").value="recent";
  if(typeof batchSelection!=="undefined") batchSelection.clear();
  clearBackupSelection();render();
}
$("#loadOtherTab").addEventListener("click",()=>{
  try { const next=parseCollectionBackup(localStorage.getItem(STORAGE_KEY));storageSession.blocked=false;storageSession.notice="";storageSession.undo=[];storageSession.known.set(STORAGE_KEY,localStorage.getItem(STORAGE_KEY));applyCollectionState(next);showToast("Versão salva carregada."); }
  catch {showToast("A versão salva não é válida. Baixe o original e tente recuperar a cópia local.","error");}
});
$("#recoverCollection").addEventListener("click",()=>{
  try {
    const raw=localStorage.getItem(`${STORAGE_KEY}-recovery`),next=parseCollectionBackup(raw);
    const original=localStorage.getItem(STORAGE_KEY);
    // Preserve a corrupt/conflicting original before explicitly replacing it.
    if(original!==null) localStorage.setItem(`${STORAGE_KEY}-preserved`,original);
    persistCollection(STORAGE_KEY,next,{resolve:true});applyCollectionState(next);showToast("Última versão válida recuperada.","success");
  } catch {showToast("Não foi possível recuperar. O original foi mantido; importe um backup para restaurar.","error");}
});
$("#undoCollection").addEventListener("click",()=>{
  const raw=storageSession.undo.at(-1);if(!raw)return;
  try {const next=parseCollectionBackup(raw);persistCollection(STORAGE_KEY,next,{noUndo:true});storageSession.undo.pop();applyCollectionState(next);showToast("Última alteração desfeita.","success");}
  catch(error){showToast(error.message,"error");}
});
window.addEventListener("storage",event=>{
  if(event.key===PROFILE_KEY){renderEnhancements();return;}
  if(event.key===STORAGE_KEY || event.key===null) {
    storageSession.blocked=true;storageSession.notice="Os dados mudaram em outra aba. Baixe sua cópia antes de carregar a versão salva. Para trocar de perfil, feche os formulários e selecione a coleção desejada.";renderStorageNotice();
  }
});
function switchProfile(id) {
  const profiles=readProfiles();if(!profiles.items.some(p=>p.id===id))return false;
  try {
    if([...document.querySelectorAll("dialog[open]")].some(d=>d.id!=="profilesDialog")) throw new Error("Feche os formulários antes de trocar de perfil.");
    const nextProfiles={...profiles,active:id};localStorage.setItem(PROFILE_KEY,JSON.stringify(nextProfiles));
    sessionProfileId=id;
    STORAGE_KEY=profileStorageKey(id);storageSession.blocked=false;storageSession.notice="";storageSession.undo=[];
    applyCollectionState(loadData());return true;
  }catch(error){showToast(error.message,"error");renderEnhancements();return false;}
}
$("#collectionProfile").addEventListener("change",event=>switchProfile(event.target.value));
$("#manageProfiles").addEventListener("click",()=>{$("#profileRename").value=readProfiles().items.find(p=>p.id===readProfiles().active).name;$("#profileError").textContent="";$("#profilesDialog").showModal();});
$("#profileForm").addEventListener("submit",event=>{
  event.preventDefault();const profiles=readProfiles(),name=$("#profileName").value.trim();if(!name)return;
  try{if(profiles.items.length>=50)throw new Error("Limite de 50 perfis atingido.");const id=crypto.randomUUID();profiles.items.push({id,name});localStorage.setItem(PROFILE_KEY,JSON.stringify(profiles));$("#profileName").value="";switchProfile(id);}catch(error){$("#profileError").textContent=error.message;}
});
$("#renameProfileForm").addEventListener("submit",event=>{event.preventDefault();const profiles=readProfiles(),name=$("#profileRename").value.trim();if(!name)return;try{profiles.items.find(p=>p.id===profiles.active).name=name;localStorage.setItem(PROFILE_KEY,JSON.stringify(profiles));renderEnhancements();$("#profilesDialog").close();}catch{$("#profileError").textContent="Não foi possível salvar o nome.";}});

function editProject(change) {
  const vehicle=data.vehicles.find(v=>v.id===plus.projectId);if(!vehicle)return false;
  const previous=structuredClone(vehicle);change(vehicle);
  if(!saveData("Projeto atualizado.")){Object.keys(vehicle).forEach(k=>delete vehicle[k]);Object.assign(vehicle,previous);return false;}
  renderProject();if(detailVehicleId===vehicle.id)renderVehicleDetails();return true;
}
function renderProject() {
  const vehicle=data.vehicles.find(v=>v.id===plus.projectId);if(!vehicle)return;
  $("#projectVehicleName").textContent=vehicle.name;
  $("#purchasePrice").value=vehicle.purchasePrice??"";$("#modificationCost").value=vehicle.modificationCost??"";
  const tasks=vehicle.tuning||[],pending=tasks.filter(t=>!t.done).reduce((s,t)=>s+t.cost,0);
  $("#projectBudget").textContent=`Gasto registrado: ${plusMoney(getActualCost(vehicle))}. Falta investir: ${plusMoney(pending)}. ${tasks.filter(t=>t.done).length}/${tasks.length} modificações concluídas.`;
  $("#projectTasks").innerHTML=tasks.length?tasks.map(t=>`<div class="plus-task"><label><input type="checkbox" data-task-toggle="${plusEscape(t.id)}" ${t.done?"checked":""}>${escapeHtml(t.name)}</label><small>${plusMoney(t.cost)}</small><button type="button" class="text-button" data-task-remove="${plusEscape(t.id)}" aria-label="Remover ${plusEscape(t.name)}">Remover</button></div>`).join(""):"<p class='tool-hint'>Nenhuma modificação planejada.</p>";
}
function openProject(id) {plus.projectId=id;$("#projectError").textContent="";$("#taskForm").reset();renderProject();$("#projectDialog").showModal();}
$("#openVehicleProject").addEventListener("click",()=>openProject(detailVehicleId));
$("#purchaseForm").addEventListener("submit",event=>{event.preventDefault();editProject(v=>{for(const [field,id] of [["purchasePrice","purchasePrice"],["modificationCost","modificationCost"]]){if($("#"+id).value==="")delete v[field];else v[field]=Number($("#"+id).value);}});});
$("#taskForm").addEventListener("submit",event=>{event.preventDefault();const name=$("#taskName").value.trim();if(!name)return;const vehicle=data.vehicles.find(v=>v.id===plus.projectId);if((vehicle?.tuning||[]).length>=100){$("#projectError").textContent="Limite de 100 modificações por veículo.";return;}if(editProject(v=>{v.tuning=[...(v.tuning||[]),{id:crypto.randomUUID(),name,cost:Number($("#taskCost").value),done:false}];}))$("#taskForm").reset();});
$("#projectTasks").addEventListener("change",event=>{const id=event.target.dataset.taskToggle;if(id)editProject(v=>{const task=v.tuning.find(t=>t.id===id);if(task)task.done=event.target.checked;});});
$("#projectTasks").addEventListener("click",event=>{const id=event.target.closest("[data-task-remove]")?.dataset.taskRemove;if(id)editProject(v=>{v.tuning=v.tuning.filter(t=>t.id!==id);});});

function goalProgress(goal) {
  if(goal.type==="garage") {const garage=getGarage(goal.value);return {count:data.vehicles.filter(v=>v.garageId===goal.value).length,total:goal.target||garage?.capacity||0,missing:!garage};}
  const models=vehicleModels.filter(m=>m[goal.type]===goal.value),wanted=new Set(models.map(m=>m.id));
  const owned=new Set(data.vehicles.map(v=>findCatalogVehicle(v.name,v.catalogId)?.id).filter(id=>wanted.has(id)));
  return {count:owned.size,total:goal.target||models.length,missing:!models.length};
}
function renderGoals() {
  $("#collectionGoals").innerHTML=(data.goals||[]).map(goal=>{const p=goalProgress(goal);return `<article class="plus-goal"><div class="plus-goal-title"><strong>${escapeHtml(goal.name)}</strong><button type="button" class="text-button" data-remove-goal="${plusEscape(goal.id)}" aria-label="Remover meta ${plusEscape(goal.name)}">Remover</button></div><p>${escapeHtml(goal.type==="garage"?garageLabel(getGarage(goal.value)):goal.value)} · ${p.count}/${p.total}${p.missing?" · Objetivo indisponível":p.count>=p.total?" · Meta concluída!":""}</p><progress max="${Math.max(1,p.total)}" value="${Math.min(p.count,p.total)}" aria-label="Progresso de ${plusEscape(goal.name)}"></progress></article>`;}).join("")||"<p class='tool-hint'>Crie sua primeira meta para acompanhar a coleção.</p>";
}
function renderGoalOptions() {const type=$("#goalType").value;$("#goalValue").replaceChildren(...(type==="garage"?data.garages.map(g=>new Option(garageLabel(g),g.id)):[...new Set(vehicleModels.map(m=>m[type]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR")).map(v=>new Option(v,v))));}
$("#openGoals").addEventListener("click",()=>{renderGoals();renderGoalOptions();$("#goalError").textContent="";$("#goalsDialog").showModal();});
$("#goalType").addEventListener("change",renderGoalOptions);
$("#goalForm").addEventListener("submit",event=>{
  event.preventDefault();const name=$("#goalName").value.trim(),value=$("#goalValue").value;if(!name||!value)return;
  if((data.goals||[]).length>=100){$("#goalError").textContent="Limite de 100 metas por perfil.";return;}
  const previous=data.goals;data.goals=[...(data.goals||[]),{id:crypto.randomUUID(),name,type:$("#goalType").value,value,target:$("#goalTarget").value?Number($("#goalTarget").value):null}];
  if(!saveData("Meta criada.")){data.goals=previous;return;}$("#goalName").value="";$("#goalTarget").value="";renderGoals();
});
$("#collectionGoals").addEventListener("click",event=>{const id=event.target.closest("[data-remove-goal]")?.dataset.removeGoal;if(!id)return;const previous=data.goals;data.goals=data.goals.filter(g=>g.id!==id);if(!saveData("Meta removida."))data.goals=previous;renderGoals();});

function canvasLine(ctx,text,x,y,maxWidth) {
  let line=String(text);while(line.length>1 && ctx.measureText(line).width>maxWidth)line=line.slice(0,-2)+"…";
  ctx.fillText(line,x,y);
}
async function createGarageImage(garageId) {
  const garage=getGarage(garageId);if(!garage)throw new Error("Selecione uma garagem.");
  const vehicles=data.vehicles.filter(v=>v.garageId===garageId).map(v=>({...v}));
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
  canvas.width=1200;canvas.height=230+Math.max(1,Math.ceil(vehicles.length/4))*215;
  ctx.fillStyle="#17171f";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#ecedeb";ctx.font="bold 46px sans-serif";canvasLine(ctx,garageLabel(garage),40,75,1120);
  ctx.font="22px sans-serif";ctx.fillStyle="#bfc3ce";canvasLine(ctx,`${vehicles.length} veículos · ${(garage.tags||[]).join(" · ") || "Minha coleção GTA Online"}`,40,120,1120);
  ctx.fillStyle="#aaa2da";ctx.fillText("GARAGE V",40,165);
  for(let i=0;i<vehicles.length;i++){
    const v=vehicles[i],x=40+(i%4)*285,y=200+Math.floor(i/4)*215;
    ctx.fillStyle="#272734";ctx.fillRect(x,y,265,195);
    const source=getVehicleImage(v);
    if(source && location.protocol!=="file:"){try{const image=new Image();image.src=source;await image.decode();const scale=Math.min(245/image.width,130/image.height);ctx.drawImage(image,x+(265-image.width*scale)/2,y+8+(130-image.height*scale)/2,image.width*scale,image.height*scale);}catch{}}
    ctx.font="bold 19px sans-serif";ctx.fillStyle="#ecedeb";canvasLine(ctx,v.name,x+12,y+160,241);
    ctx.font="15px sans-serif";ctx.fillStyle="#bfc3ce";canvasLine(ctx,v.category,x+12,y+183,241);
  }
  if(!vehicles.length){ctx.font="26px sans-serif";ctx.fillStyle="#bfc3ce";ctx.fillText("Garagem pronta para os próximos carros.",40,280);}
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));if(!blob)throw new Error("Não foi possível gerar a imagem.");return {canvas,blob};
}
$("#shareGarage").addEventListener("click",async()=>{
  const sequence=++plus.shareSequence;plus.shareBlob=null;$("#downloadGarageImage").disabled=true;$("#nativeShareGarage").hidden=true;$("#shareStatus").textContent="Preparando imagem…";$("#garageShareCanvas").hidden=true;$("#shareDialog").showModal();
    try{const result=await createGarageImage(selectedGarage);if(sequence!==plus.shareSequence)return;plus.shareBlob=result.blob;const preview=$("#garageShareCanvas");preview.width=result.canvas.width;preview.height=result.canvas.height;preview.getContext("2d").drawImage(result.canvas,0,0);preview.hidden=false;$("#shareStatus").textContent=location.protocol==="file:"?"Imagem pronta sem fotos. Para incluir fotos dos veículos, abra o site publicado.":"Imagem pronta para baixar.";$("#downloadGarageImage").disabled=false;$("#nativeShareGarage").hidden=!navigator.canShare?.({files:[new File([result.blob],"garagem.png",{type:"image/png"})]});}catch(error){$("#shareStatus").textContent=error.message;}
});
$("#shareDialog").addEventListener("close",()=>{plus.shareSequence++;});
$("#downloadGarageImage").addEventListener("click",()=>{if(plus.shareBlob)downloadFile(plus.shareBlob,"minha-garagem.png");});
$("#nativeShareGarage").addEventListener("click",async()=>{try{await navigator.share({files:[new File([plus.shareBlob],"minha-garagem.png",{type:"image/png"})]});}catch(error){if(error.name!=="AbortError")$("#shareStatus").textContent="Não foi possível compartilhar. Use Baixar imagem PNG.";}});

window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();plus.installPrompt=event;$("#installApp").hidden=false;});
$("#installApp").addEventListener("click",async()=>{if(plus.installPrompt){await plus.installPrompt.prompt();plus.installPrompt=null;$("#installApp").hidden=true;}});
if("serviceWorker" in navigator && ["https:","http:"].includes(location.protocol)) {
  navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(registration=>{
    const status=()=>{$("#offlineStatus").textContent=registration.active?"Aplicativo disponível offline":"Preparando acesso offline…";};status();
    registration.addEventListener("updatefound",()=>registration.installing?.addEventListener("statechange",status));
    navigator.serviceWorker.addEventListener("controllerchange",status);
    window.addEventListener("pageshow",()=>registration.update().catch(()=>{}));
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")registration.update().catch(()=>{});});
  }).catch(()=>{$("#offlineStatus").textContent="Acesso offline indisponível neste navegador.";});
}
renderEnhancements();
