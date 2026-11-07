const PHOTO_SHOTS = [
  { id: "front", label: "Frente", hint: "Centralizada, na altura dos faróis" },
  { id: "rear", label: "Traseira", hint: "Centralizada, mostrando a placa" },
  { id: "left", label: "Lateral esquerda", hint: "Perfil inteiro, com as duas rodas" },
  { id: "right", label: "Lateral direita", hint: "Perfil inteiro, com as duas rodas" },
  { id: "cinematicFront", label: "Cinematográfica dianteira", hint: "Diagonal dianteira, com câmera baixa" },
  { id: "cinematicRear", label: "Cinematográfica traseira", hint: "Diagonal traseira, com câmera baixa" }
];
let detailVehicleId = null;
let detailShot = "cinematicFront";
let studioVehicleId = null;
let studioDraft = new Map();
let studioCover = "cinematicFront";
let uploadShot = null;
let studioGeneration = 0;
let captureRunning = false;
let studioBusy = false;
let captureGeneration = 0;
let capturePoll = null;
const CAPTURE_API = "http://127.0.0.1:47831";
const escapeAttr = value => escapeHtml(String(value)).replaceAll('"', "&quot;");

const photoDatabase = new Promise((resolve, reject) => {
  const request = indexedDB.open("minha-garagem-fotos", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("photos", { keyPath: "key" });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error("Feche outras abas para liberar o banco de fotos."));
});
// A rejeição também é tratada pelos fluxos de leitura e gravação.
photoDatabase.catch(() => {});

async function readAllPhotos() {
  const db = await photoDatabase;
  return new Promise((resolve, reject) => {
    const request = db.transaction("photos").objectStore("photos").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeVehiclePhotos(vehicleId, entries) {
  const db = await photoDatabase;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("photos", "readwrite");
    const store = transaction.objectStore("photos");
    PHOTO_SHOTS.forEach(shot => {
      const key = `${vehicleId}:${shot.id}`;
      if (entries.has(shot.id)) store.put({ key, vehicleId, shot: shot.id, blob: entries.get(shot.id).blob });
      else store.delete(key);
    });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Gravação interrompida"));
  });
}

async function deleteVehiclePhotos(vehicleId) {
  await writeVehiclePhotos(vehicleId, new Map());
  PHOTO_SHOTS.forEach(shot => {
    const key = `${vehicleId}:${shot.id}`;
    if (photoUrls.has(key)) URL.revokeObjectURL(photoUrls.get(key));
    photoUrls.delete(key);
  });
}

function getBrand(vehicle) {
  return vehicle.brand || findCatalogVehicle(vehicle.name, vehicle.catalogId)?.brand || "Não informada";
}

let portfolioScroll = 0;
function openVehicleDetails(id, navigate = true) {
  if (!data.vehicles.some(vehicle => vehicle.id === id)) return;
  detailVehicleId = id;
  const vehicle = data.vehicles.find(item => item.id === id);
  detailShot = vehicle.coverSlot || "cinematicFront";
  renderVehicleDetails();
  if ($("#vehicleDetailsDialog").hidden) portfolioScroll = window.scrollY;
  $("#vehicleDetailsDialog").hidden = false;
  $(".app-shell").hidden = true;
  document.title = `${vehicle.name} · Minha Garagem`;
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
  document.title = "Minha Garagem";
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
  $("#detailsSubtitle").textContent = `${vehicle.category} · ${getGarage(vehicle.garageId)?.name || "Sem garagem"}`;
  $("#detailsFavorite").textContent = vehicle.favorite ? "★ Favorito" : "☆ Favoritar";
  $("#detailsFavorite").setAttribute("aria-pressed", String(Boolean(vehicle.favorite)));
  const fields = [["Marca", getBrand(vehicle)], ["Modelo", vehicle.name], ["Categoria", vehicle.category], ["Garagem", getGarage(vehicle.garageId)?.name || "Sem garagem"], ["Pintura", vehicle.paint || "Não informada"], ["Rodas", getWheelDescription(vehicle) || "Não informadas"], ["Placa", vehicle.plate || "Não informada"]];
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
  const available = PHOTO_SHOTS.filter(shot => photoUrls.has(`${vehicle.id}:${shot.id}`));
  if (available.length && !available.some(shot => shot.id === detailShot)) detailShot = available[0].id;
  const photo = available.length ? photoUrls.get(`${vehicle.id}:${detailShot}`) : getVehicleImage(vehicle);
  const image = $("#detailsPhoto");
  image.hidden = !photo;
  image.alt = `${vehicle.name} — ${PHOTO_SHOTS.find(shot => shot.id === detailShot)?.label || "capa"}`;
  if (photo) image.src = photo; else image.removeAttribute("src");
  $("#detailsPhotoLabel").textContent = available.length ? PHOTO_SHOTS.find(shot => shot.id === detailShot).label : photo ? "Imagem de referência" : "Adicione as fotos do seu carro";
  $("#detailsPrevious").hidden = $("#detailsNext").hidden = available.length < 2;
  $("#detailsThumbnails").innerHTML = PHOTO_SHOTS.map(shot => {
    const url = photoUrls.get(`${vehicle.id}:${shot.id}`);
    return `<button type="button" data-detail-shot="${shot.id}" class="detail-thumb ${url && shot.id === detailShot ? "selected" : ""}" ${url ? "" : "disabled"} aria-label="${shot.label}" aria-pressed="${Boolean(url && shot.id === detailShot)}">${url ? `<img src="${escapeAttr(url)}" alt="">` : '<span aria-hidden="true">＋</span>'}<small>${shot.label}</small></button>`;
  }).join("");
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

function stepDetailPhoto(direction) {
  const shots = PHOTO_SHOTS.filter(shot => photoUrls.has(`${detailVehicleId}:${shot.id}`));
  if (!shots.length) return;
  detailShot = shots[(shots.findIndex(shot => shot.id === detailShot) + direction + shots.length) % shots.length].id;
  renderVehicleDetails();
}

function clearStudioDraft() {
  studioDraft.forEach(entry => URL.revokeObjectURL(entry.url));
  studioDraft.clear();
}

async function openPhotoStudio() {
  if (!detailVehicleId) return;
  const vehicleId = detailVehicleId;
  const generation = ++studioGeneration;
  clearStudioDraft();
  studioVehicleId = vehicleId;
  studioCover = data.vehicles.find(vehicle => vehicle.id === vehicleId)?.coverSlot || "cinematicFront";
  $("#studioTitle").textContent = `Ensaio · ${data.vehicles.find(vehicle => vehicle.id === vehicleId).name}`;
  $("#studioStatus").textContent = "Carregando fotos…";
  studioBusy = true;
  $("#savePhotos").disabled = true;
  renderStudio();
  $("#photoStudioDialog").showModal();
  try {
    const records = await readAllPhotos();
    if (generation !== studioGeneration) return;
    records.filter(record => record.vehicleId === vehicleId).forEach(record => studioDraft.set(record.shot, { blob: record.blob, url: URL.createObjectURL(record.blob) }));
    $("#studioStatus").textContent = "Envie as fotos em cada posição ou capture com o assistente.";
    $("#savePhotos").disabled = false;
    studioBusy = false;
    renderStudio();
  } catch {
    studioBusy = false;
    $("#studioStatus").textContent = "Não foi possível abrir o armazenamento de fotos neste navegador.";
  }
  checkCaptureConnection();
}

function renderStudio() {
  $("#studioCount").textContent = `${studioDraft.size} de 6 fotos`;
  $("#studioGrid").innerHTML = PHOTO_SHOTS.map(shot => {
    const photo = studioDraft.get(shot.id);
    return `<section class="studio-shot ${studioCover === shot.id ? "cover" : ""}"><div class="studio-shot-image">${photo ? `<img src="${escapeAttr(photo.url)}" alt="${shot.label}">` : `<span aria-hidden="true">＋</span>`}${studioCover === shot.id ? '<span class="cover-label">CAPA</span>' : ""}</div><div class="studio-shot-body"><h3>${shot.label}</h3><p>${shot.hint}</p><div><button type="button" data-upload-shot="${shot.id}" ${captureRunning || studioBusy ? "disabled" : ""}>${photo ? "Trocar foto" : "Enviar foto"}</button>${photo ? `<button type="button" data-cover-shot="${shot.id}" aria-pressed="${studioCover === shot.id}" ${captureRunning || studioBusy ? "disabled" : ""}>${studioCover === shot.id ? "★ Capa" : "Usar capa"}</button><button type="button" data-remove-shot="${shot.id}" aria-label="Remover ${shot.label}" ${captureRunning || studioBusy ? "disabled" : ""}>×</button>` : ""}</div></div></section>`;
  }).join("");
}

async function preparePhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use uma imagem JPG, PNG ou WebP.");
  if (file.size > 25 * 1024 * 1024) throw new Error("A imagem deve ter até 25 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new Error("Não foi possível preparar a imagem.");
    return { blob, url: URL.createObjectURL(blob) };
  } finally { bitmap.close(); }
}

async function uploadPhoto(file, shot = uploadShot) {
  if (!file || !shot || captureRunning || studioBusy) return;
  const generation = studioGeneration;
  try {
    const prepared = await preparePhoto(file);
    if (generation !== studioGeneration || !$("#photoStudioDialog").open) { URL.revokeObjectURL(prepared.url); return; }
    if (studioDraft.has(shot)) URL.revokeObjectURL(studioDraft.get(shot).url);
    studioDraft.set(shot, prepared);
    if (!studioDraft.has(studioCover)) studioCover = shot;
    $("#studioStatus").textContent = `${PHOTO_SHOTS.find(item => item.id === shot).label} adicionada. Salve o ensaio para confirmar.`;
    renderStudio();
  } catch (error) { $("#studioStatus").textContent = error.message || "Não foi possível abrir a imagem."; }
}

async function saveStudio() {
  if (captureRunning || studioBusy) return;
  const vehicle = data.vehicles.find(item => item.id === studioVehicleId);
  if (!vehicle) return;
  $("#savePhotos").disabled = true;
  studioBusy = true;
  renderStudio();
  try {
    if (studioDraft.size && !studioDraft.has(studioCover)) studioCover = studioDraft.has("cinematicFront") ? "cinematicFront" : studioDraft.keys().next().value;
    await writeVehiclePhotos(vehicle.id, studioDraft);
    PHOTO_SHOTS.forEach(shot => {
      const key = `${vehicle.id}:${shot.id}`;
      if (photoUrls.has(key)) URL.revokeObjectURL(photoUrls.get(key));
      photoUrls.delete(key);
      if (studioDraft.has(shot.id)) photoUrls.set(key, URL.createObjectURL(studioDraft.get(shot.id).blob));
    });
    vehicle.coverSlot = studioCover;
    if (!saveData("Ensaio salvo")) throw new Error("As fotos foram gravadas, mas a preferência de capa não foi salva.");
    studioBusy = false;
    closePhotoStudio();
    renderVehicleDetails();
  } catch (error) { $("#studioStatus").textContent = error.message || "Não foi possível salvar as fotos. Verifique o espaço no navegador."; }
  finally { studioBusy = false; $("#savePhotos").disabled = false; renderStudio(); }
}

function closePhotoStudio() {
  if (studioBusy) return;
  if (captureRunning) { cancelCaptureSession(); return; }
  studioGeneration++;
  clearStudioDraft();
  $("#photoStudioDialog").close();
}

async function captureRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(CAPTURE_API + path, { ...options, signal: controller.signal, headers: { "X-Capture-Token": localStorage.getItem("minha-garagem-capture-token") || "", ...(options.headers || {}) } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível conectar ao assistente.");
    return result;
  } finally { clearTimeout(timeout); }
}

async function checkCaptureConnection() {
  try {
    const status = await captureRequest("/health");
    $("#captureStatus").textContent = status.calibrated ? status.armCapture ? "Assistente conectado · painel no GTA pronto. Prepare aqui e inicie com F8 no jogo." : "Assistente conectado · perfil de seis câmeras pronto. Atualize o assistente para usar o painel e F8." : "Assistente conectado. No GTA, use F6 para calibrar e F7 para marcar cada câmera.";
    $("#captureSession").textContent = status.armCapture ? "Preparar ensaio · iniciar com F8 no GTA" : "Capturar ensaio · 6 fotos";
    $("#captureSession").disabled = captureRunning || !status.calibrated;
    $("#connectCapture").textContent = "Verificar conexão";
  } catch {
    $("#captureStatus").textContent = "Assistente desconectado. Execute Iniciar captura.cmd e abra o organizador pelo assistente.";
    $("#captureSession").disabled = true;
  }
}

function setCapturing(value) {
  captureRunning = value;
  $("#cancelCapture").hidden = !value;
  $("#captureSession").disabled = value;
  $("#savePhotos").disabled = value;
  $("#exportPhotos").disabled = value;
  renderStudio();
}

async function startCaptureSession() {
  if (captureRunning || studioBusy) return;
  captureGeneration++;
  setCapturing(true);
  try {
    const assistant = await captureRequest("/health");
    await captureRequest(assistant.armCapture ? "/arm" : "/capture", { method: "POST" });
    $("#studioStatus").textContent = assistant.armCapture ? "Ensaio preparado. Volte ao GTA, ajuste a câmera inicial e pressione F8. F9 cancela." : "Ensaio iniciado. Não mova o mouse; F9 interrompe a captura.";
    pollCaptureSession();
  } catch (error) { setCapturing(false); $("#studioStatus").textContent = error.message; }
}

async function pollCaptureSession() {
  if (!captureRunning) return;
  const generation = captureGeneration;
  try {
    const status = await captureRequest("/status");
    if (generation !== captureGeneration || !captureRunning) return;
    if (status.state === "error" || status.state === "cancelled") throw new Error(status.error || "Captura interrompida. Suas fotos anteriores foram mantidas.");
    if (status.state === "complete") {
      const result = await captureRequest("/photos");
      if (generation !== captureGeneration || !captureRunning) return;
      if (result.photos.length !== 6 || !PHOTO_SHOTS.every(shot => result.photos.some(photo => photo.shot === shot.id))) throw new Error("Ensaio incompleto. Suas fotos anteriores foram mantidas.");
      const prepared = new Map();
      try {
        for (const photo of result.photos) {
          const binary = atob(photo.data);
          const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
          prepared.set(photo.shot, await preparePhoto(new Blob([bytes], { type: "image/jpeg" })));
        }
      } catch (error) { prepared.forEach(entry => URL.revokeObjectURL(entry.url)); throw error; }
      if (generation !== captureGeneration || !captureRunning) { prepared.forEach(entry => URL.revokeObjectURL(entry.url)); return; }
      clearStudioDraft(); studioDraft = prepared; studioCover = "cinematicFront";
      $("#studioStatus").textContent = "Seis fotos recebidas. Confira o enquadramento e salve o ensaio.";
      setCapturing(false);
      return;
    }
    $("#studioStatus").textContent = status.state === "armed" ? "Ensaio preparado. Volte ao GTA e pressione F8 na câmera inicial. F9 cancela." : `Capturando ${status.progress || 0} de 6 fotos. F9 interrompe.`;
    capturePoll = setTimeout(pollCaptureSession, 800);
  } catch (error) { if (generation !== captureGeneration) return; setCapturing(false); $("#studioStatus").textContent = error.message || "A conexão foi interrompida."; }
}

async function cancelCaptureSession() {
  captureGeneration++;
  clearTimeout(capturePoll);
  try { await captureRequest("/cancel", { method: "POST" }); }
  catch { /* O atalho F9 permanece disponível no assistente. */ }
  setCapturing(false);
  $("#studioStatus").textContent = "Captura interrompida. Suas fotos anteriores foram mantidas.";
}

$("#detailsEdit").addEventListener("click", () => { closeVehiclePortfolio(); openVehicleDialog(detailVehicleId); });
$("#detailsPhotos").addEventListener("click", openPhotoStudio);
$("#detailsFavorite").addEventListener("click", () => {
  const vehicle = data.vehicles.find(item => item.id === detailVehicleId);
  vehicle.favorite = !vehicle.favorite; saveData(); renderVehicleDetails();
});
$("#detailsPhoto").addEventListener("error", () => { $("#detailsPhoto").hidden = true; });
$("#detailsThumbnails").addEventListener("click", event => {
  const button = event.target.closest("[data-detail-shot]");
  if (!button || button.disabled) return;
  detailShot = button.dataset.detailShot; renderVehicleDetails();
});
$("#detailsPrevious").addEventListener("click", () => stepDetailPhoto(-1));
$("#detailsNext").addEventListener("click", () => stepDetailPhoto(1));
$("#vehicleDetailsDialog").addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") stepDetailPhoto(-1);
  if (event.key === "ArrowRight") stepDetailPhoto(1);
});
$("#studioGrid").addEventListener("click", event => {
  if (captureRunning || studioBusy) return;
  const upload = event.target.closest("[data-upload-shot]");
  const cover = event.target.closest("[data-cover-shot]");
  const remove = event.target.closest("[data-remove-shot]");
  if (upload) { uploadShot = upload.dataset.uploadShot; $("#studioFile").value = ""; $("#studioFile").click(); }
  if (cover) { studioCover = cover.dataset.coverShot; renderStudio(); }
  if (remove) {
    const shot = remove.dataset.removeShot;
    if (studioDraft.has(shot)) URL.revokeObjectURL(studioDraft.get(shot).url);
    studioDraft.delete(shot);
    if (studioCover === shot) studioCover = studioDraft.has("cinematicFront") ? "cinematicFront" : studioDraft.keys().next().value || "cinematicFront";
    renderStudio();
  }
});
$("#studioFile").addEventListener("change", event => uploadPhoto(event.target.files[0]));
$("#photoStudioDialog").addEventListener("paste", event => {
  const file = [...(event.clipboardData?.files || [])].find(item => item.type.startsWith("image/"));
  if (!file || captureRunning) return;
  event.preventDefault();
  uploadPhoto(file, uploadShot || PHOTO_SHOTS.find(shot => !studioDraft.has(shot.id))?.id || "cinematicFront");
});
$("#savePhotos").addEventListener("click", saveStudio);
$("#closeStudio").addEventListener("click", closePhotoStudio);
$("#discardPhotos").addEventListener("click", closePhotoStudio);
$("#photoStudioDialog").addEventListener("cancel", event => { event.preventDefault(); closePhotoStudio(); });
$("#connectCapture").addEventListener("click", checkCaptureConnection);
setInterval(() => {
  if ($("#photoStudioDialog").open && !captureRunning) checkCaptureConnection();
}, 5000);
$("#captureSession").addEventListener("click", startCaptureSession);
$("#cancelCapture").addEventListener("click", cancelCaptureSession);
$("#importPhotos").addEventListener("click", () => {
  if (captureRunning || studioBusy) return;
  $("#studioImport").value = "";
  $("#studioImport").click();
});
async function importPhotoBackup(file) {
  if (!file || captureRunning || studioBusy) return;
  const generation = studioGeneration;
  const prepared = new Map();
  studioBusy = true; renderStudio();
  try {
    if (file.size > 40 * 1024 * 1024) throw new Error("O arquivo de ensaio deve ter até 40 MB.");
    const backup = JSON.parse(await file.text());
    if (backup.version !== 1 || !Array.isArray(backup.photos) || backup.photos.length > 6) throw new Error("Arquivo de ensaio inválido.");
    for (const photo of backup.photos) {
      if (!PHOTO_SHOTS.some(shot => shot.id === photo.shot) || prepared.has(photo.shot) || typeof photo.image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(photo.image)) throw new Error("O arquivo contém uma posição ou imagem inválida.");
      const mime = photo.image.slice(5, photo.image.indexOf(";"));
      const bytes = Uint8Array.from(atob(photo.image.split(",")[1]), character => character.charCodeAt(0));
      prepared.set(photo.shot, await preparePhoto(new Blob([bytes], { type: mime })));
    }
    if (generation !== studioGeneration) { prepared.forEach(entry => URL.revokeObjectURL(entry.url)); return; }
    clearStudioDraft(); studioDraft = prepared;
    studioCover = prepared.has(backup.cover) ? backup.cover : prepared.has("cinematicFront") ? "cinematicFront" : prepared.keys().next().value || "cinematicFront";
    $("#studioStatus").textContent = "Ensaio importado. Confira as imagens e salve para confirmar.";
  } catch (error) {
    prepared.forEach(entry => URL.revokeObjectURL(entry.url));
    $("#studioStatus").textContent = error.message || "Não foi possível importar o ensaio.";
  } finally { studioBusy = false; renderStudio(); }
}
$("#studioImport").addEventListener("change", event => importPhotoBackup(event.target.files[0]));
$("#exportPhotos").addEventListener("click", async () => {
  if (captureRunning || studioBusy) return;
  if (!studioDraft.size) return showToast("Adicione fotos antes de exportar.");
  // Um único arquivo evita bloqueios de múltiplos downloads pelo navegador.
  const photos = [];
  for (const [shot, entry] of studioDraft) {
    const image = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(entry.blob); });
    photos.push({ shot, image });
  }
  const vehicle = data.vehicles.find(item => item.id === studioVehicleId);
  const blob = new Blob([JSON.stringify({ version: 1, vehicle: { ...vehicle, brand: getBrand(vehicle) }, cover: studioCover, photos })], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `ensaio-${vehicle.name.replace(/[^a-z0-9-]/gi, "-")}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});

const connectionToken = new URLSearchParams(location.hash.slice(1)).get("capture");
if (connectionToken && /^[a-f0-9]{64}$/.test(connectionToken)) {
  localStorage.setItem("minha-garagem-capture-token", connectionToken);
  history.replaceState(null, "", location.pathname + location.search);
}
readAllPhotos().then(records => {
  records.forEach(record => {
    if (PHOTO_SHOTS.some(shot => shot.id === record.shot) && data.vehicles.some(vehicle => vehicle.id === record.vehicleId)) photoUrls.set(record.key, URL.createObjectURL(record.blob));
  });
  renderVehicles();
  if (!$("#vehicleDetailsDialog").hidden) renderVehicleDetails();
}).catch(() => showToast("Armazenamento de fotos indisponível neste navegador.", "error"));
if (location.hash.startsWith("#carro/")) restoreVehicleRoute();
