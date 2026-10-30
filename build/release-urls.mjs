// Stamp the complete local module graph, not just main.js. Imported modules do
// not inherit the entry point's query string in browser module caches.
export function releaseURL(path,release){
 const url=new URL(path,'https://pnt.invalid/');
 url.searchParams.set('release',release);
 return path.split(/[?#]/)[0]+url.search+url.hash;
}
export function versionModule(source,release){
 return source.replace(/(\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])(\.{1,2}\/[^'"\r\n]+\.m?js(?:[?#][^'"\r\n]*)?)\2/g,
  (_,prefix,quote,path)=>prefix+quote+releaseURL(path,release)+quote);
}
export function versionHTML(source,release){
 return source.replace(/\b(src|href)=(['"])((?:\.?\.?\/)?(?:src|styles)\/[^'"\s]+\.(?:m?js|css)(?:[?#][^'"\s]*)?)\2/g,
  (_,attribute,quote,path)=>attribute+'='+quote+releaseURL(path,release)+quote);
}
