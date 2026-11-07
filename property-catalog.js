const PROPERTY_DEALERS = [
  { id: "dynasty8", name: "Dynasty 8", address: "www.dynasty8realestate.com", tagline: "Casas, apartamentos e garagens tradicionais", types: ["safehouse", "garage", "eclipse_boulevard"] },
  { id: "executive", name: "Dynasty 8 Executive", address: "www.dynasty8executiverealty.com", tagline: "Escritórios executivos e agências", types: ["office", "agency"] },
  { id: "foreclosures", name: "Maze Bank Foreclosures", address: "foreclosures.maze-bank.com", tagline: "Oficinas, boates, motoclubes e negócios", types: ["auto_shop_property", "arcade", "bat_club_property", "biker_clubhouse", "hangar", "facility", "property_bunker", "salvage_yard"] },
  { id: "special", name: "Outros sites", address: "www.eyefind.info/imoveis-especiais", tagline: "Warstock, Arena War, Casino e Clube Vinewood", types: ["kosatka", "arena_workshop", "casino", "vinewood_garage", "warehouse_vehicle"] }
];
function getPropertyLocation(id) { return PROPERTY_MAP.locations.find(location => location.id === id) || null; }
function propertyImageKey(value) {
  return normalizeVehicleText(String(value)).replace(/,?\s*(apt\.?|apartment|penthouse|suite)\s*.*$/, "").replace(/[^a-z0-9]/g, "");
}
function getGarageCover(garage) {
  const type = getGarageType(garage);
  const linked = getPropertyLocation(garage.locationId);
  // A saved location takes precedence over a custom garage name.
  if (linked?.type === type && PROPERTY_IMAGES[linked.id]) return PROPERTY_IMAGES[linked.id];
  if (!garage.locationId) {
    const name = propertyImageKey(garage.name);
    const location = PROPERTY_MAP.locations.find(item => item.type === type && propertyImageKey(item.name) === name);
    if (location && PROPERTY_IMAGES[location.id]) return PROPERTY_IMAGES[location.id];
    const single = PROPERTY_MAP.locations.filter(item => item.type === type);
    if (single.length === 1 && PROPERTY_IMAGES[single[0].id]) return PROPERTY_IMAGES[single[0].id];
    if (PROPERTY_IMAGES[`type-${type}`]) return PROPERTY_IMAGES[`type-${type}`];
  }
  return { image: "", label: PROPERTY_MAP.locations.some(item => item.type === type) ? "Selecione a localização do imóvel" : "Fachada indisponível" };
}
function propertyCapacityLabel(location) { return location.capacity ? `${location.capacityMode === "max" ? "Até " : ""}${location.capacity} ${location.type === "hangar" ? "aeronaves" : location.type === "biker_clubhouse" ? "motos" : "vagas"}` : "Sem vagas comuns de veículos"; }
function renderGarageLocationOptions() {
  const type = getGarageType({ name: $("#garageName").value, type: $("#garageType").value });
  const select = $("#garageLocation");
  const previous = select.value;
  const choices = PROPERTY_MAP.locations.filter(location => location.type === type);
  select.replaceChildren(new Option(type === "kosatka" ? "Propriedade móvel · sem localização fixa" : "Sem localização vinculada", ""));
  choices.forEach(location => select.add(new Option(location.name, location.id)));
  select.value = choices.some(location => location.id === previous) ? previous : "";
  select.disabled = type === "kosatka";
  $("#garageLocationHelp").textContent = type === "kosatka" ? "O Kosatka não recebe um ponto fixo no mapa." : "Vincule um local para encontrar esta garagem no mapa. Se não estiver na lista, mantenha sem localização.";
}
function registerPropertyLocation(id) {
  const location = getPropertyLocation(id);
  if (!location) return;
  if ($("#eyefindDialog").open) $("#eyefindDialog").close();
  openGarageDialog();
  $("#garageType").value = location.type;
  $("#garageName").value = location.name;
  renderGarageLocationOptions();
  $("#garageLocation").value = location.id;
  updateGarageCapacity();
}
