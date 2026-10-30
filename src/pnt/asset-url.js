// A release-stamped module must request matching textures, even if an older
// texture URL is still fresh in the browser's cache.
export function assetURL(path,base){
 const url=new URL(path,base),release=new URL(base).searchParams.get('release');
 if(release)url.searchParams.set('release',release);
 return url.href;
}
