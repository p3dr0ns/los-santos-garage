const STORAGE_KEY = "minha-garagem-v1";
const photoUrls = new Map();
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
  const profile = garageProfiles[type];
  const capacity = Number($("#garageCapacity").value);
  $("#garagePreviewIcon").innerHTML = garageIcon(garage);
  $("#garagePreviewName").textContent = garage.name || garageTypes[type].label;
  $("#garageCapacityTotal").textContent = capacity;
  $("#garageCapacityUnit").textContent = type === "hangar" ? "aeronaves" : capacity === 1 ? "vaga" : "vagas";
  $("#garageCapacityConfig").hidden = profile.capacities.length === 1;
  $("#garageCapacityOptions").innerHTML = profile.capacities.map(value => `<button type="button" class="capacity-choice ${value === capacity ? "selected" : ""}" data-capacity="${value}" aria-pressed="${value === capacity}">${value} vagas</button>`).join("");
  $$("[data-property-type]").forEach(button => {
    const selected = button.dataset.propertyType === type;
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
  }).join("");
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

// Imagens da RAGE Multiplayer Wiki, disponíveis localmente para uso offline.
const vehicleImages = {
  zentorno: "zentorno",
  elegy: "elegy",
  elegyretrocustom: "elegy",
  turismor: "turismor",
  kuruma2: "kuruma2",
  kurumablindado: "kuruma2",
  kurumaarmored: "kuruma2",
  sultanrs: "sultanrs",
  dominator: "dominator"
};

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
  const image = getVehicleImage({ ...savedVehicle, name, image: $("#vehicleImage").value.trim() });
  $("#vehiclePreviewName").textContent = name || "Qual é o próximo carro?";
  $("#vehiclePreviewCategory").textContent = $("#vehicleCategory").value.trim() || "SUA PRÓXIMA AQUISIÇÃO";
  const preview = $("#vehiclePreviewImage");
  preview.alt = name ? `Prévia de ${name}` : "";
  preview.hidden = true;
  if (image) {
    if (preview.getAttribute("src") !== image) preview.src = image;
    else if (preview.complete && preview.naturalWidth > 0) preview.hidden = false;
  } else preview.removeAttribute("src");
  const hasSessionPhoto = savedVehicle && [...photoUrls.keys()].some(key => key.startsWith(`${savedVehicle.id}:`));
  $("#vehicleImageStatus").textContent = image ? (hasSessionPhoto ? "Foto do seu ensaio" : $("#vehicleImage").value.trim() ? "Imagem personalizada" : "Imagem automática") : name ? "Sem imagem disponível" : "Prévia do veículo";
}

function renderVehicleGaragePicker() {
  const vehicleId = $("#vehicleId").value;
  const selectedId = $("#vehicleGarage").value;
  const existingGarageId = data.vehicles.find(vehicle => vehicle.id === vehicleId)?.garageId;
  $("#vehicleGaragePicker").innerHTML = data.garages.map(garage => {
    const used = data.vehicles.filter(vehicle => vehicle.garageId === garage.id && vehicle.id !== vehicleId).length;
    const free = Math.max(0, garage.capacity - used);
    const blocked = free === 0 && garage.id !== existingGarageId;
    return `<button type="button" class="property-choice ${garage.id === selectedId ? "selected" : ""}" data-vehicle-garage="${garage.id}" aria-pressed="${garage.id === selectedId}" ${blocked ? "disabled" : ""}>${garageIcon(garage)}<span><strong>${escapeHtml(garage.name)}</strong><small>${garage.capacity === 0 ? "Sem vagas permanentes" : free ? `${free} de ${garage.capacity} vagas livres` : "Garagem lotada"}</small></span><span class="property-check" aria-hidden="true">✓</span></button>`;
  }).join("");
  const selected = getGarage(selectedId);
  $("#vehicleGarageSummary").textContent = selected?.name || "Selecione uma garagem";
}

function getVehicleImage(vehicle) {
  const cover = photoUrls.get(`${vehicle.id}:${vehicle.coverSlot || "cinematicFront"}`);
  if (cover) return cover;
  const firstPhoto = [...photoUrls].find(([key]) => key.startsWith(`${vehicle.id}:`));
  if (firstPhoto) return firstPhoto[1];
  if (vehicle.image) return vehicle.image;
  const name = vehicle.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const model = vehicleImages[name];
  return model ? `assets/vehicles/${model}.png` : "";
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
  });
  return saved;
}

function saveData(message) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { showToast("Não foi possível salvar. Verifique o espaço disponível no navegador."); return false; }
  render();
  if (message) showToast(message);
  return true;
}

function render() {
  document.body.dataset.view = currentFilter;
  $(".stats").hidden = currentFilter !== "all";
  $("#garageSection").hidden = currentFilter !== "all" && currentFilter !== "garages";
  $("#vehicleSection").hidden = currentFilter === "garages";
  const pages = {
    all: ["Visão geral", "Sua coleção, organizada do seu jeito."],
    vehicles: ["Seus veículos", "Encontre cada carro e o lugar que ele chama de casa."],
    garages: ["Suas garagens", "Todas as propriedades. Cada vaga sob controle."],
    favorites: ["Favoritos", "Os que merecem um lugar especial na coleção."]
  };
  $("#pageTitle").textContent = pages[currentFilter][0];
  $("#pageDescription").textContent = pages[currentFilter][1];
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
  $("#searchInput").disabled = currentFilter === "garages";
  renderGarages();
  renderCategories();
  renderVehicles();
}

function renderGarages() {
  $("#garageList").innerHTML = data.garages.map((garage, index) => {
    const used = data.vehicles.filter(vehicle => vehicle.garageId === garage.id).length;
    const percent = garage.capacity > 0 ? Math.min(100, used / garage.capacity * 100) : 0;
    const free = Math.max(0, garage.capacity - used);
    return `<article class="garage-card ${selectedGarage === garage.id ? "selected" : ""}" role="button" tabindex="0" aria-label="Ver veículos: ${escapeHtml(garage.name).replaceAll('"', '&quot;')}" data-garage-id="${garage.id}" style="--card-color:${garageColors[index % garageColors.length]}">
      <div class="garage-card-top"><span class="garage-symbol">${garageIcon(garage)}</span><span class="garage-availability ${free === 0 ? "full" : ""}">${garage.capacity === 0 ? "Sem vagas" : free === 0 ? "Completa" : `${free} livres`}</span></div>
      <h3>${escapeHtml(garage.name)}</h3>
      <p class="garage-kind" title="${escapeHtml(getGarageProfile(garage).note).replaceAll('"', '&quot;')}">${garageTypes[getGarageType(garage)].label}</p>
      <div class="progress"><span style="width:${percent}%"></span></div>
      <div class="garage-card-bottom"><p><strong>${used}</strong> de ${garage.capacity} ocupadas</p><svg class="ui-icon"><use href="#ui-arrow"/></svg></div>
    </article>`;
  }).join("");
  $$(".garage-card").forEach(card => card.addEventListener("click", () => {
    selectedGarage = selectedGarage === card.dataset.garageId ? null : card.dataset.garageId;
    currentFilter = "vehicles";
    setActiveNav("vehicles");
    render();
  }));
  $$(".garage-card").forEach(card => card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); card.click(); }
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
    const matchesQuery = `${vehicle.name} ${vehicle.brand || ""} ${vehicle.category} ${vehicle.plate || ""} ${garage?.name || ""}`.toLowerCase().includes(query);
    const matchesCategory = category === "all" || vehicle.category === category;
    const matchesGarage = !selectedGarage || vehicle.garageId === selectedGarage;
    const matchesMode = currentFilter !== "favorites" || vehicle.favorite;
    return matchesQuery && matchesCategory && matchesGarage && matchesMode;
  });

  const titles = { favorites: "Veículos favoritos" };
  $("#vehicleTitle").textContent = selectedGarage ? getGarage(selectedGarage)?.name : (titles[currentFilter] || "Todos os veículos");
  $("#vehicleResultCount").textContent = vehicles.length;
  $("#activeGarageFilter").hidden = !selectedGarage;
  $("#activeGarageName").textContent = selectedGarage ? `Garagem: ${getGarage(selectedGarage)?.name || ""}` : "";
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
      <div class="vehicle-info"><h3>${escapeHtml(vehicle.name)}</h3><div class="vehicle-meta"><span class="vehicle-garage">${garage ? garageIcon(garage, "garage-icon-small") : ""} ${escapeHtml(garage?.name || "Sem garagem")}</span><svg class="ui-icon vehicle-detail-arrow"><use href="#ui-arrow"/></svg></div></div>
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
}

function getGarage(id) { return data.garages.find(garage => garage.id === id); }

function openVehicleDialog(id = null) {
  if (!data.garages.length) return showToast("Crie uma garagem primeiro");
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
  $("#vehicleImage").value = vehicle?.image || "";
  $("#vehicleFavorite").checked = vehicle?.favorite || false;
  $("#vehicleGarage").innerHTML = data.garages.map(garage => `<option value="${garage.id}">${escapeHtml(garage.name)}</option>`).join("");
  const availableGarages = data.garages.filter(garage => data.vehicles.filter(item => item.garageId === garage.id).length < garage.capacity);
  $("#vehicleGarage").value = vehicle?.garageId || availableGarages.find(garage => garage.id === selectedGarage)?.id || availableGarages[0]?.id || data.garages[0].id;
  $("#deleteVehicleButton").hidden = !vehicle;
  $("#vehicleImageDetails").open = Boolean(vehicle?.image);
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
function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200); }

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
$("#vehicleImage").addEventListener("input", updateVehiclePreview);
$("#vehicleImage").addEventListener("invalid", () => { $("#vehicleImageDetails").open = true; });
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
$("#addGarageButton").addEventListener("click", () => {
  updateGarageCapacity();
  $("#garageDialog").showModal();
});
$("#garageType").innerHTML = '<option value="auto">Automático pelo nome</option>' + Object.entries(garageTypes).map(([type, info]) => `<option value="${type}">${info.label}</option>`).join("");
renderPropertyPicker();
$("#propertyPicker").addEventListener("click", event => {
  const button = event.target.closest("[data-property-type]");
  if (!button) return;
  $("#garageType").value = button.dataset.propertyType;
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
$("#clearGarageFilter").addEventListener("click", () => { selectedGarage = null; render(); });
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
  if (!$("#vehicleName").value.trim() || !$("#vehicleCategory").value.trim()) return showToast("Preencha o modelo e a categoria do veículo");
  const id = $("#vehicleId").value;
  const garageId = $("#vehicleGarage").value;
  const garage = getGarage(garageId);
  const used = data.vehicles.filter(vehicle => vehicle.garageId === garageId && vehicle.id !== id).length;
  const movingVehicle = !id || data.vehicles.find(vehicle => vehicle.id === id)?.garageId !== garageId;
  if (movingVehicle && used >= garage.capacity) return showToast(garage.capacity === 0 ? "Esta propriedade não tem vagas permanentes" : "Esta garagem está lotada");
  const payload = {
    ...(data.vehicles.find(vehicle => vehicle.id === id) || {}),
    id: id || crypto.randomUUID(), name: $("#vehicleName").value.trim(), category: $("#vehicleCategory").value.trim(),
    garageId, image: $("#vehicleImage").value.trim(), favorite: $("#vehicleFavorite").checked,
    brand: $("#vehicleBrand").value.trim(), paint: $("#vehiclePaint").value.trim(), ...readVehicleWheels(), plate: $("#vehiclePlate").value.trim(), notes: $("#vehicleNotes").value.trim(),
    catalogId: findCatalogVehicle($("#vehicleName").value, selectedCatalogModelId)?.id || null,
    color: data.vehicles.find(vehicle => vehicle.id === id)?.color || carColors[data.vehicles.length % carColors.length]
  };
  if (id) data.vehicles[data.vehicles.findIndex(vehicle => vehicle.id === id)] = payload; else data.vehicles.push(payload);
  $("#vehicleDialog").close();
  saveData(id ? "Veículo atualizado" : "Veículo adicionado");
  openVehicleDetails(payload.id);
});

$("#deleteVehicleButton").addEventListener("click", () => {
  const id = $("#vehicleId").value;
  if (!id || !confirm("Excluir este veículo?")) return;
  data.vehicles = data.vehicles.filter(vehicle => vehicle.id !== id);
  $("#vehicleDialog").close();
  saveData("Veículo excluído");
  deleteVehiclePhotos(id).catch(() => showToast("Veículo excluído; não foi possível limpar as fotos locais."));
});

$("#garageForm").addEventListener("submit", event => {
  event.preventDefault();
  const type = getGarageType({ name: $("#garageName").value.trim(), type: $("#garageType").value });
  const garage = { id: crypto.randomUUID(), name: $("#garageName").value.trim() || garageTypes[type].label, type, capacity: Number($("#garageCapacity").value) };
  const profile = getGarageProfile(garage);
  if (!profile.capacities.includes(garage.capacity)) return showToast("Selecione uma capacidade válida para esta propriedade");
  data.garages.push(garage);
  event.target.reset();
  updateGarageCapacity();
  $("#garageDialog").close();
  saveData("Garagem criada");
});

updateGarageCapacity();
render();
