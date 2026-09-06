const CATS = {
  gory:{n:'Горы', c:'#A9E34B'},
  voda:{n:'Вода', c:'#39D6D0'},
  strannoe:{n:'Необычное', c:'#FFB84D'},
  eda:{n:'Еда', c:'#FF5470'},
};
const PLACES = [
 {id:'metallurg', n:'Зона отдыха «Металлург»', cat:'voda', real:true, ver:'5 сент', photo:'assets/metallurg.jpg', lat:41.612463, lon:70.000463, km:'~95 км', drive:'1,5–2 ч', walk:'нет', sez:'май–сент пляж, виды весь год',
  d:'Зона отдыха на берегу Чарвака, 1275 м над морем, в Угам-Чаткальской заповедной зоне. Панорамный вид на водохранилище и отроги Тянь-Шаня, пляж с пирсом, открытый летний бассейн, беседки под деревьями. Территория 12 гектаров.',
  rows:[['Вход','платный: от 50–100 тыс сум, может быть выше'],['Формат','зона отдыха: пляж, бассейн, беседки'],['Дорога','асфальт до Чарвака'],['Кому','семьи, компании, спокойный отдых'],['График','ежедневно 10:00–19:00']]},
 {id:'chimyon', n:'Чимён (Chimyon)', cat:'gory', real:true, ver:'5 сент', photo:'assets/chimyon.jpg', lat:41.517232, lon:69.969141, km:'~80 км', drive:'1,5 ч', walk:'по желанию', sez:'весь год',
  d:'Горная локация в Бостанлыкском районе, предгорья Чимгана. Топ-точка для съёмок: реклама машины в кадре, видео, фотосессии — фактура гор без долгой дороги.',
  rows:[['Чем хорош','съёмки: авто в кадре, видео, фото'],['Дорога','асфальт, Бостанлыкский район'],['Кадр','дорога-серпантин прямо на Большой Чимган']]},
];

const $ = id => document.getElementById(id);
const yandexTo = (lat,lon) => `https://yandex.uz/maps/?rtext=~${lat},${lon}&rtt=auto`;
const googleTo = (lat,lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;

const SCREENS = ['scr-trips','scr-places','scr-place','scr-saved','scr-profile','scr-feedback','scr-suggest'];
let current='scr-trips', backTo='scr-trips', activeCat='all', curPlace=null;
const SAVED_KEY='yashirin.saved.v1';
function loadSaved(){
  try{
    const raw=JSON.parse(localStorage.getItem(SAVED_KEY)||'[]');
    return new Set(Array.isArray(raw)?raw.filter(id=>PLACES.some(p=>p.id===id)):[]);
  }catch(e){ return new Set(); }
}
const saved = loadSaved();
function persistSaved(){
  try{ localStorage.setItem(SAVED_KEY, JSON.stringify([...saved])); }catch(e){}
}

/* дизайн-акценты */
const SHORT = {metallurg:'«Металлург»', chimyon:'Чимён'};
const POETIC = {metallurg:'берег Чарвака, 1275 м', chimyon:'серпантин на Большой Чимган'};
{ const h = new Date().getHours();
  const g = h<5?'Не спится':h<11?'Доброе утро':h<17?'Добрый день':'Добрый вечер';
  const greet=$('greet'); greet.textContent=g+', ';
  const em=document.createElement('em'); em.textContent='куда едем?'; greet.appendChild(em); }

function show(id){
  SCREENS.forEach(s => { $(s).hidden = (s !== id); });
  current = id;
  const tabOf = {'scr-trips':'trips','scr-places':'places','scr-place':'places','scr-saved':'profile','scr-profile':'profile','scr-feedback':'profile','scr-suggest':'suggest'}[id];
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tabOf));
  if(window.moveInd) moveInd();
}
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
  show({trips:'scr-trips',places:'scr-places',suggest:'scr-suggest',profile:'scr-profile'}[b.dataset.tab]);
}));
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => show(backTo)));

let toastTimer=null;
function toast(msg){
  const t=$('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{t.classList.remove('show');},2200);
}

const EXTERNAL_HOSTS=new Set(['t.me','yandex.uz','www.google.com','www.instagram.com']);
function openExternal(url){
  try{
    const u=new URL(url, location.href);
    if(u.protocol!=='https:' || !EXTERNAL_HOSTS.has(u.hostname)) throw new Error('External host is not allowed');
    const a=document.createElement('a');
    a.href=u.href; a.target='_blank'; a.rel='noopener noreferrer'; a.referrerPolicy='no-referrer';
    document.body.appendChild(a); a.click(); a.remove();
  }catch(e){ toast('Не удалось открыть ссылку'); }
}
async function copyText(text){
  try{
    if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); return true; }
  }catch(e){}
  try{
    const ta=document.createElement('textarea');
    ta.value=text; ta.setAttribute('readonly','');
    ta.className='clipboard-fallback';
    document.body.appendChild(ta); ta.select();
    const ok=document.execCommand('copy'); ta.remove(); return ok;
  }catch(e){ return false; }
}

/* анонс первого выезда */
{ const ch = PLACES.find(p=>p.id==='chimyon');
  if(ch && ch.photo) $('annimg').src = ch.photo; }
$('annbtn').addEventListener('click', () => {
  const msg='Хочу в первый выезд YASHIRIN. Пришлите дату, точку старта и условия участия.';
  copyText(msg).then(copied=>toast(copied?'Сообщение скопировано':'Открыл Telegram — напиши про первый выезд'));
  openExternal('https://t.me/yunusovprod');
});
$('annplaces').addEventListener('click', ()=>show('scr-places'));

/* места: легенда-фильтр + список */
const DOT_CLASS={'#A9E34B':'dot-gory','#39D6D0':'dot-voda','#FFB84D':'dot-amber','#FF5470':'dot-red','#8D8DA6':'dot-soft'};
function dot(color, className='dot'){
  const s=document.createElement('span'); s.className=`${className} ${DOT_CLASS[color]||'dot-soft'}`; return s;
}
function textEl(tag, className, text){
  const e=document.createElement(tag); if(className) e.className=className; e.textContent=text; return e;
}
const legend = $('legend');
[['all','Все','#8D8DA6'], ...Object.entries(CATS).map(([k,v])=>[k,v.n,v.c])].forEach(([k,label,color])=>{
  const b=document.createElement('button');
  b.dataset.cat=k; b.className=k==='all'?'on':'';
  b.append(dot(color), document.createTextNode(label));
  b.addEventListener('click',()=>{ activeCat=k; legend.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.cat===k)); renderPlaces(); });
  legend.appendChild(b);
});
$('ymall').href='https://yandex.uz/maps/?ll=69.62,41.42&z=9&pt='+PLACES.map(p=>`${p.lon},${p.lat},pm2gnm`).join('~');

function itemEl(p, sub){
  const el=document.createElement('button'); el.className='item';
  const body=document.createElement('span');
  const title=textEl('span','t',p.n);
  if(p.real){ const tag=textEl('span','verified-tag',' ✓ проверено'); title.appendChild(tag); }
  const desc=textEl('span','s',sub);
  body.append(title,desc);
  el.append(dot(CATS[p.cat].c),body,textEl('span','km',p.km));
  return el;
}
function renderPlaces(){
  const list=$('placelist'); list.replaceChildren();
  PLACES.filter(p=>activeCat==='all'||p.cat===activeCat).forEach(p=>{
    const el=document.createElement('button'); el.className='pcard'; el.type='button';
    if(p.photo){ const img=document.createElement('img'); img.src=p.photo; img.alt=`${SHORT[p.id]||p.n} — фото места`; img.loading='lazy'; img.decoding='async'; el.appendChild(img); }
    el.appendChild(textEl('div','grad',''));
    if(p.real) el.appendChild(textEl('span','chip','✓ проверено'+(p.ver?' · '+p.ver:'')));
    const inside=textEl('div','in','');
    inside.appendChild(textEl('div','nm',SHORT[p.id]||p.n));
    if(POETIC[p.id]) inside.appendChild(textEl('div','pn',POETIC[p.id]));
    const line=textEl('div','ln',''); line.append(dot(CATS[p.cat].c),document.createTextNode(`${CATS[p.cat].n} · ${p.km} из Ташкента · ${p.drive}`));
    inside.appendChild(line); el.appendChild(inside);
    el.addEventListener('click',()=>openPlace(p.id,'scr-places'));
    list.appendChild(el);
  });
  const add=document.createElement('button'); add.className='pcard addcard'; add.type='button';
  add.append(textEl('div','plus','+'),textEl('div','nm2','Предложи место'),textEl('div','sub2','знаешь точку — после проверки она появится здесь с твоим именем'));
  add.addEventListener('click',()=>show('scr-suggest'));
  list.appendChild(add);
}
renderPlaces();

function openPlace(id, from){
  const p = PLACES.find(x=>x.id===id); if(!p) return; curPlace=p; backTo=from;
  if(p.photo){ $('pheroimg').src=p.photo; $('pheroimg').alt=`${p.n} — фото места`; $('phero').hidden=false; } else { $('phero').hidden=true; }
  const cat=$('pcat'); cat.replaceChildren(); cat.append(dot(CATS[p.cat].c),document.createTextNode(CATS[p.cat].n+' · '));
  const status=textEl('span',p.real?'verified-tag':'','');
  status.textContent=p.real?`проверено${p.ver?' '+p.ver:''} · точка №${PLACES.filter(x=>x.real).findIndex(x=>x.id===p.id)+1}`:'ещё не проверено командой';
  cat.appendChild(status);
  $('pname').textContent=p.n;
  const po=POETIC[p.id]; $('psub').hidden=!po; $('psub').textContent=po||'';
  const meta=$('pmeta'); meta.replaceChildren();
  const parts=[
    [p.km,' от Ташкента · в пути '],[p.drive,' · пешком '],[p.walk,' · сезон '],[p.sez,'']
  ];
  parts.forEach(([bold,tail])=>{ const b=document.createElement('b'); b.textContent=bold; meta.append(b,document.createTextNode(tail)); });
  $('pdesc').textContent=p.d;
  const rows=$('prows'); rows.replaceChildren();
  p.rows.forEach(([k,v])=>{ const r=textEl('div','r',''); r.append(textEl('span','k',k),textEl('span','v',v)); rows.appendChild(r); });
  $('pyandex').href=yandexTo(p.lat,p.lon);
  $('pgoogle').href=googleTo(p.lat,p.lon);
  $('pcoord').textContent = p.real
    ? `точка на карте: ${p.lat}, ${p.lon}`
    : `ориентировочная точка: ${p.lat}, ${p.lon} · уточняется проверочным выездом`;
  const sb=$('saveplace');
  sb.classList.toggle('on',saved.has(p.id));
  sb.textContent=saved.has(p.id)?'♥ Сохранено':'♡ Сохранить';
  show('scr-place');
  $('scr-place').scrollTop=0;
}
$('saveplace').addEventListener('click',()=>{
  if(!curPlace) return;
  if(saved.has(curPlace.id)){ saved.delete(curPlace.id); toast('Убрано из сохранённого'); }
  else { saved.add(curPlace.id); toast('Сохранено на этом устройстве'); }
  persistSaved();
  const sb=$('saveplace');
  sb.classList.toggle('on',saved.has(curPlace.id));
  sb.textContent=saved.has(curPlace.id)?'♥ Сохранено':'♡ Сохранить';
});

/* сохранённое */
$('openSaved').addEventListener('click',()=>{ backTo='scr-profile'; renderSaved(); show('scr-saved'); });
function renderSaved(){
  const list=$('savedlist'); list.replaceChildren();
  const items=[...saved].map(id=>PLACES.find(p=>p.id===id));
  $('savedempty').hidden = items.length>0;
  items.forEach(p=>{
    const el=itemEl(p, `в пути ${p.drive} · пешком ${p.walk} · ${p.sez}`);
    el.addEventListener('click',()=>openPlace(p.id,'scr-saved'));
    list.appendChild(el);
  });
}

/* бета-отзыв */
function openFeedback(){ backTo = current==='scr-feedback' ? backTo : current; show('scr-feedback'); }
$('betabtn').addEventListener('click',openFeedback);
$('openFeedback').addEventListener('click',()=>{ backTo='scr-profile'; show('scr-feedback'); });
$('feedbackForm').addEventListener('submit', e=>{
  e.preventDefault();
  if(!e.currentTarget.reportValidity()) return;
  const msg = `Бета-отзыв YASHIRIN:
1) Последняя поездка и выбор места: ${$('fq1').value.trim()}
2) Что непонятно/мешает: ${$('fq2').value.trim()}
3) Не хватает перед выездом: ${$('fq3').value.trim()}
4) Причина вернуться: ${$('fq4').value}`;
  copyText(msg).then(copied=>{
    const out=$('fout'); out.hidden=false;
    out.textContent=(copied?'Ответы скопированы. Вставь их в Telegram и отправь.':'Не удалось скопировать автоматически. Скопируй текст ниже вручную:')+'\n\n'+msg;
    toast(copied?'Ответы скопированы':'Скопируй ответы ниже');
  });
  openExternal('https://t.me/yunusovprod');
});

/* предложить место */
$('suggestForm').addEventListener('submit', e=>{
  e.preventDefault();
  if(!e.currentTarget.reportValidity()) return;
  const msg = `Предлагаю место для YASHIRIN:
Название: ${$('sq1').value.trim()}
Где: ${$('sq2').value.trim()}
Почему стоит ехать: ${$('sq3').value.trim()}`;
  copyText(msg).then(copied=>{
    const out=$('sout'); out.hidden=false;
    out.textContent=(copied?'Описание скопировано. Вставь его в Telegram и отправь.':'Не удалось скопировать автоматически. Скопируй текст ниже вручную:')+'\n\n'+msg;
    toast(copied?'Описание скопировано':'Скопируй текст ниже');
  });
  openExternal('https://t.me/yunusovprod');
});

/* динамичный индикатор таб-бара */
window.moveInd = function(){
  const bar=document.getElementById('tabs'), ind=document.getElementById('tabind');
  if(!bar||!ind) return;
  const b=bar.querySelector('button.on'); if(!b) return;
  const br=b.getBoundingClientRect(), wr=bar.getBoundingClientRect();
  if(wr.width===0) return;
  const cx=br.left-wr.left+br.width/2;
  ind.style.transform=`translateX(${cx-26}px)`;
  bar.style.setProperty('--nx', ((cx/wr.width)*100).toFixed(2)+'%');
  const svg=b.querySelector('svg');
  if(svg) ind.innerHTML=svg.outerHTML;
};
setTimeout(moveInd, 60);
window.addEventListener('resize', moveInd);
