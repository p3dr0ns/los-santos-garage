// A preview is saved separately: original photos and vehicle records stay intact.
let configuratorDraft = null;
let configuratorImage = "";
let configuratorTool = "paint";
const configElement = id => document.getElementById(id);
const configVehicle = () => data.vehicles.find(item => item.id === detailVehicleId);

function openConfigurator() {
  const vehicle = configVehicle();
  if (!vehicle) return;
  const model = findCatalogVehicle(vehicle.name, vehicle.catalogId);
  const reference = VEHICLE_CUSTOMIZATION[model?.id];
  configuratorImage = reference?.localImage || reference?.image || getVehicleImage(vehicle);
  configuratorDraft = JSON.parse(JSON.stringify(vehicle.configuration2d || {
    color: "#d92d36", points: [], wheels: [], wheelStyle: "original", wheelColor: "#c5c8cc", radius: 5, parts: {}
  }));
  // Masks are only valid for the exact image on which they were drawn.
  if (configuratorDraft.image !== configuratorImage) {
    configuratorDraft.points = []; configuratorDraft.wheels = [];
  }
  configuratorTool = "paint";
  configElement("configCompare").checked = false;
  configElement("configStage").classList.remove("show-original");
  configElement("configTitle").textContent = `Configure seu ${vehicle.name}`;
  configElement("configColor").value = configuratorDraft.color;
  configElement("configWheelColor").value = configuratorDraft.wheelColor;
  configElement("configWheelStyle").value = configuratorDraft.wheelStyle;
  configElement("configRadius").value = configuratorDraft.radius;
  configElement("configTool").value = "paint";
  configElement("configParts").replaceChildren();
  for (const group of reference?.groups || []) {
    const label = document.createElement("label");
    label.textContent = group.name;
    const select = document.createElement("select");
    select.dataset.group = group.name;
    select.add(new Option("Não escolhido", ""));
    for (const part of group.options) select.add(new Option(`${part.name} · GTA$ ${part.price.toLocaleString("pt-BR")}`, part.name));
    select.value = configuratorDraft.parts[group.name] || "";
    label.append(select); configElement("configParts").append(label);
  }
  configElement("configCoverage").textContent = reference?.groups.length
    ? "Opções publicadas pelo GTA Base para este modelo. Nomes originais da fonte; preços sujeitos a alterações. Peças selecionadas ficam na ficha e não alteram a foto."
    : "A lista de peças deste modelo ainda não foi coletada. Você pode experimentar pintura e rodas ilustrativas.";
  const source = configElement("configSource");
  source.hidden = !reference;
  if (reference) source.href = reference.url;
  configElement("configImageStatus").textContent = configuratorImage ? "Carregando imagem…" : "Sem imagem para este modelo. Adicione uma foto no cadastro do veículo.";
  configElement("configImage").setAttribute("href", configuratorImage);
  configElement("configSaveStatus").textContent = "";
  configElement("configDialog").showModal();
  drawConfiguration();
}

function drawConfiguration() {
  const draft = configuratorDraft;
  if (!draft) return;
  const polygon = configElement("configPaint");
  polygon.setAttribute("points", draft.points.map(point => point.join(",")).join(" "));
  polygon.setAttribute("fill", draft.color);
  configElement("configOutline").setAttribute("points", draft.points.map(point => point.join(",")).join(" "));
  const nodes = configElement("configPoints"); nodes.replaceChildren();
  for (const [x, y] of draft.points) {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", ".6"); dot.setAttribute("fill", "white"); nodes.append(dot);
  }
  const wheels = configElement("configWheels"); wheels.replaceChildren();
  if (draft.wheelStyle !== "original") for (const [x, y] of draft.wheels) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("transform", `translate(${x} ${y}) scale(.65 1)`);
    const circle = (radius, fill) => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      node.setAttribute("r", radius); node.setAttribute("fill", fill); group.append(node);
    };
    circle(draft.radius, "#151515"); circle(draft.radius * .76, draft.wheelColor); circle(draft.radius * .61, "#24262b");
    const count = draft.wheelStyle === "mesh" ? 16 : draft.wheelStyle === "sport" ? 5 : 8;
    for (let index = 0; index < count; index++) {
      const spoke = document.createElementNS("http://www.w3.org/2000/svg", "line");
      spoke.setAttribute("x2", draft.radius * .72); spoke.setAttribute("stroke", draft.wheelColor);
      spoke.setAttribute("stroke-width", draft.radius * .12); spoke.setAttribute("transform", `rotate(${index * 360 / count})`); group.append(spoke);
    }
    circle(draft.radius * .18, draft.wheelColor); wheels.append(group);
  }
  configElement("configHint").textContent = configuratorTool === "paint"
    ? "Clique ao redor da lataria para delimitar a pintura. A área se fecha a partir do terceiro ponto. Evite vidros, pneus e fundo."
    : "Clique no centro de cada roda visível (até duas). Ajuste o tamanho. Desenhos ilustrativos, sem correspondência com o catálogo do GTA.";
}

configElement("configStage").addEventListener("click", event => {
  if (!configuratorDraft || !configuratorImage) return;
  const svg = configElement("configStage");
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  const value = [Math.max(0, Math.min(100, point.x)), Math.max(0, Math.min(56.25, point.y))];
  const list = configuratorTool === "paint" ? configuratorDraft.points : configuratorDraft.wheels;
  if (configuratorTool === "wheels" && list.length >= 2) list.shift();
  list.push(value); drawConfiguration();
});
configElement("configTool").addEventListener("change", event => { configuratorTool = event.target.value; drawConfiguration(); });
for (const [id, key] of [["configColor", "color"], ["configWheelColor", "wheelColor"], ["configWheelStyle", "wheelStyle"], ["configRadius", "radius"]]) {
  configElement(id).addEventListener("input", event => { configuratorDraft[key] = key === "radius" ? Number(event.target.value) : event.target.value; drawConfiguration(); });
}
configElement("configUndo").addEventListener("click", () => { (configuratorTool === "paint" ? configuratorDraft.points : configuratorDraft.wheels).pop(); drawConfiguration(); });
configElement("configClear").addEventListener("click", () => { configuratorDraft.points = []; configuratorDraft.wheels = []; drawConfiguration(); });
configElement("configCompare").addEventListener("change", event => { configElement("configStage").classList.toggle("show-original", event.target.checked); });
configElement("configImage").addEventListener("load", () => { configElement("configImageStatus").textContent = ""; });
configElement("configImage").addEventListener("error", () => { configElement("configImageStatus").textContent = "Não foi possível carregar a imagem. Verifique sua conexão ou adicione uma foto ao veículo."; });
configElement("configClose").addEventListener("click", () => configElement("configDialog").close());
configElement("configSave").addEventListener("click", () => {
  const vehicle = configVehicle(); if (!vehicle) return;
  const previous = vehicle.configuration2d;
  const parts = {};
  configElement("configParts").querySelectorAll("select").forEach(select => { if (select.value) parts[select.dataset.group] = select.value; });
  vehicle.configuration2d = { ...configuratorDraft, parts, image: configuratorImage };
  if (!saveData("Configuração 2D salva.")) { vehicle.configuration2d = previous; return; }
  configElement("configSaveStatus").textContent = "Salvo neste navegador.";
  renderVehicleDetails();
});
