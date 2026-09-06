/* Сборка: проверка синтаксиса JS и копирование статических файлов в dist/. */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
const skip=new Set(['dist','node_modules','scripts','tests','package.json','package-lock.json','.gitignore']);
for(const f of ['core.js','app.js']) execFileSync(process.execPath,['--check',path.join(root,f)]);
fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
for(const entry of fs.readdirSync(root)){
  if(skip.has(entry)) continue;
  fs.cpSync(path.join(root,entry),path.join(out,entry),{recursive:true});
}
console.log('Built static website in dist');
