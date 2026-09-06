/* YASHIRIN core: данные и чистые функции. Без DOM, чтобы тестировать в Node. */
(function(root){'use strict';

/* Настройки. metrikaId: номер счётчика Яндекс Метрики. null = аналитика выключена. */
const CONFIG={
  siteUrl:'https://yashirin.netlify.app/',
  metrikaId:null,
  telegram:'https://t.me/yunusovprod',
  instagram:'https://www.instagram.com/uzb.yashirin/',
  dataDate:'сентябрь 2026'
};

/* Категории с запасом под лонглист. Фильтр показывается только там, где есть места. */
const CATEGORIES={
  gory:{name:'Горы',color:'lime'},
  voda:{name:'У воды',color:'cyan'},
  eda:{name:'Еда',color:'red'},
  strannoe:{name:'Необычное',color:'amber'},
  gorod:{name:'Город',color:'soft'}
};

const places=[
{
  id:'metallurg',
  name:'Зона отдыха «Металлург»',
  short:'«Металлург»',
  category:'voda',
  location:'Чарвак, Бостанлыкский район',
  tagline:'берег Чарвака, 1275 м над морем',
  image:'assets/metallurg.jpg',
  alt:'Бирюзовая вода Чарвака, горы и зелёный берег у зоны отдыха «Металлург»',
  lat:41.612463, lon:70.000463,
  km:95, drive:'1,5–2 ч', walk:'не нужно', season:'май–сентябрь пляж, виды весь год',
  summary:'Панорама всей чаши Чарвака и отрогов Тянь-Шаня с берега на высоте 1275 м.',
  description:'Зона отдыха на берегу Чарвакского водохранилища, в Угам-Чаткальской заповедной зоне. Территория около 12 гектаров: пляж с пирсом, открытый летний бассейн, беседки под деревьями и открытый вид на воду и хребты.',
  reason:'Ради вида. С этого берега водохранилище видно целиком, а за ним встают горы. Спокойный формат для семьи или компании, когда хочется к воде без долгой дороги и без палаточного быта.',
  facts:[
    ['Как добраться','На машине из Ташкента около 95 км, 1,5–2 ч, асфальт до самого Чарвака. Без машины: такси или трансфер от Газалкента, уточняйте на месте.'],
    ['Формат','Зона отдыха: пляж, бассейн, беседки. Подходит семьям и компаниям.'],
    ['Вход','Платный. Ориентир 50–100 тыс сум с человека, в сезон бывает выше. Уточняйте перед поездкой.'],
    ['Режим работы','Ориентир: ежедневно 10:00–19:00. Уточняйте перед поездкой.'],
    ['Сезон','Пляж и бассейн с мая по сентябрь. Ради вида можно ехать круглый год.']
  ]
},
{
  id:'chimyon',
  name:'Чимён',
  short:'Чимён',
  category:'gory',
  location:'Предгорья Чимгана, Бостанлыкский район',
  tagline:'серпантин с видом на Большой Чимган',
  image:'assets/chimyon.jpg',
  alt:'Дорога-серпантин среди зелёных склонов, впереди вершина Большого Чимгана',
  lat:41.517232, lon:69.969141,
  km:80, drive:'1,5 ч', walk:'по желанию', season:'весь год',
  summary:'Серпантин выходит прямо на Большой Чимган: фактура гор в полутора часах от города.',
  description:'Горная точка в предгорьях Чимгана. Дорога поднимается серпантином, и на одном из витков вершина Большого Чимгана оказывается прямо перед вами. До точки можно доехать, идти никуда не обязательно.',
  reason:'Ради кадра. Серпантин, склоны и вершина в одном ракурсе, без канатки и толпы. Одна из лучших точек рядом с Ташкентом для фото и видео, в том числе с машиной в кадре.',
  facts:[
    ['Как добраться','На машине из Ташкента около 80 км, 1,5 ч, асфальт. Точка у дороги, парковаться на обочине с площадкой.'],
    ['Формат','Смотровая точка и съёмки. Пешая часть по желанию.'],
    ['Вход','Бесплатно, открытая дорога.'],
    ['Сезон','Весь год. Зимой и после дождей уточняйте состояние дороги.'],
    ['Что взять','Тёплую вещь даже летом: на высоте ветрено.']
  ]
}
];

const key='yashirin.saved.v1';

function route(hash){
  let value;
  try{ value=decodeURIComponent((hash||'#/').replace(/^#/,'')); }catch{ return {view:'not-found'}; }
  const url=value.split('?')[0].replace(/\/$/,'')||'/';
  if(url==='/') return {view:'places'};
  if(['/saved','/about','/feedback','/suggest','/thanks'].includes(url)){
    const q=new URLSearchParams(value.split('?')[1]||'');
    const place=q.get('place');
    return {view:url.slice(1), place:places.some(p=>p.id===place)?place:null};
  }
  const m=/^\/place\/([a-z0-9-]+)$/.exec(url);
  if(m&&places.some(p=>p.id===m[1])) return {view:'place',id:m[1]};
  return {view:'not-found'};
}

function readSaved(storage){
  try{
    const value=JSON.parse(storage.getItem(key)||'[]');
    return new Set(Array.isArray(value)?value.filter(id=>places.some(p=>p.id===id)):[]);
  }catch{ return new Set(); }
}
function writeSaved(storage,saved){
  try{ storage.setItem(key,JSON.stringify([...saved])); return true; }catch{ return false; }
}

function filtered(category,ids){
  return places.filter(p=>(category==='all'||p.category===category)&&(!ids||ids.has(p.id)));
}
/* Категории, в которых есть хотя бы одно место, в порядке объявления. */
function activeCategories(){
  return Object.keys(CATEGORIES).filter(k=>places.some(p=>p.category===k));
}

function mapLinks(p){
  return {
    yandex:`https://yandex.uz/maps/?ll=${p.lon},${p.lat}&z=15&pt=${p.lon},${p.lat},pm2rdm`,
    google:`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`,
    yandexRoute:`https://yandex.uz/maps/?rtext=~${p.lat},${p.lon}`,
    all:'https://yandex.uz/maps/?ll=69.62,41.42&z=9&pt='+places.map(x=>`${x.lon},${x.lat},pm2gnm`).join('~')
  };
}

function placeURL(href,id){
  const u=new URL(href); u.search=''; u.hash=`/place/${id}`; return u.href;
}

/* Тело запроса для Netlify Forms: application/x-www-form-urlencoded с form-name. */
function encodeForm(formName,fields){
  const params=new URLSearchParams();
  params.set('form-name',formName);
  Object.entries(fields).forEach(([k,v])=>{ if(v!==undefined&&v!==null) params.set(k,String(v).trim()); });
  return params.toString();
}

/* Текст для Telegram, если автоматическая отправка не удалась. */
function feedbackText(f){
  const p=places.find(x=>x.id===f.place);
  return `Отзыв о Yashirin\nЧто успел(а): ${f.result}\nМесто: ${p?p.name:'Сайт в целом'}\nВпечатление: ${f.text}${f.contact?`\nСвязь: ${f.contact}`:''}`;
}
function suggestText(f){
  return `Находка для Yashirin\nНазвание: ${f.name}\nГде: ${f.location}\nЧто интересного: ${f.reason}${f.contact?`\nСвязь: ${f.contact}`:''}`;
}

function greeting(hour){
  return hour<5?'Не спится':hour<11?'Доброе утро':hour<17?'Добрый день':'Добрый вечер';
}

root.Yashirin={CONFIG,CATEGORIES,places,key,route,readSaved,writeSaved,filtered,activeCategories,mapLinks,placeURL,encodeForm,feedbackText,suggestText,greeting};
})(typeof window!=='undefined'?window:globalThis);
