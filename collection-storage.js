// Local collections are isolated by profile. The original key remains untouched.
const PROFILE_KEY = "lsg-profiles-v1";
let sessionProfileId = null;
const storageSession = { known: new Map(), undo: [], blocked: false, notice: "" };
function readProfiles() {
  try {
    const value = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (value && Array.isArray(value.items) && value.items.length && value.items.length <= 50 &&
        value.items.every(p => p && typeof p.id === "string" && /^(default|[a-zA-Z0-9_-]{1,100})$/.test(p.id) && typeof p.name === "string" && p.name.trim() && p.name.length <= 100) &&
        new Set(value.items.map(p => p.id)).size === value.items.length && value.items.some(p => p.id === value.active)) {
      if(sessionProfileId && value.items.some(p=>p.id===sessionProfileId))value.active=sessionProfileId;
      return value;
    }
  } catch {}
  return { active: "default", items: [{ id: "default", name: "Minha coleção" }] };
}
function profileStorageKey(id) { return id === "default" ? "minha-garagem-v1" : `minha-garagem-v1-profile-${id}`; }
function collectionStorageKey() { sessionProfileId=readProfiles().active;return profileStorageKey(sessionProfileId); }
function isCollectionShape(value) {
  const text=(v,max=1000)=>typeof v==="string" && v.length<=max;
  const amount=v=>typeof v==="number" && Number.isFinite(v) && v>=0 && v<=10000000000;
  const optional=(v,predicate)=>v==null || predicate(v);
  return value && typeof value === "object" && Array.isArray(value.garages) && Array.isArray(value.vehicles) &&
    value.garages.length <= 2000 && value.vehicles.length <= 20000 &&
    new Set(value.garages.map(g=>g?.id)).size===value.garages.length && new Set(value.vehicles.map(v=>v?.id)).size===value.vehicles.length &&
    value.garages.every(g => g && text(g.id,100) && text(g.name,200) && Number.isFinite(Number(g.capacity)) &&
      optional(g.type,v=>text(v)) && optional(g.locationId,v=>text(v)) && optional(g.tags,v=>Array.isArray(v)&&v.every(t=>text(t))) && optional(g.interiorStyle,v=>text(v))) &&
    value.vehicles.every(v => v && text(v.id,100) && text(v.name,200) && text(v.category,100) &&
      ["catalogId","brand","paint","wheelType","wheelModel","wheelRearModel","plate","color","wheels"].every(k=>optional(v[k],t=>text(t))) && optional(v.notes,t=>text(t,10000)) &&
      optional(v.purchasePrice,amount) && optional(v.modificationCost,amount) && optional(v.tuning,tasks=>Array.isArray(tasks)&&tasks.length<=100&&tasks.every(t=>t&&text(t.id,100)&&text(t.name,150)&&amount(t.cost)&&typeof t.done==="boolean"))) &&
    optional(value.wishlist,ids=>Array.isArray(ids)&&ids.every(id=>text(id,100))) &&
    optional(value.goals,goals=>Array.isArray(goals)&&goals.length<=100&&goals.every(g=>g&&text(g.id,100)&&text(g.name,150)&&["brand","category","garage"].includes(g.type)&&text(g.value,200)&&optional(g.target,t=>Number.isInteger(t)&&t>0&&t<=20000)));
}
function parseStoredCollection(raw) {
  const value = JSON.parse(raw);
  if (!isCollectionShape(value)) throw new Error("Estrutura da coleção inválida.");
  return value;
}
function readStoredCollection(key, fallback) {
  let raw;
  try { raw = localStorage.getItem(key); }
  catch { storageSession.blocked = true; storageSession.notice = "O navegador bloqueou o armazenamento. Seus dados não serão gravados."; return structuredClone(fallback); }
  storageSession.known.set(key, raw);
  if (raw === null) return structuredClone(fallback);
  try { return parseStoredCollection(raw); }
  catch {
    storageSession.blocked = true;
    storageSession.notice = "Os dados salvos estão danificados. Baixe uma cópia para preservar o original ou recupere a última versão válida.";
    // Never replace a damaged original silently with an empty collection.
    try { return parseStoredCollection(localStorage.getItem(`${key}-recovery`)); }
    catch { return structuredClone(fallback); }
  }
}
function persistCollection(key, value, options = {}) {
  if (storageSession.blocked && !options.resolve) throw new Error("Resolva o aviso de armazenamento antes de salvar.");
  const previous = localStorage.getItem(key);
  if (!options.resolve && storageSession.known.has(key) && previous !== storageSession.known.get(key)) {
    storageSession.blocked = true;
    storageSession.notice = "Esta coleção mudou em outra aba. Carregue a versão salva ou baixe sua cópia antes de continuar.";
    if (typeof renderStorageNotice === "function") renderStorageNotice();
    throw new Error("Outra aba alterou a coleção. Confira o aviso acima.");
  }
  const next = JSON.stringify(value);
  const priorSnapshot=previous===null?JSON.stringify({garages:[],vehicles:[],wishlist:[]}):previous;
  let validPrevious = false;
  try { parseStoredCollection(priorSnapshot); validPrevious = true; } catch {}
  // A failed recovery write also aborts the operation, preserving the original.
  if (validPrevious && priorSnapshot !== next) localStorage.setItem(`${key}-recovery`, priorSnapshot);
  localStorage.setItem(key, next);
  if (validPrevious && priorSnapshot !== next && !options.noUndo) {
    storageSession.undo.push(priorSnapshot);
    if (storageSession.undo.length > 20) storageSession.undo.shift();
  }
  storageSession.known.set(key, next);
  storageSession.blocked = false;
  storageSession.notice = "";
}
