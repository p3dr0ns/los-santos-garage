const AUTO_SHOP_STYLES = [
  { id: "undressed", label: "Undressed", description: "Industrial cru, concreto e banners de marcas.", accent: "#d6ad67", floor: "#a5aaa5", wall: "#3b4248", pattern: "concrete" },
  { id: "flawless", label: "Flawless", description: "Oficina limpa e moderna, com pôsteres de supercarros.", accent: "#8bcbd3", floor: "#c8d1d0", wall: "#34454c", pattern: "clean" },
  { id: "polished", label: "Polished", description: "Acabamento refinado e identidade de marcas de luxo.", accent: "#d9be83", floor: "#b7b4af", wall: "#34343e", pattern: "clean" },
  { id: "concrete-chic", label: "Concrete Chic", description: "Concreto urbano e pôsteres de esportivos.", accent: "#d18d75", floor: "#a7a5a8", wall: "#4c4245", pattern: "concrete" },
  { id: "nostalgia-trip", label: "Nostalgia Trip", description: "Placas vintage e memórias da cultura automotiva.", accent: "#d6b97a", floor: "#a59984", wall: "#50432f", pattern: "vintage" },
  { id: "route-68", label: "Route 68", description: "Estrada americana, murais retrô e piso quadriculado.", accent: "#edbc64", floor: "#bfbba8", wall: "#813c34", pattern: "checker" },
  { id: "super-chibi", label: "Super Chibi", description: "Cultura japonesa, murais coloridos e espírito drift.", accent: "#d997e9", floor: "#a5a2bf", wall: "#253b89", pattern: "drift" },
  { id: "wildstyle", label: "Wildstyle", description: "Grafites de Los Santos e contrastes vibrantes.", accent: "#dbdd75", floor: "#9597a0", wall: "#443154", pattern: "graffiti" },
  { id: "race-and-chase", label: "Race and Chase", description: "Fliperamas clássicos, QUB3D e Degenatron.", accent: "#6ce0dc", floor: "#8799ac", wall: "#1d3057", pattern: "arcade" }
];

const PROPERTY_INTERIORS = {
  facility: { imageId: "facility", label: "Complexo · garagem subterrânea", accent: "#a8c1cb", floor: "#a2aab0", wall: "#334351", pattern: "industrial" },
  kosatka: { imageId: "kosatka", label: "Kosatka · Moon Pool", accent: "#88bbb5", floor: "#9caeaa", wall: "#344e4c", pattern: "industrial" },
  garage: { imageId: "apartment", label: "Garagem residencial", accent: "#bfcbd4", floor: "#bbc4c9", wall: "#3d4850", pattern: "clean" },
  safehouse: { imageId: "apartment", label: "Garagem de apartamento", accent: "#b0d4e5", floor: "#d2d9dc", wall: "#6b7c86", pattern: "clean" },
  agency: { imageId: "agency", label: "Agência · oficina e garagem", accent: "#91c5b6", floor: "#a2abab", wall: "#34404a", pattern: "clean" },
  arena_workshop: { imageId: "arena", label: "Oficina da Arena", accent: "#e2a35c", floor: "#948c80", wall: "#47392f", pattern: "industrial" },
  arcade: { imageId: "arcade", label: "Garagem do fliperama", accent: "#ba9ddc", floor: "#929399", wall: "#3c3846", pattern: "concrete" },
  office: { imageId: "office", label: "Garagem executiva", accent: "#97c7e2", floor: "#c3ccd3", wall: "#3a4c57", pattern: "clean" },
  bat_club_property: { imageId: "nightclub", label: "Clube noturno · subsolo", accent: "#b592ed", floor: "#777d8a", wall: "#282438", pattern: "nightclub" },
  biker_clubhouse: { imageId: "clubhouse", label: "Sede do motoclube", accent: "#d0ad7b", floor: "#a19583", wall: "#4f4031", pattern: "vintage" },
  casino: { imageId: "casino", label: "Garagem da cobertura", accent: "#e5cc8f", floor: "#d2c8b4", wall: "#51464a", pattern: "clean" },
  hangar: { imageId: "hangar", label: "Hangar", accent: "#e0ce76", floor: "#a3aeb0", wall: "#3b494b", pattern: "industrial" },
  property_bunker: { imageId: "bunker", label: "Bunker · área de veículos", accent: "#b6c487", floor: "#929b87", wall: "#3c4937", pattern: "industrial" },
  salvage_yard: { imageId: "salvage", label: "Desmanche", accent: "#d7a069", floor: "#a09484", wall: "#554133", pattern: "industrial" },
  warehouse_vehicle: { imageId: "warehouse", label: "Depósito de veículos", accent: "#c2c08a", floor: "#9ea9a4", wall: "#3c4d44", pattern: "concrete" },
  car_meet: { imageId: "car-meet", label: "Encontro de Carros LS", accent: "#a5b4e0", floor: "#9197a4", wall: "#303c51", pattern: "drift" },
  eclipse_boulevard: { imageId: "eclipse-boulevard", label: "Eclipse Boulevard · Immaculate", accent: "#daa7dc", floor: "#b9bdcb", wall: "#474353", pattern: "clean" },
  vinewood_garage: { imageId: "vinewood", label: "Clube Vinewood", accent: "#93d9bf", floor: "#c2cecc", wall: "#324840", pattern: "clean" }
};

function getGarageTheme(garage) {
  const type = getGarageType(garage);
  let theme;
  if (type === "auto_shop_property") {
    const style = AUTO_SHOP_STYLES.find(item => item.id === garage.interiorStyle) || AUTO_SHOP_STYLES[0];
    theme = { ...style, imageId: style.id };
  } else {
    const base = PROPERTY_INTERIORS[type] || PROPERTY_INTERIORS.garage;
    theme = { ...base, id: type };
    if ((type === "garage" || type === "safehouse") && garage.capacity <= 6) theme.imageId = "six-car";
  }
  return { ...theme, ...INTERIOR_IMAGES[theme.imageId], type };
}

function applyGarageTheme(element, garage) {
  const theme = getGarageTheme(garage);
  element.dataset.garageType = theme.type;
  element.dataset.interior = theme.id;
  element.dataset.floorPattern = theme.pattern;
  for (const key of ["accent", "floor", "wall"]) element.style.setProperty(`--interior-${key}`, theme[key]);
  return theme;
}

function renderGarageInteriorPicker() {
  const garage = { name: $("#garageName").value, type: $("#garageType").value, capacity: Number($("#garageCapacity").value), interiorStyle: $("#garageInteriorStyle").value };
  const theme = applyGarageTheme($("#garageInteriorPreview"), garage);
  $("#garageInteriorPreview img").src = theme.image;
  $("#garageInteriorPreview img").alt = `Interior de referência: ${theme.label}`;
  $("#garageInteriorPreviewLabel").textContent = theme.label;
  $("#garageInteriorField").hidden = theme.type !== "auto_shop_property";
  $("#garageInteriorPicker").innerHTML = AUTO_SHOP_STYLES.map(style => `<button type="button" class="interior-choice ${theme.id === style.id ? "selected" : ""}" data-interior-style="${style.id}" aria-pressed="${theme.id === style.id}"><img src="${INTERIOR_IMAGES[style.id].image}" alt="" loading="lazy"><span><strong>${style.label}</strong><small>${style.description}</small></span><span class="interior-check" aria-hidden="true">✓</span></button>`).join("");
}

function garageInteriorBanner(theme) {
  const decoration = theme.type === "auto_shop_property" ? `<label class="garage-decoration-switcher">Decoração<select id="garageDecoration" aria-label="Decoração da oficina">${AUTO_SHOP_STYLES.map(style => `<option value="${style.id}" ${style.id === theme.id ? "selected" : ""}>${style.label}</option>`).join("")}</select></label>` : "";
  return `<div class="garage-interior-banner"><img src="${theme.image}" alt="Interior de referência: ${theme.label}"><div class="garage-interior-caption"><span>INTERIOR · GTA ONLINE</span><strong>${theme.label}</strong><a href="${theme.sourceUrl}" target="_blank" rel="noopener noreferrer">Referência do jogo ↗</a></div>${decoration}</div>`;
}
