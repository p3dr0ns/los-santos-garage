// Apply the saved identity before rendering the page. Collection data is separate.
const WORKSHOP_THEME_KEY = "lsg-workshop-theme-v1";
const WORKSHOP_THEMES = Object.freeze([
  {id:"garage-v",name:"Garage V",short:"GV",heading:"GARAGE",tagline:"V · ONLINE",place:"PERSONAL VEHICLE COLLECTION · GTA ONLINE",description:"Tema padrão. Preto tinta, branco papel e verde cédula, com a identidade Garage V.",caption:"Sua coleção.\nSuas regras.",footer:"Todos os seus carros. Uma garagem do seu jeito.",color:"#0e1211",palette:["#0e1211","#f5f3ed","#8cda91"]},
  {id:"lsc",name:"Los Santos Customs",short:"LSC",heading:"Los Santos",tagline:"CUSTOMS",place:"LOS SANTOS · SAN ANDREAS",description:"Cromado, índigo e o letreiro clássico da sua garagem.",caption:"Sua coleção.\nCada carro no seu lugar.",footer:"Garagens, projetos e cultura automotiva.",color:"#17171f",palette:["#35345f","#bfc3ce","#17171f"]},
  {id:"bennys",name:"Benny’s Original Motor Works",short:"B",heading:"Benny’s",tagline:"ORIGINAL MOTOR WORKS",place:"STRAWBERRY · LOS SANTOS",description:"Vermelho vinho, creme e uma oficina de customização cheia de personalidade.",caption:"Cada detalhe.\nUma assinatura sua.",footer:"Sua coleção de lowriders, clássicos e projetos especiais.",color:"#201619",palette:["#a63f4b","#efd8ad","#201619"]},
  {id:"beekers",name:"Beeker’s Garage",short:"BG",heading:"BEEKER’S",tagline:"GARAGE & PARTS",place:"PALETO BAY · BLAINE COUNTY",description:"Verde petróleo, amarelo envelhecido e acabamento de oficina de estrada.",caption:"De portas abertas.\nPronta para a estrada.",footer:"Sua garagem no norte de San Andreas.",color:"#131e1b",palette:["#3e7163","#e1bd72","#131e1b"]},
  {id:"haos",name:"Hao’s Special Works",short:"HSW",heading:"HAO’S",tagline:"SPECIAL WORKS",place:"LS CAR MEET · CYPRESS FLATS",description:"Grafite, laranja e detalhes técnicos de uma garagem de alta performance.",caption:"Seu próximo projeto.\nUm nível acima.",footer:"Uma coleção com espírito de preparação e desempenho.",color:"#15191f",palette:["#f3a450","#b7c7d9","#15191f"]}
]);
function readWorkshopTheme() {
  try {const id=localStorage.getItem(WORKSHOP_THEME_KEY);return WORKSHOP_THEMES.find(theme=>theme.id===id)||WORKSHOP_THEMES[0];}
  catch {return WORKSHOP_THEMES[0];}
}
document.documentElement.dataset.workshopTheme=readWorkshopTheme().id;
function createWorkshopMark(theme, mini=false) {
  const mark=document.createElement("span");mark.className="workshop-mark";
  if(theme.id==="garage-v"){
    const image=document.createElement("img");image.src="assets/garage-v-logo.svg";image.alt="Garage V";image.width=960;image.height=420;image.className="garage-v-preview-logo";
    mark.append(image);return mark;
  }
  const upper=document.createElement("small"),title=document.createElement("strong"),lower=document.createElement("small"),initial=document.createElement("span");
  upper.textContent="PERSONAL COLLECTION";title.textContent=theme.heading;lower.textContent=theme.tagline;
  initial.className="workshop-initial";initial.textContent=theme.short;
  mark.append(upper,title,lower,initial);if(mini)mark.classList.add("workshop-mark-mini");return mark;
}
function applyWorkshopTheme(id, persist=true) {
  const theme=WORKSHOP_THEMES.find(entry=>entry.id===id);if(!theme)return false;
  if(persist) {
    try{localStorage.setItem(WORKSHOP_THEME_KEY,theme.id);}
    catch{const status=document.querySelector("#workshopThemeStatus");if(status)status.textContent="Não foi possível salvar o tema. Verifique o armazenamento do navegador.";return false;}
  }
  document.documentElement.dataset.workshopTheme=theme.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",theme.color);
  const brand=document.querySelector(".brand"),wordmark=document.querySelector(".lsg-wordmark"),banner=document.querySelector("#lsgBrandBanner");
  if(brand){brand.querySelector(".workshop-mark")?.remove();brand.append(createWorkshopMark(theme,true));brand.setAttribute("aria-label",theme.id==="garage-v"?"Garage V":`${theme.name} · Garage V`);}
  if(wordmark){wordmark.querySelector(".workshop-mark")?.remove();wordmark.append(createWorkshopMark(theme));}
  document.querySelectorAll('.brand-logo,.lsg-banner-logo').forEach(image=>{
    const lsc=theme.id==="lsc";
    image.setAttribute('src',lsc?'assets/logo-los-santos-customs.png':'assets/garage-v-logo.svg');
    image.alt=lsc?'Los Santos Customs Garage':'Garage V';
    image.width=lsc?1536:960;image.height=lsc?1024:420;
  });
  if(banner){
    banner.setAttribute("aria-label",`${theme.name} · sua garagem`);
    banner.querySelector(".lsg-brand-caption > span").textContent=theme.place;
    const heading=banner.querySelector(".lsg-brand-caption h2");heading.replaceChildren();
    theme.caption.split("\n").forEach((line,index)=>{if(index)heading.append(document.createElement("br"));heading.append(document.createTextNode(line));});
    banner.querySelector(".lsg-brand-caption small").textContent=theme.footer;
    let plaque=banner.querySelector(".workshop-bay-plaque");if(!plaque){plaque=document.createElement("span");plaque.className="workshop-bay-plaque";banner.append(plaque);}
    plaque.textContent=`${theme.short} / PERSONAL GARAGE`;
  }
  document.querySelectorAll("[data-workshop-choice]").forEach(button=>{
    const active=button.dataset.workshopChoice===theme.id;button.setAttribute("aria-pressed",String(active));
    button.querySelector(".workshop-choice-state").textContent=active?"Tema atual":"Usar este tema";
  });
  const status=document.querySelector("#workshopThemeStatus");if(status)status.textContent=`Tema atual: ${theme.name}. Suas garagens e seus veículos continuam os mesmos.`;
  return true;
}
function initializeWorkshopThemes() {
  const choices=document.querySelector("#workshopThemeChoices");if(!choices)return;
  WORKSHOP_THEMES.forEach(theme=>{
    const button=document.createElement("button");button.type="button";button.className="workshop-theme-choice";button.dataset.workshopChoice=theme.id;
    button.setAttribute("aria-pressed","false");button.setAttribute("aria-label",`Usar tema ${theme.name}`);
    const preview=document.createElement("span");preview.className="workshop-theme-preview";preview.setAttribute("aria-hidden","true");preview.append(createWorkshopMark(theme));
    const name=document.createElement("strong"),description=document.createElement("span"),state=document.createElement("span"),swatches=document.createElement("span");
    name.textContent=theme.name;description.textContent=theme.description;description.className="workshop-choice-description";
    swatches.className="workshop-swatches";swatches.setAttribute("aria-hidden","true");
    theme.palette.forEach(color=>{const dot=document.createElement("i");dot.style.backgroundColor=color;swatches.append(dot);});
    state.className="workshop-choice-state";button.append(preview,name,description,swatches,state);
    button.addEventListener("click",()=>applyWorkshopTheme(theme.id));choices.append(button);
  });
  applyWorkshopTheme(readWorkshopTheme().id,false);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initializeWorkshopThemes,{once:true});else initializeWorkshopThemes();
window.addEventListener("storage",event=>{if(event.key===WORKSHOP_THEME_KEY||event.key===null)applyWorkshopTheme(readWorkshopTheme().id,false);});
