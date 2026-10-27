// Rebuild the small web copies of the existing Unreal UI artwork.
import {createRequire} from 'node:module';
import {mkdirSync,copyFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
if(!process.argv[2])throw new Error('Pass the PSXWonderUI Resources directory, then an optional sharp module path.');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),resources=resolve(process.argv[2]);
const sharp=createRequire(import.meta.url)(process.argv[3]||'sharp');
mkdirSync(join(root,'assets/pnt/maps'),{recursive:true});mkdirSync(join(root,'assets/pnt/ui'),{recursive:true});
for(const name of ['users','online','lock'])copyFileSync(join(resources,'Icons',name+'.png'),join(root,'assets/pnt/ui',name+'.png'));
for(const name of ['MALL','SUNKEN','ICEBERG'])await sharp(join(resources,'Maps',name+'.png')).resize(960,540,{fit:'cover'}).webp({quality:82}).toFile(join(root,'assets/pnt/maps',name.toLowerCase()+'.webp'));
