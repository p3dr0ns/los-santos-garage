const STORAGE_KEY = "minha-garagem-v1";

const garageColors = ["#4388ff", "#795cff", "#35bde8", "#ef7c5c", "#db67bd", "#f1a94b"];
const carColors = ["#397ce5", "#d84856", "#8b62da", "#e38643", "#4b9b91", "#bfc6d3"];

const garageTypes = {
  garage: { label: "Garagem", pattern: /garagem|garage/ },
  arcade: { label: "Fliperama", pattern: /fliperama|arcade|videogeddon|eight.?bit|insert coin|pixel pete|wonderama|warehouse arcade/ },
  agency: { label: "Agência", pattern: /agencia|agency/ },
  arena_workshop: { label: "Oficina da Arena", pattern: /arena/ },
  bat_club_property: { label: "Clube noturno", pattern: /clube noturno|boate|nightclub|night club/ },
  office: { label: "Escritório", pattern: /escritorio|office|maze bank|arcadius|lombank/ },
  biker_clubhouse: { label: "Sede do motoclube", pattern: /motoclube|moto clube|clubhouse|sede.*moto/ },
  auto_shop_property: { label: "Oficina de Tuning", pattern: /tuning|auto shop|autoshop|oficina/ },
  casino: { label: "Cassino / cobertura", pattern: /cassino|casino|penthouse|cobertura/ },
  hangar: { label: "Hangar", pattern: /hangar/ },
  property_bunker: { label: "Bunker", pattern: /bunker/ },
  salvage_yard: { label: "Desmanche", pattern: /desmanche|salvage|ferro.velho|scrapyard/ },
  warehouse_vehicle: { label: "Depósito de veículos", pattern: /deposito|armazem|warehouse/ },
  car_meet: { label: "Encontro de Carros LS", pattern: /car meet|encontro.*carros|ls car/ },
  eclipse_boulevard: { label: "Eclipse Boulevard (50 vagas)", icon: "garage", pattern: /eclipse.*(boulevard|blvd|50)|(?:boulevard|blvd).*eclipse/ },
  vinewood_garage: { label: "Garagem do Clube Vinewood", pattern: /vinewood.*(clube|club|garagem|garage)|(clube|club).*vinewood/ },
  safehouse: { label: "Apartamento / casa", pattern: /apartamento|apartment|eclipse|towers|casa|house|tinsel|alta|del perro|weazel|richards/ }
};

// Capacidades permanentes; vagas reservadas e estacionamento temporário não
// aumentam a capacidade de uma garagem comum. Fontes em GARAGENS.md.
const garageProfiles = {
  garage: { capacities: [2, 6, 10], note: "Garagem avulsa: 2, 6 ou 10 vagas, conforme o imóvel." },
  safehouse: { capacities: [2, 6, 10], note: "Apartamento/casa: 2, 6 ou 10 vagas. Eclipse Towers tem 10." },
  arcade: { capacities: [10], note: "10 vagas com a garagem do fliperama adquirida." },
  agency: { capacities: [20], note: "20 vagas para veículos pessoais." },
  arena_workshop: { capacities: [9, 18, 27], note: "9 vagas comuns por piso; até 27 com os dois pisos extras. Há ainda 1 vaga exclusiva de Cerberus por piso, não contada aqui." },
  bat_club_property: { capacities: [1, 11, 21, 31], note: "1 vaga na entrada + 10 por piso extra, até 31. Vagas de entrega e Terrorbyte não entram na conta." },
  office: { capacities: [20, 40, 60], note: "20 vagas por garagem comprada; até 60 com as três garagens." },
  biker_clubhouse: { capacities: [10], note: "10 vagas exclusivas para motocicletas." },
  auto_shop_property: { capacities: [10], note: "10 vagas pessoais; elevadores de clientes não entram na conta." },
  casino: { capacities: [10], note: "10 vagas na garagem da cobertura adquirida. O estacionamento público do cassino é temporário." },
  hangar: { capacities: [20], note: "20 aeronaves no hangar padrão, incluindo o armazenamento interno; não são vagas para carros." },
  property_bunker: { capacities: [0], note: "Sem garagem permanente para carros pessoais. A vaga temporária e o Centro de Operações Móvel não são contados." },
  salvage_yard: { capacities: [0], note: "Sem garagem permanente para carros pessoais. Carros de roubos, reboques e estacionamento temporário não são vagas pessoais." },
  warehouse_vehicle: { capacities: [8], note: "8 vagas exclusivas para veículos especiais no subsolo. Os 40 carros de carga do negócio não são veículos pessoais." },
  car_meet: { capacities: [0], note: "Estacionamento temporário; não oferece vagas permanentes para sua coleção." },
  eclipse_boulevard: { capacities: [50], note: "50 vagas, distribuídas em cinco pisos de 10." },
  vinewood_garage: { capacities: [100], note: "100 vagas na garagem do Clube Vinewood, com acesso via GTA+." }
};

function getGarageProfile(garage) {
  if (getGarageType(garage) === "safehouse" && /eclipse/i.test(garage.name)) return { capacities: [10], note: "Eclipse Towers: 10 vagas por apartamento. Cadastre cada apartamento separadamente." };
  return garageProfiles[getGarageType(garage)];
}

function updateGarageCapacity() {
  const garage = { name: $("#garageName").value, type: $("#garageType").value };
  const profile = getGarageProfile(garage);
  const select = $("#garageCapacity");
  const previousType = select.dataset.propertyType;
  const previousCapacity = Number(select.value);
  select.innerHTML = profile.capacities.map(capacity => `<option value="${capacity}">${capacity} vagas</option>`).join("");
  select.value = previousType === getGarageType(garage) && profile.capacities.includes(previousCapacity)
    ? previousCapacity : profile.capacities.at(-1);
  select.dataset.propertyType = getGarageType(garage);
  select.disabled = profile.capacities.length === 1;
  $("#garageCapacityNote").textContent = profile.note;
  renderGaragePreview();
}

function renderGaragePreview() {
  const garage = { name: $("#garageName").value.trim(), type: $("#garageType").value };
  const type = getGarageType(garage);
  const profile = getGarageProfile(garage);
  const capacity = Number($("#garageCapacity").value);
  $("#garagePreviewIcon").innerHTML = garageIcon(garage);
  $("#garagePreviewName").textContent = garageLabel({ ...garage, name: garage.name || garageTypes[type].label });
  $("#garageCapacityTotal").textContent = capacity;
  $("#garageCapacityUnit").textContent = type === "hangar" ? "aeronaves" : capacity === 1 ? "vaga" : "vagas";
  $("#garageCapacityConfig").hidden = profile.capacities.length === 1;
  $("#garageCapacityOptions").innerHTML = profile.capacities.map(value => `<button type="button" class="capacity-choice ${value === capacity ? "selected" : ""}" data-capacity="${value}" aria-pressed="${value === capacity}">${value} vagas</button>`).join("");
  $$("[data-property-type]").forEach(button => {
    const eclipse = type === "safehouse" && /eclipse/i.test(garage.name);
    const selected = button.dataset.propertyType === type && (button.dataset.propertyName ? eclipse : !eclipse);
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function renderPropertyPicker() {
  const orderedTypes = ["garage", "safehouse", "agency", "arcade", "auto_shop_property", "office", "bat_club_property", "arena_workshop", "eclipse_boulevard", "vinewood_garage", "biker_clubhouse", "casino", "hangar", "warehouse_vehicle", "property_bunker", "salvage_yard", "car_meet"];
  $("#propertyPicker").innerHTML = orderedTypes.map(type => {
    const info = garageTypes[type];
    const capacity = garageProfiles[type].capacities.at(-1);
    return `<button type="button" class="property-choice" data-property-type="${type}" aria-pressed="false">${garageIcon({name: "", type})}<span><strong>${info.label.replace(" (50 vagas)", "")}</strong><small>${capacity ? `${garageProfiles[type].capacities.length > 1 ? "Até " : ""}${capacity} ${type === "hangar" ? "aeronaves" : "vagas"}` : "Sem vagas permanentes"}</small></span><span class="property-check" aria-hidden="true">✓</span></button>`;
  }).join("") + `<button type="button" class="property-choice" data-property-type="safehouse" data-property-name="Eclipse Towers" aria-pressed="false">${garageIcon({ name: "Eclipse Towers", type: "safehouse" })}<span><strong>Eclipse Towers</strong><small>10 vagas por apartamento</small></span><span class="property-check" aria-hidden="true">✓</span></button>`;
  $("#propertyPicker [data-property-type='safehouse']").after($("#propertyPicker [data-property-name='Eclipse Towers']"));
}

function getGarageType(garage) {
  if (Object.hasOwn(garageTypes, garage.type)) return garage.type;
  const name = garage.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Tipos específicos têm prioridade sobre a palavra genérica "garagem".
  return Object.keys(garageTypes).find(type => type !== "garage" && garageTypes[type].pattern.test(name)) || "garage";
}

function garageIcon(garage, className = "garage-icon") {
  const type = getGarageType(garage);
  return `<img class="${className}" src="assets/blips/${garageTypes[type].icon || type}.png" alt="${garageTypes[type].label}" title="${garageTypes[type].label}">`;
}

const vehicleModels = VEHICLE_CATALOG.vehicles;
let selectedCatalogModelId = "";

function normalizeVehicleText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findCatalogVehicle(value, id = "") {
  if (id) {
    const byId = vehicleModels.find(model => model.id === id);
    if (byId) return byId;
  }
  const name = normalizeVehicleText(value);
  if (!name) return null;
  const exact = vehicleModels.find(model => normalizeVehicleText(model.name) === name);
  if (exact) return exact;
  const aliases = vehicleModels.filter(model => model.aliases.some(alias => normalizeVehicleText(alias) === name));
  return aliases.length === 1 ? aliases[0] : null;
}

function updateVehiclePreview() {
  const name = $("#vehicleName").value.trim();
  const savedVehicle = data.vehicles.find(vehicle => vehicle.id === $("#vehicleId").value);
  const image = getVehicleImage({ ...savedVehicle, name, catalogId: selectedCatalogModelId });
  $("#vehiclePreviewName").textContent = name || "Qual é o próximo carro?";
  $("#vehiclePreviewCategory").textContent = $("#vehicleCategory").value.trim() || "SUA PRÓXIMA AQUISIÇÃO";
  const preview = $("#vehiclePreviewImage");
  preview.alt = name ? `Prévia de ${name}` : "";
  preview.hidden = true;
  if (image) {
    if (preview.getAttribute("src") !== image) preview.src = image;
    else if (preview.complete && preview.naturalWidth > 0) preview.hidden = false;
  } else preview.removeAttribute("src");
  $("#vehicleImageStatus").textContent = image ? "Imagem automática" : name ? "Sem imagem disponível" : "Prévia do veículo";
}

function renderVehicleGaragePicker() {
  const vehicleId = $("#vehicleId").value;
  const selectedId = $("#vehicleGarage").value;
  const existingGarageId = data.vehicles.find(vehicle => vehicle.id === vehicleId)?.garageId;
  $("#vehicleGaragePicker").innerHTML = data.garages.map(garage => {
    const used = data.vehicles.filter(vehicle => vehicle.garageId === garage.id && vehicle.id !== vehicleId).length;
    const free = Math.max(0, garage.capacity - used);
    const blocked = free === 0 && garage.id !== existingGarageId;
    return `<button type="button" class="property-choice ${garage.id === selectedId ? "selected" : ""}" data-vehicle-garage="${garage.id}" aria-pressed="${garage.id === selectedId}" ${blocked ? "disabled" : ""}>${garageIcon(garage)}<span><strong>${escapeHtml(garageLabel(garage))}</strong><small>${garage.capacity === 0 ? "Sem vagas permanentes" : free ? `${free} de ${garage.capacity} vagas livres` : "Garagem lotada"}</small>${garageTagMarkup(garage)}</span><span class="property-check" aria-hidden="true">✓</span></button>`;
  }).join("") + `<button type="button" class="property-choice ${!selectedId ? "selected" : ""}" data-vehicle-garage="" aria-pressed="${!selectedId}"><span><strong>Sem garagem</strong><small>Decidir depois</small></span></button>`;
  const selected = getGarage(selectedId);
  $("#vehicleGarageSummary").textContent = selected ? garageLabel(selected) : "Sem garagem";
}

function getVehicleImage(vehicle) {
  const model = findCatalogVehicle(vehicle.name, vehicle.catalogId);
  return model ? VEHICLE_IMAGES[model.id]?.image || "" : "";
}
const initialData = {
  garages: [
    { id: "g1", name: "Eclipse Towers", capacity: 10 },
    { id: "g2", name: "Agência", capacity: 20 },
    { id: "g3", name: "Garagem da Arena", capacity: 27 }
  ],
  vehicles: [
    { id: "v1", name: "Zentorno", category: "Super", garageId: "g1", favorite: true, color: "#397ce5", image: "" },
    { id: "v2", name: "Elegy Retro Custom", category: "Esportivo", garageId: "g1", favorite: true, color: "#d84856", image: "" },
    { id: "v3", name: "Turismo R", category: "Super", garageId: "g1", favorite: false, color: "#8b62da", image: "" },
    { id: "v4", name: "Kuruma Blindado", category: "Esportivo", garageId: "g2", favorite: true, color: "#bfc6d3", image: "" },
    { id: "v5", name: "Sultan RS", category: "Super", garageId: "g2", favorite: false, color: "#4b9b91", image: "" },
    { id: "v6", name: "Dominator", category: "Muscle", garageId: "g3", favorite: false, color: "#e38643", image: "" }
  ]
};

let data = loadData();
let currentFilter = "all";
let selectedGarage = null;
let requestedParkingSlot = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadData() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(initialData); }
  catch { saved = structuredClone(initialData); }
  // Atualiza cadastros antigos sem remover ou deslocar veículos existentes.
  saved.garages.forEach(garage => {
    const profile = getGarageProfile(garage);
    if (!profile.capacities.includes(Number(garage.capacity))) garage.capacity = profile.capacities.at(-1);
    else garage.capacity = Number(garage.capacity);
    getGarageParking(garage, saved.vehicles).forEach((vehicle, slot) => {
      if (vehicle) vehicle.parking = { garageId: garage.id, slot };
    });
  });
  return saved;
}

function saveData(message) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { showToast("Não foi possível salvar. Verifique o espaço disponível no navegador.", "error"); return false; }
  render();
  if (message) showToast(message, "success");
  return true;
}

function render() {
  document.body.dataset.view = currentFilter;
  $(".stats").hidden = currentFilter !== "all";
  $("#garageSection").hidden = !!selectedGarage || (currentFilter !== "all" && currentFilter !== "garages");
  $("#vehicleSection").hidden = currentFilter === "garages" && !selectedGarage;
  const pages = {
    all: ["Visão geral", "Sua coleção, organizada do seu jeito."],
    vehicles: ["Seus veículos", "Encontre cada carro e o lugar que ele chama de casa."],
    garages: ["Suas garagens", "Todas as propriedades. Cada vaga sob controle."],
    favorites: ["Favoritos", "Os que merecem um lugar especial na coleção."]
  };
  $("#pageTitle").textContent = pages[currentFilter][0];
  $("#pageDescription").textContent = pages[currentFilter][1];
  if (selectedGarage) {
    $("#pageTitle").textContent = garageLabel(getGarage(selectedGarage));
    const garage = getGarage(selectedGarage);
    $("#pageDescription").textContent = garage.tags?.length ? `Tema: ${garage.tags.join(" · ")}` : "Os veículos guardados nesta garagem.";
  }
  $("#garageDetailActions").hidden = !selectedGarage;
  const collectionValue = getVehicleValuation(data.vehicles);
  $("#collectionValue").textContent = valuationAmount(collectionValue);
  $("#collectionValueNote").textContent = valuationCoverage(collectionValue);
  const selected = getGarage(selectedGarage);
  $("#garageValuation").hidden = !selected;
  if (selected) {
    const value = getVehicleValuation(data.vehicles.filter(vehicle => vehicle.garageId === selected.id));
    $("#garageValue").textContent = valuationAmount(value);
    $("#garageValueCoverage").textContent = valuationCoverage(value);
  }
  const free = data.garages.reduce((sum, garage) => sum + Math.max(0, garage.capacity - data.vehicles.filter(vehicle => vehicle.garageId === garage.id).length), 0);
  $("#vehicleCount").textContent = data.vehicles.length;
  $("#garageCount").textContent = data.garages.length;
  $("#freeCount").textContent = free;
  $("#sideVehicleCount").textContent = `${data.vehicles.length} veículos`;
  $("#sideGarageCount").textContent = `${data.garages.length} garagens`;
  $("#sideFreeCount").textContent = `${free} vagas livres`;
  $("#navVehicleCount").textContent = data.vehicles.length;
  $("#navGarageCount").textContent = data.garages.length;
  $("#navFavoriteCount").textContent = data.vehicles.filter(vehicle => vehicle.favorite).length;
  $("#garageSectionCount").textContent = data.garages.length;
  const totalCapacity = data.garages.reduce((sum, garage) => sum + garage.capacity, 0);
  $("#sidebarStorageFill").style.width = `${totalCapacity ? Math.min(100, data.vehicles.length / totalCapacity * 100) : 0}%`;
  $("#searchInput").disabled = currentFilter === "garages" && !selectedGarage;
  renderGarages();
  renderCategories();
  renderVehicles();
}

function renderGarages() {
  $("#garageList").innerHTML = data.garages.map((garage, index) => {
    const used = data.vehicles.filter(vehicle => vehicle.garageId === garage.id).length;
    const percent = garage.capacity > 0 ? Math.min(100, used / garage.capacity * 100) : 0;
    const free = Math.max(0, garage.capacity - used);
    const value = getVehicleValuation(data.vehicles.filter(vehicle => vehicle.garageId === garage.id));
    return `<article class="garage-card ${selectedGarage === garage.id ? "selected" : ""}" data-garage-id="${garage.id}" style="--card-color:${garageColors[index % garageColors.length]}"><button type="button" class="garage-open" aria-label="Ver veículos: ${escapeHtml(garageLabel(garage)).replaceAll('"', '&quot;')}">
      <div class="garage-card-top"><span class="garage-symbol">${garageIcon(garage)}</span><span class="garage-availability ${free === 0 ? "full" : ""}">${garage.capacity === 0 ? "Sem vagas" : free === 0 ? "Completa" : `${free} livres`}</span></div>
      <h3>${escapeHtml(garageLabel(garage))}</h3>${garageTagMarkup(garage)}
      <p class="garage-kind" title="${escapeHtml(getGarageProfile(garage).note).replaceAll('"', '&quot;')}">${garageTypes[getGarageType(garage)].label}</p>
      <div class="garage-card-value"><span>Valor dos veículos</span><strong>${valuationAmount(value)}</strong>${value.missing ? `<small>${valuationCoverage(value)}</small>` : ""}</div>
      <div class="progress"><span style="width:${percent}%"></span></div>
      <div class="garage-card-bottom"><p><strong>${used}</strong> de ${garage.capacity} ocupadas</p><svg class="ui-icon"><use href="#ui-arrow"/></svg></div>
    </button><div class="garage-card-tools"><button type="button" data-edit-garage="${garage.id}">Editar garagem</button></div></article>`;
  }).join("");
  const unassigned = data.vehicles.filter(vehicle => !getGarage(vehicle.garageId));
  $("#unassignedValue").hidden = !unassigned.length;
  $("#unassignedValue").textContent = unassigned.length ? `Sem garagem · ${unassigned.length} ${unassigned.length === 1 ? "veículo" : "veículos"} · ${valuationAmount(getVehicleValuation(unassigned))} · ${valuationCoverage(getVehicleValuation(unassigned))}` : "";
  $$(".garage-card").forEach(card => card.addEventListener("click", event => {
    if (event.target.closest("[data-edit-garage]")) { openGarageDialog(card.dataset.garageId); return; }
    selectedGarage = card.dataset.garageId;
    currentFilter = "garages";
    $("#searchInput").value = "";
    $("#categoryFilter").value = "all";
    setActiveNav("garages");
    render();
    $("#pageTitle").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }));
}

function renderCategories() {
  const select = $("#categoryFilter");
  const previous = select.value;
  const categories = [...new Set(data.vehicles.map(vehicle => vehicle.category))].sort();
  select.innerHTML = `<option value="all">Todas as categorias</option>${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  select.value = categories.includes(previous) ? previous : "all";
}

function renderVehicles() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const category = $("#categoryFilter").value;
  let vehicles = data.vehicles.filter(vehicle => {
    const garage = getGarage(vehicle.garageId);
    const matchesQuery = `${vehicle.name} ${vehicle.brand || ""} ${vehicle.category} ${vehicle.plate || ""} ${garageLabel(garage)} ${(garage?.tags || []).join(" ")}`.toLowerCase().includes(query);
    const matchesCategory = category === "all" || vehicle.category === category;
    const matchesGarage = !selectedGarage || vehicle.garageId === selectedGarage;
    const matchesMode = currentFilter !== "favorites" || vehicle.favorite;
    return matchesQuery && matchesCategory && matchesGarage && matchesMode;
  });

  const titles = { favorites: "Veículos favoritos" };
  $("#vehicleTitle").textContent = selectedGarage ? garageLabel(getGarage(selectedGarage)) : (titles[currentFilter] || "Todos os veículos");
  $("#vehicleResultCount").textContent = vehicles.length;
  $("#activeGarageFilter").hidden = !selectedGarage;
  $("#activeGarageName").textContent = selectedGarage ? `Garagem: ${garageLabel(getGarage(selectedGarage))}` : "";
  $("#vehicleGrid").innerHTML = vehicles.map(vehicle => {
    const garage = getGarage(vehicle.garageId);
    const image = getVehicleImage(vehicle);
    return `<article class="vehicle-card" tabindex="0" role="button" aria-label="Ver ${escapeHtml(vehicle.name).replaceAll('"', '&quot;')}" data-vehicle-id="${vehicle.id}">
      <button class="favorite-button ${vehicle.favorite ? "on" : ""}" data-favorite-id="${vehicle.id}" aria-pressed="${Boolean(vehicle.favorite)}" aria-label="${vehicle.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}"><svg class="ui-icon"><use href="#ui-star"/></svg></button>
      <div class="vehicle-image">
        <div class="car-shape" style="--car-color:${vehicle.color || carColors[0]}"></div>
        ${image ? `<img src="${escapeHtml(image).replaceAll('"', '&quot;')}" alt="${escapeHtml(vehicle.name).replaceAll('"', '&quot;')}" loading="lazy" decoding="async">` : ""}
        <span class="vehicle-category-badge">${escapeHtml(vehicle.category)}</span>
      </div>
      <div class="vehicle-info"><h3>${escapeHtml(vehicle.name)}</h3><div class="vehicle-meta"><span class="vehicle-garage">${garage ? garageIcon(garage, "garage-icon-small") : ""} ${escapeHtml(garageLabel(garage))}</span><svg class="ui-icon vehicle-detail-arrow"><use href="#ui-arrow"/></svg></div></div>
    </article>`;
  }).join("");
  $$(".vehicle-image img").forEach(img => {
    img.addEventListener("error", () => img.remove());
    if (img.complete && !img.naturalWidth) img.remove();
  });
  $("#emptyState").hidden = vehicles.length > 0;
  const emptyFavorites = currentFilter === "favorites" && !query && category === "all";
  $("#emptyTitle").textContent = emptyFavorites ? "Seus favoritos começam aqui" : "Nenhum veículo por aqui";
  $("#emptyDescription").textContent = emptyFavorites ? "Toque na estrela de um carro para guardá-lo nesta seleção." : query || category !== "all" ? "Tente outro nome ou uma categoria diferente." : "Adicione um veículo para começar a preencher sua coleção.";
  $$(".vehicle-card").forEach(card => card.addEventListener("click", event => {
    if (!event.target.closest(".favorite-button")) openVehicleDetails(card.dataset.vehicleId);
  }));
  $$(".vehicle-card").forEach(card => card.addEventListener("keydown", event => {
    if (event.target === card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openVehicleDetails(card.dataset.vehicleId); }
  }));
  $$(".favorite-button").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const vehicle = data.vehicles.find(item => item.id === button.dataset.favoriteId);
    vehicle.favorite = !vehicle.favorite;
    saveData(vehicle.favorite ? "Adicionado aos favoritos" : "Removido dos favoritos");
  }));
  if (typeof renderGarageView === "function") renderGarageView(vehicles);
}

function getGarage(id) { return data.garages.find(garage => garage.id === id); }
function getVehicleValuation(vehicles) {
  let total = 0, priced = 0;
  vehicles.forEach(vehicle => {
    const model = findCatalogVehicle(vehicle.name, vehicle.catalogId);
    const price = model ? VEHICLE_REFERENCE[model.id]?.price : null;
    if (typeof price === "number" && Number.isFinite(price) && price >= 0) { total += price; priced++; }
  });
  return { total, priced, missing: vehicles.length - priced, count: vehicles.length };
}
function valuationAmount(value) { return value.count && !value.priced ? "Não informado" : `GTA$ ${value.total.toLocaleString("pt-BR")}`; }
function valuationCoverage(value) { return value.missing ? `${value.missing} ${value.missing === 1 ? "veículo sem preço" : "veículos sem preço"} · total parcial` : "Preços normais · GTA Base"; }
function getGarageParking(garage, vehicles) {
  const members = vehicles.filter(vehicle => vehicle.garageId === garage.id);
  const slots = Array(Math.max(garage.capacity, members.length)).fill(null);
  const pending = [];
  members.forEach(vehicle => {
    const parking = vehicle.parking;
    if (parking?.garageId === garage.id && Number.isInteger(parking.slot) && parking.slot >= 0 && parking.slot < slots.length && !slots[parking.slot]) slots[parking.slot] = vehicle;
    else pending.push(vehicle);
  });
  pending.forEach(vehicle => { slots[slots.indexOf(null)] = vehicle; });
  return slots;
}
function parkingForVehicleSave(id, garageId) {
  const garage = getGarage(garageId);
  if (!garage) return null;
  const slots = getGarageParking(garage, data.vehicles);
  const existing = slots.findIndex(vehicle => vehicle?.id === id);
  const requested = requestedParkingSlot;
  const slot = requested?.garageId === garageId && Number.isInteger(requested.slot) && requested.slot >= 0 && requested.slot < garage.capacity && !slots[requested.slot]
    ? requested.slot : existing >= 0 ? existing : slots.indexOf(null);
  return slot >= 0 ? { garageId, slot } : null;
}
function garageLabel(garage) { return garage ? `${garage.name}${garage.apartment ? ` · Ap. ${garage.apartment}` : ""}` : "Sem garagem"; }
function garageTagMarkup(garage) { return (garage.tags || []).length ? `<span class="garage-tags">${garage.tags.map(tag => `<span class="garage-tag">${escapeHtml(tag)}</span>`).join("")}</span>` : ""; }

function openVehicleDialog(id = null) {
  requestedParkingSlot = null;
  const vehicle = data.vehicles.find(item => item.id === id);
  $("#vehicleDialogTitle").textContent = vehicle ? "Editar veículo" : "Adicionar veículo";
  $("#saveVehicleButton").textContent = vehicle ? "Salvar alterações" : "＋ Adicionar veículo";
  $("#vehicleId").value = vehicle?.id || "";
  $("#vehicleName").value = vehicle?.name || "";
  $("#vehicleCategory").value = vehicle?.category || "";
  const catalogModel = findCatalogVehicle(vehicle?.name, vehicle?.catalogId);
  selectedCatalogModelId = catalogModel?.id || "";
  const savedBrand = vehicle?.brand || catalogModel?.brand || "";
  const brand = VEHICLE_CATALOG.brands.find(item => normalizeVehicleText(item) === normalizeVehicleText(savedBrand)) || savedBrand;
  $$("#vehicleBrand option[data-custom-brand]").forEach(option => option.remove());
  if (brand && ![...$("#vehicleBrand").options].some(option => option.value === brand)) {
    const option = new Option(brand, brand); option.dataset.customBrand = "true"; $("#vehicleBrand").add(option);
  }
  $("#vehicleBrand").value = brand;
  $("#vehiclePaint").value = vehicle?.paint || "";
  setVehicleWheels(vehicle);
  $("#vehiclePlate").value = vehicle?.plate || "";
  $("#vehicleNotes").value = vehicle?.notes || "";
  $("#vehicleFavorite").checked = vehicle?.favorite || false;
  $("#vehicleGarage").innerHTML = '<option value="">Sem garagem</option>' + data.garages.map(garage => `<option value="${garage.id}">${escapeHtml(garageLabel(garage))}</option>`).join("");
  const availableGarages = data.garages.filter(garage => data.vehicles.filter(item => item.garageId === garage.id).length < garage.capacity);
  $("#vehicleGarage").value = vehicle ? vehicle.garageId || "" : availableGarages.find(garage => garage.id === selectedGarage)?.id || availableGarages[0]?.id || "";
  $("#deleteVehicleButton").hidden = !vehicle;
  updateVehiclePreview();
  renderVehicleGaragePicker();
  resetCatalogSearch();
  $("#vehicleDialog").showModal();
}

function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }
function setActiveNav(filter) { $$(".nav-item").forEach(item => {
  item.classList.toggle("active", item.dataset.filter === filter);
  if (item.dataset.filter === filter) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current");
}); }
function dismissToast() {
  clearTimeout(showToast.timer);
  const toast = $("#toast");
  if (typeof toast.hidePopover === "function" && toast.matches(":popover-open")) toast.hidePopover();
  toast.classList.remove("show");
  toast.hidden = true;
}

function showToast(message, type = "info") {
  const appearances = {
    success: { title: "Tudo certo", icon: "✓" },
    info: { title: "Só um detalhe", icon: "i" },
    warning: { title: "Atenção", icon: "!" },
    error: { title: "Não foi possível concluir", icon: "!" }
  };
  if (!Object.hasOwn(appearances, type)) type = "info";
  const toast = $("#toast");
  clearTimeout(showToast.timer);
  toast.dataset.type = type;
  $("#toastIcon").textContent = appearances[type].icon;
  $("#toastTitle").textContent = appearances[type].title;
  $("#toastMessage").textContent = message;
  toast.hidden = false;
  // O popover mantém o aviso visível também acima das fichas e formulários modais.
  if (typeof toast.showPopover === "function" && !toast.matches(":popover-open")) toast.showPopover();
  toast.classList.add("show");
  showToast.timer = setTimeout(dismissToast, type === "error" || type === "warning" ? 8000 : 5000);
}
$("#closeToast").addEventListener("click", dismissToast);

$("#addVehicleButton").addEventListener("click", () => openVehicleDialog());
$("#vehicleBrand").innerHTML = '<option value="">Selecione uma marca</option>' + VEHICLE_CATALOG.brands.map(brand => `<option value="${escapeHtml(brand).replaceAll('"', '&quot;')}">${escapeHtml(brand)}</option>`).join("");
$("#vehicleCategories").innerHTML = [...new Set(vehicleModels.map(model => model.category))].sort((a, b) => a.localeCompare(b, "pt-BR")).map(category => `<option value="${category}"></option>`).join("");
$("#vehicleName").addEventListener("input", () => {
  const model = findCatalogVehicle($("#vehicleName").value);
  selectedCatalogModelId = model?.id || "";
  if (model) { $("#vehicleCategory").value = model.category; $("#vehicleBrand").value = model.brand; }
  updateVehiclePreview();
});
$("#vehicleCategory").addEventListener("input", updateVehiclePreview);
$("#vehiclePreviewImage").addEventListener("load", () => { $("#vehiclePreviewImage").hidden = false; });
$("#vehiclePreviewImage").addEventListener("error", () => {
  $("#vehiclePreviewImage").hidden = true;
  $("#vehicleImageStatus").textContent = "Imagem indisponível";
});
$("#vehicleGaragePicker").addEventListener("click", event => {
  const button = event.target.closest("[data-vehicle-garage]");
  if (!button || button.disabled) return;
  $("#vehicleGarage").value = button.dataset.vehicleGarage;
  renderVehicleGaragePicker();
});
$("#addGarageButton").addEventListener("click", () => openGarageDialog());
$("#garageType").innerHTML = '<option value="auto">Automático pelo nome</option>' + Object.entries(garageTypes).map(([type, info]) => `<option value="${type}">${info.label}</option>`).join("");
renderPropertyPicker();
$("#propertyPicker").addEventListener("click", event => {
  const button = event.target.closest("[data-property-type]");
  if (!button) return;
  $("#garageType").value = button.dataset.propertyType;
  if (button.dataset.propertyName) $("#garageName").value = button.dataset.propertyName;
  updateGarageCapacity();
});
$("#garageCapacityOptions").addEventListener("click", event => {
  const button = event.target.closest("[data-capacity]");
  if (!button) return;
  $("#garageCapacity").value = button.dataset.capacity;
  renderGaragePreview();
});
$("#garageName").addEventListener("input", updateGarageCapacity);
$("#garageType").addEventListener("change", updateGarageCapacity);
$("#searchInput").addEventListener("input", renderVehicles);
$("#clearGarageFilter").addEventListener("click", returnToGarages);
$("#backToGarages").addEventListener("click", returnToGarages);
$("#editSelectedGarage").addEventListener("click", () => openGarageDialog(selectedGarage));
$(".brand").addEventListener("click", event => { event.preventDefault(); $('[data-filter="all"]').click(); });
$("#categoryFilter").addEventListener("change", renderVehicles);
$$('[data-close]').forEach(button => button.addEventListener("click", () => $("#" + button.dataset.close).close()));

$$('.nav-item').forEach(item => item.addEventListener("click", () => {
  currentFilter = item.dataset.filter;
  selectedGarage = null;
  setActiveNav(currentFilter);
  render();
  if (currentFilter === "vehicles" || currentFilter === "favorites") $("#vehicleSection").scrollIntoView({ behavior: "smooth", block: "start" });
}));

$("#vehicleForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!$("#vehicleName").value.trim() || !$("#vehicleCategory").value.trim()) return showToast("Preencha o modelo e a categoria do veículo.", "warning");
  const id = $("#vehicleId").value;
  const garageId = $("#vehicleGarage").value;
  const garage = getGarage(garageId);
  if (garageId && !garage) return showToast("Selecione uma garagem existente.", "warning");
  const used = data.vehicles.filter(vehicle => vehicle.garageId === garageId && vehicle.id !== id).length;
  const movingVehicle = !id || data.vehicles.find(vehicle => vehicle.id === id)?.garageId !== garageId;
  if (garage && movingVehicle && used >= garage.capacity) return showToast(garage.capacity === 0 ? "Esta propriedade não tem vagas permanentes." : "Esta garagem está lotada. Escolha outra garagem para este veículo.", "warning");
  const payload = {
    ...(data.vehicles.find(vehicle => vehicle.id === id) || {}),
    id: id || crypto.randomUUID(), name: $("#vehicleName").value.trim(), category: $("#vehicleCategory").value.trim(),
    garageId: garageId || null, favorite: $("#vehicleFavorite").checked,
    parking: parkingForVehicleSave(id, garageId),
    brand: $("#vehicleBrand").value.trim(), paint: $("#vehiclePaint").value.trim(), ...readVehicleWheels(), plate: $("#vehiclePlate").value.trim(), notes: $("#vehicleNotes").value.trim(),
    catalogId: findCatalogVehicle($("#vehicleName").value, selectedCatalogModelId)?.id || null,
    color: data.vehicles.find(vehicle => vehicle.id === id)?.color || carColors[data.vehicles.length % carColors.length]
  };
  if (id) data.vehicles[data.vehicles.findIndex(vehicle => vehicle.id === id)] = payload; else data.vehicles.push(payload);
  $("#vehicleDialog").close();
  saveData(id ? "Veículo atualizado" : "Veículo adicionado");
  openVehicleDetails(payload.id);
});

let pendingDeleteVehicleId = null;
$("#deleteVehicleButton").addEventListener("click", () => {
  const id = $("#vehicleId").value;
  const vehicle = data.vehicles.find(item => item.id === id);
  if (!vehicle) return;
  pendingDeleteVehicleId = id;
  $("#deleteVehicleName").textContent = vehicle.name;
  $("#deleteVehicleDialog").showModal();
  $("#cancelDeleteVehicle").focus();
});
$("#deleteVehicleDialog").addEventListener("close", () => { pendingDeleteVehicleId = null; });
$("#confirmDeleteVehicle").addEventListener("click", () => {
  const id = pendingDeleteVehicleId;
  if (!id || !data.vehicles.some(vehicle => vehicle.id === id)) return;
  pendingDeleteVehicleId = null;
  data.vehicles = data.vehicles.filter(vehicle => vehicle.id !== id);
  $("#deleteVehicleDialog").close();
  $("#vehicleDialog").close();
  saveData("Veículo excluído");
});

$("#garageForm").addEventListener("submit", event => {
  event.preventDefault();
  const type = getGarageType({ name: $("#garageName").value.trim(), type: $("#garageType").value });
  const id = $("#garageId").value;
  const garage = { ...(getGarage(id) || {}), id: id || crypto.randomUUID(), name: $("#garageName").value.trim() || garageTypes[type].label, type, capacity: Number($("#garageCapacity").value), tags: [...new Set($("#garageTags").value.split(",").map(tag => tag.trim()).filter(Boolean))].slice(0, 10) };
  const profile = getGarageProfile(garage);
  if (!profile.capacities.includes(garage.capacity)) return showToast("Selecione uma capacidade válida para esta propriedade.", "warning");
  const used = data.vehicles.filter(vehicle => vehicle.garageId === id).length;
  if (id && garage.capacity < used) return showToast(`Esta garagem tem ${used} veículos. Mova os carros antes de reduzir as vagas.`, "warning");
  const previous = data.garages;
  data.garages = id ? data.garages.map(item => item.id === id ? garage : item) : [...data.garages, garage];
  if (!saveData(id ? "Garagem atualizada" : "Garagem criada")) { data.garages = previous; return; }
  event.target.reset();
  updateGarageCapacity();
  $("#garageDialog").close();
});

function returnToGarages() {
  selectedGarage = null; currentFilter = "garages";
  $("#searchInput").value = ""; $("#categoryFilter").value = "all";
  setActiveNav("garages"); render();
}

function openGarageDialog(id = null) {
  const garage = getGarage(id);
  $("#garageForm").reset();
  $("#garageId").value = garage?.id || "";
  $("#garageName").value = garage?.name || "";
  $("#garageType").value = garage ? getGarageType(garage) : "garage";
  $("#garageTags").value = (garage?.tags || []).join(", ");
  $("#garageDialogTitle").textContent = garage ? "Editar garagem" : "Adicionar garagem";
  $("#saveGarageButton").textContent = garage ? "Salvar alterações" : "＋ Criar garagem";
  $("#deleteGarageButton").hidden = !garage;
  $("#garageCapacity").dataset.propertyType = "";
  updateGarageCapacity();
  if (garage) { $("#garageCapacity").value = garage.capacity; renderGaragePreview(); }
  $("#garageDialog").showModal();
}

let pendingDeleteGarageId = null;
$("#deleteGarageButton").addEventListener("click", () => {
  const garage = getGarage($("#garageId").value); if (!garage) return;
  pendingDeleteGarageId = garage.id;
  const used = data.vehicles.filter(vehicle => vehicle.garageId === garage.id).length;
  $("#deleteGarageDescription").textContent = `Remover ${garageLabel(garage)}? ${used ? `Os ${used} veículos serão mantidos na coleção, como “Sem garagem”, com seus dados de cadastro.` : "Esta garagem está vazia."}`;
  $("#deleteGarageDialog").showModal(); $("#cancelDeleteGarage").focus();
});
$("#confirmDeleteGarage").addEventListener("click", () => {
  if (!getGarage(pendingDeleteGarageId)) return;
  const previousGarages = data.garages, previousVehicles = data.vehicles, previousSelected = selectedGarage;
  data.garages = data.garages.filter(garage => garage.id !== pendingDeleteGarageId);
  data.vehicles = data.vehicles.map(vehicle => vehicle.garageId === pendingDeleteGarageId ? { ...vehicle, garageId: null } : vehicle);
  if (selectedGarage === pendingDeleteGarageId) selectedGarage = null;
  if (!saveData("Garagem removida. Seus veículos foram preservados.")) { data.garages = previousGarages; data.vehicles = previousVehicles; selectedGarage = previousSelected; render(); return; }
  pendingDeleteGarageId = null; $("#deleteGarageDialog").close(); $("#garageDialog").close();
});

updateGarageCapacity();
render();
