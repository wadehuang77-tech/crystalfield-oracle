import { useEffect,useRef,useState } from 'react';
import { useLocation } from 'react-router-dom';
import { authApi } from '../lib/api';
interface FacebookAPI {
  init(options:{appId:string;version:string;cookie:boolean;xfbml:boolean}):void;
  login(callback:(response:{authResponse?:{accessToken?:string}})=>void,options:{scope:string}):void;
}
declare global {interface Window {FB?:FacebookAPI}}
let sdk:Promise<void>|null=null;
function loadSdk(en:boolean){
  if(window.FB)return Promise.resolve();
  if(!sdk)sdk=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');script.src=`https://connect.facebook.net/${en?'en_US':'zh_TW'}/sdk.js`;script.async=true;script.defer=true;
    script.onload=()=>window.FB?resolve():reject(new Error('SDK unavailable'));script.onerror=()=>reject(new Error('SDK unavailable'));document.head.appendChild(script);
  }).catch(error=>{sdk=null;throw error;});
  return sdk;
}
export function FacebookSignInButton({onCredential}:{onCredential:(accessToken:string,csrf:string)=>Promise<void>}){
  const en=useLocation().pathname.startsWith('/en/'),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const csrf=useRef(''),callback=useRef(onCredential);callback.current=onCredential;
  useEffect(()=>{let active=true;setReady(false);setMessage('');
    void authApi.facebookConfig().then(async config=>{
      if(!active)return;
      if(!config.enabled||!config.app_id||!config.version||!config.csrf_token){setMessage(en?'Facebook sign-in is not enabled yet.':'Facebook 登入尚未啟用');return;}
      await loadSdk(en);if(!active)return;
      window.FB!.init({appId:config.app_id,version:config.version,cookie:false,xfbml:false});csrf.current=config.csrf_token;setReady(true);
    }).catch(()=>{if(active)setMessage(en?'Facebook sign-in is temporarily unavailable.':'Facebook 登入服務暫時無法使用');});
    return()=>{active=false;};
  },[en]);
  function login(){
    if(!ready||busy||!window.FB)return;setBusy(true);setMessage('');
    // Invoke synchronously from the click so browsers can open the provider popup.
    try{window.FB.login(response=>{
      const token=response.authResponse?.accessToken;
      if(!token){setBusy(false);setMessage(en?'Sign-in was cancelled. You can try again.':'已取消登入，可以重新嘗試。');return;}
      void callback.current(token,csrf.current).catch(()=>setMessage(en?'Facebook sign-in failed. Check the message below.':'Facebook 登入未完成，請查看下方提示。')).finally(()=>setBusy(false));
    },{scope:'public_profile,email'});}catch{setBusy(false);setMessage(en?'Could not open Facebook sign-in. Please retry.':'無法開啟 Facebook 登入，請重試。');}
  }
  return <div className="space-y-2"><button type="button" disabled={!ready||busy} onClick={login} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#1877f2] px-4 py-3 text-base font-semibold text-white hover:bg-[#1464cc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-500"><span aria-hidden="true" className="font-sans text-2xl font-bold">f</span>{busy?(en?'Signing in…':'登入中…'):'Facebook'}</button>{message&&<p role="status" className="text-sm leading-6 text-slate-600">{message}</p>}</div>;
}
