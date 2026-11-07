const eyefindState = { dealer: null, query: "", type: "all", limit: 12 };
const propertyMapState = { query: "", type: "all", owned: false, selectedId: null, box: { x: 0, y: 0, w: PROPERTY_MAP.width, h: PROPERTY_MAP.height } };
const propertyEscape = value => escapeHtml(String(value)).replaceAll('"', "&quot;");
const propertyOwners = id => data.garages.filter(garage => garage.locationId === id);

function openEyefind() {
  Object.assign(eyefindState, { dealer: null, query: "", type: "all", limit: 12 });
  $("#eyefindSearch").value = "";
  renderEyefind();
  $("#eyefindDialog").showModal();
}
function dealerLogo(dealer) {
  if (dealer.id === "dynasty8") return '<span class="dealer-dynasty">DYNASTY <b>8</b><small>REAL ESTATE</small></span>';
  if (dealer.id === "executive") return '<span class="dealer-executive">DYNASTY <b>8</b><small>EXECUTIVE</small></span>';
  if (dealer.id === "foreclosures") return '<span class="dealer-maze"><b>MAZE BANK</b><small>FORECLOSURES</small></span>';
  return '<span class="dealer-special"><b>WARSTOCK</b><small>& OUTROS SITES</small></span>';
}
function renderEyefind() {
  const dealer = PROPERTY_DEALERS.find(item => item.id === eyefindState.dealer);
  $("#eyefindAddress").textContent = dealer ? dealer.address : "www.eyefind.info";
  $("#eyefindBack").disabled = !dealer && !eyefindState.query;
  const query = normalizeVehicleText(eyefindState.query);
  const locations = PROPERTY_MAP.locations.filter(location => (!dealer || location.dealer === dealer.id) && (eyefindState.type === "all" || location.type === eyefindState.type) && normalizeVehicleText(`${location.name} ${garageTypes[location.type].label}`).includes(query));
  const home = !dealer ? `<p class="eyefind-intro">Encontre um lugar para a sua coleção.</p><div class="eyefind-site-grid">${PROPERTY_DEALERS.map(site => `<button type="button" class="eyefind-site ${site.id}" data-eyefind-dealer="${site.id}">${dealerLogo(site)}<strong>${site.name}</strong><span>${site.tagline}</span></button>`).join("")}</div>` : `<div class="eyefind-dealer-heading ${dealer.id}">${dealerLogo(dealer)}<div><h3>${dealer.name}</h3><p>${dealer.tagline}</p></div></div><div class="eyefind-type-filters" role="group" aria-label="Tipo de imóvel"><button type="button" data-eyefind-type="all" aria-pressed="${eyefindState.type === "all"}">Todos</button>${dealer.types.map(type => `<button type="button" data-eyefind-type="${type}" aria-pressed="${eyefindState.type === type}">${garageTypes[type].label}</button>`).join("")}</div>`;
  let results = "";
  if (dealer || query) {
    results = `<div class="eyefind-results-heading"><h3>${query ? "Resultados da busca" : "Escolha a localização"}</h3><span>${locations.length} imóveis</span></div><div class="eyefind-property-grid">${locations.slice(0, eyefindState.limit).map(location => {
      const cover = getGarageCover({ name: location.name, type: location.type, locationId: location.id });
      return `<article class="eyefind-property">${cover.image ? `<img src="${propertyEscape(cover.image)}" alt="Fachada: ${propertyEscape(location.name)}" loading="lazy">` : `<div class="eyefind-property-placeholder" aria-hidden="true">${garageIcon({name: location.name,type:location.type})}</div>`}<div><span>${garageTypes[location.type].label}</span><h4>${escapeHtml(location.name)}</h4><p>${propertyCapacityLabel(location)}</p><button type="button" data-register-property="${location.id}">Escolher imóvel</button>${location.capacity ? `<button type="button" class="eyefind-map-link" data-show-map-property="${location.id}">Ver no mapa ↗</button>` : ""}</div></article>`;
    }).join("")}</div>${!locations.length ? '<p class="eyefind-empty">Nenhum imóvel encontrado com esses filtros.</p>' : ""}${locations.length > eyefindState.limit ? '<button type="button" class="eyefind-more" data-eyefind-more>Mostrar mais imóveis</button>' : ""}`;
  }
  const manual = dealer ? `<section class="eyefind-manual"><h3>Outro endereço ou propriedade especial?</h3><p>Você também pode cadastrar pelo tipo e vincular uma localização depois. Imóveis sem ponto confirmado não recebem marcador.</p><div>${dealer.types.filter(type => eyefindState.type === "all" || type === eyefindState.type).map(type => `<button type="button" data-eyefind-create-type="${type}">${garageTypes[type].label}${type === "kosatka" ? ' <small>Warstock · móvel</small>' : ""}</button>`).join("")}</div></section>` : "";
  $("#eyefindContent").innerHTML = home + results + manual;
}
function resetEyefind() {
  Object.assign(eyefindState, { dealer: null, query: "", type: "all", limit: 12 });
  $("#eyefindSearch").value = ""; renderEyefind();
}
$("#eyefindHome").addEventListener("click", resetEyefind);
$("#eyefindBack").addEventListener("click", resetEyefind);
$("#eyefindSearch").addEventListener("input", event => { eyefindState.query = event.target.value; eyefindState.limit = 12; renderEyefind(); });
$("#eyefindContent").addEventListener("click", event => {
  const dealer = event.target.closest("[data-eyefind-dealer]");
  const type = event.target.closest("[data-eyefind-type]");
  const register = event.target.closest("[data-register-property]");
  const map = event.target.closest("[data-show-map-property]");
  const create = event.target.closest("[data-eyefind-create-type]");
  if (dealer) { Object.assign(eyefindState, { dealer: dealer.dataset.eyefindDealer, query: "", type: "all", limit: 12 }); $("#eyefindSearch").value = ""; renderEyefind(); }
  if (type) { eyefindState.type = type.dataset.eyefindType; eyefindState.limit = 12; renderEyefind(); }
  if (event.target.closest("[data-eyefind-more]")) { eyefindState.limit += 12; renderEyefind(); }
  if (register) registerPropertyLocation(register.dataset.registerProperty);
  if (map) { $("#eyefindDialog").close(); Object.assign(propertyMapState,{query:"",type:"all",owned:false}); $('[data-filter="map"]').click(); selectMapProperty(map.dataset.showMapProperty, true); }
  if (create) {
    const value = create.dataset.eyefindCreateType;
    if (!Object.hasOwn(garageTypes, value)) return;
    $("#eyefindDialog").close(); openGarageDialog(); $("#garageType").value = value; $("#garageName").value = garageTypes[value].label; updateGarageCapacity();
  }
});

function filteredMapProperties() {
  const query = normalizeVehicleText(propertyMapState.query);
  return PROPERTY_MAP.locations.filter(location => location.capacity > 0 && (propertyMapState.type === "all" || location.type === propertyMapState.type) && (!propertyMapState.owned || propertyOwners(location.id).length) && normalizeVehicleText(`${location.name} ${garageTypes[location.type].label}`).includes(query));
}
function renderPropertyMap() {
  const root = $("#mapSection");
  if (!root.dataset.ready) {
    const types = [...new Set(PROPERTY_MAP.locations.filter(location => location.capacity > 0).map(location => location.type))];
    const tiles = Array.from({ length: PROPERTY_MAP.columns }, (_, x) => Array.from({ length: PROPERTY_MAP.rows }, (_, y) => `<image href="assets/map/${x}-${y}.png" x="${x * 256}" y="${y * 256}" width="256" height="256"/>`).join("")).join("");
    root.innerHTML = `<div class="property-map-toolbar"><label class="property-map-search"><svg class="ui-icon"><use href="#ui-search"/></svg><input id="propertyMapSearch" type="search" placeholder="Buscar endereço ou tipo…" aria-label="Buscar localização de garagem"></label><select id="propertyMapType" aria-label="Filtrar locais por tipo"><option value="all">Todos os tipos</option>${types.map(type => `<option value="${type}">${garageTypes[type].label}</option>`).join("")}</select><label class="property-map-owned"><input id="propertyMapOwned" type="checkbox"> Só minhas garagens</label></div><div class="property-map-layout"><div class="property-map-canvas"><svg id="propertyMapSvg" role="group" tabindex="0" aria-label="Mapa do GTA. Arraste para mover, use os botões para ampliar ou selecione um marcador." viewBox="0 0 ${PROPERTY_MAP.width} ${PROPERTY_MAP.height}"><rect width="${PROPERTY_MAP.width}" height="${PROPERTY_MAP.height}" fill="#c8dfe7"/>${tiles}<g id="propertyMapPins"></g></svg><div class="property-map-zoom" role="group" aria-label="Zoom do mapa"><button type="button" data-map-zoom="in" aria-label="Ampliar mapa">＋</button><button type="button" data-map-zoom="out" aria-label="Reduzir mapa">−</button><button type="button" data-map-zoom="reset" aria-label="Mostrar todo o mapa">⌂</button></div><div class="property-map-credit">Mapa: <a href="https://gta-5-map.com/" target="_blank" rel="noopener noreferrer">GTA 5 Map / MapGenie</a> · Rockstar Games</div></div><aside class="property-map-sidebar"><div id="propertyMapDetails" aria-live="polite"></div><div class="property-map-results-heading"><h3>Locais com garagem</h3><span id="propertyMapCount"></span></div><div id="propertyMapResults" class="property-map-results"></div></aside></div><p class="property-map-note">Somente armazenamento permanente de veículos: casas, garagens e propriedades compatíveis. Pontos sem vagas comuns e propriedades móveis não aparecem. Locais ainda não cadastrados na base não recebem coordenadas estimadas. Vincule suas garagens a um endereço em “Editar garagem”.</p>`;
    root.dataset.ready = "true";
    installPropertyMapGestures();
  }
  const locations = filteredMapProperties();
  if ($("#propertyMapSearch").value !== propertyMapState.query) $("#propertyMapSearch").value = propertyMapState.query;
  $("#propertyMapType").value = propertyMapState.type;
  $("#propertyMapOwned").checked = propertyMapState.owned;
  const selected = locations.find(location => location.id === propertyMapState.selectedId);
  $("#propertyMapCount").textContent = locations.length;
  $("#propertyMapPins").innerHTML = locations.map(location => {
    const owned = propertyOwners(location.id).length;
    const icon = garageTypes[location.type].icon || location.type;
    return `<g class="property-pin ${owned ? "owned" : ""} ${selected?.id === location.id ? "selected" : ""}" transform="translate(${location.x} ${location.y})" data-map-property="${location.id}" tabindex="0" role="button" aria-label="${propertyEscape(`${location.name} · ${propertyCapacityLabel(location)}${owned ? ' · cadastrada na coleção' : ''}`)}"><title>${escapeHtml(location.name)}</title><g class="property-pin-body"><rect class="pin-hit" x="-17" y="-17" width="34" height="34" fill="transparent"/><rect class="pin-frame" x="-12" y="-12" width="24" height="24" rx="7"/><image href="assets/blips/${icon}.png" x="-9" y="-9" width="18" height="18"/></g></g>`;
  }).join("");
  $("#propertyMapResults").innerHTML = locations.map(location => `<button type="button" class="property-map-result ${selected?.id === location.id ? 'selected' : ''}" data-map-property="${location.id}">${garageIcon({name:location.name,type:location.type})}<span><strong>${escapeHtml(location.name)}</strong><small>${garageTypes[location.type].label} · ${propertyCapacityLabel(location)}</small></span>${propertyOwners(location.id).length ? '<i aria-label="Cadastrada">●</i>' : ''}</button>`).join("") || '<p class="property-map-empty">Nenhum local com esses filtros. Se suas garagens ainda não aparecem, vincule um endereço na edição.</p>';
  $("#propertyMapDetails").innerHTML = selected ? `<div class="property-map-detail"><span class="eyebrow">${garageTypes[selected.type].label}</span><h3>${escapeHtml(selected.name)}</h3><p>${propertyCapacityLabel(selected)}</p><button type="button" class="primary-button" data-register-property="${selected.id}">Adicionar à coleção</button>${propertyOwners(selected.id).map(garage => `<button type="button" class="secondary-button" data-map-open-garage="${propertyEscape(garage.id)}">Abrir ${escapeHtml(garageLabel(garage))} ↗</button>`).join('')}<a href="${selected.sourceUrl}" target="_blank" rel="noopener noreferrer">Ver referência do local ↗</a></div>` : '<div class="property-map-tip"><strong>Encontre a próxima garagem.</strong><p>Clique em um marcador ou endereço. Arraste para mover e use + e − para ampliar.</p><span>◆ Local disponível · <i>◆ Cadastrado na coleção</i></span></div>';
  updatePropertyMapBox();
}
function updatePropertyMapBox() {
  const svg = $("#propertyMapSvg"); if (!svg) return;
  const box = propertyMapState.box;
  svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.w} ${box.h}`);
  const scale = svg.getScreenCTM()?.a;
  if (scale) svg.querySelectorAll(".property-pin-body").forEach(pin => pin.setAttribute("transform", `scale(${1 / scale})`));
}
function selectMapProperty(id, center = false) {
  const location = PROPERTY_MAP.locations.find(item => item.id === id && item.capacity > 0);
  if (!location) return;
  propertyMapState.selectedId = id;
  if (center) {
    const svg = $("#propertyMapSvg");
    const ratio = (svg?.clientHeight || 640) / (svg?.clientWidth || 850);
    propertyMapState.box = { x: location.x - 350, y: location.y - 350 * ratio, w: 700, h: 700 * ratio };
  }
  renderPropertyMap();
}
function zoomPropertyMap(factor, anchor) {
  const box = propertyMapState.box;
  const width = Math.max(260, Math.min(PROPERTY_MAP.width * 1.3, box.w * factor));
  const scale = width / box.w;
  const point = anchor || { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  propertyMapState.box = { x: point.x - (point.x - box.x) * scale, y: point.y - (point.y - box.y) * scale, w: width, h: box.h * scale };
  updatePropertyMapBox();
}
function installPropertyMapGestures() {
  const svg = $("#propertyMapSvg");
  let drag = null;
  svg.addEventListener("pointerdown", event => {
    if (event.target.closest("[data-map-property]") || event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, box: { ...propertyMapState.box }, scale: svg.getScreenCTM().a };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", event => {
    if (!drag) return;
    propertyMapState.box = { ...drag.box, x: drag.box.x - (event.clientX - drag.x) / drag.scale, y: drag.box.y - (event.clientY - drag.y) / drag.scale };
    updatePropertyMapBox();
  });
  const endDrag = () => { drag = null; };
  svg.addEventListener("pointerup", endDrag); svg.addEventListener("pointercancel", endDrag);
  svg.addEventListener("wheel", event => {
    event.preventDefault();
    const point = new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    zoomPropertyMap(event.deltaY < 0 ? .8 : 1.25, point);
  }, {passive:false});
  svg.addEventListener("keydown", event => {
    if (event.target.closest("[data-map-property]") && ["Enter"," "].includes(event.key)) { event.preventDefault(); selectMapProperty(event.target.closest("[data-map-property]").dataset.mapProperty); return; }
    if (event.target !== svg) return;
    const box = propertyMapState.box;
    if (event.key === '+' || event.key === '=') zoomPropertyMap(.8);
    else if (event.key === '-') zoomPropertyMap(1.25);
    else if (event.key === 'ArrowLeft') box.x -= box.w * .1;
    else if (event.key === 'ArrowRight') box.x += box.w * .1;
    else if (event.key === 'ArrowUp') box.y -= box.h * .1;
    else if (event.key === 'ArrowDown') box.y += box.h * .1;
    else return;
    event.preventDefault(); updatePropertyMapBox();
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(updatePropertyMapBox).observe(svg);
}
$("#mapSection").addEventListener("input", event => {
  if (event.target.id !== "propertyMapSearch") return;
  propertyMapState.query = event.target.value; propertyMapState.selectedId = null; renderPropertyMap();
});
$("#mapSection").addEventListener("change", event => {
  if (event.target.id === "propertyMapType") propertyMapState.type = event.target.value;
  else if (event.target.id === "propertyMapOwned") propertyMapState.owned = event.target.checked;
  else return;
  propertyMapState.selectedId = null; renderPropertyMap();
});
$("#mapSection").addEventListener("click", event => {
  const point = event.target.closest("[data-map-property]");
  const register = event.target.closest("[data-register-property]");
  const saved = event.target.closest("[data-map-open-garage]");
  const zoom = event.target.closest("[data-map-zoom]");
  if (point) selectMapProperty(point.dataset.mapProperty, Boolean(point.closest(".property-map-results")));
  if (register) registerPropertyLocation(register.dataset.registerProperty);
  if (saved) {
    const garage = getGarage(saved.dataset.mapOpenGarage); if (!garage) return;
    selectedGarage = garage.id; currentFilter = "garages"; setActiveNav("garages"); $("#searchInput").value = ""; $("#categoryFilter").value = "all"; render(); window.scrollTo(0,0);
  }
  if (zoom) {
    if (zoom.dataset.mapZoom === 'reset') { propertyMapState.box = {x:0,y:0,w:PROPERTY_MAP.width,h:PROPERTY_MAP.height}; updatePropertyMapBox(); }
    else zoomPropertyMap(zoom.dataset.mapZoom === 'in' ? .8 : 1.25);
  }
});
render();
