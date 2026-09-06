'use strict';
const Y=window.Yashirin, $=id=>document.getElementById(id);
let storage; try{ storage=window.localStorage; }catch{ storage=null; }
let saved=Y.readSaved(storage), category='all', selected=null, previousView='places', toastTimer;

/* ---------- аналитика ---------- */
function track(goal,params){
  try{ if(typeof window.ym==='function'&&Y.CONFIG.metrikaId) window.ym(Y.CONFIG.metrikaId,'reachGoal',goal,params||{}); }catch{}
}
function initAnalytics(){
  const id=Y.CONFIG.metrikaId; if(!id) return;
  window.ym=window.ym||function(){ (window.ym.a=window.ym.a||[]).push(arguments); };
  window.ym.l=Date.now();
  const s=document.createElement('script'); s.async=true; s.src='https://mc.yandex.ru/metrika/tag.js';
  document.head.appendChild(s);
  window.ym(id,'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,trackHash:true});
}

/* ---------- helpers ---------- */
function node(tag,cls,text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!==undefined) n.textContent=text; return n; }
function dot(cat){ return node('span','dot dot-'+(Y.CATEGORIES[cat]||{}).color); }
function notify(text){ clearTimeout(toastTimer); $('toast').textContent=text; $('toast').hidden=false; toastTimer=setTimeout(()=>$('toast').hidden=true,3500); }
async function copy(text){
  try{ if(navigator.clipboard&&window.isSecureContext){ await navigator.clipboard.writeText(text); return true; } }catch{}
  try{
    const ta=node('textarea','clipboard-fallback'); ta.value=text; ta.setAttribute('readonly','');
    document.body.appendChild(ta); ta.select(); const ok=document.execCommand('copy'); ta.remove(); return ok;
  }catch{ return false; }
}

/* ---------- приветствие и счётчики ---------- */
{ const g=$('greet'); if(g){ g.textContent=Y.greeting(new Date().getHours())+', '; const em=node('em','','куда поедем?'); g.appendChild(em); } }
{ const n=Y.places.length; document.querySelectorAll('[data-count-places]').forEach(el=>el.textContent=String(n)); }

/* ---------- фильтры ---------- */
function renderFilters(){
  const box=$('filters'); box.replaceChildren();
  const cats=[['all','Все места','soft'],...Y.activeCategories().map(k=>[k,Y.CATEGORIES[k].name,Y.CATEGORIES[k].color])];
  cats.forEach(([k,label,color])=>{
    const b=node('button'); b.type='button'; b.dataset.filter=k; b.setAttribute('aria-pressed',String(k===category));
    b.append(node('span','dot dot-'+color),document.createTextNode(label));
    b.addEventListener('click',()=>{ category=k; box.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); renderLists(); });
    box.appendChild(b);
  });
  $('map-all').href=Y.mapLinks(Y.places[0]).all;
}

/* ---------- карточки ---------- */
function saveButton(p){
  const b=node('button','save-small',saved.has(p.id)?'♥':'♡'); b.type='button'; b.dataset.save=p.id;
  b.setAttribute('aria-pressed',String(saved.has(p.id)));
  b.setAttribute('aria-label',(saved.has(p.id)?'Убрать из сохранённого: ':'Сохранить: ')+p.name);
  b.addEventListener('click',e=>{ e.preventDefault(); toggleSave(p.id); });
  return b;
}
function card(p){
  const a=node('article','pcard');
  const link=node('a','pcard-link'); link.href=`#/place/${p.id}`; link.setAttribute('aria-label',`Открыть: ${p.name}`);
  const img=node('img'); img.src=p.image; img.alt=p.alt; img.loading='lazy'; img.decoding='async'; img.width=900; img.height=600;
  link.append(img,node('span','grad'));
  const chip=node('span','chip','✓ автор был лично');
  const inside=node('div','in');
  inside.append(node('div','nm',p.short||p.name), node('div','pn',p.tagline));
  const line=node('div','ln'); line.append(dot(p.category),document.createTextNode(`${Y.CATEGORIES[p.category].name} · ${p.km} км от Ташкента · ${p.drive}`));
  inside.appendChild(line);
  a.append(link,chip,inside,saveButton(p));
  return a;
}
function renderLists(){
  const list=Y.filtered(category);
  $('place-list').replaceChildren(...list.map(card));
  const n=list.length; $('result-count').textContent=n===0?'Пока нет мест':n===1?'1 место':n<5?`${n} места`:`${n} мест`;
  const chosen=Y.filtered('all',saved);
  $('saved-list').replaceChildren(...chosen.map(card));
  $('saved-empty').hidden=chosen.length>0;
  const sc=$('saved-count'); sc.textContent=String(chosen.length); sc.hidden=chosen.length===0;
}

/* ---------- сохранение ---------- */
function syncSave(){
  if(!selected) return;
  const on=saved.has(selected.id);
  $('save-place').textContent=on?'♥ Сохранено':'♡ Сохранить место';
  $('save-place').setAttribute('aria-pressed',String(on));
}
function toggleSave(id){
  const remove=saved.has(id);
  if(remove) saved.delete(id); else saved.add(id);
  const persisted=Y.writeSaved(storage,saved);
  renderLists(); syncSave();
  const focused=document.querySelector(`#view-${Y.route(location.hash).view} [data-save="${id}"]`);
  if(focused) focused.focus({preventScroll:true});
  notify(persisted?(remove?'Убрано из сохранённого':'Сохранено в этом браузере'):'Браузер не разрешил сохранить: список живёт до закрытия страницы');
  $('storage-note').textContent=persisted?'Сохранённое остаётся в этом браузере.':'Браузер не разрешил сохранение. Список действует до закрытия страницы.';
  if(!remove) track('place_save',{place:id});
}

/* ---------- карточка места ---------- */
function renderPlace(id){
  selected=Y.places.find(p=>p.id===id); const p=selected, maps=Y.mapLinks(p);
  $('place-name').textContent=p.name;
  const cat=$('place-category'); cat.replaceChildren(dot(p.category),document.createTextNode(`${Y.CATEGORIES[p.category].name} · ${p.location}`));
  $('place-tagline').textContent=p.tagline;
  $('place-image').src=p.image; $('place-image').alt=p.alt;
  const meta=$('place-meta'); meta.replaceChildren();
  [[`~${p.km} км`,' от Ташкента · на машине '],[p.drive,' · пешком '],[p.walk,' · сезон '],[p.season,'']].forEach(([b,t])=>{ meta.append(node('b','',b),document.createTextNode(t)); });
  $('place-description').textContent=p.description;
  $('place-reason').textContent=p.reason;
  $('place-facts').replaceChildren(...p.facts.map(([k,v])=>{ const row=node('div'); row.append(node('dt','',k),node('dd','',v)); return row; }));
  $('facts-date').textContent=`Сведения на ${Y.CONFIG.dataDate}. Погода, цены и режим работы меняются, уточняйте перед поездкой.`;
  $('place-map').href=maps.yandexRoute; $('yandex-map').href=maps.yandex; $('google-map').href=maps.google;
  $('coordinates').textContent=`Координаты: ${p.lat}, ${p.lon}`;
  $('place-feedback').href=`#/feedback?place=${p.id}`;
  $('detail-back').href=previousView==='saved'?'#/saved':'#/';
  $('detail-back').textContent=previousView==='saved'?'‹ Сохранённое':'‹ Все места';
  syncSave();
  track('place_view',{place:id});
}

/* ---------- маршрутизация ---------- */
const TITLES={places:'Места, о которых мало говорят',saved:'Сохранённое',about:'О проекте',feedback:'Обратная связь',suggest:'Предложить место',thanks:'Спасибо','not-found':'Страница не найдена'};
function renderRoute(){
  const r=Y.route(location.hash);
  document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==`view-${r.view}`);
  document.querySelectorAll('[data-nav]').forEach(a=>{
    const active=a.dataset.nav===(r.view==='place'?'places':r.view);
    if(active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
  if(r.view==='place') renderPlace(r.id); else previousView=r.view;
  if(r.view==='saved') renderLists();
  if(r.view==='feedback'&&r.place) $('feedback-place').value=r.place;
  document.title=`${r.view==='place'?selected.name:TITLES[r.view]} — Yashirin`;
  window.scrollTo({top:0,behavior:'instant'});
  $('main').focus({preventScroll:true});
}

/* ---------- поделиться ---------- */
$('share-place').addEventListener('click',async()=>{
  if(!selected) return;
  const url=Y.placeURL(location.href,selected.id), title=`${selected.name} — Yashirin`;
  track('share',{place:selected.id});
  if(navigator.share){ try{ await navigator.share({title,url}); return; }catch(e){ if(e.name==='AbortError') return; } }
  if(await copy(url)){ notify('Ссылка на место скопирована'); return; }
  window.prompt('Скопируйте ссылку на место:',url);
});
$('save-place').addEventListener('click',()=>{ if(selected) toggleSave(selected.id); });
document.querySelectorAll('[data-track]').forEach(el=>el.addEventListener('click',()=>track(el.dataset.track,selected?{place:selected.id}:{})));

/* ---------- формы: Netlify Forms, запасной путь Telegram ---------- */
async function submitNetlify(formName,fields){
  const res=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:Y.encodeForm(formName,fields)});
  if(!res.ok) throw new Error('HTTP '+res.status);
  return true;
}
function showFallback(boxId,message){
  const box=$(boxId); box.replaceChildren(); box.hidden=false;
  const area=node('textarea'); area.readOnly=true; area.value=message; area.setAttribute('aria-label','Текст сообщения для Telegram');
  const row=node('div','action-row');
  const copyBtn=node('button','btn primary','Скопировать текст'); copyBtn.type='button';
  copyBtn.addEventListener('click',async()=>{ if(await copy(message)){ notify('Текст скопирован, теперь откройте Telegram'); copyBtn.textContent='Скопировано'; } else { area.focus(); area.select(); notify('Выделили текст, скопируйте его вручную'); } });
  const link=node('a','btn ghost','Открыть Telegram ↗'); link.href=Y.CONFIG.telegram; link.target='_blank'; link.rel='noopener noreferrer';
  row.append(copyBtn,link);
  box.append(node('h2','','Автоматически отправить не удалось'),node('p','','Скопируйте текст и отправьте его автору в Telegram. Так тоже дойдёт.'),area,row);
  box.scrollIntoView({behavior:'instant',block:'nearest'}); area.focus({preventScroll:true});
}
function showThanks(boxId,text){
  const box=$(boxId); box.replaceChildren(); box.hidden=false;
  const row=node('div','action-row');
  const home=node('a','btn primary','К местам'); home.href='#/';
  const tg=node('a','btn ghost','Написать автору ↗'); tg.href=Y.CONFIG.telegram; tg.target='_blank'; tg.rel='noopener noreferrer';
  row.append(home,tg);
  box.append(node('h2','','Спасибо, получили'),node('p','',text),row);
  box.scrollIntoView({behavior:'instant',block:'nearest'});
}
function lockForm(form,locked){ form.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=locked); }

$('feedback-form').addEventListener('submit',async e=>{
  e.preventDefault(); const form=e.currentTarget; if(!form.reportValidity()) return;
  if(form.elements['bot-field'].value) return;
  const f={result:$('feedback-result').value,place:$('feedback-place').value,text:$('feedback-text').value.trim(),contact:$('feedback-contact').value.trim()};
  lockForm(form,true);
  try{ await submitNetlify('feedback',{...f,page:location.href}); form.hidden=true; showThanks('feedback-output','Отзыв дошёл до автора. Если оставили контакт, ответим лично.'); track('feedback_sent',{place:f.place||'site'}); }
  catch{ lockForm(form,false); showFallback('feedback-output',Y.feedbackText(f)); track('feedback_fallback'); }
});
$('suggest-form').addEventListener('submit',async e=>{
  e.preventDefault(); const form=e.currentTarget; if(!form.reportValidity()) return;
  if(form.elements['bot-field'].value) return;
  const f={name:$('suggest-name').value.trim(),location:$('suggest-location').value.trim(),reason:$('suggest-reason').value.trim(),contact:$('suggest-contact').value.trim()};
  lockForm(form,true);
  try{ await submitNetlify('suggest',{...f,page:location.href}); form.hidden=true; showThanks('suggest-output','Находка у автора. После знакомства с местом оно появится в подборке с вашим именем, если захотите.'); track('suggest_sent'); }
  catch{ lockForm(form,false); showFallback('suggest-output',Y.suggestText(f)); track('suggest_fallback'); }
});
document.querySelectorAll('.form input,.form textarea').forEach(field=>{
  field.addEventListener('input',()=>field.setCustomValidity(''));
  field.addEventListener('change',()=>{ field.value=field.value.trim(); field.setCustomValidity(field.required&&field.value.length<field.minLength?'Добавьте, пожалуйста, несколько слов.':''); });
});
document.querySelector('.skip').addEventListener('click',e=>{ e.preventDefault(); $('main').focus(); });

/* ---------- старт ---------- */
window.addEventListener('hashchange',renderRoute);
window.addEventListener('storage',e=>{ if(e.key===Y.key){ saved=Y.readSaved(storage); renderLists(); syncSave(); } });
initAnalytics(); renderFilters(); renderLists(); renderRoute();
