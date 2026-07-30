import{r as y,u as dr,d as ur,e as hr,f as fr,j as o,b as Tt,U as pr,L as mr,C as gr,t as St,h as Ct}from"./index-CTbqIzJ4-1785395055700.js";import{i as yr,u as rn,M as _r,m as br,a as wr,c as Ir,f as vr,b as We,d as m}from"./proxy-BgUGIIFV-1785395055700.js";import{A as Z}from"./index-C4bWECN--1785395055700.js";import{E as Er}from"./eye-B_5fv3HD-1785395055700.js";import{E as Tr}from"./eye-off-CIMzFsTb-1785395055700.js";import{C as Sr}from"./chevron-down-Dg2qHaKX-1785395055700.js";import{A as Cr}from"./arrow-right-DZZ3vMmV-1785395055700.js";function xr(...n){const e=!Array.isArray(n[0]),t=e?0:-1,r=n[0+t],s=n[1+t],i=n[2+t],a=n[3+t],l=yr(s,i,a);return e?l(r):l}function Ze(n){const e=rn(()=>br(n)),{isStatic:t}=y.useContext(_r);if(t){const[,r]=y.useState(n);y.useEffect(()=>e.on("change",r),[])}return e}function sn(n,e){const t=Ze(e()),r=()=>t.set(e());return r(),wr(()=>{const s=()=>vr.preRender(r,!1,!0),i=n.map(a=>a.on("change",s));return()=>{i.forEach(a=>a()),Ir(r)}}),t}function Ar(n){We.current=[],n();const e=sn(We.current,n);return We.current=void 0,e}function xt(n,e,t,r){if(typeof n=="function")return Ar(n);const s=typeof e=="function"?e:xr(e,t,r);return Array.isArray(n)?At(n,s):At([n],([i])=>s(i))}function At(n,e){const t=rn(()=>[]);return sn(n,()=>{t.length=0;const r=n.length;for(let s=0;s<r;s++)t[s]=n[s].get();return e(t)})}const kr=()=>{};var kt={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const an=function(n){const e=[];let t=0;for(let r=0;r<n.length;r++){let s=n.charCodeAt(r);s<128?e[t++]=s:s<2048?(e[t++]=s>>6|192,e[t++]=s&63|128):(s&64512)===55296&&r+1<n.length&&(n.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(n.charCodeAt(++r)&1023),e[t++]=s>>18|240,e[t++]=s>>12&63|128,e[t++]=s>>6&63|128,e[t++]=s&63|128):(e[t++]=s>>12|224,e[t++]=s>>6&63|128,e[t++]=s&63|128)}return e},Nr=function(n){const e=[];let t=0,r=0;for(;t<n.length;){const s=n[t++];if(s<128)e[r++]=String.fromCharCode(s);else if(s>191&&s<224){const i=n[t++];e[r++]=String.fromCharCode((s&31)<<6|i&63)}else if(s>239&&s<365){const i=n[t++],a=n[t++],l=n[t++],c=((s&7)<<18|(i&63)<<12|(a&63)<<6|l&63)-65536;e[r++]=String.fromCharCode(55296+(c>>10)),e[r++]=String.fromCharCode(56320+(c&1023))}else{const i=n[t++],a=n[t++];e[r++]=String.fromCharCode((s&15)<<12|(i&63)<<6|a&63)}}return e.join("")},on={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<n.length;s+=3){const i=n[s],a=s+1<n.length,l=a?n[s+1]:0,c=s+2<n.length,d=c?n[s+2]:0,f=i>>2,p=(i&3)<<4|l>>4;let u=(l&15)<<2|d>>6,b=d&63;c||(b=64,a||(u=64)),r.push(t[f],t[p],t[u],t[b])}return r.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(an(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):Nr(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<n.length;){const i=t[n.charAt(s++)],l=s<n.length?t[n.charAt(s)]:0;++s;const d=s<n.length?t[n.charAt(s)]:64;++s;const p=s<n.length?t[n.charAt(s)]:64;if(++s,i==null||l==null||d==null||p==null)throw new Pr;const u=i<<2|l>>4;if(r.push(u),d!==64){const b=l<<4&240|d>>2;if(r.push(b),p!==64){const v=d<<6&192|p;r.push(v)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class Pr extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Rr=function(n){const e=an(n);return on.encodeByteArray(e,!0)},cn=function(n){return Rr(n).replace(/\./g,"")},ln=function(n){try{return on.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Or(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Dr=()=>Or().__FIREBASE_DEFAULTS__,Lr=()=>{if(typeof process>"u"||typeof kt>"u")return;const n=kt.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},Mr=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=n&&ln(n[1]);return e&&JSON.parse(e)},ot=()=>{try{return kr()||Dr()||Lr()||Mr()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},Ur=n=>{var e,t;return(t=(e=ot())==null?void 0:e.emulatorHosts)==null?void 0:t[n]},dn=()=>{var n;return(n=ot())==null?void 0:n.config},un=n=>{var e;return(e=ot())==null?void 0:e[`_${n}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jr{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,r))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function De(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Br(n){return(await fetch(n,{credentials:"include"})).ok}const ce={};function Fr(){const n={prod:[],emulator:[]};for(const e of Object.keys(ce))ce[e]?n.emulator.push(e):n.prod.push(e);return n}function $r(n){let e=document.getElementById(n),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",n),t=!0),{created:t,element:e}}let Nt=!1;function Hr(n,e){if(typeof window>"u"||typeof document>"u"||!De(window.location.host)||ce[n]===e||ce[n]||Nt)return;ce[n]=e;function t(u){return`__firebase__banner__${u}`}const r="__firebase__banner",i=Fr().prod.length>0;function a(){const u=document.getElementById(r);u&&u.remove()}function l(u){u.style.display="flex",u.style.background="#7faaf0",u.style.position="fixed",u.style.bottom="5px",u.style.left="5px",u.style.padding=".5em",u.style.borderRadius="5px",u.style.alignItems="center"}function c(u,b){u.setAttribute("width","24"),u.setAttribute("id",b),u.setAttribute("height","24"),u.setAttribute("viewBox","0 0 24 24"),u.setAttribute("fill","none"),u.style.marginLeft="-6px"}function d(){const u=document.createElement("span");return u.style.cursor="pointer",u.style.marginLeft="16px",u.style.fontSize="24px",u.innerHTML=" &times;",u.onclick=()=>{Nt=!0,a()},u}function f(u,b){u.setAttribute("id",b),u.innerText="Learn more",u.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",u.setAttribute("target","__blank"),u.style.paddingLeft="5px",u.style.textDecoration="underline"}function p(){const u=$r(r),b=t("text"),v=document.getElementById(b)||document.createElement("span"),T=t("learnmore"),G=document.getElementById(T)||document.createElement("a"),I=t("preprendIcon"),S=document.getElementById(I)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(u.created){const A=u.element;l(A),f(G,T);const U=d();c(S,I),A.append(S,v,G,U),document.body.appendChild(A)}i?(v.innerText="Preview backend disconnected.",S.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(S.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,v.innerText="Preview backend running in this workspace."),v.setAttribute("id",b)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",p):p()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function E(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function Vr(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(E())}function Wr(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function zr(){const n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function Gr(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function qr(){const n=E();return n.indexOf("MSIE ")>=0||n.indexOf("Trident/")>=0}function Kr(){try{return typeof indexedDB=="object"}catch{return!1}}function Jr(){return new Promise((n,e)=>{try{let t=!0;const r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),t||self.indexedDB.deleteDatabase(r),n(!0)},s.onupgradeneeded=()=>{t=!1},s.onerror=()=>{var i;e(((i=s.error)==null?void 0:i.message)||"")}}catch(t){e(t)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yr="FirebaseError";class z extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name=Yr,Object.setPrototypeOf(this,z.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,fe.prototype.create)}}class fe{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r}create(e,...t){const r=t[0]||{},s=`${this.service}/${e}`,i=this.errors[e],a=i?Xr(i,r):"Error",l=`${this.serviceName}: ${a} (${s}).`;return new z(s,l,r)}}function Xr(n,e){return n.replace(Zr,(t,r)=>{const s=e[r];return s!=null?String(s):`<${r}?>`})}const Zr=/\{\$([^}]+)}/g;function Qr(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function re(n,e){if(n===e)return!0;const t=Object.keys(n),r=Object.keys(e);for(const s of t){if(!r.includes(s))return!1;const i=n[s],a=e[s];if(Pt(i)&&Pt(a)){if(!re(i,a))return!1}else if(i!==a)return!1}for(const s of r)if(!t.includes(s))return!1;return!0}function Pt(n){return n!==null&&typeof n=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pe(n){const e=[];for(const[t,r]of Object.entries(n))Array.isArray(r)?r.forEach(s=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(s))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function es(n,e){const t=new ts(n,e);return t.subscribe.bind(t)}class ts{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,r){let s;if(e===void 0&&t===void 0&&r===void 0)throw new Error("Missing Observer.");ns(e,["next","error","complete"])?s=e:s={next:e,error:t,complete:r},s.next===void 0&&(s.next=ze),s.error===void 0&&(s.error=ze),s.complete===void 0&&(s.complete=ze);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?s.error(this.finalError):s.complete()}catch{}}),this.observers.push(s),i}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function ns(n,e){if(typeof n!="object"||n===null)return!1;for(const t of e)if(t in n&&typeof n[t]=="function")return!0;return!1}function ze(){}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ae(n){return n&&n._delegate?n._delegate:n}class se{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const q="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rs{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const r=new jr;if(this.instancesDeferred.set(t,r),this.isInitialized(t)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:t});s&&r.resolve(s)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),r=(e==null?void 0:e.optional)??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(s){if(r)return null;throw s}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(is(e))try{this.getOrInitializeService({instanceIdentifier:q})}catch{}for(const[t,r]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(t);try{const i=this.getOrInitializeService({instanceIdentifier:s});r.resolve(i)}catch{}}}}clearInstance(e=q){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=q){return this.instances.has(e)}getOptions(e=q){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:r,options:t});for(const[i,a]of this.instancesDeferred.entries()){const l=this.normalizeInstanceIdentifier(i);r===l&&a.resolve(s)}return s}onInit(e,t){const r=this.normalizeInstanceIdentifier(t),s=this.onInitCallbacks.get(r)??new Set;s.add(e),this.onInitCallbacks.set(r,s);const i=this.instances.get(r);return i&&e(i,r),()=>{s.delete(e)}}invokeOnInitCallbacks(e,t){const r=this.onInitCallbacks.get(t);if(r)for(const s of r)try{s(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:ss(e),options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=q){return this.component?this.component.multipleInstances?e:q:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function ss(n){return n===q?void 0:n}function is(n){return n.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class as{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new rs(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var g;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(g||(g={}));const os={debug:g.DEBUG,verbose:g.VERBOSE,info:g.INFO,warn:g.WARN,error:g.ERROR,silent:g.SILENT},cs=g.INFO,ls={[g.DEBUG]:"log",[g.VERBOSE]:"log",[g.INFO]:"info",[g.WARN]:"warn",[g.ERROR]:"error"},ds=(n,e,...t)=>{if(e<n.logLevel)return;const r=new Date().toISOString(),s=ls[e];if(s)console[s](`[${r}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class hn{constructor(e){this.name=e,this._logLevel=cs,this._logHandler=ds,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in g))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?os[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,g.DEBUG,...e),this._logHandler(this,g.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,g.VERBOSE,...e),this._logHandler(this,g.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,g.INFO,...e),this._logHandler(this,g.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,g.WARN,...e),this._logHandler(this,g.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,g.ERROR,...e),this._logHandler(this,g.ERROR,...e)}}const us=(n,e)=>e.some(t=>n instanceof t);let Rt,Ot;function hs(){return Rt||(Rt=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function fs(){return Ot||(Ot=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const fn=new WeakMap,Qe=new WeakMap,pn=new WeakMap,Ge=new WeakMap,ct=new WeakMap;function ps(n){const e=new Promise((t,r)=>{const s=()=>{n.removeEventListener("success",i),n.removeEventListener("error",a)},i=()=>{t(V(n.result)),s()},a=()=>{r(n.error),s()};n.addEventListener("success",i),n.addEventListener("error",a)});return e.then(t=>{t instanceof IDBCursor&&fn.set(t,n)}).catch(()=>{}),ct.set(e,n),e}function ms(n){if(Qe.has(n))return;const e=new Promise((t,r)=>{const s=()=>{n.removeEventListener("complete",i),n.removeEventListener("error",a),n.removeEventListener("abort",a)},i=()=>{t(),s()},a=()=>{r(n.error||new DOMException("AbortError","AbortError")),s()};n.addEventListener("complete",i),n.addEventListener("error",a),n.addEventListener("abort",a)});Qe.set(n,e)}let et={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return Qe.get(n);if(e==="objectStoreNames")return n.objectStoreNames||pn.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return V(n[e])},set(n,e,t){return n[e]=t,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function gs(n){et=n(et)}function ys(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const r=n.call(qe(this),e,...t);return pn.set(r,e.sort?e.sort():[e]),V(r)}:fs().includes(n)?function(...e){return n.apply(qe(this),e),V(fn.get(this))}:function(...e){return V(n.apply(qe(this),e))}}function _s(n){return typeof n=="function"?ys(n):(n instanceof IDBTransaction&&ms(n),us(n,hs())?new Proxy(n,et):n)}function V(n){if(n instanceof IDBRequest)return ps(n);if(Ge.has(n))return Ge.get(n);const e=_s(n);return e!==n&&(Ge.set(n,e),ct.set(e,n)),e}const qe=n=>ct.get(n);function bs(n,e,{blocked:t,upgrade:r,blocking:s,terminated:i}={}){const a=indexedDB.open(n,e),l=V(a);return r&&a.addEventListener("upgradeneeded",c=>{r(V(a.result),c.oldVersion,c.newVersion,V(a.transaction),c)}),t&&a.addEventListener("blocked",c=>t(c.oldVersion,c.newVersion,c)),l.then(c=>{i&&c.addEventListener("close",()=>i()),s&&c.addEventListener("versionchange",d=>s(d.oldVersion,d.newVersion,d))}).catch(()=>{}),l}const ws=["get","getKey","getAll","getAllKeys","count"],Is=["put","add","delete","clear"],Ke=new Map;function Dt(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(Ke.get(e))return Ke.get(e);const t=e.replace(/FromIndex$/,""),r=e!==t,s=Is.includes(t);if(!(t in(r?IDBIndex:IDBObjectStore).prototype)||!(s||ws.includes(t)))return;const i=async function(a,...l){const c=this.transaction(a,s?"readwrite":"readonly");let d=c.store;return r&&(d=d.index(l.shift())),(await Promise.all([d[t](...l),s&&c.done]))[0]};return Ke.set(e,i),i}gs(n=>({...n,get:(e,t,r)=>Dt(e,t)||n.get(e,t,r),has:(e,t)=>!!Dt(e,t)||n.has(e,t)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vs{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(Es(t)){const r=t.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(t=>t).join(" ")}}function Es(n){const e=n.getComponent();return(e==null?void 0:e.type)==="VERSION"}const tt="@firebase/app",Lt="0.14.2";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const L=new hn("@firebase/app"),Ts="@firebase/app-compat",Ss="@firebase/analytics-compat",Cs="@firebase/analytics",xs="@firebase/app-check-compat",As="@firebase/app-check",ks="@firebase/auth",Ns="@firebase/auth-compat",Ps="@firebase/database",Rs="@firebase/data-connect",Os="@firebase/database-compat",Ds="@firebase/functions",Ls="@firebase/functions-compat",Ms="@firebase/installations",Us="@firebase/installations-compat",js="@firebase/messaging",Bs="@firebase/messaging-compat",Fs="@firebase/performance",$s="@firebase/performance-compat",Hs="@firebase/remote-config",Vs="@firebase/remote-config-compat",Ws="@firebase/storage",zs="@firebase/storage-compat",Gs="@firebase/firestore",qs="@firebase/ai",Ks="@firebase/firestore-compat",Js="firebase",Ys="12.2.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nt="[DEFAULT]",Xs={[tt]:"fire-core",[Ts]:"fire-core-compat",[Cs]:"fire-analytics",[Ss]:"fire-analytics-compat",[As]:"fire-app-check",[xs]:"fire-app-check-compat",[ks]:"fire-auth",[Ns]:"fire-auth-compat",[Ps]:"fire-rtdb",[Rs]:"fire-data-connect",[Os]:"fire-rtdb-compat",[Ds]:"fire-fn",[Ls]:"fire-fn-compat",[Ms]:"fire-iid",[Us]:"fire-iid-compat",[js]:"fire-fcm",[Bs]:"fire-fcm-compat",[Fs]:"fire-perf",[$s]:"fire-perf-compat",[Hs]:"fire-rc",[Vs]:"fire-rc-compat",[Ws]:"fire-gcs",[zs]:"fire-gcs-compat",[Gs]:"fire-fst",[Ks]:"fire-fst-compat",[qs]:"fire-vertex","fire-js":"fire-js",[Js]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xe=new Map,Zs=new Map,rt=new Map;function Mt(n,e){try{n.container.addComponent(e)}catch(t){L.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function de(n){const e=n.name;if(rt.has(e))return L.debug(`There were multiple attempts to register component ${e}.`),!1;rt.set(e,n);for(const t of xe.values())Mt(t,n);for(const t of Zs.values())Mt(t,n);return!0}function mn(n,e){const t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}function k(n){return n==null?!1:n.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Qs={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},W=new fe("app","Firebase",Qs);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ei{constructor(e,t,r){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new se("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw W.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const me=Ys;function gn(n,e={}){let t=n;typeof e!="object"&&(e={name:e});const r={name:nt,automaticDataCollectionEnabled:!0,...e},s=r.name;if(typeof s!="string"||!s)throw W.create("bad-app-name",{appName:String(s)});if(t||(t=dn()),!t)throw W.create("no-options");const i=xe.get(s);if(i){if(re(t,i.options)&&re(r,i.config))return i;throw W.create("duplicate-app",{appName:s})}const a=new as(s);for(const c of rt.values())a.addComponent(c);const l=new ei(t,r,a);return xe.set(s,l),l}function ti(n=nt){const e=xe.get(n);if(!e&&n===nt&&dn())return gn();if(!e)throw W.create("no-app",{appName:n});return e}function Q(n,e,t){let r=Xs[n]??n;t&&(r+=`-${t}`);const s=r.match(/\s|\//),i=e.match(/\s|\//);if(s||i){const a=[`Unable to register library "${r}" with version "${e}":`];s&&a.push(`library name "${r}" contains illegal characters (whitespace or "/")`),s&&i&&a.push("and"),i&&a.push(`version name "${e}" contains illegal characters (whitespace or "/")`),L.warn(a.join(" "));return}de(new se(`${r}-version`,()=>({library:r,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ni="firebase-heartbeat-database",ri=1,ue="firebase-heartbeat-store";let Je=null;function yn(){return Je||(Je=bs(ni,ri,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(ue)}catch(t){console.warn(t)}}}}).catch(n=>{throw W.create("idb-open",{originalErrorMessage:n.message})})),Je}async function si(n){try{const t=(await yn()).transaction(ue),r=await t.objectStore(ue).get(_n(n));return await t.done,r}catch(e){if(e instanceof z)L.warn(e.message);else{const t=W.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});L.warn(t.message)}}}async function Ut(n,e){try{const r=(await yn()).transaction(ue,"readwrite");await r.objectStore(ue).put(e,_n(n)),await r.done}catch(t){if(t instanceof z)L.warn(t.message);else{const r=W.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});L.warn(r.message)}}}function _n(n){return`${n.name}!${n.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ii=1024,ai=30;class oi{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new li(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,t;try{const s=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),i=jt();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===i||this._heartbeatsCache.heartbeats.some(a=>a.date===i))return;if(this._heartbeatsCache.heartbeats.push({date:i,agent:s}),this._heartbeatsCache.heartbeats.length>ai){const a=di(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(a,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){L.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=jt(),{heartbeatsToSend:r,unsentEntries:s}=ci(this._heartbeatsCache.heartbeats),i=cn(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=t,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),i}catch(t){return L.warn(t),""}}}function jt(){return new Date().toISOString().substring(0,10)}function ci(n,e=ii){const t=[];let r=n.slice();for(const s of n){const i=t.find(a=>a.agent===s.agent);if(i){if(i.dates.push(s.date),Bt(t)>e){i.dates.pop();break}}else if(t.push({agent:s.agent,dates:[s.date]}),Bt(t)>e){t.pop();break}r=r.slice(1)}return{heartbeatsToSend:t,unsentEntries:r}}class li{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Kr()?Jr().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await si(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return Ut(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return Ut(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...e.heartbeats]})}else return}}function Bt(n){return cn(JSON.stringify({version:2,heartbeats:n})).length}function di(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let r=1;r<n.length;r++)n[r].date<t&&(t=n[r].date,e=r);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ui(n){de(new se("platform-logger",e=>new vs(e),"PRIVATE")),de(new se("heartbeat",e=>new oi(e),"PRIVATE")),Q(tt,Lt,n),Q(tt,Lt,"esm2020"),Q("fire-js","")}ui("");var hi="firebase",fi="12.2.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Q(hi,fi,"app");function bn(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const pi=bn,wn=new fe("auth","Firebase",bn());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ae=new hn("@firebase/auth");function mi(n,...e){Ae.logLevel<=g.WARN&&Ae.warn(`Auth (${me}): ${n}`,...e)}function Ee(n,...e){Ae.logLevel<=g.ERROR&&Ae.error(`Auth (${me}): ${n}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function P(n,...e){throw dt(n,...e)}function x(n,...e){return dt(n,...e)}function lt(n,e,t){const r={...pi(),[e]:t};return new fe("auth","Firebase",r).create(e,{appName:n.name})}function J(n){return lt(n,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function gi(n,e,t){const r=t;if(!(e instanceof r))throw r.name!==e.constructor.name&&P(n,"argument-error"),lt(n,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function dt(n,...e){if(typeof n!="string"){const t=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=n.name),n._errorFactory.create(t,...r)}return wn.create(n,...e)}function h(n,e,...t){if(!n)throw dt(e,...t)}function O(n){const e="INTERNAL ASSERTION FAILED: "+n;throw Ee(e),new Error(e)}function M(n,e){n||O(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function st(){var n;return typeof self<"u"&&((n=self.location)==null?void 0:n.href)||""}function yi(){return Ft()==="http:"||Ft()==="https:"}function Ft(){var n;return typeof self<"u"&&((n=self.location)==null?void 0:n.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _i(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(yi()||zr()||"connection"in navigator)?navigator.onLine:!0}function bi(){if(typeof navigator>"u")return null;const n=navigator;return n.languages&&n.languages[0]||n.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ge{constructor(e,t){this.shortDelay=e,this.longDelay=t,M(t>e,"Short delay should be less than long delay!"),this.isMobile=Vr()||Gr()}get(){return _i()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ut(n,e){M(n.emulator,"Emulator should always be set here");const{url:t}=n.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class In{static initialize(e,t,r){this.fetchImpl=e,t&&(this.headersImpl=t),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;O("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;O("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;O("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wi={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ii=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],vi=new ge(3e4,6e4);function ht(n,e){return n.tenantId&&!e.tenantId?{...e,tenantId:n.tenantId}:e}async function oe(n,e,t,r,s={}){return vn(n,s,async()=>{let i={},a={};r&&(e==="GET"?a=r:i={body:JSON.stringify(r)});const l=pe({key:n.config.apiKey,...a}).slice(1),c=await n._getAdditionalHeaders();c["Content-Type"]="application/json",n.languageCode&&(c["X-Firebase-Locale"]=n.languageCode);const d={method:e,headers:c,...i};return Wr()||(d.referrerPolicy="no-referrer"),n.emulatorConfig&&De(n.emulatorConfig.host)&&(d.credentials="include"),In.fetch()(await En(n,n.config.apiHost,t,l),d)})}async function vn(n,e,t){n._canInitEmulator=!1;const r={...wi,...e};try{const s=new Ti(n),i=await Promise.race([t(),s.promise]);s.clearNetworkTimeout();const a=await i.json();if("needConfirmation"in a)throw ve(n,"account-exists-with-different-credential",a);if(i.ok&&!("errorMessage"in a))return a;{const l=i.ok?a.errorMessage:a.error.message,[c,d]=l.split(" : ");if(c==="FEDERATED_USER_ID_ALREADY_LINKED")throw ve(n,"credential-already-in-use",a);if(c==="EMAIL_EXISTS")throw ve(n,"email-already-in-use",a);if(c==="USER_DISABLED")throw ve(n,"user-disabled",a);const f=r[c]||c.toLowerCase().replace(/[_\s]+/g,"-");if(d)throw lt(n,f,d);P(n,f)}}catch(s){if(s instanceof z)throw s;P(n,"network-request-failed",{message:String(s)})}}async function Ei(n,e,t,r,s={}){const i=await oe(n,e,t,r,s);return"mfaPendingCredential"in i&&P(n,"multi-factor-auth-required",{_serverResponse:i}),i}async function En(n,e,t,r){const s=`${e}${t}?${r}`,i=n,a=i.config.emulator?ut(n.config,s):`${n.config.apiScheme}://${s}`;return Ii.includes(t)&&(await i._persistenceManagerAvailable,i._getPersistenceType()==="COOKIE")?i._getPersistence()._getFinalTarget(a).toString():a}class Ti{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,r)=>{this.timer=setTimeout(()=>r(x(this.auth,"network-request-failed")),vi.get())})}}function ve(n,e,t){const r={appName:n.name};t.email&&(r.email=t.email),t.phoneNumber&&(r.phoneNumber=t.phoneNumber);const s=x(n,e,r);return s.customData._tokenResponse=t,s}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Si(n,e){return oe(n,"POST","/v1/accounts:delete",e)}async function ke(n,e){return oe(n,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function le(n){if(n)try{const e=new Date(Number(n));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function Ci(n,e=!1){const t=ae(n),r=await t.getIdToken(e),s=ft(r);h(s&&s.exp&&s.auth_time&&s.iat,t.auth,"internal-error");const i=typeof s.firebase=="object"?s.firebase:void 0,a=i==null?void 0:i.sign_in_provider;return{claims:s,token:r,authTime:le(Ye(s.auth_time)),issuedAtTime:le(Ye(s.iat)),expirationTime:le(Ye(s.exp)),signInProvider:a||null,signInSecondFactor:(i==null?void 0:i.sign_in_second_factor)||null}}function Ye(n){return Number(n)*1e3}function ft(n){const[e,t,r]=n.split(".");if(e===void 0||t===void 0||r===void 0)return Ee("JWT malformed, contained fewer than 3 sections"),null;try{const s=ln(t);return s?JSON.parse(s):(Ee("Failed to decode base64 JWT payload"),null)}catch(s){return Ee("Caught error parsing JWT payload as JSON",s==null?void 0:s.toString()),null}}function $t(n){const e=ft(n);return h(e,"internal-error"),h(typeof e.exp<"u","internal-error"),h(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function he(n,e,t=!1){if(t)return e;try{return await e}catch(r){throw r instanceof z&&xi(r)&&n.auth.currentUser===n&&await n.auth.signOut(),r}}function xi({code:n}){return n==="auth/user-disabled"||n==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ai{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const r=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,r)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class it{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=le(this.lastLoginAt),this.creationTime=le(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ne(n){var p;const e=n.auth,t=await n.getIdToken(),r=await he(n,ke(e,{idToken:t}));h(r==null?void 0:r.users.length,e,"internal-error");const s=r.users[0];n._notifyReloadListener(s);const i=(p=s.providerUserInfo)!=null&&p.length?Tn(s.providerUserInfo):[],a=Ni(n.providerData,i),l=n.isAnonymous,c=!(n.email&&s.passwordHash)&&!(a!=null&&a.length),d=l?c:!1,f={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:a,metadata:new it(s.createdAt,s.lastLoginAt),isAnonymous:d};Object.assign(n,f)}async function ki(n){const e=ae(n);await Ne(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function Ni(n,e){return[...n.filter(r=>!e.some(s=>s.providerId===r.providerId)),...e]}function Tn(n){return n.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Pi(n,e){const t=await vn(n,{},async()=>{const r=pe({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:s,apiKey:i}=n.config,a=await En(n,s,"/v1/token",`key=${i}`),l=await n._getAdditionalHeaders();l["Content-Type"]="application/x-www-form-urlencoded";const c={method:"POST",headers:l,body:r};return n.emulatorConfig&&De(n.emulatorConfig.host)&&(c.credentials="include"),In.fetch()(a,c)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function Ri(n,e){return oe(n,"POST","/v2/accounts:revokeToken",ht(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ee{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){h(e.idToken,"internal-error"),h(typeof e.idToken<"u","internal-error"),h(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):$t(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){h(e.length!==0,"internal-error");const t=$t(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(h(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:r,refreshToken:s,expiresIn:i}=await Pi(e,t);this.updateTokensAndExpiration(r,s,Number(i))}updateTokensAndExpiration(e,t,r){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,t){const{refreshToken:r,accessToken:s,expirationTime:i}=t,a=new ee;return r&&(h(typeof r=="string","internal-error",{appName:e}),a.refreshToken=r),s&&(h(typeof s=="string","internal-error",{appName:e}),a.accessToken=s),i&&(h(typeof i=="number","internal-error",{appName:e}),a.expirationTime=i),a}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new ee,this.toJSON())}_performRefresh(){return O("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function B(n,e){h(typeof n=="string"||typeof n>"u","internal-error",{appName:e})}class C{constructor({uid:e,auth:t,stsTokenManager:r,...s}){this.providerId="firebase",this.proactiveRefresh=new Ai(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new it(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const t=await he(this,this.stsTokenManager.getToken(this.auth,e));return h(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return Ci(this,e)}reload(){return ki(this)}_assign(e){this!==e&&(h(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new C({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){h(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),t&&await Ne(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(k(this.auth.app))return Promise.reject(J(this.auth));const e=await this.getIdToken();return await he(this,Si(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const r=t.displayName??void 0,s=t.email??void 0,i=t.phoneNumber??void 0,a=t.photoURL??void 0,l=t.tenantId??void 0,c=t._redirectEventId??void 0,d=t.createdAt??void 0,f=t.lastLoginAt??void 0,{uid:p,emailVerified:u,isAnonymous:b,providerData:v,stsTokenManager:T}=t;h(p&&T,e,"internal-error");const G=ee.fromJSON(this.name,T);h(typeof p=="string",e,"internal-error"),B(r,e.name),B(s,e.name),h(typeof u=="boolean",e,"internal-error"),h(typeof b=="boolean",e,"internal-error"),B(i,e.name),B(a,e.name),B(l,e.name),B(c,e.name),B(d,e.name),B(f,e.name);const I=new C({uid:p,auth:e,email:s,emailVerified:u,displayName:r,isAnonymous:b,photoURL:a,phoneNumber:i,tenantId:l,stsTokenManager:G,createdAt:d,lastLoginAt:f});return v&&Array.isArray(v)&&(I.providerData=v.map(S=>({...S}))),c&&(I._redirectEventId=c),I}static async _fromIdTokenResponse(e,t,r=!1){const s=new ee;s.updateFromServerResponse(t);const i=new C({uid:t.localId,auth:e,stsTokenManager:s,isAnonymous:r});return await Ne(i),i}static async _fromGetAccountInfoResponse(e,t,r){const s=t.users[0];h(s.localId!==void 0,"internal-error");const i=s.providerUserInfo!==void 0?Tn(s.providerUserInfo):[],a=!(s.email&&s.passwordHash)&&!(i!=null&&i.length),l=new ee;l.updateFromIdToken(r);const c=new C({uid:s.localId,auth:e,stsTokenManager:l,isAnonymous:a}),d={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:i,metadata:new it(s.createdAt,s.lastLoginAt),isAnonymous:!(s.email&&s.passwordHash)&&!(i!=null&&i.length)};return Object.assign(c,d),c}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ht=new Map;function D(n){M(n instanceof Function,"Expected a class definition");let e=Ht.get(n);return e?(M(e instanceof n,"Instance stored in cache mismatched with class"),e):(e=new n,Ht.set(n,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sn{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}Sn.type="NONE";const Vt=Sn;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Te(n,e,t){return`firebase:${n}:${e}:${t}`}class te{constructor(e,t,r){this.persistence=e,this.auth=t,this.userKey=r;const{config:s,name:i}=this.auth;this.fullUserKey=Te(this.userKey,s.apiKey,i),this.fullPersistenceKey=Te("persistence",s.apiKey,i),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await ke(this.auth,{idToken:e}).catch(()=>{});return t?C._fromGetAccountInfoResponse(this.auth,t,e):null}return C._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,r="authUser"){if(!t.length)return new te(D(Vt),e,r);const s=(await Promise.all(t.map(async d=>{if(await d._isAvailable())return d}))).filter(d=>d);let i=s[0]||D(Vt);const a=Te(r,e.config.apiKey,e.name);let l=null;for(const d of t)try{const f=await d._get(a);if(f){let p;if(typeof f=="string"){const u=await ke(e,{idToken:f}).catch(()=>{});if(!u)break;p=await C._fromGetAccountInfoResponse(e,u,f)}else p=C._fromJSON(e,f);d!==i&&(l=p),i=d;break}}catch{}const c=s.filter(d=>d._shouldAllowMigration);return!i._shouldAllowMigration||!c.length?new te(i,e,r):(i=c[0],l&&await i._set(a,l.toJSON()),await Promise.all(t.map(async d=>{if(d!==i)try{await d._remove(a)}catch{}})),new te(i,e,r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wt(n){const e=n.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(kn(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Cn(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Pn(e))return"Blackberry";if(Rn(e))return"Webos";if(xn(e))return"Safari";if((e.includes("chrome/")||An(e))&&!e.includes("edge/"))return"Chrome";if(Nn(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=n.match(t);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function Cn(n=E()){return/firefox\//i.test(n)}function xn(n=E()){const e=n.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function An(n=E()){return/crios\//i.test(n)}function kn(n=E()){return/iemobile/i.test(n)}function Nn(n=E()){return/android/i.test(n)}function Pn(n=E()){return/blackberry/i.test(n)}function Rn(n=E()){return/webos/i.test(n)}function pt(n=E()){return/iphone|ipad|ipod/i.test(n)||/macintosh/i.test(n)&&/mobile/i.test(n)}function Oi(n=E()){var e;return pt(n)&&!!((e=window.navigator)!=null&&e.standalone)}function Di(){return qr()&&document.documentMode===10}function On(n=E()){return pt(n)||Nn(n)||Rn(n)||Pn(n)||/windows phone/i.test(n)||kn(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Dn(n,e=[]){let t;switch(n){case"Browser":t=Wt(E());break;case"Worker":t=`${Wt(E())}-${n}`;break;default:t=n}const r=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${me}/${r}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Li{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const r=i=>new Promise((a,l)=>{try{const c=e(i);a(c)}catch(c){l(c)}});r.onAbort=t,this.queue.push(r);const s=this.queue.length-1;return()=>{this.queue[s]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const r of this.queue)await r(e),r.onAbort&&t.push(r.onAbort)}catch(r){t.reverse();for(const s of t)try{s()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Mi(n,e={}){return oe(n,"GET","/v2/passwordPolicy",ht(n,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ui=6;class ji{constructor(e){var r;const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??Ui,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((r=e.allowedNonAlphanumericCharacters)==null?void 0:r.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const r=this.customStrengthOptions.minPasswordLength,s=this.customStrengthOptions.maxPasswordLength;r&&(t.meetsMinPasswordLength=e.length>=r),s&&(t.meetsMaxPasswordLength=e.length<=s)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let r;for(let s=0;s<e.length;s++)r=e.charAt(s),this.updatePasswordCharacterOptionsStatuses(t,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,t,r,s,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=s)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bi{constructor(e,t,r,s){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=r,this.config=s,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new zt(this),this.idTokenSubscription=new zt(this),this.beforeStateQueue=new Li(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=wn,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=s.sdkClientVersion,this._persistenceManagerAvailable=new Promise(i=>this._resolvePersistenceManagerAvailable=i)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=D(t)),this._initializationPromise=this.queue(async()=>{var r,s,i;if(!this._deleted&&(this.persistenceManager=await te.create(this,e),(r=this._resolvePersistenceManagerAvailable)==null||r.call(this),!this._deleted)){if((s=this._popupRedirectResolver)!=null&&s._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((i=this.currentUser)==null?void 0:i.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await ke(this,{idToken:e}),r=await C._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(r)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var i;if(k(this.app)){const a=this.app.settings.authIdToken;return a?new Promise(l=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(a).then(l,l))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let r=t,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const a=(i=this.redirectUser)==null?void 0:i._redirectEventId,l=r==null?void 0:r._redirectEventId,c=await this.tryRedirectSignIn(e);(!a||a===l)&&(c!=null&&c.user)&&(r=c.user,s=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(r)}catch(a){r=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(a))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return h(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Ne(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=bi()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(k(this.app))return Promise.reject(J(this));const t=e?ae(e):null;return t&&h(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&h(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return k(this.app)?Promise.reject(J(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return k(this.app)?Promise.reject(J(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(D(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await Mi(this),t=new ji(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new fe("auth","Firebase",e())}onAuthStateChanged(e,t,r){return this.registerStateListener(this.authStateSubscription,e,t,r)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,r){return this.registerStateListener(this.idTokenSubscription,e,t,r)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(r.tenantId=this.tenantId),await Ri(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,t){const r=await this.getOrInitRedirectPersistenceManager(t);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&D(e)||this._popupRedirectResolver;h(t,this,"argument-error"),this.redirectPersistenceManager=await te.create(this,[D(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,r;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)==null?void 0:t._redirectEventId)===e?this._currentUser:((r=this.redirectUser)==null?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((t=this.currentUser)==null?void 0:t.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,r,s){if(this._deleted)return()=>{};const i=typeof t=="function"?t:t.next.bind(t);let a=!1;const l=this._isInitialized?Promise.resolve():this._initializationPromise;if(h(l,this,"internal-error"),l.then(()=>{a||i(this.currentUser)}),typeof t=="function"){const c=e.addObserver(t,r,s);return()=>{a=!0,c()}}else{const c=e.addObserver(t);return()=>{a=!0,c()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return h(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=Dn(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var s;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await((s=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:s.getHeartbeatsHeader());t&&(e["X-Firebase-Client"]=t);const r=await this._getAppCheckToken();return r&&(e["X-Firebase-AppCheck"]=r),e}async _getAppCheckToken(){var t;if(k(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:t.getToken());return e!=null&&e.error&&mi(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function Le(n){return ae(n)}class zt{constructor(e){this.auth=e,this.observer=null,this.addObserver=es(t=>this.observer=t)}get next(){return h(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let mt={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function Fi(n){mt=n}function $i(n){return mt.loadJS(n)}function Hi(){return mt.gapiScript}function Vi(n){return`__${n}${Math.floor(Math.random()*1e6)}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wi(n,e){const t=mn(n,"auth");if(t.isInitialized()){const s=t.getImmediate(),i=t.getOptions();if(re(i,e??{}))return s;P(s,"already-initialized")}return t.initialize({options:e})}function zi(n,e){const t=(e==null?void 0:e.persistence)||[],r=(Array.isArray(t)?t:[t]).map(D);e!=null&&e.errorMap&&n._updateErrorMap(e.errorMap),n._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function Gi(n,e,t){const r=Le(n);h(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const s=!!(t!=null&&t.disableWarnings),i=Ln(e),{host:a,port:l}=qi(e),c=l===null?"":`:${l}`,d={url:`${i}//${a}${c}/`},f=Object.freeze({host:a,port:l,protocol:i.replace(":",""),options:Object.freeze({disableWarnings:s})});if(!r._canInitEmulator){h(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),h(re(d,r.config.emulator)&&re(f,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=d,r.emulatorConfig=f,r.settings.appVerificationDisabledForTesting=!0,De(a)?(Br(`${i}//${a}${c}`),Hr("Auth",!0)):Ki()}function Ln(n){const e=n.indexOf(":");return e<0?"":n.substr(0,e+1)}function qi(n){const e=Ln(n),t=/(\/\/)?([^?#/]+)/.exec(n.substr(e.length));if(!t)return{host:"",port:null};const r=t[2].split("@").pop()||"",s=/^(\[[^\]]+\])(:|$)/.exec(r);if(s){const i=s[1];return{host:i,port:Gt(r.substr(i.length+1))}}else{const[i,a]=r.split(":");return{host:i,port:Gt(a)}}}function Gt(n){if(!n)return null;const e=Number(n);return isNaN(e)?null:e}function Ki(){function n(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",n):n())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mn{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return O("not implemented")}_getIdTokenResponse(e){return O("not implemented")}_linkToIdToken(e,t){return O("not implemented")}_getReauthenticationResolver(e){return O("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ne(n,e){return Ei(n,"POST","/v1/accounts:signInWithIdp",ht(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ji="http://localhost";class Y extends Mn{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Y(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):P("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:s,...i}=t;if(!r||!s)return null;const a=new Y(r,s);return a.idToken=i.idToken||void 0,a.accessToken=i.accessToken||void 0,a.secret=i.secret,a.nonce=i.nonce,a.pendingToken=i.pendingToken||null,a}_getIdTokenResponse(e){const t=this.buildRequest();return ne(e,t)}_linkToIdToken(e,t){const r=this.buildRequest();return r.idToken=t,ne(e,r)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,ne(e,t)}buildRequest(){const e={requestUri:Ji,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=pe(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gt{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ye extends gt{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class F extends ye{constructor(){super("facebook.com")}static credential(e){return Y._fromParams({providerId:F.PROVIDER_ID,signInMethod:F.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return F.credentialFromTaggedObject(e)}static credentialFromError(e){return F.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return F.credential(e.oauthAccessToken)}catch{return null}}}F.FACEBOOK_SIGN_IN_METHOD="facebook.com";F.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class R extends ye{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Y._fromParams({providerId:R.PROVIDER_ID,signInMethod:R.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return R.credentialFromTaggedObject(e)}static credentialFromError(e){return R.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:r}=e;if(!t&&!r)return null;try{return R.credential(t,r)}catch{return null}}}R.GOOGLE_SIGN_IN_METHOD="google.com";R.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $ extends ye{constructor(){super("github.com")}static credential(e){return Y._fromParams({providerId:$.PROVIDER_ID,signInMethod:$.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return $.credentialFromTaggedObject(e)}static credentialFromError(e){return $.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return $.credential(e.oauthAccessToken)}catch{return null}}}$.GITHUB_SIGN_IN_METHOD="github.com";$.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class H extends ye{constructor(){super("twitter.com")}static credential(e,t){return Y._fromParams({providerId:H.PROVIDER_ID,signInMethod:H.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return H.credentialFromTaggedObject(e)}static credentialFromError(e){return H.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:r}=e;if(!t||!r)return null;try{return H.credential(t,r)}catch{return null}}}H.TWITTER_SIGN_IN_METHOD="twitter.com";H.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ie{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,r,s=!1){const i=await C._fromIdTokenResponse(e,r,s),a=qt(r);return new ie({user:i,providerId:a,_tokenResponse:r,operationType:t})}static async _forOperation(e,t,r){await e._updateTokensIfNecessary(r,!0);const s=qt(r);return new ie({user:e,providerId:s,_tokenResponse:r,operationType:t})}}function qt(n){return n.providerId?n.providerId:"phoneNumber"in n?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pe extends z{constructor(e,t,r,s){super(t.code,t.message),this.operationType=r,this.user=s,Object.setPrototypeOf(this,Pe.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,t,r,s){return new Pe(e,t,r,s)}}function Un(n,e,t,r){return(e==="reauthenticate"?t._getReauthenticationResolver(n):t._getIdTokenResponse(n)).catch(i=>{throw i.code==="auth/multi-factor-auth-required"?Pe._fromErrorAndOperation(n,i,e,r):i})}async function Yi(n,e,t=!1){const r=await he(n,e._linkToIdToken(n.auth,await n.getIdToken()),t);return ie._forOperation(n,"link",r)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Xi(n,e,t=!1){const{auth:r}=n;if(k(r.app))return Promise.reject(J(r));const s="reauthenticate";try{const i=await he(n,Un(r,s,e,n),t);h(i.idToken,r,"internal-error");const a=ft(i.idToken);h(a,r,"internal-error");const{sub:l}=a;return h(n.uid===l,r,"user-mismatch"),ie._forOperation(n,s,i)}catch(i){throw(i==null?void 0:i.code)==="auth/user-not-found"&&P(r,"user-mismatch"),i}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Zi(n,e,t=!1){if(k(n.app))return Promise.reject(J(n));const r="signIn",s=await Un(n,r,e),i=await ie._fromIdTokenResponse(n,r,s);return t||await n._updateCurrentUser(i.user),i}function Qi(n,e,t,r){return ae(n).onIdTokenChanged(e,t,r)}function ea(n,e,t){return ae(n).beforeAuthStateChanged(e,t)}const Re="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jn{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(Re,"1"),this.storage.removeItem(Re),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ta=1e3,na=10;class Bn extends jn{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=On(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const r=this.storage.getItem(t),s=this.localCache[t];r!==s&&e(t,s,r)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((a,l,c)=>{this.notifyListeners(a,c)});return}const r=e.key;t?this.detachListener():this.stopPolling();const s=()=>{const a=this.storage.getItem(r);!t&&this.localCache[r]===a||this.notifyListeners(r,a)},i=this.storage.getItem(r);Di()&&i!==e.newValue&&e.newValue!==e.oldValue?setTimeout(s,na):s()}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:r}),!0)})},ta)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}Bn.type="LOCAL";const ra=Bn;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fn extends jn{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}Fn.type="SESSION";const $n=Fn;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sa(n){return Promise.all(n.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Me{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(s=>s.isListeningto(e));if(t)return t;const r=new Me(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:r,eventType:s,data:i}=t.data,a=this.handlersMap[s];if(!(a!=null&&a.size))return;t.ports[0].postMessage({status:"ack",eventId:r,eventType:s});const l=Array.from(a).map(async d=>d(t.origin,i)),c=await sa(l);t.ports[0].postMessage({status:"done",eventId:r,eventType:s,response:c})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Me.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yt(n="",e=10){let t="";for(let r=0;r<e;r++)t+=Math.floor(Math.random()*10);return n+t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ia{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,r=50){const s=typeof MessageChannel<"u"?new MessageChannel:null;if(!s)throw new Error("connection_unavailable");let i,a;return new Promise((l,c)=>{const d=yt("",20);s.port1.start();const f=setTimeout(()=>{c(new Error("unsupported_event"))},r);a={messageChannel:s,onMessage(p){const u=p;if(u.data.eventId===d)switch(u.data.status){case"ack":clearTimeout(f),i=setTimeout(()=>{c(new Error("timeout"))},3e3);break;case"done":clearTimeout(i),l(u.data.response);break;default:clearTimeout(f),clearTimeout(i),c(new Error("invalid_response"));break}}},this.handlers.add(a),s.port1.addEventListener("message",a.onMessage),this.target.postMessage({eventType:e,eventId:d,data:t},[s.port2])}).finally(()=>{a&&this.removeMessageHandler(a)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function N(){return window}function aa(n){N().location.href=n}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Hn(){return typeof N().WorkerGlobalScope<"u"&&typeof N().importScripts=="function"}async function oa(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function ca(){var n;return((n=navigator==null?void 0:navigator.serviceWorker)==null?void 0:n.controller)||null}function la(){return Hn()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vn="firebaseLocalStorageDb",da=1,Oe="firebaseLocalStorage",Wn="fbase_key";class _e{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Ue(n,e){return n.transaction([Oe],e?"readwrite":"readonly").objectStore(Oe)}function ua(){const n=indexedDB.deleteDatabase(Vn);return new _e(n).toPromise()}function at(){const n=indexedDB.open(Vn,da);return new Promise((e,t)=>{n.addEventListener("error",()=>{t(n.error)}),n.addEventListener("upgradeneeded",()=>{const r=n.result;try{r.createObjectStore(Oe,{keyPath:Wn})}catch(s){t(s)}}),n.addEventListener("success",async()=>{const r=n.result;r.objectStoreNames.contains(Oe)?e(r):(r.close(),await ua(),e(await at()))})})}async function Kt(n,e,t){const r=Ue(n,!0).put({[Wn]:e,value:t});return new _e(r).toPromise()}async function ha(n,e){const t=Ue(n,!1).get(e),r=await new _e(t).toPromise();return r===void 0?null:r.value}function Jt(n,e){const t=Ue(n,!0).delete(e);return new _e(t).toPromise()}const fa=800,pa=3;class zn{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await at(),this.db)}async _withRetries(e){let t=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(t++>pa)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Hn()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Me._getInstance(la()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var t,r;if(this.activeServiceWorker=await oa(),!this.activeServiceWorker)return;this.sender=new ia(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(t=e[0])!=null&&t.fulfilled&&(r=e[0])!=null&&r.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||ca()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await at();return await Kt(e,Re,"1"),await Jt(e,Re),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(r=>Kt(r,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(r=>ha(r,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Jt(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(s=>{const i=Ue(s,!1).getAll();return new _e(i).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],r=new Set;if(e.length!==0)for(const{fbase_key:s,value:i}of e)r.add(s),JSON.stringify(this.localCache[s])!==JSON.stringify(i)&&(this.notifyListeners(s,i),t.push(s));for(const s of Object.keys(this.localCache))this.localCache[s]&&!r.has(s)&&(this.notifyListeners(s,null),t.push(s));return t}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const s of Array.from(r))s(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),fa)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}zn.type="LOCAL";const ma=zn;new ge(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gn(n,e){return e?D(e):(h(n._popupRedirectResolver,n,"argument-error"),n._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _t extends Mn{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return ne(e,this._buildIdpRequest())}_linkToIdToken(e,t){return ne(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return ne(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function ga(n){return Zi(n.auth,new _t(n),n.bypassAuthState)}function ya(n){const{auth:e,user:t}=n;return h(t,e,"internal-error"),Xi(t,new _t(n),n.bypassAuthState)}async function _a(n){const{auth:e,user:t}=n;return h(t,e,"internal-error"),Yi(t,new _t(n),n.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qn{constructor(e,t,r,s,i=!1){this.auth=e,this.resolver=r,this.user=s,this.bypassAuthState=i,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:r,postBody:s,tenantId:i,error:a,type:l}=e;if(a){this.reject(a);return}const c={auth:this.auth,requestUri:t,sessionId:r,tenantId:i||void 0,postBody:s||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(l)(c))}catch(d){this.reject(d)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return ga;case"linkViaPopup":case"linkViaRedirect":return _a;case"reauthViaPopup":case"reauthViaRedirect":return ya;default:P(this.auth,"internal-error")}}resolve(e){M(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){M(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ba=new ge(2e3,1e4);async function wa(n,e,t){if(k(n.app))return Promise.reject(x(n,"operation-not-supported-in-this-environment"));const r=Le(n);gi(n,e,gt);const s=Gn(r,t);return new K(r,"signInViaPopup",e,s).executeNotNull()}class K extends qn{constructor(e,t,r,s,i){super(e,t,s,i),this.provider=r,this.authWindow=null,this.pollId=null,K.currentPopupAction&&K.currentPopupAction.cancel(),K.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return h(e,this.auth,"internal-error"),e}async onExecution(){M(this.filter.length===1,"Popup operations only handle one event");const e=yt();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(x(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(x(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,K.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,r;if((r=(t=this.authWindow)==null?void 0:t.window)!=null&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(x(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,ba.get())};e()}}K.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ia="pendingRedirect",Se=new Map;class va extends qn{constructor(e,t,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,r),this.eventId=null}async execute(){let e=Se.get(this.auth._key());if(!e){try{const r=await Ea(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(t){e=()=>Promise.reject(t)}Se.set(this.auth._key(),e)}return this.bypassAuthState||Se.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function Ea(n,e){const t=Ca(e),r=Sa(n);if(!await r._isAvailable())return!1;const s=await r._get(t)==="true";return await r._remove(t),s}function Ta(n,e){Se.set(n._key(),e)}function Sa(n){return D(n._redirectPersistence)}function Ca(n){return Te(Ia,n.config.apiKey,n.name)}async function xa(n,e,t=!1){if(k(n.app))return Promise.reject(J(n));const r=Le(n),s=Gn(r,e),a=await new va(r,s,t).execute();return a&&!t&&(delete a.user._redirectEventId,await r._persistUserIfCurrent(a.user),await r._setRedirectUser(null,e)),a}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Aa=10*60*1e3;class ka{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(t=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!Na(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var r;if(e.error&&!Kn(e)){const s=((r=e.error.code)==null?void 0:r.split("auth/")[1])||"internal-error";t.onError(x(this.auth,s))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const r=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=Aa&&this.cachedEventUids.clear(),this.cachedEventUids.has(Yt(e))}saveEventToCache(e){this.cachedEventUids.add(Yt(e)),this.lastProcessedEventTime=Date.now()}}function Yt(n){return[n.type,n.eventId,n.sessionId,n.tenantId].filter(e=>e).join("-")}function Kn({type:n,error:e}){return n==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function Na(n){switch(n.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Kn(n);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Pa(n,e={}){return oe(n,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ra=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,Oa=/^https?/;async function Da(n){if(n.config.emulator)return;const{authorizedDomains:e}=await Pa(n);for(const t of e)try{if(La(t))return}catch{}P(n,"unauthorized-domain")}function La(n){const e=st(),{protocol:t,hostname:r}=new URL(e);if(n.startsWith("chrome-extension://")){const a=new URL(n);return a.hostname===""&&r===""?t==="chrome-extension:"&&n.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&a.hostname===r}if(!Oa.test(t))return!1;if(Ra.test(n))return r===n;const s=n.replace(/\./g,"\\.");return new RegExp("^(.+\\."+s+"|"+s+")$","i").test(r)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ma=new ge(3e4,6e4);function Xt(){const n=N().___jsl;if(n!=null&&n.H){for(const e of Object.keys(n.H))if(n.H[e].r=n.H[e].r||[],n.H[e].L=n.H[e].L||[],n.H[e].r=[...n.H[e].L],n.CP)for(let t=0;t<n.CP.length;t++)n.CP[t]=null}}function Ua(n){return new Promise((e,t)=>{var s,i,a;function r(){Xt(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Xt(),t(x(n,"network-request-failed"))},timeout:Ma.get()})}if((i=(s=N().gapi)==null?void 0:s.iframes)!=null&&i.Iframe)e(gapi.iframes.getContext());else if((a=N().gapi)!=null&&a.load)r();else{const l=Vi("iframefcb");return N()[l]=()=>{gapi.load?r():t(x(n,"network-request-failed"))},$i(`${Hi()}?onload=${l}`).catch(c=>t(c))}}).catch(e=>{throw Ce=null,e})}let Ce=null;function ja(n){return Ce=Ce||Ua(n),Ce}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ba=new ge(5e3,15e3),Fa="__/auth/iframe",$a="emulator/auth/iframe",Ha={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},Va=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function Wa(n){const e=n.config;h(e.authDomain,n,"auth-domain-config-required");const t=e.emulator?ut(e,$a):`https://${n.config.authDomain}/${Fa}`,r={apiKey:e.apiKey,appName:n.name,v:me},s=Va.get(n.config.apiHost);s&&(r.eid=s);const i=n._getFrameworks();return i.length&&(r.fw=i.join(",")),`${t}?${pe(r).slice(1)}`}async function za(n){const e=await ja(n),t=N().gapi;return h(t,n,"internal-error"),e.open({where:document.body,url:Wa(n),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:Ha,dontclear:!0},r=>new Promise(async(s,i)=>{await r.restyle({setHideOnLeave:!1});const a=x(n,"network-request-failed"),l=N().setTimeout(()=>{i(a)},Ba.get());function c(){N().clearTimeout(l),s(r)}r.ping(c).then(c,()=>{i(a)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ga={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},qa=500,Ka=600,Ja="_blank",Ya="http://localhost";class Zt{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function Xa(n,e,t,r=qa,s=Ka){const i=Math.max((window.screen.availHeight-s)/2,0).toString(),a=Math.max((window.screen.availWidth-r)/2,0).toString();let l="";const c={...Ga,width:r.toString(),height:s.toString(),top:i,left:a},d=E().toLowerCase();t&&(l=An(d)?Ja:t),Cn(d)&&(e=e||Ya,c.scrollbars="yes");const f=Object.entries(c).reduce((u,[b,v])=>`${u}${b}=${v},`,"");if(Oi(d)&&l!=="_self")return Za(e||"",l),new Zt(null);const p=window.open(e||"",l,f);h(p,n,"popup-blocked");try{p.focus()}catch{}return new Zt(p)}function Za(n,e){const t=document.createElement("a");t.href=n,t.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(r)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Qa="__/auth/handler",eo="emulator/auth/handler",to=encodeURIComponent("fac");async function Qt(n,e,t,r,s,i){h(n.config.authDomain,n,"auth-domain-config-required"),h(n.config.apiKey,n,"invalid-api-key");const a={apiKey:n.config.apiKey,appName:n.name,authType:t,redirectUrl:r,v:me,eventId:s};if(e instanceof gt){e.setDefaultLanguage(n.languageCode),a.providerId=e.providerId||"",Qr(e.getCustomParameters())||(a.customParameters=JSON.stringify(e.getCustomParameters()));for(const[f,p]of Object.entries({}))a[f]=p}if(e instanceof ye){const f=e.getScopes().filter(p=>p!=="");f.length>0&&(a.scopes=f.join(","))}n.tenantId&&(a.tid=n.tenantId);const l=a;for(const f of Object.keys(l))l[f]===void 0&&delete l[f];const c=await n._getAppCheckToken(),d=c?`#${to}=${encodeURIComponent(c)}`:"";return`${no(n)}?${pe(l).slice(1)}${d}`}function no({config:n}){return n.emulator?ut(n,eo):`https://${n.authDomain}/${Qa}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xe="webStorageSupport";class ro{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=$n,this._completeRedirectFn=xa,this._overrideRedirectResult=Ta}async _openPopup(e,t,r,s){var a;M((a=this.eventManagers[e._key()])==null?void 0:a.manager,"_initialize() not called before _openPopup()");const i=await Qt(e,t,r,st(),s);return Xa(e,i,yt())}async _openRedirect(e,t,r,s){await this._originValidation(e);const i=await Qt(e,t,r,st(),s);return aa(i),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:s,promise:i}=this.eventManagers[t];return s?Promise.resolve(s):(M(i,"If manager is not set, promise should be"),i)}const r=this.initAndGetManager(e);return this.eventManagers[t]={promise:r},r.catch(()=>{delete this.eventManagers[t]}),r}async initAndGetManager(e){const t=await za(e),r=new ka(e);return t.register("authEvent",s=>(h(s==null?void 0:s.authEvent,e,"invalid-auth-event"),{status:r.onEvent(s.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=t,r}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(Xe,{type:Xe},s=>{var a;const i=(a=s==null?void 0:s[0])==null?void 0:a[Xe];i!==void 0&&t(!!i),P(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=Da(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return On()||xn()||pt()}}const so=ro;var en="@firebase/auth",tn="1.11.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class io{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){h(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ao(n){switch(n){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function oo(n){de(new se("auth",(e,{options:t})=>{const r=e.getProvider("app").getImmediate(),s=e.getProvider("heartbeat"),i=e.getProvider("app-check-internal"),{apiKey:a,authDomain:l}=r.options;h(a&&!a.includes(":"),"invalid-api-key",{appName:r.name});const c={apiKey:a,authDomain:l,clientPlatform:n,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Dn(n)},d=new Bi(r,s,i,c);return zi(d,t),d},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,r)=>{e.getProvider("auth-internal").initialize()})),de(new se("auth-internal",e=>{const t=Le(e.getProvider("auth").getImmediate());return(r=>new io(r))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),Q(en,tn,ao(n)),Q(en,tn,"esm2020")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const co=5*60,lo=un("authIdTokenMaxAge")||co;let nn=null;const uo=n=>async e=>{const t=e&&await e.getIdTokenResult(),r=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(r&&r>lo)return;const s=t==null?void 0:t.token;nn!==s&&(nn=s,await fetch(n,{method:s?"POST":"DELETE",headers:s?{Authorization:`Bearer ${s}`}:{}}))};function ho(n=ti()){const e=mn(n,"auth");if(e.isInitialized())return e.getImmediate();const t=Wi(n,{popupRedirectResolver:so,persistence:[ma,ra,$n]}),r=un("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const i=new URL(r,location.origin);if(location.origin===i.origin){const a=uo(i.toString());ea(t,a,()=>a(t.currentUser)),Qi(t,l=>a(l))}}const s=Ur("auth");return s&&Gi(t,`http://${s}`),t}function fo(){var n;return((n=document.getElementsByTagName("head"))==null?void 0:n[0])??document}Fi({loadJS(n){return new Promise((e,t)=>{const r=document.createElement("script");r.setAttribute("src",n),r.onload=e,r.onerror=s=>{const i=x("internal-error");i.customData=s,t(i)},r.type="text/javascript",r.charset="UTF-8",fo().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});oo("Browser");const po={apiKey:"AIzaSyAeAQgJJh3oYpKA3EFOVggYqsyDwivcC-g",authDomain:"pepperwahl-18d42.firebaseapp.com",projectId:"pepperwahl-18d42",storageBucket:"pepperwahl-18d42.firebasestorage.app",messagingSenderId:"759162701457",appId:"1:759162701457:web:680f1cbcb4974583db2130",measurementId:"G-15DYJNQH8K"},mo=gn(po),go=ho(mo),je=new R;je.addScope("email");je.addScope("profile");je.setCustomParameters({prompt:"select_account"});const So=()=>{const n=dr(),[e]=ur(),{login:t,register:r}=hr(),[s,i]=y.useState(e.get("mode")!=="signup");y.useEffect(()=>{fr()},[]);const[a,l]=y.useState(!1),[c,d]=y.useState(""),[f,p]=y.useState(""),[u,b]=y.useState(""),[v,T]=y.useState(!1),[G,I]=y.useState(""),[S,A]=y.useState(null);y.useState(!1);const[U,Jn]=y.useState(!1),[Be,bt]=y.useState(!1),[be,Yn]=y.useState(!0),[we,Xn]=y.useState(!0),[Ie,Zn]=y.useState(!0),[Qn,wt]=y.useState(!1),[It,er]=y.useState(!1),[vt,tr]=y.useState([]),Fe=Ze(0),$e=Ze(0),nr=xt($e,[-300,300],[5,-5]),rr=xt(Fe,[-300,300],[-5,5]),sr=_=>{const w=_.currentTarget.getBoundingClientRect();Fe.set(_.clientX-w.left-w.width/2),$e.set(_.clientY-w.top-w.height/2)},ir=()=>{Fe.set(0),$e.set(0)},ar=async _=>{_.preventDefault(),I(""),T(!0);try{if(s)await t({email:c,password:f}),St("email"),n("/dashboard");else{if(!U){I("Please accept the terms and conditions"),T(!1);return}if(!u.trim()){I("Please enter your name"),T(!1);return}if(f.length<6){I("Password must be at least 6 characters"),T(!1);return}await r({email:c,password:f,name:u,consent:{acceptedTerms:!0,prefEmails:be,prefAnalytics:we,prefPersonalization:Ie,consentDate:new Date().toISOString()},ref_code:Ct()||void 0}),fetch(`${window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:5000":"https://hostslice.onrender.com"}/api/tracking/consent-log`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_email:c,user_name:u,documents_accepted:["terms_of_use_v1.2","privacy_policy_v1.5"],consent_method:"checkbox_signup"})}).catch(()=>{}),wt(!0)}}catch(w){I(w.message||(s?"Login failed":"Registration failed"))}finally{T(!1)}},or=async()=>{var _;try{T(!0),I("");const w=await wa(go,je),cr=await w.user.getIdToken(),lr=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:5000":"https://hostslice.onrender.com",He=await fetch(`${lr}/api/auth/firebase-login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:cr,email:w.user.email,name:w.user.displayName||((_=w.user.email)==null?void 0:_.split("@")[0]),provider:"google",ref_code:Ct()||void 0})});if(He.ok){const j=await He.json();if(localStorage.setItem("auth_token",j.token),localStorage.setItem("user_data",JSON.stringify(j.user)),St("google"),j.isNewUser){localStorage.setItem("welcome_new_user",j.user.name||j.user.email),er(!0),T(!1);const Et=["Hold tight...","Setting up your account...","Configuring your workspace...","Almost there...",`Welcome aboard, ${j.user.name||"there"}! 🎉`];for(let X=0;X<Et.length;X++)await new Promise(Ve=>setTimeout(Ve,X===0?500:1200)),tr(Ve=>[...Ve,Et[X]]);await new Promise(X=>setTimeout(X,1e3)),window.location.href="/dashboard"}else window.location.href="/dashboard"}else{const j=await He.json();I(j.error||"Google sign-in failed")}}catch(w){w.code!=="auth/popup-closed-by-user"&&I(w.message||"Google sign-in failed")}finally{It||T(!1)}};return It?o.jsxs("div",{className:"min-h-screen w-full bg-gradient-to-br from-gray-950 via-red-950/40 to-gray-950 relative overflow-hidden flex flex-col items-center justify-center",style:{animation:"loaderFadeIn 0.3s ease-out"},children:[o.jsx("div",{className:"absolute top-0 left-1/2 transform -translate-x-1/2 w-[80vh] h-[40vh] rounded-b-full bg-red-500/10 blur-[100px]"}),o.jsxs("div",{className:"relative z-10 flex flex-col items-center",children:[o.jsxs("div",{className:"relative flex items-center justify-center mb-12",children:[o.jsx("svg",{className:"absolute w-0 h-0",children:o.jsx("defs",{children:o.jsxs("filter",{id:"gooey-signup-filter",children:[o.jsx("feGaussianBlur",{in:"SourceGraphic",stdDeviation:12,result:"blur"}),o.jsx("feColorMatrix",{in:"blur",mode:"matrix",values:"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 48 -7",result:"goo"}),o.jsx("feComposite",{in:"SourceGraphic",in2:"goo",operator:"atop"})]})})}),o.jsx("style",{children:`
              .signup-gooey-loader {
                width: 12em;
                height: 3em;
                position: relative;
                overflow: hidden;
                border-bottom: 8px solid rgba(255,255,255,0.15);
                filter: url(#gooey-signup-filter);
              }
              .signup-gooey-loader::before,
              .signup-gooey-loader::after {
                content: '';
                position: absolute;
                border-radius: 50%;
              }
              .signup-gooey-loader::before {
                width: 22em;
                height: 18em;
                background-color: #ef4444;
                left: -2em;
                bottom: -18em;
                animation: signup-gooey1 2s linear infinite;
              }
              .signup-gooey-loader::after {
                width: 16em;
                height: 12em;
                background-color: #fca5a5;
                left: -4em;
                bottom: -12em;
                animation: signup-gooey2 2s linear infinite 0.75s;
              }
              @keyframes signup-gooey1 {
                0% { transform: translateX(-10em) rotate(0deg); }
                100% { transform: translateX(7em) rotate(180deg); }
              }
              @keyframes signup-gooey2 {
                0% { transform: translateX(-8em) rotate(0deg); }
                100% { transform: translateX(8em) rotate(180deg); }
              }
            `}),o.jsx("div",{className:"signup-gooey-loader"})]}),o.jsx("div",{className:"space-y-4 min-h-[200px] text-center px-4",children:o.jsx(Z,{children:vt.map((_,w)=>o.jsx(m.p,{initial:{opacity:0,y:15},animate:{opacity:1,y:0},transition:{duration:.5},className:`${w===vt.length-1?"text-white font-bold text-2xl":"text-white/40 text-base"} transition-colors duration-300`,children:_},w))})})]})]}):Qn?o.jsxs("div",{className:"min-h-screen w-full bg-gradient-to-br from-gray-950 via-red-950/40 to-gray-950 relative overflow-hidden flex items-center justify-center",children:[o.jsx("div",{className:"absolute top-0 left-1/2 transform -translate-x-1/2 w-[80vh] h-[40vh] rounded-b-full bg-red-500/10 blur-[100px]"}),o.jsx(m.div,{initial:{opacity:0,scale:.9},animate:{opacity:1,scale:1},className:"relative z-10 max-w-sm w-full mx-4",children:o.jsxs("div",{className:"bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-red-500/10 text-center shadow-2xl",children:[o.jsx("div",{className:"w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5",children:o.jsx(Tt,{className:"w-8 h-8 text-green-400"})}),o.jsx("h2",{className:"text-xl font-bold text-white mb-3",children:"Check Your Email"}),o.jsx("p",{className:"text-white/60 text-sm mb-2",children:"We've sent a confirmation link to"}),o.jsx("p",{className:"text-red-400 font-medium text-sm mb-4",children:c}),o.jsx("p",{className:"text-white/40 text-xs mb-6",children:"Click the link to verify your account. Check spam if you don't see it."}),o.jsx("button",{onClick:()=>{i(!0),wt(!1)},className:"w-full bg-red-500 text-white font-medium h-10 rounded-lg text-sm hover:bg-red-600 transition-colors",children:"Go to Sign In"})]})})]}):o.jsxs("div",{className:"min-h-screen w-full relative overflow-x-hidden overflow-y-auto flex items-center justify-center bg-gradient-to-b from-white via-white to-red-100/60 py-8",children:[o.jsxs("div",{className:"absolute inset-0",children:[o.jsx("div",{className:"absolute bottom-0 left-0 right-0 h-[70%] bg-gradient-to-t from-red-200/50 via-red-100/30 to-transparent"}),o.jsx("div",{className:"absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-red-50/40 to-transparent"}),o.jsx("div",{className:"absolute bottom-0 left-0 w-[40%] h-[50%] bg-gradient-to-tr from-red-300/20 to-transparent blur-[40px]"}),o.jsx("div",{className:"absolute bottom-0 right-0 w-[40%] h-[50%] bg-gradient-to-tl from-orange-200/20 to-transparent blur-[40px]"})]}),o.jsx(m.div,{className:"absolute top-[10%] right-[12%] w-36 h-36 rounded-full",style:{background:"radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)"},animate:{y:[-15,15,-15],x:[0,8,0]},transition:{duration:9,repeat:1/0,ease:"easeInOut"}}),o.jsx(m.div,{className:"absolute bottom-[20%] left-[8%] w-28 h-28 rounded-full",style:{background:"radial-gradient(circle, rgba(251,146,60,0.06) 0%, transparent 70%)"},animate:{y:[10,-10,10],x:[-5,5,-5]},transition:{duration:7,repeat:1/0,ease:"easeInOut",delay:2}}),o.jsx(m.div,{className:"absolute top-[50%] right-[6%] w-3 h-3 rounded-full bg-red-400/25",animate:{y:[-25,25,-25],opacity:[.2,.6,.2]},transition:{duration:5,repeat:1/0,ease:"easeInOut"}}),o.jsx(m.div,{className:"absolute top-[18%] left-[15%] w-2 h-2 rounded-full bg-orange-300/35",animate:{y:[15,-15,15],opacity:[.3,.7,.3]},transition:{duration:4,repeat:1/0,ease:"easeInOut",delay:1}}),o.jsx("div",{className:"absolute inset-0 opacity-[0.012]",style:{backgroundImage:"linear-gradient(rgba(239,68,68,1) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,1) 1px, transparent 1px)",backgroundSize:"50px 50px"}}),o.jsx(m.div,{initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{duration:.8,ease:"easeOut"},className:"w-full max-w-[380px] relative z-10 mx-4 my-8",style:{perspective:1500},children:o.jsx(m.div,{className:"relative",style:{rotateX:nr,rotateY:rr},onMouseMove:sr,onMouseLeave:ir,children:o.jsxs("div",{className:"relative group",children:[o.jsxs("div",{className:"absolute -inset-[1px] rounded-2xl overflow-hidden",children:[o.jsx(m.div,{className:"absolute top-0 left-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-red-500 to-transparent",animate:{left:["-35%","100%"]},transition:{duration:3.5,ease:"easeInOut",repeat:1/0,repeatDelay:.5}}),o.jsx(m.div,{className:"absolute top-0 right-0 h-[35%] w-[2px] bg-gradient-to-b from-transparent via-red-500 to-transparent",animate:{top:["-35%","100%"]},transition:{duration:3.5,ease:"easeInOut",repeat:1/0,repeatDelay:.5,delay:.9}}),o.jsx(m.div,{className:"absolute bottom-0 right-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-red-500 to-transparent",animate:{right:["-35%","100%"]},transition:{duration:3.5,ease:"easeInOut",repeat:1/0,repeatDelay:.5,delay:1.8}}),o.jsx(m.div,{className:"absolute bottom-0 left-0 h-[35%] w-[2px] bg-gradient-to-b from-transparent via-red-500 to-transparent",animate:{bottom:["-35%","100%"]},transition:{duration:3.5,ease:"easeInOut",repeat:1/0,repeatDelay:.5,delay:2.7}})]}),o.jsxs("div",{className:"relative bg-white/30 backdrop-blur-xl rounded-2xl p-7 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden",children:[o.jsx("div",{className:"absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent"}),o.jsxs("div",{className:"text-center mb-6",children:[o.jsxs(m.div,{initial:{scale:0,rotate:-180},animate:{scale:1,rotate:0},transition:{type:"spring",duration:1.2,bounce:.5},className:"mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-red-50 to-white border border-red-100 flex items-center justify-center relative mb-4 shadow-lg shadow-red-500/10",children:[o.jsx(m.div,{className:"absolute inset-[-6px] rounded-2xl",style:{border:"1.5px dashed rgba(239,68,68,0.2)"},animate:{rotate:360},transition:{duration:12,repeat:1/0,ease:"linear"}}),o.jsx(m.div,{className:"absolute w-2 h-2 bg-red-400 rounded-full shadow-lg shadow-red-400/50",animate:{rotate:360},transition:{duration:4,repeat:1/0,ease:"linear"},style:{top:"-4px",left:"50%",transformOrigin:"0px 36px"}}),o.jsx(m.div,{className:"absolute w-1.5 h-1.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50",animate:{rotate:-360},transition:{duration:6,repeat:1/0,ease:"linear"},style:{bottom:"-3px",left:"50%",transformOrigin:"0px -32px"}}),o.jsx(m.div,{className:"absolute inset-0 rounded-2xl border-2 border-red-400/30",animate:{scale:[1,1.2,1],opacity:[.5,0,.5]},transition:{duration:2.5,repeat:1/0,ease:"easeOut"}}),o.jsx(m.img,{src:"/logo.png",alt:"Logo",className:"w-9 h-9 object-contain relative z-10 drop-shadow-sm",animate:{y:[0,-3,0],rotate:[0,5,0,-5,0],scale:[1,1.05,1]},transition:{duration:3,repeat:1/0,ease:"easeInOut"}})]}),o.jsx(m.h1,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{delay:.3},className:"text-2xl font-bold text-gray-900",children:s?"Welcome Back":"Create Account"}),o.jsx(m.p,{initial:{opacity:0},animate:{opacity:1},transition:{delay:.4},className:"text-gray-500 text-sm mt-1",children:s?"Sign in to continue to Pepperwahl":"Get started with Pepperwahl"})]}),o.jsx(Z,{children:G&&o.jsx(m.div,{initial:{opacity:0,y:-5},animate:{opacity:1,y:0},exit:{opacity:0,y:-5},className:"mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs text-center",children:G})}),o.jsxs("form",{onSubmit:ar,className:"space-y-3",children:[o.jsx(Z,{children:!s&&o.jsx(m.div,{initial:{opacity:0,height:0,marginBottom:0},animate:{opacity:1,height:"auto",marginBottom:12},exit:{opacity:0,height:0,marginBottom:0},transition:{duration:.3},children:o.jsxs("div",{className:`relative flex items-center rounded-xl overflow-hidden border transition-all ${S==="name"?"border-red-400 bg-white shadow-sm":"border-gray-200 bg-white/80"}`,children:[o.jsx(pr,{className:`absolute left-3.5 w-4 h-4 transition-colors ${S==="name"?"text-red-500":"text-gray-400"}`}),o.jsx("input",{type:"text",placeholder:"Full name",value:u,onChange:_=>b(_.target.value),onFocus:()=>A("name"),onBlur:()=>A(null),className:"w-full bg-transparent text-gray-900 placeholder:text-gray-400 h-11 rounded-xl pl-11 pr-4 text-sm outline-none",required:!s})]})})}),o.jsxs("div",{className:`relative flex items-center rounded-xl overflow-hidden border transition-all ${S==="email"?"border-red-400 bg-white shadow-sm":"border-gray-200 bg-white/80"}`,children:[o.jsx(Tt,{className:`absolute left-3.5 w-4 h-4 transition-colors ${S==="email"?"text-red-500":"text-gray-400"}`}),o.jsx("input",{type:"email",placeholder:"Email address",value:c,onChange:_=>d(_.target.value),onFocus:()=>A("email"),onBlur:()=>A(null),className:"w-full bg-transparent text-gray-900 placeholder:text-gray-400 h-11 rounded-xl pl-11 pr-4 text-sm outline-none",required:!0})]}),o.jsxs("div",{className:`relative flex items-center rounded-xl overflow-hidden border transition-all ${S==="password"?"border-red-400 bg-white shadow-sm":"border-gray-200 bg-white/80"}`,children:[o.jsx(mr,{className:`absolute left-3.5 w-4 h-4 transition-colors ${S==="password"?"text-red-500":"text-gray-400"}`}),o.jsx("input",{type:a?"text":"password",placeholder:"Password",value:f,onChange:_=>p(_.target.value),onFocus:()=>A("password"),onBlur:()=>A(null),className:"w-full bg-transparent text-gray-900 placeholder:text-gray-400 h-11 rounded-xl pl-11 pr-11 text-sm outline-none",required:!0}),o.jsx("button",{type:"button",onClick:()=>l(!a),className:"absolute right-3.5",children:a?o.jsx(Er,{className:"w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors"}):o.jsx(Tr,{className:"w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors"})})]}),s&&o.jsx("div",{className:"text-right -mt-1",children:o.jsx("a",{href:"/forgot-password",className:"text-xs text-red-500 hover:text-red-600 font-medium",children:"Forgot Password?"})}),o.jsx(Z,{children:!s&&o.jsxs(m.div,{initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},transition:{duration:.3},className:"pt-2",children:[o.jsxs("div",{className:"flex items-center justify-between",children:[o.jsxs("div",{className:"flex items-start gap-3",children:[o.jsx("input",{id:"terms",type:"checkbox",checked:U,onChange:()=>{Jn(!U),U&&bt(!1)},className:"mt-0.5 h-4 w-4 rounded border border-gray-300 bg-white accent-red-500 cursor-pointer"}),o.jsxs("label",{htmlFor:"terms",className:"text-xs text-gray-500 leading-relaxed cursor-pointer",children:["I agree to the ",o.jsx("a",{href:"/terms",target:"_blank",rel:"noopener noreferrer",className:"text-red-500 font-medium hover:underline",onClick:_=>_.stopPropagation(),children:"Terms of Use"})," and ",o.jsx("a",{href:"/privacy",target:"_blank",rel:"noopener noreferrer",className:"text-red-500 font-medium hover:underline",onClick:_=>_.stopPropagation(),children:"Privacy Policy"})]})]}),U&&o.jsx("button",{type:"button",onClick:()=>bt(!Be),className:`p-1 rounded-md transition-all ${Be?"bg-stone-100 rotate-180":"hover:bg-stone-50"}`,children:o.jsx(Sr,{size:14,className:"text-stone-400"})})]}),o.jsx(Z,{children:U&&Be&&o.jsx(m.div,{initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},transition:{duration:.25},className:"overflow-hidden",children:o.jsxs("div",{className:"mt-3 ml-7 space-y-2.5 max-h-[120px] overflow-y-auto pr-1",children:[o.jsxs("div",{className:"flex items-center justify-between py-1.5 border-b border-stone-100",children:[o.jsx("span",{className:"text-[11px] text-gray-500",children:"Receive tips, updates & offers via email"}),o.jsx("button",{type:"button",onClick:()=>Yn(!be),className:`w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${be?"bg-red-500":"bg-stone-300"}`,children:o.jsx("div",{className:`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${be?"translate-x-[17px]":"translate-x-[2px]"}`})})]}),o.jsxs("div",{className:"flex items-center justify-between py-1.5 border-b border-stone-100",children:[o.jsx("span",{className:"text-[11px] text-gray-500",children:"Allow analytics to improve experience"}),o.jsx("button",{type:"button",onClick:()=>Xn(!we),className:`w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${we?"bg-red-500":"bg-stone-300"}`,children:o.jsx("div",{className:`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${we?"translate-x-[17px]":"translate-x-[2px]"}`})})]}),o.jsxs("div",{className:"flex items-center justify-between py-1.5",children:[o.jsx("span",{className:"text-[11px] text-gray-500",children:"Personalize content based on activity"}),o.jsx("button",{type:"button",onClick:()=>Zn(!Ie),className:`w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${Ie?"bg-red-500":"bg-stone-300"}`,children:o.jsx("div",{className:`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${Ie?"translate-x-[17px]":"translate-x-[2px]"}`})})]})]})})})]})}),o.jsxs(m.button,{whileHover:{scale:1.01},whileTap:{scale:.98},type:"submit",disabled:v,className:"w-full mt-5 relative group/button",children:[o.jsx("div",{className:"absolute inset-0 bg-red-500/30 rounded-xl blur-xl opacity-0 group-hover/button:opacity-60 transition-opacity duration-300"}),o.jsx("div",{className:"relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 text-white font-medium h-11 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-red-500/25",children:o.jsx(Z,{mode:"wait",children:v?o.jsx(m.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:o.jsx("div",{className:"w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin"})},"loading"):o.jsxs(m.span,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"flex items-center gap-2 text-sm font-semibold",children:[s?"Sign In":"Create Account",o.jsx(Cr,{className:"w-4 h-4 group-hover/button:translate-x-1 transition-transform"})]},"text")})})]}),o.jsxs("div",{className:"relative my-5 flex items-center",children:[o.jsx("div",{className:"flex-grow border-t border-gray-200"}),o.jsx("span",{className:"mx-4 text-xs text-gray-400",children:"or continue with"}),o.jsx("div",{className:"flex-grow border-t border-gray-200"})]}),o.jsx("div",{className:"flex justify-center",children:o.jsxs(m.button,{whileHover:{scale:1.02},whileTap:{scale:.98},type:"button",onClick:or,className:"w-full bg-white h-11 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex items-center justify-center gap-2",children:[o.jsxs("svg",{className:"w-4 h-4",viewBox:"0 0 24 24",children:[o.jsx("path",{fill:"#EA4335",d:"M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"}),o.jsx("path",{fill:"#34A853",d:"M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067C3.198 21.302 7.27 24 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"}),o.jsx("path",{fill:"#4A90D9",d:"M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"}),o.jsx("path",{fill:"#FBBC05",d:"M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"})]}),o.jsx("span",{className:"text-gray-700 text-sm font-medium",children:"Continue with Google"})]})}),o.jsxs(m.p,{className:"text-center text-sm text-gray-500 mt-5",initial:{opacity:0},animate:{opacity:1},transition:{delay:.5},children:[s?"Don't have an account? ":"Already have an account? ",o.jsx("button",{type:"button",onClick:()=>{i(!s),I("")},className:"text-red-500 font-semibold hover:text-red-600 transition-colors",children:s?"Sign up":"Sign in"})]})]})]})]})})}),o.jsx(gr,{})]})};export{So as default};
