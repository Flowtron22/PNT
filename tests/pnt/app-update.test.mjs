import test from 'node:test';
import assert from 'node:assert/strict';
import {newerRelease,createReleaseChecker} from '../../src/pnt/app-update.js';

test('only valid newer releases offer an update, including numeric patch ordering',()=>{
 assert.equal(newerRelease('0.9.100','0.9.84'),true);
 for(const value of ['0.9.84','0.9.83','invalid',null,'<script>','0.9.85-beta'])assert.equal(newerRelease(value,'0.9.84'),false);
 assert.equal(newerRelease('1.0.0','0.9.84'),true);
});
test('release checks bypass caches and tolerate offline, missing and malformed endpoints',async()=>{
 let options;
 const check=createReleaseChecker('0.9.84',{fetcher:async(url,opts)=>{assert.equal(url,'/release.json');options=opts;return {ok:true,json:async()=>({version:'0.9.85'})};}});
 assert.equal(await check(),'0.9.85');assert.equal(options.cache,'no-store');assert.ok(options.signal);
 for(const fetcher of [async()=>{throw Error('offline');},async()=>({ok:false}),async()=>({ok:true,json:async()=>{throw Error('bad JSON');}}),async()=>({ok:true,json:async()=>({version:'0.9.83'})})])assert.equal(await createReleaseChecker('0.9.84',{fetcher})(),null);
});
test('resume events cannot create overlapping release requests and checks recover after completion',async()=>{
 let resolve,calls=0;const check=createReleaseChecker('0.9.84',{fetcher:()=>{calls++;return new Promise(r=>{resolve=r;});}});
 const first=check();assert.equal(await check(),null);assert.equal(calls,1);
 resolve({ok:true,json:async()=>({version:'0.9.85'})});assert.equal(await first,'0.9.85');
 const next=check();assert.equal(calls,2);resolve({ok:false});assert.equal(await next,null);
});
