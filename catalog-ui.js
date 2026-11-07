let catalogBrandFilter = "";
let catalogMatches = [];
let catalogActiveIndex = -1;
const catalogSearchIndex = vehicleModels.map(model => ({
  model,
  name: normalizeVehicleText(model.name),
  search: normalizeVehicleText([model.name, model.brand, ...model.aliases].join(" "))
}));

function searchVehicleCatalog(query, brand = "") {
  const normalized = normalizeVehicleText(query);
  const terms = normalized.split(" ").filter(Boolean);
  return catalogSearchIndex.filter(entry => (!brand || entry.model.brand === brand) && terms.every(term => entry.search.includes(term)))
    .sort((a, b) => {
      const rank = entry => entry.name === normalized ? 0 : entry.name.startsWith(normalized) ? 1 : 2;
      return rank(a) - rank(b) || a.model.name.localeCompare(b.model.name, "pt-BR", { numeric: true });
    }).map(entry => entry.model);
}

function closeCatalogSuggestions() {
  $("#vehicleModelSuggestions").hidden = true;
  $("#vehicleName").setAttribute("aria-expanded", "false");
  $("#vehicleName").removeAttribute("aria-activedescendant");
  catalogActiveIndex = -1;
  catalogMatches = [];
}

function resetCatalogSearch() {
  catalogBrandFilter = "";
  closeCatalogSuggestions();
  $("#vehicleModelHint").textContent = `${vehicleModels.length} modelos de carros e motos disponíveis. Busque pelo nome.`;
}

function showCatalogSuggestions() {
  const query = $("#vehicleName").value;
  if (!query.trim() && !catalogBrandFilter) { closeCatalogSuggestions(); return; }
  const matches = searchVehicleCatalog(query, catalogBrandFilter);
  catalogMatches = matches.slice(0, 40);
  catalogActiveIndex = -1;
  const escapeAttribute = value => escapeHtml(value).replaceAll('"', "&quot;");
  $("#vehicleModelSuggestions").innerHTML = catalogMatches.length
    ? catalogMatches.map((model, index) => `<div role="option" id="catalog-option-${index}" data-catalog-index="${index}" aria-selected="false" class="catalog-option"><span class="catalog-vehicle-symbol" aria-hidden="true"><svg class="ui-icon"><use href="#ui-${model.type === "motorcycle" ? "motorcycle" : "car"}"/></svg></span><span class="catalog-model-name"><strong>${escapeHtml(model.name)}</strong><small>${escapeHtml(model.brand || "Marca não informada no jogo")}</small></span><span class="catalog-category">${escapeHtml(model.category)}</span></div>`).join("")
    : `<p class="catalog-no-results">Nenhum modelo encontrado${catalogBrandFilter ? ` em ${escapeAttribute(catalogBrandFilter)}` : ""}. Você pode cadastrar um nome personalizado.</p>`;
  $("#vehicleModelSuggestions").hidden = false;
  $("#vehicleName").setAttribute("aria-expanded", "true");
  $("#vehicleName").removeAttribute("aria-activedescendant");
  $("#vehicleModelHint").textContent = matches.length ? `${matches.length} ${matches.length === 1 ? "modelo encontrado" : "modelos encontrados"}${matches.length > 40 ? ". Digite mais para refinar" : ". Escolha uma variante"}.` : "Nome personalizado permitido. Preencha a marca e a categoria.";
}

function selectCatalogModel(index) {
  const model = catalogMatches[index];
  if (!model) return;
  $("#vehicleName").value = model.name;
  $("#vehicleBrand").value = model.brand;
  $("#vehicleCategory").value = model.category;
  selectedCatalogModelId = model.id;
  $("#vehicleModelHint").textContent = `${model.name} selecionado. Marca e categoria preenchidas.`;
  closeCatalogSuggestions();
  updateVehiclePreview();
}

function setCatalogActiveIndex(index) {
  catalogActiveIndex = (index + catalogMatches.length) % catalogMatches.length;
  $$("#vehicleModelSuggestions [role=option]").forEach((option, optionIndex) => {
    const active = optionIndex === catalogActiveIndex;
    option.classList.toggle("active", active);
    option.setAttribute("aria-selected", String(active));
    if (active) {
      $("#vehicleName").setAttribute("aria-activedescendant", option.id);
      option.scrollIntoView({ block: "nearest" });
    }
  });
}

$("#vehicleName").addEventListener("input", showCatalogSuggestions);
$("#vehicleName").addEventListener("focus", showCatalogSuggestions);
$("#vehicleName").addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("#vehicleModelSuggestions").hidden) { event.preventDefault(); event.stopPropagation(); closeCatalogSuggestions(); return; }
  if (event.key === "Tab") { closeCatalogSuggestions(); return; }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if ($("#vehicleModelSuggestions").hidden) showCatalogSuggestions();
    if (!catalogMatches.length) return;
    event.preventDefault();
    setCatalogActiveIndex(catalogActiveIndex < 0 ? (event.key === "ArrowDown" ? 0 : catalogMatches.length - 1) : catalogActiveIndex + (event.key === "ArrowDown" ? 1 : -1));
  }
  if (event.key === "Enter" && !$("#vehicleModelSuggestions").hidden && catalogMatches.length) {
    event.preventDefault();
    selectCatalogModel(catalogActiveIndex >= 0 ? catalogActiveIndex : 0);
  }
});
$("#vehicleModelSuggestions").addEventListener("pointerdown", event => event.preventDefault());
$("#vehicleModelSuggestions").addEventListener("click", event => {
  const option = event.target.closest("[data-catalog-index]");
  if (option) selectCatalogModel(Number(option.dataset.catalogIndex));
});
$("#vehicleBrand").addEventListener("change", () => {
  catalogBrandFilter = $("#vehicleBrand").value;
  selectedCatalogModelId = "";
  $("#vehicleModelHint").textContent = catalogBrandFilter ? `Busca filtrada por ${catalogBrandFilter}. Digite o modelo ou limpe o campo para ver as opções.` : "Busque um modelo de qualquer marca.";
  closeCatalogSuggestions();
});
document.addEventListener("pointerdown", event => {
  if (!event.target.closest(".model-search-field")) closeCatalogSuggestions();
});
$("#vehicleDialog").addEventListener("close", closeCatalogSuggestions);
resetCatalogSearch();
