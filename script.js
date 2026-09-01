const root = document.documentElement;
const body = document.body;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer:fine)').matches;

function trackEvent(name, data = {}) {
  try {
    if (typeof window.va === 'function') window.va('event', { name, data });
  } catch (_) {}
}

// Localized spotlights and restrained tilt
const spotlightCards = document.querySelectorAll('.spotlight-card');
spotlightCards.forEach((card) => {
  if (!finePointer) return;
  card.addEventListener('pointermove', (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--card-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--card-y', `${e.clientY - rect.top}px`);
  });
});
if (!prefersReduced && finePointer) {
  document.querySelectorAll('.tilt-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - .5;
      const dy = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(1100px) rotateX(${(-dy * 1.7).toFixed(2)}deg) rotateY(${(dx * 1.7).toFixed(2)}deg) translateY(-2px)`;
    });
    card.addEventListener('pointerleave', () => card.style.transform = '');
  });
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX-r.left-r.width/2)*.07}px, ${(e.clientY-r.top-r.height/2)*.1}px)`;
    });
    el.addEventListener('pointerleave', () => el.style.transform = '');
  });
}

// Reveal on scroll
const reveals = document.querySelectorAll('.reveal');
reveals.forEach(el => { if (el.dataset.delay) el.style.setProperty('--delay', `${el.dataset.delay}ms`); });
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: .10, rootMargin: '0px 0px -35px' });
  reveals.forEach(el => revealObserver.observe(el));
} else reveals.forEach(el => el.classList.add('is-visible'));

// Nav + header
const navLinks = [...document.querySelectorAll('.nav-link')];
const sections = [...document.querySelectorAll('[data-section]')];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-38% 0px -52% 0px', threshold: 0 });
sections.forEach(section => sectionObserver.observe(section));
const header = document.querySelector('.site-header');
const setHeader = () => header.classList.toggle('scrolled', window.scrollY > 20);
setHeader(); window.addEventListener('scroll', setHeader, { passive:true });
const menu = document.querySelector('.menu-toggle'); const nav = document.querySelector('.main-nav');
menu?.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); menu?.setAttribute('aria-expanded','false'); }));

// Track recruiter-intent CTAs
for (const el of document.querySelectorAll('[data-track]')) {
  el.addEventListener('click', () => trackEvent('CTA Click', { label: el.dataset.track }));
}

const cases = {
  iport: {
    number:'01', type:'PRODUCTION AI · 0→1', title:'Production Operations AI Agent', alias:'Internal product: I-Port',
    meta:[['Role','Lead Product Manager'],['Stage','0→1 → Production'],['Focus','Agentic Operations']],
    summary:'A production AI agent embedded in a live operations workflow to collapse a senior-engineering setup bottleneck from hours to minutes while preserving bounded actions, operator control, and production reliability.',
    metrics:[['3.5h → 8m','workflow setup'],['3×','run volume at constant headcount'],['0','AI-initiated configuration errors / 6 months']],
    decisionFlow:[['Before','3.5h expert setup','Senior engineering was the throughput bottleneck.'],['Product decision','Bounded agent in workflow','Use live operational context, typed/bounded actions, and operator visibility.'],['After','8m + 3× volume','Operations absorbed materially more throughput without added headcount.']],
    decisions:['Bounded autonomy','Human visibility','Live operational context','Production quality metric'],
    blocks:[
      ['The problem','A high-value run setup depended on a lengthy senior-engineering workflow. It was reliable, but the dependency constrained throughput and made higher volume expensive to support.'],
      ['Product decision','Treat the bottleneck as an operations product, not a chatbot. The agent sits inside the workflow, receives authorized operational context, and acts only through bounded product surfaces.'],
      ['System pattern',['Assembles only the context needed for the current workflow','Uses controlled tool actions rather than open-ended system access','Keeps operator visibility and intervention in the execution loop','Measures setup speed, throughput, and configuration quality in production']],
      ['My role','Owned 0-to-1 strategy and launch: framed the workflow, defined the agent boundary and success metrics, worked through controls and rollout, and tied the product to measurable operating leverage.'],
      ['Outcome','Setup fell from 3.5 hours to 8 minutes, run volume scaled 3x at constant headcount, and the agent recorded zero AI-initiated configuration errors in its first six months.']
    ]
  },
  coco: {
    number:'02', type:'PRODUCTION AI · MCP', title:'AI Incident Investigation Agent', alias:'Internal product: QT CoCo',
    meta:[['Role','Lead Product Manager'],['Stage','Production'],['Focus','MCP · Expert Support']],
    summary:'A domain-aware support agent that turns years of production knowledge into fast, evidence-backed incident diagnosis before senior engineering has to step in.',
    metrics:[['4.5h → 11m','expert incident investigation'],['−78%','escalations to engineering'],['750+','senior engineering hours returned / year']],
    decisionFlow:[['Before','4.5h investigation','Deep system knowledge lived with a small group of experts.'],['Product decision','MCP-backed evidence triage','Retrieve domain evidence and structure diagnosis before escalating.'],['After','11m investigation','Fewer escalations and 750+ senior engineering hours returned annually.']],
    decisions:['Domain-specific MCP','Evidence first','Escalation boundary','Expert time as KPI'],
    blocks:[
      ['The problem','Institutional production support relied on deep system knowledge accumulated over years. Investigations were slow and frequently escalated from operations to senior engineering.'],
      ['Product decision','Build for diagnosis, not generic Q&A. The agent retrieves domain evidence through two specialized MCP surfaces, applies production-support knowledge, and sharpens the incident before any escalation.'],
      ['System pattern',['Connects the agent to curated operational context through domain-specific MCP','Surfaces evidence relevant to the incident instead of generic answers','Structures triage so issues can be resolved or sharply scoped before escalation','Uses investigation time and escalation rate as production success criteria']],
      ['My role','Led development and launch, shaped the domain boundaries and support workflows, and focused the product on actionable diagnosis and engineering leverage.'],
      ['Outcome','Expert investigation time fell from 4.5 hours to 11 minutes, escalations to engineering dropped 78%, and 750+ senior engineering hours per year were redirected to product development.']
    ]
  },
  agentfit: {
    number:'03', type:'INDEPENDENT BUILD · INTERACTIVE', title:'AgentFit — Workflow Opportunity Mapper', alias:'Built outside work',
    meta:[['Role','Product / Builder'],['Stage','Prototype'],['Focus','AI Opportunity Selection']],
    summary:'An interactive decision product for evaluating where an AI agent belongs, how autonomous it should be, and what control/system pattern fits the workflow.',
    metrics:[['Fit score','workflow suitability'],['Autonomy','assist → supervised agent'],['Capacity','illustrative hours returned']],
    decisionFlow:[['Before','AI idea by intuition','Teams can jump from “LLM possible” to “agent project” too quickly.'],['Product decision','Score workflow + controls','Make repeatability, system access, reversibility, and economics explicit.'],['After','Prioritized agent thesis','A concrete autonomy level, system pattern, and value hypothesis to test.']],
    decisions:['Workflow-first','Autonomy ladder','Control pattern','Economic hypothesis'],
    blocks:[
      ['The problem','“Can AI do this?” is not enough to prioritize an agent. A useful product decision also needs workflow repetition, accessible context, action reversibility, human judgment, and enough economic value to justify integration.'],
      ['What I built','A browser-based workflow mapper that turns those characteristics into an illustrative fit score, autonomy recommendation, system pattern, and capacity estimate.'],
      ['Product logic',['Start from workflow volume and time cost','Score structure, context access, and reversibility before increasing autonomy','Map higher-risk workflows toward supervised patterns and approval gates','Treat the output as a hypothesis for discovery and prototyping, not a production authorization']],
      ['Why I built it','It reflects how I think about AI product strategy: the scarce skill is not finding places models can be used; it is finding where software can change the operating model enough to matter.'],
      ['Try it','The live demo is embedded directly in this portfolio under Featured Work.']
    ]
  },
  platform: {
    number:'ARCH', type:'AGENT PLATFORM · CONTROLS', title:'AI Platform & Controls', alias:'Generalized enterprise pattern',
    meta:[['Role','Lead Product Manager'],['Scope','5 Enterprise Systems'],['Focus','Reusable Agent Architecture']],
    summary:'A reusable production pattern for human-supervised agents — designed to make tool access, actions, controls, and evaluation consistent across enterprise systems.',
    metrics:[['5','enterprise systems'],['MCP + APIs','reusable system interfaces'],['HITL + evals','production controls']],
    decisions:['Reusable interfaces','Typed actions','Deterministic services','Evaluation baseline'],
    blocks:[
      ['The problem','Individual AI workflows can become one-off integrations quickly. Production scale required a repeatable way to expose domain context and actions while keeping behavior bounded, observable, and reviewable.'],
      ['What I standardized','Human-supervised agent architecture spanning reusable MCP servers, domain APIs, Pydantic-typed actions, deterministic services, and shared evaluation and QA baselines.'],
      ['Control model',['Typed actions constrain what an agent can attempt','Deterministic services keep high-consequence logic outside the model','Human approval gates consequential workflow steps','Evaluation and QA baselines create a repeatable path from prototype to production']],
      ['My role','Standardized the product and control pattern across five enterprise systems so new agent workflows could reuse proven interfaces and deployment principles instead of starting from zero.'],
      ['Why it mattered','The architecture turned agent development from isolated prototypes into a repeatable product capability while preserving trust and control in high-stakes workflows.']
    ]
  },
  crosscurrency: {
    number:'04', type:'0→1 · MULTILATERAL OPTIMIZATION', title:'Cross-Currency Compression', alias:'LCH SwapAgent workflow',
    meta:[['Role','Product Manager'],['Stage','0→1 Launch'],['Focus','Market Structure · Optimization']],
    summary:'A multilateral cross-currency compression product that expanded optimization beyond bilateral relationships and created a new workflow for global banks.',
    metrics:[['$6.5T','previously ineligible bilateral notional'],['18 banks','across 12 currency pairs'],['+34%','greater notional reduction per run']],
    decisions:['Multilateral network','Settlement design','Eligibility constraints','Executable outcome'],
    blocks:[
      ['The problem','Cross-currency exposures were largely optimized in bilateral relationships, limiting the offsets a bank could find across its broader network.'],
      ['What I built','A multilateral cross-currency compression product with LCH SwapAgent as settlement counterparty, creating a new path for institutions to optimize eligible exposure across multiple participants.'],
      ['How it works',['Expands optimization from bilateral pairings to a multilateral network','Uses the settlement structure to support executable outcomes','Applies portfolio optimization across eligible cross-currency positions and currencies','Measures value in notional made eligible and notional eliminated']],
      ['My role','Owned the 0-to-1 launch across product design, eligibility, workflow requirements, institutional onboarding, and GTM.'],
      ['Outcome','The product made $6.5T of previously ineligible bilateral notional available for optimization across 12 currency pairs and enabled 18 banks to achieve 34% greater notional reduction per run than bilateral optimization.']
    ]
  },
  simplified: {
    number:'05', type:'VALUATION · VALIDATION', title:'Valuation & Validation Engine', alias:'Simplified Compression',
    meta:[['Role','Product Manager'],['Stage','0→1 Launch'],['Focus','Valuation · Reliability']],
    summary:'A swap valuation and validation system that moved discrepancy detection earlier and removed a single point of failure from institution-scale compression cycles.',
    metrics:[['$6T+','compression cycles'],['48h','earlier discrepancy detection'],['−91%','failed-run resubmissions']],
    decisions:['Independent valuation','Dual-source validation','Shift-left controls','Reliability KPI'],
    blocks:[
      ['The problem','Large compression cycles depended on consistent valuation across multiple data sources. A discrepancy discovered late could halt a live cycle and force an expensive resubmission.'],
      ['What I built','A swap valuation engine plus a dual-source validation layer that created an independent comparison before the critical production window.'],
      ['How it works',['Produces an independent valuation view','Compares results across two sources before live execution','Surfaces discrepancies early enough for teams to resolve them','Turns data quality from a late-stage operational failure into an explicit product control']],
      ['Scale','The workflow supported $6T+ compression cycles across 24 banks.'],
      ['Outcome','Discrepancies surfaced 48 hours earlier and failed-run resubmissions fell by 91%.']
    ]
  },
  forex: {
    number:'06', type:'FX · PRODUCTION RELIABILITY', title:'FX Forward & NDF Compression', alias:'ForexClear margin workflow',
    meta:[['Role','Product Manager'],['Stage','Production'],['Focus','Margin API · Validation']],
    summary:'FX-forward and NDF compression with margin validation embedded directly in the optimizer and a four-source data-quality layer around live execution.',
    metrics:[['40+','live production runs'],['100%','proposal acceptance'],['−94%','live-run failures']],
    decisions:['Embed margin constraints','Four-source validation','Pre-live quality gate','Acceptance KPI'],
    blocks:[
      ['The problem','FX optimization only creates value if the resulting proposal survives margin constraints, data-quality checks, and real production execution.'],
      ['What I built','FX-forward/NDF compression with the ForexClear margin API embedded in the optimizer, plus a four-source validation layer around production inputs.'],
      ['How it works',['Validates margin constraints inside the optimization workflow','Cross-checks critical data across four sources','Surfaces quality issues before the live production window','Measures success through proposal acceptance and live-run reliability']],
      ['Product result','Across 40+ live runs, proposals achieved 100% acceptance while the validation layer cut live-run failures by 94%.'],
      ['Why it mattered','Reliability is part of the product in institutional markets. Embedding validation upstream made the optimization workflow easier for clients and operators to trust.']
    ]
  },
  margin: {
    number:'07', type:'0→1 · PRE-TRADE ANALYTICS', title:'Pre-Trade Margin Simulator', alias:'OpenGamma What-If',
    meta:[['Role','Product Analyst'],['Stage','0→1'],['Focus','Pre-Trade Margin · Risk']],
    summary:'A pre-trade simulator that made margin consequences visible before execution, turning broker, venue, and product allocation into a measurable product decision.',
    metrics:[['0 → 1','product originated and shipped'],['up to −30%','initial margin for equivalent risk'],['20+','enterprise clients across discovery / adoption']],
    decisions:['Scenario before trade','Native methodology validation','Decision-oriented UX','Capital efficiency KPI'],
    blocks:[
      ['The problem','Trading teams could see current margin but lacked a simple way to compare the incremental margin impact of a proposed trade across brokers, venues, and products before execution.'],
      ['What I built','A pre-trade margin simulator validated against CME SPAN and ICE IRM across OTC and exchange-traded derivatives venues.'],
      ['How it works',['Models proposed trades before execution','Compares margin outcomes across broker, venue, and product scenarios','Uses native clearing methodologies as validation anchors','Turns capital efficiency into a decision input inside the trading workflow']],
      ['Product discovery','Led discovery across trading, treasury, risk, and operations to define margin-simulation capabilities that drove adoption across 20+ enterprise clients, including banks, asset managers, commodity firms, and hedge funds.'],
      ['Outcome','The simulator enabled institutional clients to identify allocations with up to 30% lower initial margin for equivalent risk.']
    ]
  }
};

const modal = document.getElementById('case-modal');
const modalContent = document.getElementById('modal-content');
const closeBtn = modal.querySelector('.modal-close');
const caseOrder = ['iport','coco','agentfit','crosscurrency','simplified','forex','margin','platform'];
let lastFocus = null;
let currentCaseKey = null;
let urlBeforeModal = null;

function blockHTML([title, content], idx, total, key) {
  const full = idx === total - 1 && total % 2 === 1 ? ' case-full' : '';
  const bodyHTML = Array.isArray(content) ? `<ul>${content.map(item=>`<li>${item}</li>`).join('')}</ul>` : `<p>${content}</p>`;
  const liveDemo = key === 'agentfit' && title.toLowerCase() === 'try it'
    ? `<a class="case-action-btn case-block-action" href="#agentfit" data-jump-agentfit>Try live demo <span>↗</span></a>`
    : '';
  return `<section class="case-block${full}"><h4>${title}</h4>${bodyHTML}${liveDemo}</section>`;
}
function decisionFlowHTML(flow) {
  if (!flow) return '';
  return `<div class="case-decision-flow">${flow.map((item,i)=>`${i?'<i></i>':''}<div><small>${item[0]}</small><strong>${item[1]}</strong><span>${item[2]}</span></div>`).join('')}</div>`;
}
function modalVisualHTML(key) {
  const visuals = {
    iport: `<div class="modal-system-visual mv-iport"><span class="mv-label">BOUNDED AGENT / OPERATIONS</span><div class="mv-track mv-manual"><i></i><i></i><i></i><i></i><i></i></div><div class="mv-core">AI</div><div class="mv-track mv-fast"><i></i><i></i><i></i></div><small>3.5H</small><b>8M · 3×</b></div>`,
    coco: `<div class="modal-system-visual mv-coco"><span class="mv-label">MCP / EVIDENCE GRAPH</span><div class="mv-box left">MCP 01</div><div class="mv-box left lower">MCP 02</div><div class="mv-core">AI</div><div class="mv-stack"><i></i><i></i><i></i></div><b>−78% ESCALATIONS</b></div>`,
    agentfit: `<div class="modal-system-visual mv-agentfit"><span class="mv-label">WORKFLOW OPPORTUNITY MODEL</span><div class="mv-ring"><strong>81</strong><small>/100</small></div><div class="mv-fitbars"><i style="--w:82%"></i><i style="--w:68%"></i><i style="--w:91%"></i></div><b>FIT → AUTONOMY → CONTROL</b></div>`,
    platform: `<div class="modal-system-visual mv-platform"><span class="mv-label">REUSABLE AGENT CONTROL PLANE</span><div class="mv-orbit"><i>CTX</i><i>API</i><i>ACT</i><i>QA</i><strong>HITL</strong></div><b>5 ENTERPRISE SYSTEMS</b></div>`,
    crosscurrency: `<div class="modal-system-visual mv-network"><span class="mv-label">MULTILATERAL OPTIMIZATION NETWORK</span><div class="mv-nodes"><i></i><i></i><i></i><i></i><i></i><i></i><b></b></div><strong>$6.5T</strong><small>18 BANKS · 12 CURRENCY PAIRS</small></div>`,
    simplified: `<div class="modal-system-visual mv-validation"><span class="mv-label">DUAL-SOURCE VALIDATION</span><div class="mv-source">SOURCE A</div><div class="mv-source">SOURCE B</div><div class="mv-check">✓</div><strong>48H EARLIER</strong><small>−91% RESUBMISSIONS</small></div>`,
    forex: `<div class="modal-system-visual mv-forex"><span class="mv-label">FOUR-SOURCE MARGIN VALIDATION</span><div class="mv-streams"><i></i><i></i><i></i><i></i></div><div class="mv-gate">FX / NDF</div><strong>100%</strong><small>PROPOSAL ACCEPTANCE</small></div>`,
    margin: `<div class="modal-system-visual mv-margin"><span class="mv-label">PRE-TRADE SCENARIO ENGINE</span><div class="mv-bars"><i></i><i></i><i></i><i></i></div><div class="mv-line"></div><strong>UP TO −30%</strong><small>INITIAL MARGIN</small></div>`
  };
  return visuals[key] || '';
}
function renderCase(key) {
  const c = cases[key]; if (!c) return;
  currentCaseKey = key;
  const idx = caseOrder.indexOf(key); const prevKey = caseOrder[(idx-1+caseOrder.length)%caseOrder.length]; const nextKey = caseOrder[(idx+1)%caseOrder.length];
  modalContent.innerHTML = `
    <span class="modal-eyebrow">${c.number} / ${c.type}</span>
    <h3 class="modal-title" id="case-title">${c.title}</h3>
    <span class="internal-name">${c.alias}</span>
    <p class="modal-summary">${c.summary}</p>
    <div class="case-meta-row">${c.meta.map(m=>`<div class="case-meta-item"><b>${m[0]}</b><span>${m[1]}</span></div>`).join('')}</div>
    ${modalVisualHTML(key)}
    ${decisionFlowHTML(c.decisionFlow)}
    <div class="decision-chips">${c.decisions.map(x=>`<span>${x}</span>`).join('')}</div>
    <div class="case-path"><span>Problem</span><i></i><span>Decision</span><i></i><span>System</span><i></i><span>Outcome</span></div>
    <div class="modal-metrics">${c.metrics.map(m=>`<div class="modal-metric"><strong>${m[0]}</strong><span>${m[1]}</span></div>`).join('')}</div>
    <div class="case-grid">${c.blocks.map((b,i)=>blockHTML(b,i,c.blocks.length,key)).join('')}</div>
    <div class="case-actions"><button class="case-action-btn" type="button" data-share-case>Copy direct link</button></div>
    <div class="case-nav"><button class="case-nav-btn" type="button" data-case-nav="${prevKey}"><small>← Previous case</small><strong>${cases[prevKey].title}</strong></button><button class="case-nav-btn" type="button" data-case-nav="${nextKey}"><small>Next case →</small><strong>${cases[nextKey].title}</strong></button></div>`;
  modal.querySelector('.modal-shell').scrollTop = 0;
  trackEvent('Case Viewed', { case: key });
}
function setCaseUrl(key, push=true) {
  const u = new URL(window.location.href); u.searchParams.set('case', key); u.hash='';
  history[push?'pushState':'replaceState']({case:key},'',u);
}
function openCase(key, options={}) {
  if (!cases[key]) return;
  if (!modal.open) { lastFocus=document.activeElement; urlBeforeModal=window.location.href; }
  renderCase(key);
  if (options.updateUrl !== false) setCaseUrl(key, options.pushUrl !== false);
  if (!modal.open) modal.showModal();
  body.style.overflow='hidden'; closeBtn.focus();
}
function closeCase({restoreUrl=true}={}) {
  if (modal.open) modal.close();
  if (restoreUrl && urlBeforeModal) history.replaceState({},'',urlBeforeModal);
}

document.querySelectorAll('[data-project]').forEach(el => el.addEventListener('click', (e) => {
  if (e.target.closest('a')) return;
  openCase(el.dataset.project);
}));
modalContent.addEventListener('click', async (e) => {
  const navBtn=e.target.closest('[data-case-nav]');
  if (navBtn) { renderCase(navBtn.dataset.caseNav); setCaseUrl(navBtn.dataset.caseNav,false); return; }
  const share=e.target.closest('[data-share-case]');
  if (share) {
    const url=new URL(window.location.href); url.searchParams.set('case',currentCaseKey); url.hash='';
    try { await navigator.clipboard.writeText(url.toString()); share.textContent='Link copied ✓'; setTimeout(()=>share.textContent='Copy direct link',1500); trackEvent('Case Link Copied',{case:currentCaseKey}); } catch (_) { share.textContent='Copy unavailable'; }
  }
  const jump=e.target.closest('[data-jump-agentfit]');
  if (jump) { e.preventDefault(); const target=document.querySelector('#agentfit'); closeCase({restoreUrl:true}); setTimeout(()=>target?.scrollIntoView({behavior:prefersReduced?'auto':'smooth',block:'center'}),50); }
});
closeBtn.addEventListener('click',()=>closeCase());
modal.addEventListener('click',(e)=>{ if(e.target===modal) closeCase(); });
modal.addEventListener('cancel',(e)=>{ e.preventDefault(); closeCase(); });
modal.addEventListener('close',()=>{ body.style.overflow=''; lastFocus?.focus(); currentCaseKey=null; });
document.addEventListener('keydown',(e)=>{
  if(!modal.open||!currentCaseKey) return; const idx=caseOrder.indexOf(currentCaseKey);
  if(e.key==='ArrowRight'){ const k=caseOrder[(idx+1)%caseOrder.length]; renderCase(k); setCaseUrl(k,false); }
  if(e.key==='ArrowLeft'){ const k=caseOrder[(idx-1+caseOrder.length)%caseOrder.length]; renderCase(k); setCaseUrl(k,false); }
});
window.addEventListener('popstate',()=>{
  const k=new URL(window.location.href).searchParams.get('case');
  if(k&&cases[k]) openCase(k,{updateUrl:false}); else if(modal.open) { modal.close(); body.style.overflow=''; }
});

// Open deep-linked case on load
const initialCase = new URL(window.location.href).searchParams.get('case');
if (initialCase && cases[initialCase]) setTimeout(()=>openCase(initialCase,{updateUrl:false}),120);

// AgentFit interactive decision model
const af = {
  volume:document.getElementById('af-volume'), minutes:document.getElementById('af-minutes'), rules:document.getElementById('af-rules'), access:document.getElementById('af-access'), reverse:document.getElementById('af-reverse'),
  volumeLabel:document.getElementById('af-volume-label'), minutesLabel:document.getElementById('af-minutes-label'), rulesLabel:document.getElementById('af-rules-label'), accessLabel:document.getElementById('af-access-label'), reverseLabel:document.getElementById('af-reverse-label'), score:document.getElementById('af-score'), autonomy:document.getElementById('af-autonomy'), hours:document.getElementById('af-hours'), pattern:document.getElementById('af-pattern')
};
let agentFitTracked=false;
function paintRange(input){ const pct=(input.value-input.min)/(input.max-input.min)*100; input.style.background=`linear-gradient(90deg,#6884a3 0 ${pct}%,rgba(142,162,188,.16) ${pct}% 100%)`; }
function calculateAgentFit(track=false){
  if(!af.volume) return;
  const volume=+af.volume.value, minutes=+af.minutes.value, rules=+af.rules.value, access=+af.access.value, reverse=+af.reverse.value;
  // Weighted suitability: structure/access/reversibility plus enough repetition and time cost to matter.
  const repetition=Math.min(100,(volume/220)*100); const timeValue=Math.min(100,(minutes/60)*100);
  const score=Math.round((rules/5)*28 + (access/5)*27 + (reverse/5)*18 + repetition*.17 + timeValue*.10);
  const clamped=Math.max(20,Math.min(96,score));
  let autonomy, pattern, efficiency;
  if(clamped>=84){autonomy='Bounded autonomous';pattern='APIs + typed actions + policy gates';efficiency=.72;}
  else if(clamped>=68){autonomy='Supervised agent';pattern='APIs + typed actions + approval';efficiency=.65;}
  else if(clamped>=50){autonomy='Copilot';pattern='Retrieval + suggested actions';efficiency=.48;}
  else {autonomy='Assist / automate pieces';pattern='Retrieval + deterministic workflow';efficiency=.30;}
  const hours=Math.round(volume*minutes/60*efficiency);
  af.volumeLabel.textContent=volume; af.minutesLabel.textContent=minutes; af.rulesLabel.textContent=`${rules}/5`; af.accessLabel.textContent=`${access}/5`; af.reverseLabel.textContent=`${reverse}/5`; af.score.textContent=clamped; af.autonomy.textContent=autonomy; af.hours.textContent=`${hours} hrs / week`; af.pattern.textContent=pattern;
  [af.volume,af.minutes,af.rules,af.access,af.reverse].forEach(paintRange);
  if(track&&!agentFitTracked){agentFitTracked=true;trackEvent('AgentFit Interacted',{score:clamped,autonomy});}
}
[af.volume,af.minutes,af.rules,af.access,af.reverse].filter(Boolean).forEach(input=>input.addEventListener('input',()=>calculateAgentFit(true)));
calculateAgentFit(false);

// Fixed-header anchor correction
window.addEventListener('hashchange',()=>{ const target=document.querySelector(location.hash); if(target) setTimeout(()=>target.scrollIntoView({behavior:prefersReduced?'auto':'smooth',block:'start'}),0); });
