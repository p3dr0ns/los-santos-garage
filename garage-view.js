const garageRoomState = { garageId: null, floor: 0, selectedSlot: null, movingVehicleId: null, view: "room" };
const parkingNumber = slot => String(slot + 1).padStart(2, "0");
const parkingAttr = value => escapeHtml(String(value)).replaceAll('"', "&quot;");

function getGarageSections(garage, slotCount) {
  const nightclub = getGarageType(garage) === "bat_club_property";
  const office = getGarageType(garage) === "office";
  const sectionSize = office ? 20 : 10;
  const personalSlots = nightclub ? Math.max(0, garage.capacity - 1) : slotCount;
  const sections = Array.from({ length: Math.ceil(personalSlots / sectionSize) }, (_, floor) => ({
    start: floor * sectionSize, end: Math.min(personalSlots, (floor + 1) * sectionSize),
    label: office ? `Garagem executiva ${floor + 1}` : nightclub ? `Piso B${floor + 2}` : `Setor ${floor + 1}`
  }));
  if (nightclub) {
    sections.push({ start: personalSlots, end: personalSlots + 1, label: "Entrada" });
    if (slotCount > garage.capacity) sections.push({ start: garage.capacity, end: slotCount, label: "Excedentes" });
  }
  return sections;
}

function renderGarageView(matches) {
  const garage = getGarage(selectedGarage);
  const room = $("#garageRoom");
  if (garageRoomState.garageId !== selectedGarage) Object.assign(garageRoomState, { garageId: selectedGarage, floor: 0, selectedSlot: null, movingVehicleId: null, view: "room" });
  $("#garageViewToggle").hidden = !garage;
  const active = Boolean(garage && garageRoomState.view === "room");
  $("#vehicleSection").classList.toggle("garage-map-mode", active);
  room.hidden = !active;
  $("#vehicleGrid").hidden = active;
  if (!active) return;
  const theme = applyGarageTheme(room, garage);
  $("#activeGarageFilter").hidden = true;
  $("#emptyState").hidden = true;
  $$("[data-garage-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.garageView === garageRoomState.view)));
  const slots = getGarageParking(garage, data.vehicles);
  if (!slots.length) {
    room.innerHTML = garageInteriorBanner(theme) + '<div class="garage-room-unavailable"><h3>Esta propriedade não tem vagas permanentes.</h3><p>Escolha uma garagem com vagas para posicionar seus veículos.</p></div>';
    return;
  }
  const sections = getGarageSections(garage, slots.length);
  const floors = sections.length;
  garageRoomState.floor = Math.min(garageRoomState.floor, floors - 1);
  const { start, end } = sections[garageRoomState.floor];
  const visible = slots.slice(start, end);
  const matchingIds = new Set(matches.map(vehicle => vehicle.id));
  const selectedSlot = garageRoomState.selectedSlot;
  const chosen = selectedSlot == null ? null : slots[selectedSlot];
  const moving = data.vehicles.find(vehicle => vehicle.id === garageRoomState.movingVehicleId && vehicle.garageId === garage.id);
  if (!moving) garageRoomState.movingVehicleId = null;
  const used = slots.filter(Boolean).length;
  const free = Math.max(0, garage.capacity - used);
  const selectLabel = (vehicle, slot) => `${vehicle ? vehicle.name : "Vaga livre"} · vaga ${parkingNumber(slot)}`;
  const mapSlots = visible.map((vehicle, offset) => {
    const slot = start + offset;
    const selected = selectedSlot === slot;
    const image = vehicle ? getVehicleImage(vehicle) : "";
    const filtered = vehicle && !matchingIds.has(vehicle.id);
    return `<button type="button" class="parking-bay ${vehicle ? "occupied" : "vacant"} ${selected ? "selected" : ""} ${filtered ? "filtered-out" : ""} ${moving ? "move-target" : ""}" data-parking-slot="${slot}" aria-label="${parkingAttr(selectLabel(vehicle, slot))}" aria-pressed="${selected}"><span class="parking-bay-number">${parkingNumber(slot)}</span>${vehicle ? `<span class="parking-car-photo">${image ? `<img src="${parkingAttr(image)}" alt="" loading="lazy">` : '<svg class="ui-icon"><use href="#ui-car"/></svg>'}</span><span class="parking-car-name">${escapeHtml(vehicle.name)}<small>${escapeHtml(vehicle.category)}</small></span>` : '<span class="parking-empty-symbol" aria-hidden="true">＋</span><span class="parking-car-name">Livre<small>Disponível para um veículo</small></span>'}${slot >= garage.capacity ? '<span class="parking-overflow">Excedente</span>' : ""}</button>`;
  }).join("");
  const menu = visible.map((vehicle, offset) => {
    const slot = start + offset;
    return `<button type="button" class="parking-menu-item ${selectedSlot === slot ? "selected" : ""}" data-parking-slot="${slot}" aria-pressed="${selectedSlot === slot}"><span>${parkingNumber(slot)}</span><strong>${vehicle ? escapeHtml(vehicle.name) : "Vazio"}</strong><i class="${vehicle ? "occupied" : ""}" aria-hidden="true"></i></button>`;
  }).join("");
  let selection = '<p class="parking-selection-hint">Selecione um carro ou uma vaga no mapa.</p>';
  if (selectedSlot != null && selectedSlot < slots.length) {
    selection = `<div class="parking-selection"><span class="eyebrow">VAGA ${parkingNumber(selectedSlot)}</span><strong>${chosen ? escapeHtml(chosen.name) : "Vaga livre"}</strong>${chosen ? '<button type="button" class="primary-button" data-parking-action="details">Abrir ficha ↗</button><button type="button" class="secondary-button" data-parking-action="move">Trocar posição</button>' : selectedSlot < garage.capacity ? '<button type="button" class="primary-button" data-parking-action="add">Adicionar nesta vaga</button>' : ""}</div>`;
  }
  room.innerHTML = `<div class="garage-room-bar"><div><span class="eyebrow">SUA GARAGEM, VAGA POR VAGA</span><h3>Gerenciar veículos</h3></div><div class="garage-room-occupancy"><strong>${used}<span> / ${garage.capacity}</span></strong><small>${free} ${free === 1 ? "vaga livre" : "vagas livres"}</small></div></div><div class="garage-room-layout"><aside class="parking-manager"><label class="parking-floor-label">Setor<select id="parkingFloor" aria-label="Escolher setor da garagem">${sections.map((section, floor) => `<option value="${floor}" ${floor === garageRoomState.floor ? "selected" : ""}>${section.label} · ${section.end - section.start === 1 ? `vaga ${parkingNumber(section.start)}` : `vagas ${parkingNumber(section.start)}–${parkingNumber(section.end - 1)}`}</option>`).join("")}</select></label>${moving ? `<div class="parking-moving" role="status"><strong>Movendo ${escapeHtml(moving.name)}</strong><p>Escolha a vaga de destino. Se estiver ocupada, os dois carros trocam de posição. Você pode mudar de setor.</p><button type="button" class="secondary-button" data-parking-action="cancel">Cancelar</button></div>` : selection}<div class="parking-menu" aria-label="Vagas deste setor">${menu}</div></aside><div class="garage-map-area">${garageInteriorBanner(theme)}<div class="garage-floor" style="--bay-rows:${Math.ceil(visible.length / 2)}"><div class="garage-drive-lane" aria-hidden="true"><span>↑</span><span>↑</span><span>↑</span></div><div class="parking-bays">${mapSlots}</div><div class="garage-entry" aria-hidden="true"><span>ENTRADA / SAÍDA</span></div></div><div class="garage-map-legend"><span><i class="occupied"></i> Ocupada</span><span><i></i> Livre</span><span>Mapa 2D · fotos de referência</span></div></div></div><p class="garage-room-note" role="status">${matches.length !== used ? `${matches.length} veículos correspondem aos filtros. Os demais continuam nas suas posições. ` : ""}${getGarageType(garage) === "bat_club_property" ? "B2, B3 e B4: 10 carros pessoais por piso adquirido. A entrada tem 1 vaga separada. B1 (Speedo Custom, Mule Custom e Pounder Custom) e B5 (Terrorbyte) não entram no cadastro. " : ""}As posições são salvas neste navegador. A disposição é ilustrativa e não altera o GTA.</p>`;
  room.querySelectorAll("img").forEach(img => img.addEventListener("error", () => { img.hidden = true; }));
}

function selectParkingSlot(slot) {
  const garage = getGarage(selectedGarage);
  if (!garage) return;
  const slots = getGarageParking(garage, data.vehicles);
  if (!Number.isInteger(slot) || slot < 0 || slot >= slots.length) return;
  if (garageRoomState.movingVehicleId) {
    moveParkedVehicle(garageRoomState.movingVehicleId, slot);
    return;
  }
  garageRoomState.selectedSlot = slot;
  renderVehicles();
  $("#garageRoom").querySelector(`.parking-bay[data-parking-slot="${slot}"]`)?.focus({ preventScroll: true });
}

function moveParkedVehicle(vehicleId, target) {
  const garage = getGarage(selectedGarage);
  if (!garage || !Number.isInteger(target) || target < 0 || target >= garage.capacity) return;
  const slots = getGarageParking(garage, data.vehicles);
  const source = slots.findIndex(vehicle => vehicle?.id === vehicleId);
  if (source < 0) return;
  const previous = data.vehicles;
  const positions = new Map();
  [slots[source], slots[target]] = [slots[target], slots[source]];
  slots.forEach((vehicle, slot) => { if (vehicle) positions.set(vehicle.id, slot); });
  data.vehicles = data.vehicles.map(vehicle => positions.has(vehicle.id) ? { ...vehicle, parking: { garageId: garage.id, slot: positions.get(vehicle.id) } } : vehicle);
  const oldSelection = garageRoomState.selectedSlot;
  garageRoomState.selectedSlot = target;
  garageRoomState.movingVehicleId = null;
  garageRoomState.floor = getGarageSections(garage, slots.length).findIndex(section => target >= section.start && target < section.end);
  if (!saveData(source === target ? "Posição mantida." : "Posições da garagem atualizadas.")) {
    data.vehicles = previous;
    garageRoomState.selectedSlot = oldSelection;
    renderVehicles();
  }
}

$("#garageViewToggle").addEventListener("click", event => {
  const button = event.target.closest("[data-garage-view]");
  if (!button) return;
  garageRoomState.view = button.dataset.garageView;
  garageRoomState.movingVehicleId = null;
  $$("[data-garage-view]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  renderVehicles();
});
$("#garageRoom").addEventListener("change", event => {
  if (event.target.id === "garageDecoration") {
    const style = event.target.value;
    if (!AUTO_SHOP_STYLES.some(item => item.id === style)) return;
    const garage = getGarage(selectedGarage);
    if (!garage || getGarageType(garage) !== "auto_shop_property") return;
    const previous = data.garages;
    data.garages = data.garages.map(item => item.id === garage.id ? { ...item, interiorStyle: style } : item);
    if (!saveData("Decoração da oficina atualizada.")) { data.garages = previous; render(); }
    $("#garageDecoration")?.focus({ preventScroll: true });
    return;
  }
  if (event.target.id !== "parkingFloor") return;
  garageRoomState.floor = Number(event.target.value);
  renderVehicles();
  $("#parkingFloor")?.focus({ preventScroll: true });
});
$("#garageRoom").addEventListener("click", event => {
  const slot = event.target.closest("[data-parking-slot]");
  if (slot) { selectParkingSlot(Number(slot.dataset.parkingSlot)); return; }
  const action = event.target.closest("[data-parking-action]")?.dataset.parkingAction;
  if (!action) return;
  const garage = getGarage(selectedGarage);
  if (!garage) return;
  const vehicle = getGarageParking(garage, data.vehicles)[garageRoomState.selectedSlot];
  if (action === "details" && vehicle) openVehicleDetails(vehicle.id);
  if (action === "move" && vehicle) { garageRoomState.movingVehicleId = vehicle.id; renderVehicles(); }
  if (action === "cancel") { garageRoomState.movingVehicleId = null; renderVehicles(); }
  if (action === "add" && !vehicle) {
    openVehicleDialog();
    $("#vehicleGarage").value = garage.id;
    renderVehicleGaragePicker();
    requestedParkingSlot = { garageId: garage.id, slot: garageRoomState.selectedSlot };
  }
});
$("#garageRoom").addEventListener("keydown", event => {
  if (event.key === "Escape" && garageRoomState.movingVehicleId) {
    garageRoomState.movingVehicleId = null; renderVehicles();
  }
});
renderVehicles();
