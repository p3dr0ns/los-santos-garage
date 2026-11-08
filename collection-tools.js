const toolAttr = value => escapeHtml(String(value ?? "")).replaceAll('"', "&quot;");
const toolModelLabel = model => `${model.name} · ${model.brand || model.category}`;
const toolModel = value => vehicleModels.find(model => toolModelLabel(model) === value) || findCatalogVehicle(value);
const wishIds = () => Array.isArray(data.wishlist) ? data.wishlist : [];
const ownsModel = id => data.vehicles.some(vehicle => findCatalogVehicle(vehicle.name, vehicle.catalogId)?.id === id);
const moneyValue = value => typeof value === "number" && Number.isFinite(value) && value >= 0;

function renderCollectionTools() {
  $("#wishlistCount").textContent = wishIds().filter(id => !ownsModel(id)).length;
  $("#openBatchMove").disabled = !data.vehicles.length;
  if ($("#wishlistDialog").open) renderWishlist();
}

function getThemeFilteredGarages() {
  const select = $("#garageThemeFilter");
  const previous = select.value;
  const themes = new Map();
  data.garages.forEach(garage => (garage.tags || []).forEach(tag => {
    const key = normalizeVehicleText(tag);
    if (key && !themes.has(key)) themes.set(key, tag);
  }));
  select.replaceChildren(new Option("Todos os temas", "all"), new Option("Sem tema", "untagged"));
  [...themes].sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).forEach(([key, tag]) => select.add(new Option(tag, `tag:${key}`)));
  select.value = [...select.options].some(option => option.value === previous) ? previous : "all";
  const value = select.value;
  const garages = data.garages.filter(garage => value === "all" || (value === "untagged" ? !(garage.tags || []).length : (garage.tags || []).some(tag => `tag:${normalizeVehicleText(tag)}` === value)));
  $("#garageSectionCount").textContent = value === "all" ? garages.length : `${garages.length} de ${data.garages.length}`;
  return garages;
}
$("#garageThemeFilter").addEventListener("change", renderGarages);

$("#toolCatalogOptions").replaceChildren(...vehicleModels.map(model => new Option(toolModelLabel(model), toolModelLabel(model))));

function addWishlistModel(id) {
  if (!vehicleModels.some(model => model.id === id)) return false;
  if (wishIds().includes(id)) { showToast("Este modelo já está na lista de desejos."); return false; }
  const previous = data.wishlist;
  data.wishlist = [...wishIds(), id];
  if (!saveData("Modelo adicionado à lista de desejos.")) { data.wishlist = previous; return false; }
  return true;
}
function getWishlistBudget() {
  return getVehicleValuation(wishIds().filter(id => !ownsModel(id)).map(id => ({catalogId: id, name: ""})));
}
function renderWishlist() {
  const budget = getWishlistBudget();
  $("#wishlistBudget").textContent = valuationAmount(budget);
  $("#wishlistBudgetNote").textContent = `${budget.count} ${budget.count === 1 ? "modelo para comprar" : "modelos para comprar"} · ${valuationCoverage(budget)}`;
  $("#wishlistItems").innerHTML = wishIds().map(id => {
    const model = vehicleModels.find(item => item.id === id);
    if (!model) return "";
    const price = VEHICLE_REFERENCE[id]?.price;
    const owned = ownsModel(id);
    return `<article class="wishlist-card"><img src="${toolAttr(VEHICLE_IMAGES[id].image)}" alt="${toolAttr(model.name)}" loading="lazy"><div><h3>${escapeHtml(model.name)}</h3><p>${escapeHtml(model.brand)} · ${escapeHtml(model.category)}</p><p>${moneyValue(price) ? `GTA$ ${price.toLocaleString("pt-BR")}` : "Preço não informado"}${owned ? " · Já está na coleção" : ""}</p><div class="wishlist-card-actions"><button type="button" class="secondary-button" data-buy-wish="${toolAttr(id)}" ${owned ? "disabled" : ""}>${owned ? "Na coleção" : "Cadastrar compra"}</button><button type="button" class="text-button" data-remove-wish="${toolAttr(id)}" aria-label="Remover ${toolAttr(model.name)} da lista">Remover</button></div></div></article>`;
  }).join("") || '<p class="tool-hint">Sua próxima aquisição começa aqui. Busque um modelo acima para criar sua lista.</p>';
}
$("#openWishlist").addEventListener("click", () => { renderWishlist(); $("#wishlistDialog").showModal(); });
$("#wishlistForm").addEventListener("submit", event => {
  event.preventDefault();
  const model = toolModel($("#wishlistModel").value);
  if (!model) return showToast("Escolha um modelo da lista de sugestões.", "warning");
  if (addWishlistModel(model.id)) $("#wishlistModel").value = "";
});
$("#wishlistItems").addEventListener("click", event => {
  const remove = event.target.closest("[data-remove-wish]");
  if (remove) {
    const previous = data.wishlist;
    data.wishlist = wishIds().filter(id => id !== remove.dataset.removeWish);
    if (!saveData("Modelo removido da lista.")) data.wishlist = previous;
    return;
  }
  const buy = event.target.closest("[data-buy-wish]");
  if (!buy || buy.disabled) return;
  const model = vehicleModels.find(item => item.id === buy.dataset.buyWish);
  if (!model) return;
  $("#wishlistDialog").close();
  openVehicleDialog();
  $("#vehicleName").value = model.name;
  $("#vehicleName").dispatchEvent(new Event("input", {bubbles:true}));
  closeCatalogSuggestions();
});

function comparisonRows(a, b) {
  const refs = [a, b].map(model => VEHICLE_REFERENCE[model.id]);
  const metric = (label, get, unit, direction) => ({label, values: refs.map(ref => get(ref)), unit, direction});
  return [
    metric("Preço normal", ref => ref?.price, "money", "lower"),
    metric("Velocidade testada", ref => ref?.topSpeedKmh, "km/h", "higher"),
    ...[["speed","Velocidade"],["acceleration","Aceleração"],["braking","Frenagem"],["handling","Dirigibilidade"],["overall","Overall"]].map(([key,label]) => metric(label, ref => ref?.stats?.[key], "/ 100", "higher")),
    metric("Peso", ref => ref?.weightKg, "kg"),
    metric("Assentos", ref => ref?.seats, ""),
    {label:"Tração",values:refs.map(ref => ref?.drivetrain),unit:"text"}
  ];
}
function renderComparison() {
  const a = toolModel($("#compareModelA").value), b = toolModel($("#compareModelB").value);
  const valid = a && b && a.id !== b.id;
  $("#compareHint").textContent = valid ? "Verde destaca o menor preço e o maior desempenho em cada linha. Valores iguais não recebem destaque." : a && b ? "Escolha dois modelos diferentes." : "Selecione dois modelos diferentes do catálogo.";
  if (!valid) { $("#comparisonContent").replaceChildren(); return; }
  const format = (value, unit) => {
    if (unit === "text") return value ? escapeHtml(value) : "Não informado";
    if (!moneyValue(value)) return "Não informado";
    return unit === "money" ? `GTA$ ${value.toLocaleString("pt-BR")}` : `${value.toLocaleString("pt-BR", {maximumFractionDigits:2})} ${unit}`.trim();
  };
  const rows = comparisonRows(a, b).map(row => {
    const comparable = row.direction && row.values.every(moneyValue) && row.values[0] !== row.values[1];
    return `<tr><th scope="row">${row.label}</th>${row.values.map((value,index) => {
      const best = comparable && (row.direction === "lower" ? value < row.values[1-index] : value > row.values[1-index]);
      return `<td${best ? ' class="comparison-best"' : ""}>${format(value, row.unit)}</td>`;
    }).join("")}</tr>`;
  }).join("");
  $("#comparisonContent").innerHTML = `<div class="comparison-cars">${[a,b].map(model => `<figure><img src="${toolAttr(VEHICLE_IMAGES[model.id].image)}" alt="${toolAttr(model.name)}"><figcaption>${escapeHtml(model.brand)} · ${escapeHtml(model.name)}</figcaption></figure>`).join("")}</div><table class="comparison-table"><caption class="tool-hint">Dados de referência dos dois modelos</caption><thead><tr><th scope="col">Característica</th><th scope="col">${escapeHtml(a.name)}</th><th scope="col">${escapeHtml(b.name)}</th></tr></thead><tbody>${rows}<tr><th scope="row">Fonte</th>${[a,b].map(model => `<td>${VEHICLE_REFERENCE[model.id] ? `<a href="${toolAttr(VEHICLE_REFERENCE[model.id].url)}" target="_blank" rel="noopener noreferrer">GTA Base ↗</a>` : "Sem ficha específica"}</td>`).join("")}</tr></tbody></table>`;
}
$("#openCompare").addEventListener("click", () => { renderComparison(); $("#compareDialog").showModal(); });
[$("#compareModelA"), $("#compareModelB")].forEach(input => input.addEventListener("input", renderComparison));

const batchSelection = new Set();
function filteredBatchVehicles() {
  const source = $("#batchSource").value;
  const terms = normalizeVehicleText($("#batchSearch").value).split(" ").filter(Boolean);
  return data.vehicles.filter(vehicle => (source === "all" || (source === "unassigned" ? !getGarage(vehicle.garageId) : vehicle.garageId === source)) && terms.every(term => normalizeVehicleText(`${vehicle.name} ${getBrand(vehicle)} ${vehicle.plate || ""}`).includes(term)));
}
function batchMoveProblem(ids, destinationId) {
  const selected = data.vehicles.filter(vehicle => ids.has(vehicle.id));
  const garage = getGarage(destinationId);
  if (!selected.length || selected.length !== ids.size) return "Selecione pelo menos um veículo existente.";
  if (!garage) return "Escolha uma garagem de destino.";
  const moving = selected.filter(vehicle => vehicle.garageId !== garage.id);
  if (!moving.length) return "Os veículos selecionados já estão nesta garagem.";
  const current = data.vehicles.filter(vehicle => vehicle.garageId === garage.id).length;
  if (current + moving.length > garage.capacity) return `O destino tem ${Math.max(0,garage.capacity-current)} vagas livres para ${moving.length} veículos. Escolha outra garagem ou reduza a seleção.`;
  const type = getGarageType(garage);
  if (type === "hangar") return "Hangares não recebem os carros e motos deste catálogo.";
  if (type === "biker_clubhouse" && moving.some(vehicle => findCatalogVehicle(vehicle.name,vehicle.catalogId)?.type !== "motorcycle" && vehicle.category !== "Motocicleta")) return "A sede do motoclube recebe apenas motocicletas.";
  if (type === "kosatka" && moving.some(vehicle => !["toreador","stromberg"].includes(findCatalogVehicle(vehicle.name,vehicle.catalogId)?.id))) return "O Kosatka recebe apenas Toreador ou Stromberg.";
  const warehouseModels = ["dune4","wastelander","blazer5","phantom2","voltic2","technical2","boxville5","ruiner2"];
  if (type === "warehouse_vehicle" && moving.some(vehicle => !warehouseModels.includes(findCatalogVehicle(vehicle.name,vehicle.catalogId)?.id))) return "O depósito recebe apenas os veículos especiais de Import/Export, como Ramp Buggy, Blazer Aqua e Ruiner 2000.";
  return "";
}
function renderBatchDestination() {
  const previous = $("#batchDestination").value;
  const select = $("#batchDestination");
  select.replaceChildren(new Option("Escolha a garagem", ""));
  data.garages.forEach(garage => {
    const current = data.vehicles.filter(vehicle => vehicle.garageId === garage.id).length;
    const option = new Option(`${garageLabel(garage)} · ${Math.max(0,garage.capacity-current)} vagas livres`, garage.id);
    option.disabled = batchSelection.size > 0 ? Boolean(batchMoveProblem(batchSelection,garage.id)) : garage.capacity <= current;
    select.add(option);
  });
  select.value = data.garages.some(garage => garage.id === previous) ? previous : "";
  updateBatchSummary();
}
function updateBatchSummary() {
  const visible = filteredBatchVehicles();
  const count = visible.filter(vehicle => batchSelection.has(vehicle.id)).length;
  $("#batchSelectAll").checked = visible.length > 0 && count === visible.length;
  $("#batchSelectAll").indeterminate = count > 0 && count < visible.length;
  $("#batchSelectAll").disabled = !visible.length;
  $("#batchSelectedCount").textContent = `${batchSelection.size} selecionados`;
  const problem = batchMoveProblem(batchSelection,$("#batchDestination").value);
  $("#batchMoveNote").textContent = problem || "Confirme para transferir. Os veículos que já estão no destino mantêm suas vagas; os demais ocupam as vagas livres.";
  $("#confirmBatchMove").disabled = Boolean(problem);
}
function renderBatchVehicles() {
  const vehicles = filteredBatchVehicles();
  $("#batchVehicles").innerHTML = vehicles.map(vehicle => {
    const image = getVehicleImage(vehicle);
    return `<label class="batch-vehicle"><input type="checkbox" value="${toolAttr(vehicle.id)}" ${batchSelection.has(vehicle.id) ? "checked" : ""}>${image ? `<img src="${toolAttr(image)}" alt="" loading="lazy">` : ""}<span><strong>${escapeHtml(vehicle.name)}</strong><small>${escapeHtml(garageLabel(getGarage(vehicle.garageId)))}${vehicle.plate ? ` · ${escapeHtml(vehicle.plate)}` : ""}</small></span></label>`;
  }).join("") || '<p class="tool-hint">Nenhum veículo com esses filtros.</p>';
  renderBatchDestination();
}
function openBatchMove() {
  batchSelection.clear();
  $("#batchSearch").value = "";
  $("#batchDestination").value = "";
  const source = $("#batchSource");
  source.replaceChildren(new Option("Toda a coleção", "all"),new Option("Sem garagem", "unassigned"));
  data.garages.forEach(garage => source.add(new Option(garageLabel(garage),garage.id)));
  source.value = selectedGarage || "all";
  renderBatchVehicles();
  $("#batchMoveDialog").showModal();
}
function transferBatch(ids, destinationId) {
  const problem = batchMoveProblem(ids,destinationId);
  if (problem) { showToast(problem,"warning"); return false; }
  const garage = getGarage(destinationId);
  const slots = getGarageParking(garage,data.vehicles);
  const positions = new Map();
  data.vehicles.filter(vehicle => ids.has(vehicle.id) && vehicle.garageId !== garage.id).forEach(vehicle => {
    const slot = slots.indexOf(null);
    slots[slot] = vehicle;
    positions.set(vehicle.id,slot);
  });
  const previous = data.vehicles;
  data.vehicles = data.vehicles.map(vehicle => positions.has(vehicle.id) ? {...vehicle,garageId:garage.id,parking:{garageId:garage.id,slot:positions.get(vehicle.id)}} : vehicle);
  if (!saveData(`${positions.size} veículos transferidos para ${garageLabel(garage)}.`)) { data.vehicles = previous; return false; }
  return true;
}
$("#openBatchMove").addEventListener("click",openBatchMove);
$("#batchSource").addEventListener("change",renderBatchVehicles);
$("#batchSearch").addEventListener("input",renderBatchVehicles);
$("#batchDestination").addEventListener("change",updateBatchSummary);
$("#batchVehicles").addEventListener("change",event => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  if (event.target.checked) batchSelection.add(event.target.value); else batchSelection.delete(event.target.value);
  renderBatchDestination();
});
$("#batchSelectAll").addEventListener("change",event => {
  filteredBatchVehicles().forEach(vehicle => event.target.checked ? batchSelection.add(vehicle.id) : batchSelection.delete(vehicle.id));
  renderBatchVehicles();
});
$("#clearBatchSelection").addEventListener("click",() => {batchSelection.clear();renderBatchVehicles();});
$("#batchMoveForm").addEventListener("submit",event => {
  event.preventDefault();
  if (transferBatch(batchSelection,$("#batchDestination").value)) { batchSelection.clear(); $("#batchMoveDialog").close(); }
});

function makeCollectionBackup() {
  return {format:"los-santos-garage",version:1,exportedAt:new Date().toISOString(),data:{...data,wishlist:[...wishIds()]}};
}
function parseCollectionBackup(text) {
  if (typeof text !== "string" || text.length > 10*1024*1024) throw new Error("O backup deve ser um JSON de até 10 MB.");
  let document;
  try { document = JSON.parse(text); } catch { throw new Error("O arquivo não contém um JSON válido."); }
  if (!document || typeof document !== "object") throw new Error("Formato de backup inválido.");
  if (document.format && (document.format !== "los-santos-garage" || document.version !== 1)) throw new Error("Formato ou versão de backup não suportado.");
  const source = document.format ? document.data : document;
  if (!source || !Array.isArray(source.garages) || !Array.isArray(source.vehicles) || source.garages.length > 2000 || source.vehicles.length > 20000) throw new Error("O backup precisa conter listas válidas de garagens e veículos.");
  const identifier = value => typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
  const string = (value,max=1000) => typeof value === "string" && value.length <= max;
  const garageIds = new Set(), vehicleIds = new Set();
  const garages = source.garages.map(raw => {
    if (!raw || !identifier(raw.id) || garageIds.has(raw.id) || !string(raw.name,200) || !raw.name.trim() || !Number.isInteger(raw.capacity) || raw.capacity < 0 || raw.capacity > 100) throw new Error("Há uma garagem inválida ou com ID repetido no backup.");
    if (raw.type != null && !Object.hasOwn(garageTypes,raw.type)) throw new Error("Tipo de garagem desconhecido no backup.");
    const garage = {id:raw.id,name:raw.name,capacity:raw.capacity};
    if (raw.type != null) garage.type = raw.type;
    if (raw.apartment != null) {if(!string(raw.apartment,100)) throw new Error("Número do apartamento inválido.");garage.apartment=raw.apartment;}
    if (raw.locationId != null) {
      if (!identifier(raw.locationId)) throw new Error("Localização de garagem inválida.");
      garage.locationId = raw.locationId;
    }
    if (!getGarageProfile(garage).capacities.includes(garage.capacity)) throw new Error("Capacidade de garagem incompatível com o imóvel.");
    if (raw.tags != null && (!Array.isArray(raw.tags) || raw.tags.length > 10 || raw.tags.some(tag=>!string(tag,1000)))) throw new Error("Tags de garagem inválidas.");
    garage.tags = [...new Set((raw.tags || []).map(tag=>tag.trim()).filter(Boolean))];
    if (raw.interiorStyle != null) {
      if (!AUTO_SHOP_STYLES.some(style=>style.id===raw.interiorStyle)) throw new Error("Decoração de garagem inválida.");
      garage.interiorStyle = raw.interiorStyle;
    }
    garageIds.add(raw.id);
    return garage;
  });
  const vehicles = source.vehicles.map(raw => {
    if (!raw || !identifier(raw.id) || vehicleIds.has(raw.id) || !string(raw.name,200) || !raw.name.trim() || !string(raw.category,100) || !raw.category.trim()) throw new Error("Há um veículo inválido ou com ID repetido no backup.");
    if (raw.garageId != null && raw.garageId !== "" && !garageIds.has(raw.garageId)) throw new Error("Um veículo aponta para uma garagem que não existe no arquivo.");
    if (raw.favorite != null && typeof raw.favorite !== "boolean") throw new Error("Favorito de veículo inválido.");
    const vehicle = {id:raw.id,name:raw.name,category:raw.category,garageId:raw.garageId || null,favorite:Boolean(raw.favorite)};
    for (const key of ["catalogId","brand","paint","wheels","wheelType","wheelModel","wheelRearModel","plate","notes","color"]) {
      if (raw[key] == null) continue;
      if (!string(raw[key],key === "notes" ? 10000 : 1000)) throw new Error("Um campo de veículo tem formato inválido.");
      vehicle[key] = raw[key];
    }
    if (vehicle.color && !/^#[a-f0-9]{3,8}$/i.test(vehicle.color)) delete vehicle.color;
    for (const key of ["purchasePrice","modificationCost"]) {
      if(raw[key]!=null){if(!moneyValue(raw[key]) || raw[key]>10000000000)throw new Error("Custo de veículo inválido.");vehicle[key]=raw[key];}
    }
    if(raw.tuning!=null){
      if(!Array.isArray(raw.tuning)||raw.tuning.length>100)throw new Error("Projeto de tuning inválido.");
      const ids=new Set();
      vehicle.tuning=raw.tuning.map(t=>{
        if(!t||!identifier(t.id)||ids.has(t.id)||!string(t.name,150)||!t.name.trim()||!moneyValue(t.cost)||t.cost>10000000000||typeof t.done!=="boolean")throw new Error("Modificação de tuning inválida.");
        ids.add(t.id);return {id:t.id,name:t.name,cost:t.cost,done:t.done};
      });
    }
    if (vehicle.garageId && raw.parking?.garageId === vehicle.garageId && Number.isInteger(raw.parking.slot) && raw.parking.slot >= 0 && raw.parking.slot < 20000) vehicle.parking={garageId:vehicle.garageId,slot:raw.parking.slot};
    vehicleIds.add(raw.id);
    return vehicle;
  });
  if (source.wishlist != null && (!Array.isArray(source.wishlist) || source.wishlist.length > vehicleModels.length || source.wishlist.some(id=>!vehicleModels.some(model=>model.id===id)))) throw new Error("Lista de desejos inválida.");
  const wishlist = [...new Set(source.wishlist || [])];
  // Repair duplicate/missing parking positions without losing vehicles or changing valid positions.
  garages.forEach(garage=>getGarageParking(garage,vehicles).forEach((vehicle,slot)=>{if(vehicle)vehicle.parking={garageId:garage.id,slot};}));
  const result={garages,vehicles,wishlist};
  if(source.goals!=null){
    if(!Array.isArray(source.goals)||source.goals.length>100)throw new Error("Lista de metas inválida.");
    const ids=new Set();
    result.goals=source.goals.map(g=>{
      if(!g||!identifier(g.id)||ids.has(g.id)||!string(g.name,150)||!g.name.trim()||!["brand","category","garage"].includes(g.type)||!string(g.value,200)||!g.value.trim()||(g.target!=null&&(!Number.isInteger(g.target)||g.target<1||g.target>20000)))throw new Error("Meta de coleção inválida.");
      ids.add(g.id);return {id:g.id,name:g.name,type:g.type,value:g.value,target:g.target??null};
    });
  }
  return result;
}
let pendingCollectionBackup = null;
let backupReadSequence = 0;
function resetBackupPreview() {
  pendingCollectionBackup=null;
  $("#confirmBackupReplace").checked=false;
  $("#confirmBackupReplace").disabled=true;
  $("#restoreBackup").disabled=true;
}
async function previewBackupFile(file) {
  const sequence=++backupReadSequence;
  resetBackupPreview();
  if (!file) {$("#backupPreview").textContent="Escolha um arquivo para conferir os dados antes de restaurar.";return;}
  try {
    if (file.size > 10*1024*1024) throw new Error("O arquivo excede o limite de 10 MB.");
    const parsed=parseCollectionBackup(await file.text());
    if(sequence!==backupReadSequence)return;
    pendingCollectionBackup=parsed;
    const value=getVehicleValuation(parsed.vehicles);
    $("#backupPreview").textContent=`${file.name}: ${parsed.garages.length} garagens, ${parsed.vehicles.length} veículos e ${parsed.wishlist.length} desejos. Valor da coleção: ${valuationAmount(value)} (${valuationCoverage(value)}). Seus dados só serão alterados ao confirmar a restauração.`;
    $("#confirmBackupReplace").disabled=false;
  } catch(error) {if(sequence===backupReadSequence) $("#backupPreview").textContent=`Não foi possível ler o backup: ${error.message}`;}
}
function restoreCollectionBackup() {
  if (!pendingCollectionBackup || !$("#confirmBackupReplace").checked) return false;
  const previous=data,previousGarage=selectedGarage,previousFilter=currentFilter;
  data=structuredClone(pendingCollectionBackup);selectedGarage=null;currentFilter="all";
  // Explicit restore is also the recovery path for damaged storage. Preserve it first.
  const wasBlocked=storageSession.blocked;
  if(wasBlocked){try{const original=localStorage.getItem(STORAGE_KEY);if(original!==null)localStorage.setItem(`${STORAGE_KEY}-preserved`,original);persistCollection(STORAGE_KEY,data,{resolve:true});}catch{data=previous;selectedGarage=previousGarage;currentFilter=previousFilter;showToast("Não foi possível preservar e restaurar os dados.","error");return false;}}
  else if(!saveData("Coleção restaurada com sucesso.")){data=previous;selectedGarage=previousGarage;currentFilter=previousFilter;return false;}
  $("#searchInput").value="";$("#categoryFilter").value="all";$("#garageThemeFilter").value="all";
  for(const id of ["vehicleScope","vehicleBrandFilter"])if($("#"+id))$("#"+id).value="all";
  setActiveNav("all");render();
  $("#backupDialog").close();resetBackupPreview();
  return true;
}
$("#openBackup").addEventListener("click",()=>{$("#backupFile").value="";backupReadSequence++;resetBackupPreview();$("#backupPreview").textContent="Escolha um arquivo para conferir os dados antes de restaurar.";$("#backupDialog").showModal();});
$("#exportBackup").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(makeCollectionBackup(),null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  const today=new Date();
  const date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
  link.href=url;link.download=`los-santos-garage-${date}.json`;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast("Backup preparado para download.");
});
$("#backupFile").addEventListener("change",event=>previewBackupFile(event.target.files[0]));
$("#confirmBackupReplace").addEventListener("change",()=>{$("#restoreBackup").disabled=!pendingCollectionBackup || !$("#confirmBackupReplace").checked;});
$("#restoreBackup").addEventListener("click",restoreCollectionBackup);
$("#backupDialog").addEventListener("close",()=>{backupReadSequence++;resetBackupPreview();});
render();
