const fs=require('fs'),z=require('zlib');
const b=fs.readFileSync(process.argv[2]);
const s=b.toString('latin1');
const re=/stream\r?\n([\s\S]*?)\r?\nendstream/g;let m,i=0;
while((m=re.exec(s))){try{const t=z.inflateSync(Buffer.from(m[1],'latin1')).toString('latin1');
  const ops=t.match(/\[(.*?)\]\s*TJ|\((.*?)\)\s*Tj/gs)||[];
  for(const o of ops) console.log(o.replace(/<([0-9A-Fa-f]+)>/g,(x,h)=>{let r='';for(let j=0;j<h.length;j+=4)r+=String.fromCharCode(parseInt(h.slice(j,j+4),16)||0);return '['+r+']'}).slice(0,200));
}catch(e){}}
