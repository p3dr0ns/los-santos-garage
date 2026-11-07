let legacyWheelDescription = "";
const wheelGroups = WHEEL_CATALOG.groups.filter(group => group.id !== "bike-rear");
const wheelGroup = id => WHEEL_CATALOG.groups.find(group => group.id === id);

function initializeWheelTypes() {
  const select = $("#vehicleWheelType");
  select.replaceChildren(new Option("Não informado", ""), new Option("Originais do veículo", "stock"));
  wheelGroups.forEach(group => select.add(new Option(group.label, group.id)));
}

function populateWheelModels(select, group, selected = "") {
  select.replaceChildren(new Option("Selecione o modelo", ""));
  group?.wheels.forEach(wheel => select.add(new Option(wheel.name, wheel.name)));
  // Preserva uma seleção importada mesmo que uma futura base remova o nome.
  if (selected && ![...select.options].some(option => option.value === selected)) select.add(new Option(`${selected} (salvo anteriormente)`, selected));
  select.value = selected;
}

function updateWheelModels(model = "", rearModel = "") {
  const type = $("#vehicleWheelType").value;
  const group = wheelGroup(type);
  const select = $("#vehicleWheels");
  select.disabled = !group;
  select.required = Boolean(group);
  $("#vehicleRearWheelField").hidden = type !== "bike";
  $("#vehicleWheelModelLabel").textContent = type === "bike" ? "Roda dianteira" : "Modelo da roda";
  if (group) {
    populateWheelModels(select, group, model);
    $("#vehicleWheelHint").textContent = `${group.wheels.length} modelos em ${group.label}. Os nomes seguem o catálogo do jogo; a disponibilidade varia por veículo.`;
  } else if (type === "stock") {
    select.replaceChildren(new Option("Original do veículo", "stock"));
    $("#vehicleWheelHint").textContent = "Rodas originais que acompanham este veículo.";
  } else if (type === "legacy") {
    select.replaceChildren(new Option(legacyWheelDescription, legacyWheelDescription));
    $("#vehicleWheelHint").textContent = "Descrição anterior preservada. Escolha um tipo para substituí-la por uma roda do catálogo.";
  } else {
    select.replaceChildren(new Option("Escolha o tipo primeiro", ""));
    $("#vehicleWheelHint").textContent = "Selecione o tipo para ver os modelos disponíveis.";
  }
  populateWheelModels($("#vehicleRearWheel"), wheelGroup("bike-rear"), type === "bike" ? rearModel : "");
}

function setVehicleWheels(vehicle) {
  initializeWheelTypes();
  legacyWheelDescription = vehicle?.wheels || "";
  let type = vehicle?.wheelType || "";
  if (type && type !== "stock" && !wheelGroup(type)) type = "";
  if (!type && legacyWheelDescription) {
    type = "legacy";
    $("#vehicleWheelType").add(new Option("Personalizado (cadastro anterior)", "legacy"));
  }
  $("#vehicleWheelType").value = type;
  updateWheelModels(vehicle?.wheelModel || "", vehicle?.wheelRearModel || "");
}

function getWheelDescription(vehicle) {
  if (vehicle.wheelType === "stock") return "Originais do veículo";
  const group = wheelGroup(vehicle.wheelType);
  if (!group) return vehicle.wheels || "";
  if (group.id === "bike") {
    return `${group.label} · Dianteira: ${vehicle.wheelModel || "não informada"} · Traseira: ${vehicle.wheelRearModel || "não informada"}`;
  }
  return `${group.label} · ${vehicle.wheelModel || "modelo não informado"}`;
}

function readVehicleWheels() {
  const type = $("#vehicleWheelType").value;
  if (type === "legacy") return { wheels: legacyWheelDescription, wheelType: null, wheelModel: null, wheelRearModel: null };
  const value = { wheelType: type || null, wheelModel: wheelGroup(type) ? $("#vehicleWheels").value || null : null, wheelRearModel: type === "bike" ? $("#vehicleRearWheel").value || null : null };
  return { ...value, wheels: type ? getWheelDescription(value) : "" };
}

$("#vehicleWheelType").addEventListener("change", () => updateWheelModels());
$("#vehicleWheels").addEventListener("invalid", () => { $("#vehicleCustomizationDetails").open = true; });
initializeWheelTypes();
updateWheelModels();
