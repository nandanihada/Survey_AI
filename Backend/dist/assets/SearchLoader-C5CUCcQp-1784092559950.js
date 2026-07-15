import{c as d,r as c,j as s}from"./index-Ddoax69c-1784092559950.js";import{P as j}from"./pen-line-Cv5CgtUu-1784092559950.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=d("BarChart2",[["line",{x1:"18",x2:"18",y1:"20",y2:"10",key:"1xfpm4"}],["line",{x1:"12",x2:"12",y1:"20",y2:"4",key:"be30l9"}],["line",{x1:"6",x2:"6",y1:"20",y2:"14",key:"1r4le6"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q=d("Hash",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=d("ImagePlus",[["path",{d:"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7",key:"31hg93"}],["line",{x1:"16",x2:"22",y1:"5",y2:"5",key:"ez7e4s"}],["line",{x1:"19",x2:"19",y1:"2",y2:"8",key:"1gkr8c"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=d("Lightbulb",[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]]);function H(e,t){const a=e.trim();return{topic:q(a),questionCount:$(a,t),userQuestions:N(a),audience:S(a),tone:I(a),mentionedTypes:T(a),dataCollection:L(a),isTopicClear:_(a),rawPrompt:a}}function B(e,t){return{needsTopic:!e.isTopicClear,needsQuestionCount:e.questionCount===null&&!t,needsAudience:e.audience===null,needsDataCollection:e.dataCollection===null}}function q(e){let t=e.replace(/\b(generate|create|make|build|give me)\s+/i,"").replace(/\b\d+\s*(questions?|qs?)\b/i,"").replace(/\b(about|for|on|regarding)\s+/i,"").trim();return t.length<5&&(t=e),t}function $(e,t){const a=[/(\d+)\s*(questions?|qs?)\b/i,/\b(generate|create|make|give me)\s+(\d+)/i,/\btotal\s*(?:of\s*)?(\d+)/i,/\bexactly\s+(\d+)/i,/(\d+)\s*(प्रश्न|सवाल|preguntas?|questions?|fragen|вопрос|質問|pertanyaan|soal)/i,/,\s*(\d+)\s*\S*$/];for(const o of a){const n=e.match(o);if(n){const i=parseInt(n[1])||parseInt(n[2]);if(i>=3&&i<=100)return i}}return t!==null&&t!==10?t:null}function N(e){const t=[],a=e.split(`
`);for(const o of a){const n=o.trim();if(n.endsWith("?")&&n.length>10){const l=n.replace(/^[\d]+[\.\)\-]\s*/,"").trim();l.length>10&&t.push(l)}const i=n.match(/^[\d]+[\.\)\-]\s+(.{15,})/);if(i&&!n.endsWith("?")){const l=i[1];/^(what|how|why|when|where|which|who|do|does|did|is|are|was|were|have|has|would|could|should|can|rate|describe|explain)/i.test(l)&&t.push(l)}}return t}function S(e){const t=[[/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(customers?|clients?|buyers?)\b/i,"customers"],[/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(employees?|staff|team|workers?|colleagues?)\b/i,"employees"],[/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(students?|learners?|class)\b/i,"students"],[/\b(for|targeting|aimed at)\s+(my\s+)?(\w+\s+)*(users?|visitors?|audience)\b/i,"users"],[/\b(for|targeting|aimed at)\s+(the\s+)?(general public|everyone|anyone)\b/i,"general_public"],[/\b(internal|company|organization)\s+(survey|feedback|check)/i,"employees"],[/\bmy\s+(\w+\s+)?team\b/i,"employees"],[/\bemployee\s+(engagement|feedback|satisfaction|wellness|check)/i,"employees"],[/\bcustomer\s+(satisfaction|feedback|experience|support)/i,"customers"],[/\bstudent\s+(feedback|evaluation|assessment)/i,"students"],[/\bwebsite\s+(visitors?|users?|experience)/i,"users"],[/\b(app|mobile|software|product|platform)\s+(user|usability|experience|ux)\b/i,"users"],[/\buser\s+(experience|feedback|satisfaction|research|testing)\b/i,"users"],[/\b(ux|ui)\s+(survey|feedback|research|testing)\b/i,"users"],[/\b(membership|subscriber|purchase|buying|shopping|dining|restaurant|hotel|store|shop|service)\s+(satisfaction|feedback|experience)/i,"customers"],[/\b(satisfaction|feedback|experience)\s+(survey|form|questionnaire)\b/i,"customers"],[/\b(team|developer|engineering|software|sprint|agile|workplace|office|department)\s+(productivity|performance|collaboration|culture|survey|feedback|check)/i,"employees"],[/\b(productivity|performance|collaboration)\s+(survey|feedback|assessment)\b/i,"employees"],[/ग्राहक|cliente|client|müşteri/i,"customers"],[/कर्मचारी|empleado|employé|mitarbeiter/i,"employees"],[/छात्र|estudiante|étudiant|schüler/i,"students"]];for(const[a,o]of t)if(a.test(e))return o;return null}function I(e){const t=/\b(hey|cool|awesome|gonna|wanna|lol|haha|btw|tbh|chill|vibe)\b/i,a=/\b(pursuant|regarding|pertaining|henceforth|whereby|stakeholders|comprehensive|assessment)\b/i;return t.test(e)?"casual":a.test(e)?"formal":"professional"}function T(e){const t=[];return/\b(multiple\s*choice|mcq|options)\b/i.test(e)&&t.push("multiple_choice"),/\b(rating|rate|scale|1\s*(-|to)\s*(5|10))\b/i.test(e)&&t.push("rating"),/\b(open\s*ended|text|free\s*text|short\s*answer)\b/i.test(e)&&t.push("short_answer"),/\b(yes\s*\/?\s*no|boolean)\b/i.test(e)&&t.push("yes_no"),/\b(nps|net\s*promoter)\b/i.test(e)&&t.push("nps"),t}function L(e){return/\b(anonymous|keep\s*(it\s*)?anonymous|no\s*names?|don't\s*collect|no\s*personal|no\s*data|confidential)\b/i.test(e)?"anonymous":/\b(email\s*only|just\s*email|collect\s*email|only\s*email)\b/i.test(e)?"email_only":/\b(name|email|phone|details|personal\s*info|contact|collect\s*(their|respondent))\b/i.test(e)?"full_details":null}function _(e){const t=e.trim().toLowerCase();return t.length<10?!1:/[\u0900-\u097F\u0600-\u06FF\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(e)?!0:!([/^(make|create|generate|build|give|get)\s+(me\s+)?(a\s+)?(survey|questionnaire|form|questions?)\.?$/i,/^(i\s+)?(need|want|require)\s+(a\s+)?(some\s+)?(survey|questions?|form|questionnaire)\.?$/i,/^survey$/i,/^help\s*me.*$/i,/^(something|anything|whatever).*$/i,/^(i\s+)?(need|want)\s+(some|few|more|new)\s+(questions?|survey)\.?$/i,/^(can you|please|pls)\s+(make|create|generate|help).*?(survey|questions?|form)\.?$/i,/^(just|only)\s+(make|create|generate)\s+(a\s+)?(survey|questions?)\.?$/i,/^questions?\s*(please|pls)?$/i,/^(give|get)\s+me\s+(some\s+)?questions?\.?$/i,/^i\s+(need|want)\s+(some|few)?\s*questions?\.?$/i].some(n=>n.test(t))||t.replace(/\b(i|me|my|we|our|please|pls|can you|could you|help|need|want|would like|generate|create|make|build|give|get|some|a|an|the|few|more|new|about|for|with|and|or|of|to|in|on)\b/gi,"").replace(/\b(survey|questions?|questionnaire|form)\b/gi,"").replace(/\b\d+\b/g,"").replace(/\s+/g," ").trim().length<4)}const G=({needs:e,onSubmit:t,onCancel:a,isDarkMode:o=!1})=>{const n=[];e.needsTopic&&n.push({key:"topic",phrase:"What is the survey about?",options:[{key:"customer_feedback",label:"Customer satisfaction/feedback"},{key:"employee_engagement",label:"Employee engagement"},{key:"event_feedback",label:"Event feedback"},{key:"product_research",label:"Product/market research"}]}),e.needsQuestionCount&&n.push({key:"questionCount",phrase:"How many questions do you need?",options:[{key:"5",label:"5 — Quick survey"},{key:"10",label:"10 — Standard"},{key:"15",label:"15 — Detailed"},{key:"20",label:"20 — Comprehensive"}]}),e.needsAudience&&n.push({key:"audience",phrase:"Who will be filling this out?",options:[{key:"customers",label:"Customers"},{key:"employees",label:"Employees / Team"},{key:"students",label:"Students"},{key:"users",label:"Website visitors"}]}),n.push({key:"dataCollection",phrase:"Collect respondent details?",options:[{key:"full_details",label:"Yes (Name, Email, Phone)"},{key:"email_only",label:"Only Email"},{key:"anonymous",label:"No (keep anonymous)"}]});const[i,l]=c.useState(0),[p,k]=c.useState({}),[u,b]=c.useState(""),[f,y]=c.useState(null),w=c.useRef(null),h=r=>{y(r);const m={...p,[n[i].key]:r};k(m),setTimeout(()=>{i+1<n.length?(l(C=>C+1),y(null)):v(m)},200)},g=()=>{u.trim()&&(h(u.trim()),b(""))},v=r=>{t({topic:r.topic||void 0,questionCount:r.questionCount?parseInt(r.questionCount):void 0,audience:r.audience||void 0,dataCollection:r.dataCollection||"anonymous"})},x=n[i];return s.jsxs("div",{className:"clarification-glass rounded-xl overflow-hidden",style:{animation:"clarDropIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both"},children:[s.jsxs("div",{className:"flex items-center justify-between px-4 py-2.5",children:[s.jsx("p",{className:`text-[13px] font-semibold ${o?"text-white":"text-slate-800"}`,style:{fontFamily:"'Space Grotesk', sans-serif"},children:x.phrase}),s.jsxs("span",{className:`text-[10px] font-medium ${o?"text-slate-500":"text-stone-400"}`,children:[i+1," of ",n.length]})]}),s.jsxs("div",{style:{animation:"clarListIn 0.3s ease-out both"},children:[x.options.map((r,m)=>s.jsxs("button",{onClick:()=>h(r.key),className:`w-full flex items-center gap-3 px-4 py-2.5 text-left border-t transition-all duration-150 ${f===r.key?o?"bg-red-500/10 border-red-500/20":"bg-red-50/60 border-red-100":o?"border-white/5 hover:bg-white/5":"border-stone-100/80 hover:bg-white/40"}`,children:[s.jsx("span",{className:`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-bold flex-shrink-0 transition-colors ${f===r.key?"bg-red-500 text-white":o?"bg-white/10 text-slate-400":"bg-stone-200/60 text-stone-500"}`,children:m+1}),s.jsx("span",{className:`text-[12px] sm:text-[13px] font-medium ${o?"text-slate-200":"text-slate-700"}`,children:r.label})]},r.key)),s.jsxs("div",{className:`flex items-center gap-3 px-4 py-2.5 border-t ${o?"border-white/5":"border-stone-100/80"}`,children:[s.jsx("span",{className:`w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0 ${o?"bg-white/10":"bg-stone-200/60"}`,children:s.jsx(j,{size:10,className:o?"text-slate-400":"text-stone-400"})}),s.jsx("input",{ref:w,type:"text",value:u,onChange:r=>b(r.target.value),onKeyDown:r=>{r.key==="Enter"&&g()},placeholder:"Something else",className:`flex-1 bg-transparent text-[12px] sm:text-[13px] font-medium border-0 outline-none ${o?"text-white placeholder-slate-500":"text-slate-700 placeholder-stone-400"}`}),u.trim()&&s.jsx("button",{onClick:g,className:"text-[10px] font-bold text-red-500",children:"Enter ↵"})]})]},i),s.jsx("style",{children:`
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
      `})]})},X=({message:e,primaryColor:t="#ef4444",secondaryColor:a="#fca5a5",borderColor:o="#e5e7eb"})=>{const n={"--gooey-primary-color":t,"--gooey-secondary-color":a,"--gooey-border-color":o};return s.jsx("div",{className:"fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white",style:{animation:"loaderFadeIn 0.3s ease-out"},children:s.jsxs("div",{className:"relative flex items-center justify-center",style:n,role:"status","aria-label":"Loading",children:[s.jsx("svg",{className:"absolute w-0 h-0",children:s.jsx("defs",{children:s.jsxs("filter",{id:"gooey-loader-filter",children:[s.jsx("feGaussianBlur",{in:"SourceGraphic",stdDeviation:12,result:"blur"}),s.jsx("feColorMatrix",{in:"blur",mode:"matrix",values:"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 48 -7",result:"goo"}),s.jsx("feComposite",{in:"SourceGraphic",in2:"goo",operator:"atop"})]})})}),s.jsx("style",{children:`
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
        `}),s.jsx("div",{className:"gooey-loader"})]})})};export{F as B,Q as H,W as I,z as L,X as S,G as a,B as g,H as p};
