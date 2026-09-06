const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../core.js');const Y=globalThis.Yashirin;
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('every place can be opened from a shared URL and refreshed',()=>{
  for(const p of Y.places){
    const url=Y.placeURL('https://example.com/?utm_source=test#/saved',p.id);
    assert.equal(new URL(url).search,'');
    assert.deepEqual(Y.route(new URL(url).hash),{view:'place',id:p.id});
  }
});
test('malformed and unknown links render a recoverable not-found view',()=>{
  for(const hash of ['#/place/nope','#/%E0%A4%A','#/place/<script>','#/bad']) assert.equal(Y.route(hash).view,'not-found');
  assert.equal(Y.route('').view,'places');
  assert.equal(Y.route('#/thanks').view,'thanks');
});
test('feedback carries only an existing place',()=>{
  assert.equal(Y.route('#/feedback?place=chimyon').place,'chimyon');
  assert.equal(Y.route('#/feedback?place=fake').place,null);
});
test('saved places survive reload and remove stale ids',()=>{
  let raw;const store={getItem:()=>raw,setItem:(k,v)=>{raw=v;}};
  assert.equal(Y.writeSaved(store,new Set(['chimyon'])),true);
  assert.deepEqual([...Y.readSaved(store)],['chimyon']);
  raw='["chimyon","fake","chimyon",null]';
  assert.deepEqual([...Y.readSaved(store)],['chimyon']);
});
test('blocked storage and damaged data do not prevent reading the site',()=>{
  assert.deepEqual([...Y.readSaved(null)],[]);
  assert.deepEqual([...Y.readSaved({getItem:()=>'{bad'})],[]);
  assert.equal(Y.writeSaved(null,new Set()),false);
});
test('categories: filters only for categories that have places',()=>{
  assert.equal(Y.filtered('all').length,Y.places.length);
  for(const p of Y.places) assert.ok(Y.CATEGORIES[p.category],`unknown category ${p.category}`);
  const active=Y.activeCategories();
  assert.deepEqual(active.sort(),[...new Set(Y.places.map(p=>p.category))].sort());
  assert.deepEqual(Y.filtered('all',new Set()),[]);
  assert.deepEqual(Y.filtered('eda'),[]);
});
test('every place has the practical fields a reader needs',()=>{
  for(const p of Y.places){
    for(const f of ['id','name','category','location','tagline','image','alt','summary','description','reason','drive','season']) assert.ok(p[f],`${p.id} missing ${f}`);
    assert.ok(Number.isFinite(p.km)&&p.km>0,`${p.id} km`);
    assert.ok(Number.isFinite(p.lat)&&Number.isFinite(p.lon),`${p.id} coords`);
    assert.ok(p.facts.length>=3,`${p.id} facts`);
    assert.ok(fs.existsSync(path.join(root,p.image)),`${p.id} image file`);
  }
  assert.equal(new Set(Y.places.map(p=>p.id)).size,Y.places.length);
});
test('map links preserve latitude and longitude in each provider format',()=>{
  for(const p of Y.places){
    const m=Y.mapLinks(p);
    assert.equal(new URL(m.google).searchParams.get('query'),`${p.lat},${p.lon}`);
    assert.equal(new URL(m.yandex).searchParams.get('ll'),`${p.lon},${p.lat}`);
    assert.ok(m.yandexRoute.includes(`${p.lat},${p.lon}`));
    for(const u of Object.values(m)) assert.equal(new URL(u).protocol,'https:');
  }
});
test('netlify form body carries form-name and trimmed fields',()=>{
  const body=Y.encodeForm('feedback',{result:' Планирую поехать ',text:'ok',contact:'',skip:undefined});
  const q=new URLSearchParams(body);
  assert.equal(q.get('form-name'),'feedback');
  assert.equal(q.get('result'),'Планирую поехать');
  assert.equal(q.get('contact'),'');
  assert.equal(q.has('skip'),false);
  assert.match(Y.feedbackText({result:'x',place:'chimyon',text:'y',contact:'@me'}),/Чимён[\s\S]*@me/);
  assert.match(Y.suggestText({name:'a',location:'b',reason:'c',contact:''}),/Находка/);
});
test('published content has no old discounts, old Instagram or Google Fonts',()=>{
  const html=read('index.html'),css=read('app.css'),js=read('app.js')+read('core.js');
  for(const s of [html,css,js]) assert.doesNotMatch(s,/YASHIRIN10|Rent Motors|travelguide2711|fonts\.googleapis|fonts\.gstatic/);
  assert.match(html,/instagram\.com\/uzb\.yashirin/);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'duplicate ids');
  for(const [,id] of js.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.includes(id),`missing element ${id}`);
});
test('forms are wired to Netlify Forms and the CSP allows them',()=>{
  const html=read('index.html'),headers=read('_headers');
  for(const name of ['feedback','suggest']){
    const form=new RegExp(`<form[^>]*name="${name}"[^>]*data-netlify="true"[^>]*>`).exec(html);
    assert.ok(form,`form ${name}`);
    assert.match(html,new RegExp(`name="form-name" value="${name}"`));
  }
  assert.match(html,/data-netlify-honeypot="bot-field"/);
  assert.match(headers,/form-action 'self'/);
  assert.match(headers,/font-src 'self'/);
  assert.match(headers,/script-src 'self' https:\/\/mc\.yandex\.ru/);
});
test('sharing and installing: og image, manifest, icons, fonts exist',()=>{
  const html=read('index.html');
  assert.match(html,/property="og:image" content="https:\/\/yashirin\.netlify\.app\/assets\/og\.jpg"/);
  assert.match(html,/rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html,/<h1/);
  for(const f of ['assets/og.jpg','assets/icon-192.png','assets/icon-512.png','manifest.webmanifest','robots.txt','sitemap.xml']) assert.ok(fs.existsSync(path.join(root,f)),`missing ${f}`);
  const css=read('app.css');
  for(const [,font] of css.matchAll(/url\((assets\/fonts\/[^)]+)\)/g)) assert.ok(fs.existsSync(path.join(root,font)),`missing ${font}`);
});
test('analytics is off until a Metrika id is configured',()=>{
  assert.equal(Y.CONFIG.metrikaId,null);
  assert.match(read('app.js'),/mc\.yandex\.ru\/metrika\/tag\.js/);
});
