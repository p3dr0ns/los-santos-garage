let detailVehicleId = null;
const escapeAttr = value => escapeHtml(String(value)).replaceAll('"', "&quot;");
function getBrand(vehicle) {
  return vehicle.brand || findCatalogVehicle(vehicle.name, vehicle.catalogId)?.brand || "Não informada";
}

let portfolioScroll = 0;
function openVehicleDetails(id, navigate = true) {
  if (!data.vehicles.some(vehicle => vehicle.id === id)) return;
  detailVehicleId = id;
  const vehicle = data.vehicles.find(item => item.id === id);

  renderVehicleDetails();
  if ($("#vehicleDetailsDialog").hidden) portfolioScroll = window.scrollY;
  $("#vehicleDetailsDialog").hidden = false;
  $(".app-shell").hidden = true;
  document.title = `${vehicle.name} · Los Santos Garage`;
  if (navigate && location.hash !== `#carro/${encodeURIComponent(id)}`) {
    const url = new URL(location.href);
    url.hash = `carro/${encodeURIComponent(id)}`;
    history.pushState(null, "", url.href);
  }
  window.scrollTo(0, 0);
  $("#detailsName").focus({ preventScroll: true });
}

function closeVehiclePortfolio(navigate = true) {
  $("#vehicleDetailsDialog").hidden = true;
  $(".app-shell").hidden = false;
  document.title = "Los Santos Garage";
  if (navigate && location.hash.startsWith("#carro/")) {
    const url = new URL(location.href);
    url.hash = "";
    history.replaceState(null, "", url.href);
  }
  window.scrollTo(0, portfolioScroll);
  const card = [...$$(".vehicle-card")].find(item => item.dataset.vehicleId === detailVehicleId);
  card?.focus({ preventScroll: true });
}

function restoreVehicleRoute() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(7)); } catch { closeVehiclePortfolio(); return; }
  if (location.hash.startsWith("#carro/") && data.vehicles.some(vehicle => vehicle.id === id)) openVehicleDetails(id, false);
  else closeVehiclePortfolio(false);
}
window.addEventListener("popstate", restoreVehicleRoute);
window.addEventListener("hashchange", restoreVehicleRoute);
$("#backToCollection").addEventListener("click", () => closeVehiclePortfolio());

function renderVehicleDetails() {
  const vehicle = data.vehicles.find(item => item.id === detailVehicleId);
  if (!vehicle) return;
  $("#detailsBrand").textContent = getBrand(vehicle);
  $("#detailsName").textContent = vehicle.name;
  $("#detailsSubtitle").textContent = `${vehicle.category} · ${garageLabel(getGarage(vehicle.garageId))}`;
  $("#detailsFavorite").textContent = vehicle.favorite ? "★ Favorito" : "☆ Favoritar";
  $("#detailsFavorite").setAttribute("aria-pressed", String(Boolean(vehicle.favorite)));
  const fields = [["Marca", getBrand(vehicle)], ["Modelo", vehicle.name], ["Categoria", vehicle.category], ["Garagem", garageLabel(getGarage(vehicle.garageId))], ["Pintura", vehicle.paint || "Não informada"], ["Rodas", getWheelDescription(vehicle) || "Não informadas"], ["Placa", vehicle.plate || "Não informada"]];
  $("#detailsSpecs").innerHTML = fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  const model = findCatalogVehicle(vehicle.name, vehicle.catalogId);
  const reference = model ? VEHICLE_REFERENCE[model.id] : null;
  $("#detailsReferenceNotice").hidden = Boolean(reference);
  $("#detailsReferenceNotice").textContent = model?.id.startsWith("drift")
    ? "Não foi encontrada uma ficha específica para esta configuração Drift no GTA Base."
    : "Este modelo ainda não tem dados de referência no catálogo.";
  const number = value => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const referenceFields = [
    ["Preço do GTA Online", reference?.price != null ? `GTA$ ${number(reference.price)}` : "Não informado"],
    ["Preço de negociação", reference?.tradePrice != null ? `GTA$ ${number(reference.tradePrice)}` : "Não informado"],
    ["Velocidade máxima testada", reference?.topSpeedKmh != null ? `${number(reference.topSpeedKmh)} km/h` : "Não informada"],
    ["Baseado em (vida real)", reference?.basedOn || "Não informado"]
  ];
  $("#detailsSpecs").innerHTML += referenceFields.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  const drivetrainLabels = { RWD: "RWD · Tração traseira", FWD: "FWD · Tração dianteira", AWD: "AWD · Tração integral" };
  const mechanicalFields = [
    ["Assentos", reference?.seats != null ? number(reference.seats) : "Não informado"],
    ["Massa / peso", reference?.weightKg != null ? `${number(reference.weightKg)} kg` : "Não informado"],
    ["Tração", drivetrainLabels[reference?.drivetrain] || reference?.drivetrain || "Não informada"],
    ["Marchas", reference?.gears != null ? number(reference.gears) : "Não informado"]
  ];
  $("#detailsMechanical").innerHTML = mechanicalFields.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  renderVehicleStatistics(reference?.stats);
  if (reference) {
    const variantNote = reference.matchedBy === "sharedArenaVariant" ? " A fonte publica uma ficha compartilhada para as variantes Arena deste modelo." : "";
    $("#detailsSpecs").innerHTML += `<div class="reference-source"><dt>Referência</dt><dd><a href="${escapeAttr(reference.url)}" target="_blank" rel="noopener noreferrer">GTA Base</a> · consulta em ${escapeHtml(reference.retrieved.split("-").reverse().join("/"))}<small>Velocidade testada com melhorias completas, sem HSW. O preço de negociação pode exigir desbloqueio. Promoções, conversões e disponibilidade podem variar.${variantNote}</small></dd></div>`;
  }
  $("#detailsNotes").hidden = !vehicle.notes;
  $("#detailsNotes p").textContent = vehicle.notes || "";
  const photo = getVehicleImage(vehicle);
  const image = $("#detailsPhoto");
  image.hidden = !photo;
  image.alt = `${vehicle.name} — imagem do GTA Base`;
  if (photo) image.src = photo; else image.removeAttribute("src");
  const entry = VEHICLE_IMAGES[model?.id];
  $("#detailsPhotoLabel").textContent = photo ? (entry?.sharedWith ? "GTA Base · imagem do modelo base" : "Imagem do GTA Base") : "Imagem indisponível";
}
function renderVehicleStatistics(stats) {
  const fields = [["speed", "Velocidade"], ["acceleration", "Aceleração"], ["braking", "Frenagem"], ["handling", "Dirigibilidade"]];
  const valid = value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
  const format = value => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  $("#detailsStats").innerHTML = fields.map(([key, label]) => {
    const value = stats?.[key];
    return `<div class="performance-row"><span>${label}</span>${valid(value) ? `<div class="performance-bar" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" aria-valuetext="${format(value)} de 100"><span style="width:${value}%"></span></div><strong>${format(value)}</strong>` : '<span class="performance-unknown">Não informado</span>'}</div>`;
  }).join("");
  $("#detailsOverall").textContent = valid(stats?.overall) ? format(stats.overall) : "Não informado";
}

$("#detailsEdit").addEventListener("click", () => { closeVehiclePortfolio(); openVehicleDialog(detailVehicleId); });
$("#detailsFavorite").addEventListener("click", () => {
  const vehicle = data.vehicles.find(item => item.id === detailVehicleId);
  vehicle.favorite = !vehicle.favorite; saveData(); renderVehicleDetails();
});
$("#detailsPhoto").addEventListener("error", () => { $("#detailsPhoto").hidden = true; $("#detailsPhotoLabel").textContent = "Imagem indisponível"; });
if (location.hash.startsWith("#carro/")) restoreVehicleRoute();