import{c as q,r as c,j as s}from"./index-GFyW6bfm-1786702890286.js";import{S as P}from"./sparkles-B1xiXC20-1786702890286.js";import{P as _}from"./pen-line-Bb4KgXBv-1786702890286.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=q("ImagePlus",[["path",{d:"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7",key:"31hg93"}],["line",{x1:"16",x2:"22",y1:"5",y2:"5",key:"ez7e4s"}],["line",{x1:"19",x2:"19",y1:"2",y2:"8",key:"1gkr8c"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=q("Lightbulb",[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]]);function J(e,t){const a=e.trim();return{topic:E(a),questionCount:Q(a,t),userQuestions:z(a),audience:F(a),tone:W(a),mentionedTypes:A(a),dataCollection:G(a),isTopicClear:X(a),rawPrompt:a}}function U(e,t){const a=/\b(casual|informal|fun|formal|academic|professional|corporate|friendly|warm|direct|concise|brief)\b/i.test(e.rawPrompt);return{needsTopic:!e.isTopicClear,needsQuestionCount:e.questionCount===null&&!t,needsAudience:e.audience===null,needsDataCollection:e.dataCollection===null,needsTone:!a}}function E(e){let t=e.replace(/\b(generate|create|make|build|give me)\s+/i,"").replace(/\b\d+\s*(questions?|qs?)\b/i,"").replace(/\b(about|for|on|regarding)\s+/i,"").trim();return t.length<5&&(t=e),t}function Q(e,t){const a=[/(\d+)\s*(questions?|qs?)\b/i,/\b(generate|create|make|give me)\s+(\d+)/i,/\btotal\s*(?:of\s*)?(\d+)/i,/\bexactly\s+(\d+)/i,/(\d+)\s*(प्रश्न|सवाल|preguntas?|questions?|fragen|вопрос|質問|pertanyaan|soal)/i,/,\s*(\d+)\s*\S*$/];for(const o of a){const i=e.match(o);if(i){const l=parseInt(i[1])||parseInt(i[2]);if(l>=3&&l<=100)return l}}return t!==null&&t!==10?t:null}function z(e){const t=[],a=e.split(`
`);for(const o of a){const i=o.trim();if(i.endsWith("?")&&i.length>10){const u=i.replace(/^[\d]+[\.\)\-]\s*/,"").trim();u.length>10&&t.push(u)}const l=i.match(/^[\d]+[\.\)\-]\s+(.{15,})/);if(l&&!i.endsWith("?")){const u=l[1];/^(what|how|why|when|where|which|who|do|does|did|is|are|was|were|have|has|would|could|should|can|rate|describe|explain)/i.test(u)&&t.push(u)}}return t}function F(e){const t=[[/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(customers?|clients?|buyers?)\b/i,"customers"],[/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(employees?|staff|team|workers?|colleagues?)\b/i,"employees"],[/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(students?|learners?|class)\b/i,"students"],[/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(users?|visitors?|audience)\b/i,"users"],[/\b(for|targeting|aimed at)\s+(the\s+)?(general public|everyone|anyone)\b/i,"general_public"],[/\b(internal|company|organization)\s+(survey|feedback|check)/i,"employees"],[/\bmy\s+(\w+\s+)?team\b/i,"employees"],[/\bemployee\s+(engagement|feedback|satisfaction|wellness|check)/i,"employees"],[/\bcustomer\s+(satisfaction|feedback|experience|support)/i,"customers"],[/\bstudent\s+(feedback|evaluation|assessment)/i,"students"],[/\bwebsite\s+(visitors?|users?|experience)/i,"users"],[/\b(app|mobile|software|product|platform)\s+(user|usability|experience|ux)\b/i,"users"],[/\buser\s+(experience|feedback|satisfaction|research|testing)\b/i,"users"],[/\b(ux|ui)\s+(survey|feedback|research|testing)\b/i,"users"],[/\b(membership|subscriber|purchase|buying|shopping|dining|restaurant|hotel|store|shop|service)\s+(satisfaction|feedback|experience)/i,"customers"],[/\b(satisfaction|feedback|experience)\s+(survey|form|questionnaire)\b/i,"customers"],[/\b(team|developer|engineering|software|sprint|agile|workplace|office|department)\s+(productivity|performance|collaboration|culture|survey|feedback|check)/i,"employees"],[/\b(productivity|performance|collaboration)\s+(survey|feedback|assessment)\b/i,"employees"],[/ग्राहक|cliente|client|müşteri/i,"customers"],[/कर्मचारी|empleado|employé|mitarbeiter/i,"employees"],[/छात्र|estudiante|étudiant|schüler/i,"students"]];for(const[a,o]of t)if(a.test(e))return o;return null}function W(e){if(/\b(casual|informal|fun|playful|relaxed|chill)\b/i.test(e))return"casual";if(/\b(formal|academic|scholarly|research|institutional)\b/i.test(e))return"formal";if(/\b(professional|corporate|business|neutral)\b/i.test(e)||/\b(friendly|warm|welcoming|approachable)\b/i.test(e)||/\b(direct|concise|brief|short|no.?fluff)\b/i.test(e))return"professional";const t=/\b(hey|cool|awesome|gonna|wanna|lol|haha|btw|tbh|chill|vibe)\b/i,a=/\b(pursuant|regarding|pertaining|henceforth|whereby|stakeholders|comprehensive|assessment)\b/i;return t.test(e)?"casual":a.test(e)?"formal":"professional"}function A(e){const t=[];return/\b(multiple\s*choice|mcq|options)\b/i.test(e)&&t.push("multiple_choice"),/\b(rating|rate|scale|1\s*(-|to)\s*(5|10))\b/i.test(e)&&t.push("rating"),/\b(open\s*ended|text|free\s*text|short\s*answer)\b/i.test(e)&&t.push("short_answer"),/\b(yes\s*\/?\s*no|boolean)\b/i.test(e)&&t.push("yes_no"),/\b(nps|net\s*promoter)\b/i.test(e)&&t.push("nps"),t}function G(e){return/\b(anonymous|keep\s*(it\s*)?anonymous|no\s*names?|don't\s*collect|no\s*personal|no\s*data|confidential)\b/i.test(e)?"anonymous":/\b(email\s*only|just\s*email|collect\s*email|only\s*email)\b/i.test(e)?"email_only":/\b(name|email|phone|details|personal\s*info|contact|collect\s*(their|respondent))\b/i.test(e)?"full_details":null}function X(e){const t=e.trim().toLowerCase();return t.length<10?!1:/[\u0900-\u097F\u0600-\u06FF\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(e)?!0:!([/^(make|create|generate|build|give|get)\s+(me\s+)?(a\s+)?(survey|questionnaire|form|questions?)\.?$/i,/^(i\s+)?(need|want|require)\s+(a\s+)?(some\s+)?(survey|questions?|form|questionnaire)\.?$/i,/^survey$/i,/^help\s*me.*$/i,/^(something|anything|whatever).*$/i,/^(i\s+)?(need|want)\s+(some|few|more|new)\s+(questions?|survey)\.?$/i,/^(can you|please|pls)\s+(make|create|generate|help).*?(survey|questions?|form)\.?$/i,/^(just|only)\s+(make|create|generate)\s+(a\s+)?(survey|questions?)\.?$/i,/^questions?\s*(please|pls)?$/i,/^(give|get)\s+me\s+(some\s+)?questions?\.?$/i,/^i\s+(need|want)\s+(some|few)?\s*questions?\.?$/i].some(i=>i.test(t))||t.replace(/\b(i|me|my|we|our|please|pls|can you|could you|help|need|want|would like|generate|create|make|build|give|get|some|a|an|the|few|more|new|about|for|with|and|or|of|to|in|on)\b/gi,"").replace(/\b(survey|questions?|questionnaire|form)\b/gi,"").replace(/\b\d+\b/g,"").replace(/\s+/g," ").trim().length<4)}const V=({needs:e,onSubmit:t,onCancel:a,isDarkMode:o=!1,prompt:i=""})=>{const[l,u]=c.useState(null);c.useEffect(()=>{if(!i||i.length<10)return;(async()=>{try{const h=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:5000":"https://surevy-pepperwahl.onrender.com",j=await fetch(`${h}/api/contextual-question`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:i})});if(j.ok){const p=await j.json();p.question&&p.options&&p.options.length>0&&u({key:"aiContext",phrase:p.question,options:p.options.map((C,K)=>({key:C,label:C})),isAI:!0})}}catch{}})()},[i]);const r=[];e.needsTopic&&r.push({key:"topic",phrase:"What is the survey about?",options:[{key:"customer_feedback",label:"Customer satisfaction/feedback"},{key:"employee_engagement",label:"Employee engagement"},{key:"event_feedback",label:"Event feedback"},{key:"product_research",label:"Product/market research"}]}),e.needsQuestionCount&&r.push({key:"questionCount",phrase:"How many questions do you need?",options:[{key:"5",label:"5 — Quick survey"},{key:"10",label:"10 — Standard"},{key:"15",label:"15 — Detailed"},{key:"20",label:"20 — Comprehensive"}]}),e.needsAudience&&r.push({key:"audience",phrase:"Who will be filling this out?",options:[{key:"customers",label:"Customers"},{key:"employees",label:"Employees / Team"},{key:"students",label:"Students"},{key:"users",label:"Website visitors"}]}),r.push({key:"dataCollection",phrase:"Collect respondent details?",options:[{key:"full_details",label:"Yes (Name, Email, Phone)"},{key:"email_only",label:"Only Email"},{key:"anonymous",label:"No (keep anonymous)"}]}),l&&r.push(l);const[m,N]=c.useState(0),[$,S]=c.useState({}),[f,y]=c.useState(""),[g,x]=c.useState(null),[I,w]=c.useState(!1),T=c.useRef(null),k=n=>{x(n);const d={...$,[r[m].key]:n};S(d),setTimeout(()=>{m+1<r.length?(w(!0),setTimeout(()=>{N(h=>h+1),x(null),w(!1)},3e3)):L(d)},200)},v=()=>{f.trim()&&(k(f.trim()),y(""))},L=n=>{t({topic:n.topic||void 0,questionCount:n.questionCount?parseInt(n.questionCount):void 0,audience:n.audience||void 0,dataCollection:n.dataCollection||"anonymous",tone:n.tone||void 0,aiContext:n.aiContext||void 0})},b=r[m];return I?s.jsxs("div",{className:"clarification-glass rounded-xl overflow-hidden",style:{animation:"clarDropIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both"},children:[s.jsxs("div",{className:"flex items-center justify-center px-4 py-6 gap-3",children:[s.jsxs("div",{className:"flex gap-1",children:[s.jsx("span",{className:"w-2 h-2 rounded-full bg-red-400 animate-bounce",style:{animationDelay:"0ms"}}),s.jsx("span",{className:"w-2 h-2 rounded-full bg-red-400 animate-bounce",style:{animationDelay:"150ms"}}),s.jsx("span",{className:"w-2 h-2 rounded-full bg-red-400 animate-bounce",style:{animationDelay:"300ms"}})]}),s.jsx("span",{className:`text-[12px] font-medium ${o?"text-slate-400":"text-stone-400"}`,children:"Thinking..."})]}),s.jsx("style",{children:`
          .clarification-glass {
            background: ${o?"rgba(15, 23, 42, 0.7)":"rgba(255, 255, 255, 0.65)"};
            backdrop-filter: blur(16px) saturate(1.4);
            -webkit-backdrop-filter: blur(16px) saturate(1.4);
            border: 1px solid ${o?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"};
            box-shadow: ${o?"0 8px 32px rgba(0,0,0,0.3)":"0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)"};
          }
        `})]}):s.jsxs("div",{className:"clarification-glass rounded-xl overflow-hidden",style:{animation:"clarDropIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both"},children:[s.jsxs("div",{className:"flex items-center justify-between px-4 py-2.5",children:[s.jsxs("p",{className:`text-[13px] font-semibold flex items-center gap-1.5 ${o?"text-white":"text-slate-800"}`,style:{fontFamily:"'Space Grotesk', sans-serif"},children:[b.isAI&&s.jsx(P,{size:12,className:"text-purple-500"}),b.phrase]}),s.jsxs("span",{className:`text-[10px] font-medium ${o?"text-slate-500":"text-stone-400"}`,children:[m+1," of ",r.length]})]}),s.jsxs("div",{style:{animation:"clarListIn 0.3s ease-out both"},children:[b.options.map((n,d)=>s.jsxs("button",{onClick:()=>k(n.key),className:`w-full flex items-center gap-3 px-4 py-2.5 text-left border-t transition-all duration-150 ${g===n.key?o?"bg-red-500/10 border-red-500/20":"bg-red-50/60 border-red-100":o?"border-white/5 hover:bg-white/5":"border-stone-100/80 hover:bg-white/40"}`,children:[s.jsx("span",{className:`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-bold flex-shrink-0 transition-colors ${g===n.key?"bg-red-500 text-white":o?"bg-white/10 text-slate-400":"bg-stone-200/60 text-stone-500"}`,children:d+1}),s.jsx("span",{className:`text-[12px] sm:text-[13px] font-medium ${o?"text-slate-200":"text-slate-700"}`,children:n.label})]},n.key)),s.jsxs("div",{className:`flex items-center gap-3 px-4 py-2.5 border-t ${o?"border-white/5":"border-stone-100/80"}`,children:[s.jsx("span",{className:`w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0 ${o?"bg-white/10":"bg-stone-200/60"}`,children:s.jsx(_,{size:10,className:o?"text-slate-400":"text-stone-400"})}),s.jsx("input",{ref:T,type:"text",value:f,onChange:n=>y(n.target.value),onKeyDown:n=>{n.key==="Enter"&&v()},placeholder:"Something else",className:`flex-1 bg-transparent text-[12px] sm:text-[13px] font-medium border-0 outline-none ${o?"text-white placeholder-slate-500":"text-slate-700 placeholder-stone-400"}`}),f.trim()&&s.jsx("button",{onClick:v,className:"text-[10px] font-bold text-red-500",children:"Enter ↵"})]})]},m),s.jsx("style",{children:`
        .clarification-glass {
          background: ${o?"rgba(15, 23, 42, 0.7)":"rgba(255, 255, 255, 0.65)"};
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
          border: 1px solid ${o?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"};
          box-shadow: ${o?"0 8px 32px rgba(0,0,0,0.3)":"0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)"};
        }
        @keyframes clarDropIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes clarListIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `})]})},Z=({message:e,primaryColor:t="#ef4444",secondaryColor:a="#fca5a5",borderColor:o="#e5e7eb"})=>{const i={"--gooey-primary-color":t,"--gooey-secondary-color":a,"--gooey-border-color":o};return s.jsx("div",{className:"fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white",style:{animation:"loaderFadeIn 0.3s ease-out"},children:s.jsxs("div",{className:"relative flex items-center justify-center",style:i,role:"status","aria-label":"Loading",children:[s.jsx("svg",{className:"absolute w-0 h-0",children:s.jsx("defs",{children:s.jsxs("filter",{id:"gooey-loader-filter",children:[s.jsx("feGaussianBlur",{in:"SourceGraphic",stdDeviation:12,result:"blur"}),s.jsx("feColorMatrix",{in:"blur",mode:"matrix",values:"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 48 -7",result:"goo"}),s.jsx("feComposite",{in:"SourceGraphic",in2:"goo",operator:"atop"})]})})}),s.jsx("style",{children:`
          .gooey-loader {
            width: 12em;
            height: 3em;
            position: relative;
            overflow: hidden;
            border-bottom: 8px solid var(--gooey-border-color);
            filter: url(#gooey-loader-filter);
          }
          .gooey-loader::before,
          .gooey-loader::after {
            content: '';
            position: absolute;
            border-radius: 50%;
          }
          .gooey-loader::before {
            width: 22em;
            height: 18em;
            background-color: var(--gooey-primary-color);
            left: -2em;
            bottom: -18em;
            animation: gooey-loader-wee1 2s linear infinite;
          }
          .gooey-loader::after {
            width: 16em;
            height: 12em;
            background-color: var(--gooey-secondary-color);
            left: -4em;
            bottom: -12em;
            animation: gooey-loader-wee2 2s linear infinite 0.75s;
          }
          @keyframes gooey-loader-wee1 {
            0% { transform: translateX(-10em) rotate(0deg); }
            100% { transform: translateX(7em) rotate(180deg); }
          }
          @keyframes gooey-loader-wee2 {
            0% { transform: translateX(-8em) rotate(0deg); }
            100% { transform: translateX(8em) rotate(180deg); }
          }
          @keyframes loaderFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}),s.jsx("div",{className:"gooey-loader"})]})})};export{B as I,H as L,Z as S,V as a,U as g,J as p};
