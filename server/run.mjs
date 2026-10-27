import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:new URL('../vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(specifier,context);}});
const {createGameServer}=await import('./app.mjs');
const game=await createGameServer();const port=Number(process.env.PORT||2567);
await game.listen(port,'0.0.0.0');console.log(`PNT multiplayer listening on port ${port}`);
