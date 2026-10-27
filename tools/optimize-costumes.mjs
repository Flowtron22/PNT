import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(import.meta.url);const sharp=require(process.argv[2]||'sharp');
for(const file of fs.readdirSync('assets/pnt/costumes')){
 const path='assets/pnt/costumes/'+file,b=fs.readFileSync(path),length=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+length)),bin=b.subarray(28+length),images=new Map(j.images?.map(i=>[i.bufferView,i])||[]);const parts=[];let offset=0;
 for(let i=0;i<j.bufferViews.length;i++){
  const view=j.bufferViews[i];let chunk=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  if(images.has(i)){const meta=await sharp(chunk).metadata();if(meta.width>512||meta.height>512)chunk=await sharp(chunk).resize(512,512,{fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer();images.get(i).mimeType='image/png';}
  view.byteOffset=offset;view.byteLength=chunk.length;parts.push(chunk);offset+=chunk.length;const pad=(4-offset%4)%4;if(pad){parts.push(Buffer.alloc(pad));offset+=pad;}
 }
 j.buffers[0].byteLength=offset;const json=Buffer.from(JSON.stringify(j)),padding=Buffer.alloc((4-json.length%4)%4,32),jsonLength=json.length+padding.length,header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonLength+offset,8);header.writeUInt32LE(jsonLength,12);header.writeUInt32LE(0x4e4f534a,16);binaryHeader.writeUInt32LE(offset,0);binaryHeader.writeUInt32LE(0x004e4942,4);const result=Buffer.concat([header,json,padding,binaryHeader,...parts]);fs.writeFileSync(path,result);console.log(file,b.length,'->',result.length);
}
