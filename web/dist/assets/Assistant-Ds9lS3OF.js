import{u as S,r as y,f as w,m as t}from"./index-DFO0WcI4.js";const T=["Find cheapest RTX 4090 for SDXL fine-tuning","How much for 5000 tokens on Mistral-7B?","Deploy inference job to best provider","Compare GPU prices for training LLaMA 3","What's the best GPU for image generation?","Estimate cost for 8-hour fine-tuning job"];function I({card:d,onAction:g}){return t.jsxs("div",{className:"glass rounded-xl p-4 border border-white/10 hover:border-cyan-500/20 transition-all",children:[t.jsxs("div",{className:"flex items-center justify-between mb-2",children:[t.jsxs("div",{children:[t.jsx("h4",{className:"text-sm font-bold text-slate-200",children:d.title}),d.subtitle&&t.jsx("p",{className:"text-xs text-slate-500",children:d.subtitle})]}),d.badge&&t.jsx("span",{className:"text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold",children:d.badge})]}),d.meta&&t.jsx("div",{className:"grid grid-cols-3 gap-2 mb-3",children:d.meta.map((p,h)=>t.jsxs("div",{className:"text-center",children:[t.jsx("p",{className:"text-[10px] text-slate-500 uppercase",children:p.label}),t.jsx("p",{className:"text-xs font-mono text-cyan-400",children:p.value})]},h))}),d.action&&t.jsx("button",{onClick:()=>g(d.action.action,d.action.payload),className:"w-full py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:brightness-110 transition-all",children:d.action.label})]})}function k({number:d,title:g,desc:p,active:h}){return t.jsxs("div",{className:`flex items-start gap-3 p-3 rounded-lg border transition-all ${h?"bg-cyan-500/5 border-cyan-500/20":"bg-white/[0.02] border-white/5"}`,children:[t.jsx("div",{className:`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${h?"bg-cyan-500 text-slate-950":"bg-white/10 text-slate-500"}`,children:d}),t.jsxs("div",{children:[t.jsx("p",{className:"text-xs font-semibold text-slate-300",children:g}),t.jsx("p",{className:"text-[10px] text-slate-500",children:p})]})]})}function E(){const d=S(),[g,p]=y.useState([{role:"assistant",content:`Hey there! I'm Kinetic Assistant — your personal compute concierge.

I can help you:
• Find the best GPU deals for your workload
• Estimate costs before you deploy
• Recommend providers based on your needs
• Deploy jobs directly from chat
• Explain how proof-of-compute works

What are you working on today?`,actions:[{label:"Browse GPUs",action:"navigate",payload:{to:"/explore"}},{label:"View Models",action:"navigate",payload:{to:"/models"}}]}]),[h,x]=y.useState(""),[j,N]=y.useState(!1),[v,R]=y.useState([]),A=y.useRef(null),_=y.useRef(null);y.useEffect(()=>{w("/providers").then(a=>{const s=Array.isArray(a)?a:[];R(s.map(e=>({name:e.name||e.id,id:e.id,gpu_model:e.gpu_model||"Unknown",vram_gb:e.vram_gb||0,price_per_hour:e.price_per_hour||0,uptime:e.uptime||99,status:e.status||"active"})))}).catch(()=>{})},[]),y.useEffect(()=>{var a;(a=A.current)==null||a.scrollIntoView({behavior:"smooth"})},[g]);const G=async()=>{if(!h.trim())return;const a=h.trim();p(s=>[...s,{role:"user",content:a}]),x(""),N(!0);try{const s=await w("/assistant/chat",{method:"POST",body:JSON.stringify({messages:[...g,{role:"user",content:a}],provider_context:{providers:v.map(o=>({name:o.name,id:o.id,gpu_model:o.gpu_model,vram_gb:o.vram_gb,price_per_hour:o.price_per_hour,uptime:o.uptime,status:o.status}))}})}),e=P(s,a,v);p(o=>[...o,e])}catch(s){console.warn("LLM backend failed, using fallback:",s),setTimeout(()=>{const e=$(a,v);p(o=>[...o,e])},300)}finally{N(!1)}},P=(a,s,e)=>{var i;const o=s.toLowerCase(),r=a.cards||[],n=a.actions||[];if(o.includes("gpu")||o.includes("rtx")||o.includes("a100")||o.includes("h100")||o.includes("recommend")||o.includes("best")){const l=e.filter(u=>u.status==="active");l.length>0&&[...l].sort((c,m)=>(c.price_per_hour||0)-(m.price_per_hour||0)).slice(0,3).forEach((c,m)=>{var b,f;r.push({type:"provider",title:c.name||c.id,subtitle:c.gpu_model||"Unknown",badge:m===0?"Best Value":m===1?"Balanced":"Premium",meta:[{label:"Price",value:`${((b=c.price_per_hour)==null?void 0:b.toFixed(2))||0} A/hr`},{label:"VRAM",value:`${c.vram_gb||0}GB`},{label:"Uptime",value:`${((f=c.uptime)==null?void 0:f.toFixed(1))||99}%`}],action:{label:"Deploy Here",action:"deploy",payload:{providerId:c.id,providerName:c.name,tokens:1e3}}})})}if(o.includes("cost")||o.includes("price")||o.includes("estimate")||o.includes("how much")||o.includes("tokens")){const l=o.match(/(\d+)/),u=l?parseInt(l[1]):1e3,c=e.length>0?e.reduce((f,F)=>f+(F.price_per_hour||0),0)/e.length:1.5,m=(c*(u/3600)).toFixed(4),b=(u/3600).toFixed(2);r.unshift({type:"cost",title:"Cost Estimate",subtitle:`${u.toLocaleString()} tokens`,badge:"Estimate",meta:[{label:"Total",value:`${m} ALGO`},{label:"Duration",value:`~${b} hrs`},{label:"Avg Rate",value:`${c.toFixed(2)} A/hr`}]})}if((o.includes("deploy")||o.includes("run")||o.includes("launch"))&&r.push({type:"workflow",title:"Auto-Deploy Workflow",meta:[{label:"Step 1",value:"Select provider"},{label:"Step 2",value:"Lock escrow"},{label:"Step 3",value:"Execute job"}]}),o.includes("route")||o.includes("routing")||o.includes("provider")){const l=e.filter(u=>u.status==="active");if(l.length>0){const u=l.sort((m,b)=>(m.price_per_hour||0)-(b.price_per_hour||0))[0],c=l.sort((m,b)=>(b.uptime||0)-(m.uptime||0))[0];r.push({type:"routing",title:"Smart Routing",subtitle:"Recommended based on your query",meta:[{label:"Cheapest",value:u.name||u.id},{label:"Most Reliable",value:c.name||c.id},{label:"Active",value:`${l.length} providers`}]})}}return{role:"assistant",content:((i=a.message)==null?void 0:i.content)||a.content||"Here is what I found:",actions:n.length>0?n:[{label:"Browse GPUs",action:"navigate",payload:{to:"/explore"}},{label:"Submit Job",action:"navigate",payload:{to:"/submit"}}],cards:r}},L=async(a,s)=>{if(a==="deploy"){p(e=>[...e,{role:"assistant",content:`Deploying your job to **${s.providerName}** now...`,cards:[{type:"workflow",title:"Deployment Progress",meta:[{label:"Provider",value:s.providerName},{label:"Status",value:"Initializing..."}]}]}]);try{const e=await w("/job",{method:"POST",body:JSON.stringify({type:"inference",tokens:s.tokens||1e3,payload:JSON.stringify({auto_selected:!0,provider:s.providerId})})});p(o=>[...o,{role:"assistant",content:`✅ Job deployed successfully!

**Job ID:** ${e.job_id}
**Result Hash:** ${e.result_hash?e.result_hash.slice(0,20)+"...":"N/A"}
**Duration:** ${e.duration_ms||0}ms

You can track it in the Monitor or My Jobs page.`,actions:[{label:"Open Monitor",action:"navigate",payload:{to:"/monitor"}},{label:"View My Jobs",action:"navigate",payload:{to:"/jobs"}}]}])}catch(e){p(o=>[...o,{role:"assistant",content:`❌ Deployment failed: ${e.message||"Unknown error"}

Make sure the backend is running on port 8000.`}])}}},$=(a,s)=>{const e=a.toLowerCase();if(/^(hi|hello|hey|yo|sup|hola)/.test(e))return{role:"assistant",content:"Hey! Ready to find you some GPU power. What kind of workload are you running — inference, training, or fine-tuning?"};if(e.includes("cheapest")||e.includes("best price")||e.includes("lowest")||e.includes("budget")){const r=s.filter(i=>i.status==="active");if(r.length===0)return{role:"assistant",content:"Hmm, no providers are online right now. You could be the first one! Want to register your GPU and start earning?",actions:[{label:"Register Provider",action:"navigate",payload:{to:"/provide"}}]};const n=[...r].sort((i,l)=>(i.price_per_hour||0)-(l.price_per_hour||0))[0];return{role:"assistant",content:`Found the best deal for you. A 1000-token inference job on **${n.name}** costs roughly **${((n.price_per_hour||0)*.28).toFixed(3)} ALGO**.`,cards:[{type:"provider",title:n.name||n.id,subtitle:n.gpu_model,badge:"Cheapest",meta:[{label:"Price",value:`${(n.price_per_hour||0).toFixed(2)} ALGO/hr`},{label:"VRAM",value:`${n.vram_gb||0}GB`},{label:"Uptime",value:`${(n.uptime||99).toFixed(1)}%`}],action:{label:"Deploy Here",action:"deploy",payload:{providerId:n.id,providerName:n.name,tokens:1e3}}}],actions:[{label:"Browse All GPUs",action:"navigate",payload:{to:"/explore"}}]}}const o=[{keyword:"rtx 4090",name:"RTX 4090"},{keyword:"h100",name:"H100"},{keyword:"a100",name:"A100"},{keyword:"3090",name:"RTX 3090"},{keyword:"4090",name:"RTX 4090"}];for(const r of o)if(e.includes(r.keyword)){const n=s.filter(l=>(l.gpu_model||"").toLowerCase().includes(r.keyword));if(n.length===0)return{role:"assistant",content:`No ${r.name} providers are online right now. Would you like me to find the next best option?`,actions:[{label:"Find cheapest GPU",action:"navigate",payload:{to:"/explore"}}]};const i=n.sort((l,u)=>(l.price_per_hour||0)-(u.price_per_hour||0))[0];return{role:"assistant",content:`Found **${n.length}** ${r.name} provider(s).

Best value: **${i.name}**
• Price: ${(i.price_per_hour||0).toFixed(2)} ALGO/hr
• VRAM: ${i.vram_gb}GB
• Uptime: ${(i.uptime||99).toFixed(1)}%`,actions:[{label:`Deploy to ${i.name}`,action:"deploy",payload:{providerId:i.id,providerName:i.name,tokens:1e3}},{label:"View All",action:"navigate",payload:{to:"/explore"}}]}}if(e.includes("cost")||e.includes("price")||e.includes("estimate")||e.includes("how much")){const r=e.match(/(\d+)/),n=r?parseInt(r[1]):1e3,i=s.length>0?s.reduce((u,c)=>u+(c.price_per_hour||0),0)/s.length:1.5,l=(i*(n/3600)).toFixed(4);return{role:"assistant",content:`For **${n} tokens**, you're looking at roughly **${l} ALGO** based on current market rates.

Pricing tiers:
• Budget (RTX 3090): ~${(.65*n/3600).toFixed(3)} ALGO
• Standard (RTX 4090): ~${(1.4*n/3600).toFixed(3)} ALGO
• Premium (H100): ~${(4.5*n/3600).toFixed(3)} ALGO

Want me to find the best provider for your budget?`,cards:[{type:"cost",title:"Cost Estimate",subtitle:`${n.toLocaleString()} tokens`,badge:"Estimate",meta:[{label:"Total",value:`${l} ALGO`},{label:"Duration",value:`~${(n/3600).toFixed(2)} hrs`},{label:"Avg Rate",value:`${i.toFixed(2)} A/hr`}]}],actions:[{label:"Find Cheapest",action:"navigate",payload:{to:"/explore"}},{label:"Submit Job",action:"navigate",payload:{to:"/submit"}}]}}return e.includes("inference")||e.includes("llama")||e.includes("chat")||e.includes("stable diffusion")||e.includes("sdxl")?{role:"assistant",content:`For **LLM inference**, I'd recommend:

1. **RTX 4090** (24GB) — Best price/performance for most models
2. **A100** (40-80GB) — If you're running 70B+ parameter models

For **image generation (SDXL)**, an RTX 4090 with 24GB VRAM handles 1024×1024 images smoothly.

Want me to find available providers for your specific model?`,actions:[{label:"Find RTX 4090",action:"navigate",payload:{to:"/explore"}},{label:"Browse Model Hub",action:"navigate",payload:{to:"/models"}}]}:e.includes("training")||e.includes("fine-tune")||e.includes("finetune")?{role:"assistant",content:`For **training / fine-tuning**, you'll want serious VRAM:

• **LoRA fine-tuning (7B models)**: RTX 4090 (24GB) works
• **Full fine-tuning (7B)**: A100 40GB minimum
• **70B models**: H100 80GB or multi-GPU setup

Training jobs typically run 1-12 hours. At ~1.4 ALGO/hr for an RTX 4090, a 4-hour fine-tune costs about **5.6 ALGO**.`,actions:[{label:"Find H100 Providers",action:"navigate",payload:{to:"/explore"}},{label:"Submit Training Job",action:"navigate",payload:{to:"/submit"}}]}:e.includes("proof")||e.includes("verify")||e.includes("trust")||e.includes("secure")||e.includes("safe")?{role:"assistant",content:`Great question — trust is everything in a decentralized marketplace.

Here's how Kinetic guarantees honest compute:

1. **Escrow Lock**: Your ALGO payment is locked in a TEAL smart contract on Algorand TestNet before any work begins.

2. **Sandboxed Execution**: Providers run your workload in an isolated Docker container.

3. **Cryptographic Proof**: After execution, the result is hashed with SHA-256. This hash is stored on-chain.

4. **Conditional Release**: The escrow only releases funds after the proof is verified. If a provider cheats, they don't get paid.

It's like a smart contract escrow on steroids — designed specifically for compute verification.`,actions:[{label:"View Contracts",action:"navigate",payload:{to:"/"}}]}:e.includes("model")||e.includes("hub")||e.includes("hugging face")||e.includes("download")?{role:"assistant",content:`The **Model Hub** has pre-configured models ready to deploy instantly:

• **Llama-3-8B-Instruct** — Best open chat model
• **Stable Diffusion XL** — High-res image generation
• **Whisper-Large-v3** — Speech-to-text in 99 languages
• **YOLOv8** — Real-time object detection
• **Mistral-7B** — Efficient and powerful LLM

Each model card shows compute requirements, license, and a one-click deploy button.`,actions:[{label:"Browse Model Hub",action:"navigate",payload:{to:"/models"}},{label:"Upload My Model",action:"navigate",payload:{to:"/models"}}]}:e.includes("wallet")||e.includes("balance")||e.includes("payment")||e.includes("algo")?{role:"assistant",content:`Kinetic uses **Algorand TestNet** for all payments. Here's what you need to know:

• Connect your **Pera Wallet** (mobile app) via the button in the navbar
• All transactions cost ~**0.001 ALGO** (basically free)
• Payments are locked in escrow until job completion
• Providers receive ALGO instantly after proof verification

If you don't have TestNet ALGO, you can get some from the Algorand TestNet dispenser.`,actions:[{label:"Open Wallet",action:"navigate",payload:{to:"/wallet"}},{label:"Get TestNet ALGO",action:"navigate",payload:{to:"https://testnet.algoexplorer.io/dispenser"}}]}:e.includes("provider")||e.includes("earn")||e.includes("idle")||e.includes("money")||e.includes("income")?{role:"assistant",content:`Turning your idle GPU into passive income is straightforward:

1. **Register** your hardware (GPU model, VRAM, price/hour)
2. **Keep your node online** — jobs come to you automatically
3. **Execute workloads** in a Docker sandbox
4. **Get paid in ALGO** instantly after proof verification

Current market rates:
• RTX 3090: ~0.65 ALGO/hr
• RTX 4090: ~1.40 ALGO/hr
• H100: ~4.50 ALGO/hr

If you run your GPU 8 hours/day at 1.4 ALGO/hr, that's **11.2 ALGO/day**.`,actions:[{label:"Register Provider",action:"navigate",payload:{to:"/provide"}},{label:"Provider Guide",action:"navigate",payload:{to:"https://github.com/Shivanikinagi/KINETIC/blob/main/docs/PROVIDER_GUIDE.md"}}]}:e.includes("help")||e.includes("what can you do")||e.includes("commands")?{role:"assistant",content:`Here's what I can help you with:

**Finding Compute**
• "Find cheapest GPU"
• "Find RTX 4090"
• "Best GPU for Stable Diffusion"

**Cost Estimation**
• "How much for 5000 tokens?"
• "Estimate training cost"

**Deploying**
• "Deploy inference job"
• "Run Llama 3"

**Learning**
• "How does proof-of-compute work?"
• "What is escrow?"
• "How do I earn as a provider?"

Just ask naturally — I understand context!`}:/thanks|thank you|thx|ty/.test(e)?{role:"assistant",content:"You're welcome! Happy computing. If you need anything else, just ask."}:{role:"assistant",content:`I'm not sure I fully understood that, but I want to help!

I can assist with:
• Finding the right GPU provider for your workload
• Estimating compute costs
• Deploying jobs directly from chat
• Explaining how Kinetic's proof-of-compute works
• Helping you register as a provider

Could you rephrase, or try asking something like:
• "Find cheapest GPU for inference"
• "How much does training cost?"
• "Deploy a job to RTX 4090"`,actions:[{label:"Browse GPUs",action:"navigate",payload:{to:"/explore"}},{label:"Submit Job",action:"navigate",payload:{to:"/submit"}}]}};return t.jsxs("div",{className:"max-w-4xl mx-auto px-6 py-8 h-[calc(100vh-140px)] flex flex-col",children:[t.jsxs("div",{className:"mb-4",children:[t.jsx("h1",{className:"text-3xl font-bold tracking-tight",children:"AI Assistant"}),t.jsx("p",{className:"text-slate-500 text-sm mt-1",children:"Your compute concierge — find GPUs, estimate costs, deploy jobs"})]}),t.jsxs("div",{className:"flex-1 glass rounded-xl p-4 overflow-y-auto mb-4 space-y-4",children:[g.map((a,s)=>t.jsxs("div",{className:`flex gap-3 ${a.role==="user"?"flex-row-reverse":""}`,children:[t.jsx("div",{className:`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${a.role==="user"?"bg-cyan-500/20 text-cyan-400":"bg-violet-500/20 text-violet-400"}`,children:t.jsx("span",{className:"material-symbols-outlined text-sm",children:a.role==="user"?"person":"smart_toy"})}),t.jsxs("div",{className:`max-w-[85%] md:max-w-[80%] ${a.role==="user"?"text-right":""}`,children:[t.jsx("div",{className:`inline-block rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${a.role==="user"?"bg-cyan-500/10 text-cyan-100 border border-cyan-500/20":"bg-white/[0.03] text-slate-300 border border-white/5"}`,children:a.content}),a.cards&&a.cards.length>0&&t.jsx("div",{className:"mt-3 grid grid-cols-1 md:grid-cols-2 gap-2",children:a.cards.map((e,o)=>e.type==="workflow"?t.jsxs("div",{className:"md:col-span-2 glass rounded-xl p-4 border border-white/10",children:[t.jsx("p",{className:"text-xs font-bold text-slate-300 mb-2",children:e.title}),t.jsxs("div",{className:"space-y-2",children:[t.jsx(k,{number:1,title:"Select Provider",desc:"Choose from available GPUs",active:!0}),t.jsx(k,{number:2,title:"Lock Escrow",desc:"Funds secured in smart contract"}),t.jsx(k,{number:3,title:"Execute & Verify",desc:"Run job and validate proof"})]})]},o):t.jsx(I,{card:e,onAction:L},o))}),a.actions&&t.jsx("div",{className:"flex flex-wrap gap-2 mt-2",children:a.actions.map((e,o)=>t.jsx("button",{onClick:()=>{var r,n,i;e.action==="navigate"?(n=(r=e.payload)==null?void 0:r.to)!=null&&n.startsWith("http")?window.open(e.payload.to,"_blank"):d(((i=e.payload)==null?void 0:i.to)||"/"):L(e.action,e.payload)},className:"text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all",children:e.label},o))})]})]},s)),j&&t.jsxs("div",{className:"flex gap-3",children:[t.jsx("div",{className:"w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0",children:t.jsx("span",{className:"material-symbols-outlined text-sm text-violet-400",children:"smart_toy"})}),t.jsxs("div",{className:"bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-2.5",children:[t.jsx("div",{className:"flex items-center gap-2 mb-2",children:t.jsx("span",{className:"text-xs text-slate-500",children:"Kinetic Assistant is thinking"})}),t.jsxs("div",{className:"flex gap-1",children:[t.jsx("span",{className:"w-2 h-2 bg-slate-500 rounded-full animate-bounce",style:{animationDelay:"0ms"}}),t.jsx("span",{className:"w-2 h-2 bg-slate-500 rounded-full animate-bounce",style:{animationDelay:"150ms"}}),t.jsx("span",{className:"w-2 h-2 bg-slate-500 rounded-full animate-bounce",style:{animationDelay:"300ms"}})]})]})]}),t.jsx("div",{ref:A})]}),t.jsxs("div",{className:"glass rounded-xl p-3",children:[t.jsxs("div",{className:"flex gap-2",children:[t.jsx("input",{ref:_,value:h,onChange:a=>x(a.target.value),onKeyDown:a=>a.key==="Enter"&&G(),placeholder:"Ask me anything...",className:"flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"}),t.jsx("button",{onClick:G,disabled:j||!h.trim(),className:"px-4 py-3 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50",children:t.jsx("span",{className:"material-symbols-outlined text-sm",children:"send"})})]}),t.jsx("div",{className:"flex flex-wrap gap-2 mt-2",children:T.slice(0,4).map(a=>t.jsx("button",{onClick:()=>{var s;x(a),(s=_.current)==null||s.focus()},className:"text-[10px] px-2 py-1 rounded-full bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-all",children:a},a))})]})]})}export{E as default};
