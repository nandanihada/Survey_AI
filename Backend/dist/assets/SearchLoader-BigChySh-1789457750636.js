import{j as e}from"./index-C2OLWBD9-1789457750636.js";const m=[{id:"gooey",label:"Liquid Blob",description:"Smooth gooey blobs that merge and flow"},{id:"dots",label:"Bouncing Dots",description:"Three dots that bounce in sequence"},{id:"pulse",label:"Pulse Rings",description:"Concentric rings expanding outward"},{id:"bars",label:"Wave Bars",description:"Animated equaliser-style wave bars"},{id:"orbit",label:"Orbital Spinner",description:"Planet orbiting a glowing core"}],o=()=>e.jsxs(e.Fragment,{children:[e.jsx("svg",{className:"absolute w-0 h-0","aria-hidden":"true",children:e.jsx("defs",{children:e.jsxs("filter",{id:"gooey-loader-filter",children:[e.jsx("feGaussianBlur",{in:"SourceGraphic",stdDeviation:12,result:"blur"}),e.jsx("feColorMatrix",{in:"blur",mode:"matrix",values:"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 48 -7",result:"goo"}),e.jsx("feComposite",{in:"SourceGraphic",in2:"goo",operator:"atop"})]})})}),e.jsx("style",{children:`
      .gl-wrap{width:12em;height:3em;position:relative;overflow:hidden;
        border-bottom:8px solid #e5e7eb;filter:url(#gooey-loader-filter);}
      .gl-wrap::before,.gl-wrap::after{content:'';position:absolute;border-radius:50%;}
      .gl-wrap::before{width:22em;height:18em;background:#ef4444;left:-2em;bottom:-18em;
        animation:gl-w1 2s linear infinite;}
      .gl-wrap::after{width:16em;height:12em;background:#fca5a5;left:-4em;bottom:-12em;
        animation:gl-w2 2s linear infinite 0.75s;}
      @keyframes gl-w1{0%{transform:translateX(-10em) rotate(0deg)}100%{transform:translateX(7em) rotate(180deg)}}
      @keyframes gl-w2{0%{transform:translateX(-8em) rotate(0deg)}100%{transform:translateX(8em) rotate(180deg)}}
    `}),e.jsx("div",{className:"gl-wrap"})]}),l=()=>e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
      .dots-row{display:flex;gap:14px;align-items:flex-end;height:48px;}
      .dot{width:14px;height:14px;border-radius:50%;background:#ef4444;}
      .dot:nth-child(1){animation:dot-b 1.2s ease-in-out infinite 0s;}
      .dot:nth-child(2){animation:dot-b 1.2s ease-in-out infinite 0.2s;background:#f87171;}
      .dot:nth-child(3){animation:dot-b 1.2s ease-in-out infinite 0.4s;background:#fca5a5;}
      @keyframes dot-b{
        0%,80%,100%{transform:translateY(0);opacity:.5}
        40%{transform:translateY(-28px);opacity:1}
      }
    `}),e.jsxs("div",{className:"dots-row",children:[e.jsx("div",{className:"dot"}),e.jsx("div",{className:"dot"}),e.jsx("div",{className:"dot"})]})]}),d=()=>e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
      .pulse-wrap{position:relative;width:64px;height:64px;display:flex;align-items:center;justify-content:center;}
      .pulse-ring{position:absolute;border-radius:50%;border:3px solid #ef4444;opacity:0;
        animation:pulse-out 2s ease-out infinite;}
      .pulse-ring:nth-child(1){width:64px;height:64px;animation-delay:0s;}
      .pulse-ring:nth-child(2){width:64px;height:64px;animation-delay:0.6s;}
      .pulse-ring:nth-child(3){width:64px;height:64px;animation-delay:1.2s;}
      .pulse-core{width:20px;height:20px;border-radius:50%;background:#ef4444;}
      @keyframes pulse-out{
        0%{transform:scale(0.4);opacity:.9}
        100%{transform:scale(2.2);opacity:0}
      }
    `}),e.jsxs("div",{className:"pulse-wrap",children:[e.jsx("div",{className:"pulse-ring"}),e.jsx("div",{className:"pulse-ring"}),e.jsx("div",{className:"pulse-ring"}),e.jsx("div",{className:"pulse-core"})]})]}),c=()=>e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
      .bars-row{display:flex;gap:6px;align-items:flex-end;height:48px;}
      .bar{width:8px;border-radius:4px 4px 0 0;background:#ef4444;
        animation:bar-wave 1.2s ease-in-out infinite;}
      .bar:nth-child(1){animation-delay:0s;   background:#ef4444;}
      .bar:nth-child(2){animation-delay:.15s; background:#f87171;}
      .bar:nth-child(3){animation-delay:.3s;  background:#ef4444;}
      .bar:nth-child(4){animation-delay:.45s; background:#f87171;}
      .bar:nth-child(5){animation-delay:.6s;  background:#ef4444;}
      @keyframes bar-wave{
        0%,100%{height:10px;opacity:.5}
        50%{height:44px;opacity:1}
      }
    `}),e.jsxs("div",{className:"bars-row",children:[e.jsx("div",{className:"bar"}),e.jsx("div",{className:"bar"}),e.jsx("div",{className:"bar"}),e.jsx("div",{className:"bar"}),e.jsx("div",{className:"bar"})]})]}),p=()=>e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
      .orbit-wrap{position:relative;width:64px;height:64px;}
      .orbit-core{position:absolute;top:50%;left:50%;width:18px;height:18px;
        border-radius:50%;background:#ef4444;transform:translate(-50%,-50%);
        box-shadow:0 0 12px 4px rgba(239,68,68,.45);}
      .orbit-ring{position:absolute;top:50%;left:50%;width:54px;height:54px;
        border-radius:50%;border:2px solid rgba(239,68,68,.25);
        transform:translate(-50%,-50%);}
      .orbit-planet{position:absolute;top:50%;left:50%;width:11px;height:11px;
        border-radius:50%;background:#fca5a5;margin-top:-27px;margin-left:-5.5px;
        transform-origin:5.5px 27px;animation:orbit-spin 1.4s linear infinite;}
      @keyframes orbit-spin{to{transform:rotate(360deg)}}
    `}),e.jsxs("div",{className:"orbit-wrap",children:[e.jsx("div",{className:"orbit-ring"}),e.jsx("div",{className:"orbit-core"}),e.jsx("div",{className:"orbit-planet"})]})]}),a={gooey:o,dots:l,pulse:d,bars:c,orbit:p},x=({message:i,animationId:s="gooey",inline:r=!1})=>{const n=a[s]??a.gooey,t=e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:28},role:"status","aria-label":i||"Loading",children:[e.jsx(n,{}),i&&e.jsx("p",{style:{margin:0,fontSize:14,fontWeight:500,color:"#6b7280",letterSpacing:"0.01em",fontFamily:"'Outfit', system-ui, sans-serif",textAlign:"center",maxWidth:260,lineHeight:1.5},children:i})]});return r?e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:160,background:"#fff",borderRadius:10},children:t}):e.jsxs("div",{className:"fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white",style:{animation:"sl-fadeIn 0.3s ease-out"},children:[e.jsx("style",{children:"@keyframes sl-fadeIn{from{opacity:0}to{opacity:1}}"}),t]})};export{m as A,x as S};
