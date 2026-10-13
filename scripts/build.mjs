import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist', { recursive:true });
for (const file of ['index.html','styles.css','panel-layout.css','src','vendor','MUSIC-LICENSE.md']) await cp(file, `dist/${file}`, {recursive:true});
console.log('Built rooftop journal in dist/');
