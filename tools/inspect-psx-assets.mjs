import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const report={};
for(const name of ['thief','police','idle','run','mall-slice']){
  const b=readFileSync(`assets/psx/${name}.glb`);
  if(b.readUInt32LE(0)!==0x46546c67)throw new Error('Invalid GLB '+name);
  const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
  report[name]={bytes:b.length,nodes:j.nodes?.length,meshes:j.meshes?.length,triangles:j.meshes?.reduce((n,m)=>n+m.primitives.reduce((p,x)=>p+(x.indices!==undefined?j.accessors[x.indices].count:j.accessors[x.attributes.POSITION].count)/3,0),0),animations:j.animations?.map(a=>({name:a.name,targets:a.channels.slice(0,3).map(c=>j.nodes[c.target.node].name)})),sampleNodes:j.nodes?.slice(0,6).map(n=>n.name),extensions:j.extensionsRequired};
}
mkdirSync('.local',{recursive:true});writeFileSync('.local/asset-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
