(() => {
  const $ = (id) => document.getElementById(id);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer:fine)').matches;
  const track = (name, data={}) => { try { if (window.va) window.va('event', {name, data}); } catch (_) {} };

  const inputs={
    name:$('afp-name'), volume:$('afp-volume'), minutes:$('afp-minutes'), rules:$('afp-rules'), access:$('afp-access'), reverse:$('afp-reverse'), risk:$('afp-risk')
  };
  const labels={volume:$('afp-volume-label'),minutes:$('afp-minutes-label'),rules:$('afp-rules-label'),access:$('afp-access-label'),reverse:$('afp-reverse-label'),risk:$('afp-risk-label')};
  const output={title:$('afp-output-title'),state:$('afp-state'),score:$('afp-score'),autonomy:$('afp-autonomy'),summary:$('afp-summary'),hours:$('afp-hours'),annual:$('afp-annual'),pattern:$('afp-pattern'),patternSub:$('afp-pattern-sub'),control:$('afp-control'),controlSub:$('afp-control-sub'),reasons:$('afp-reasons'),architecture:$('afp-architecture-copy'),railControl:$('afp-rail-control')};

  const defaults={name:'Operations run setup',volume:150,minutes:30,rules:5,access:4,reverse:4,risk:2};
  const presets={
    ops:{name:'Operations run setup',volume:150,minutes:30,rules:5,access:4,reverse:4,risk:2},
    support:{name:'Production support triage',volume:240,minutes:45,rules:4,access:5,reverse:5,risk:2},
    payments:{name:'Payment exception handling',volume:90,minutes:25,rules:4,access:4,reverse:2,risk:5}
  };
  let firstInteraction=true;

  function paintRange(input){
    const pct=(+input.value-+input.min)/(+input.max-+input.min)*100;
    input.style.background=`linear-gradient(90deg,#7f9bbb 0 ${pct}%,rgba(142,162,188,.14) ${pct}% 100%)`;
  }
  function setValues(v){ Object.keys(v).forEach(k=>{ if(inputs[k]) inputs[k].value=v[k]; }); calculate(false); }

  function calculate(userInitiated=true){
    const name=inputs.name.value.trim()||'Untitled workflow';
    const volume=+inputs.volume.value, minutes=+inputs.minutes.value, rules=+inputs.rules.value, access=+inputs.access.value, reverse=+inputs.reverse.value, risk=+inputs.risk.value;
    const repetition=Math.min(100,(volume/220)*100);
    const timeValue=Math.min(100,(minutes/60)*100);
    const base=(rules/5)*27+(access/5)*26+(reverse/5)*17+repetition*.18+timeValue*.12;
    const riskPenalty=(risk-1)*3.5 + Math.max(0,risk-reverse)*2.5;
    const score=Math.max(18,Math.min(96,Math.round(base-riskPenalty)));

    let tier, state, autonomy, efficiency, pattern, patternSub, control, controlSub, summary, railControl;
    if(score>=82 && risk<=3 && reverse>=4){
      tier='bounded'; state='VERY STRONG FIT'; autonomy='Bounded autonomous agent'; efficiency=.72; pattern='APIs + typed actions'; patternSub='policy gates around every write'; control='Policy-bounded autonomy'; controlSub='audit trail · limits · deterministic validation'; railControl='Policy gates';
      summary='High structure, access, and reversibility support bounded autonomy — but only inside explicit policy and validation constraints.';
    } else if(score>=66){
      tier='supervised'; state='STRONG FIT'; autonomy='Supervised agent'; efficiency=.65; pattern='APIs + typed actions'; patternSub='approval before consequential action'; control='Human approval'; controlSub='logs · deterministic validation · rollback'; railControl='Approval gate';
      summary='The workflow is agent-shaped, but approval should remain at the consequence boundary until evidence justifies more autonomy.';
    } else if(score>=48){
      tier='copilot'; state='SELECTIVE FIT'; autonomy='Copilot'; efficiency=.48; pattern='Retrieval + recommendations'; patternSub='human owns the final action'; control='Human execution'; controlSub='citations · confidence · deterministic checks'; railControl='Human executes';
      summary='There is useful AI leverage here, but the system should recommend rather than act until the workflow becomes more structured or reversible.';
    } else {
      tier='assist'; state='LOW AUTONOMY FIT'; autonomy='Assist / automate pieces'; efficiency=.30; pattern='Retrieval + deterministic workflow'; patternSub='do not force an agent abstraction'; control='Deterministic workflow'; controlSub='human judgment stays primary'; railControl='Human judgment';
      summary='The workflow is not a strong candidate for agentic action today. Automate deterministic pieces and improve the inputs first.';
    }

    const hours=Math.round(volume*minutes/60*efficiency);
    const annual=hours*52;
    const reasons=[];
    reasons.push(rules>=4?'Rules are clear enough to define an action boundary.':'Ambiguous rules make model judgment harder to evaluate and govern.');
    reasons.push(access>=4?'The system can access enough live context to ground decisions.':'Weak system/data access limits what an agent can reliably know.');
    reasons.push(reverse>=4?'Actions are relatively reversible, reducing the cost of bounded experimentation.':'Low reversibility raises the bar for autonomous action.');
    if(risk>=4) reasons.push('High failure consequence argues for a hard human or policy gate even if the model is capable.');
    else reasons.push('Failure consequence is manageable enough to expand autonomy with evidence.');

    labels.volume.textContent=volume; labels.minutes.textContent=minutes; labels.rules.textContent=`${rules} / 5`; labels.access.textContent=`${access} / 5`; labels.reverse.textContent=`${reverse} / 5`; labels.risk.textContent=`${risk} / 5`;
    Object.values(inputs).filter(x=>x?.type==='range').forEach(paintRange);
    output.title.textContent=name; output.state.textContent=state; output.score.textContent=score; output.autonomy.textContent=autonomy; output.summary.textContent=summary; output.hours.textContent=`${hours.toLocaleString()} hrs / wk`; output.annual.textContent=`≈ ${annual.toLocaleString()} hrs / yr`; output.pattern.textContent=pattern; output.patternSub.textContent=patternSub; output.control.textContent=control; output.controlSub.textContent=controlSub; output.reasons.innerHTML=reasons.map(r=>`<li>${r}</li>`).join(''); output.railControl.textContent=railControl;
    output.architecture.innerHTML=`For <strong>${escapeHtml(name)}</strong>, the recommendation is <strong>${autonomy.toLowerCase()}</strong>: ${tier==='bounded'?'retrieve live context, use bounded typed actions, enforce policy gates, and expand scope only through eval evidence.':tier==='supervised'?'retrieve live context, call bounded domain APIs, validate deterministic rules, then request approval before consequential action.':tier==='copilot'?'ground recommendations in live context and evidence, but keep execution with the user.':'automate deterministic pieces first and preserve human judgment while the workflow becomes more structured.'}`;
    document.querySelectorAll('.autonomy-ladder [data-level]').forEach(el=>el.classList.toggle('active',el.dataset.level===tier));
    if(userInitiated && firstInteraction){firstInteraction=false;track('AgentFit Full Product Interacted',{tier,score});}
    return {name,score,autonomy,hours,annual,pattern,control,tier};
  }
  function escapeHtml(s){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  Object.values(inputs).forEach(input=>input?.addEventListener(input.type==='text'?'input':'input',()=>calculate(true)));
  document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>{setValues(presets[btn.dataset.preset]);track('AgentFit Preset Used',{preset:btn.dataset.preset});}));
  $('afp-reset').addEventListener('click',()=>{setValues(defaults);track('AgentFit Reset');});
  $('afp-copy').addEventListener('click',async()=>{
    const r=calculate(false);
    const text=`AgentFit — ${r.name}\nFit: ${r.score}/100\nRecommendation: ${r.autonomy}\nEstimated capacity returned: ${r.hours} hrs/week\nSystem pattern: ${r.pattern}\nControl posture: ${r.control}`;
    try{await navigator.clipboard.writeText(text);$('afp-copy').innerHTML='Copied ✓';setTimeout(()=>$('afp-copy').innerHTML='Copy recommendation <span>↗</span>',1500);track('AgentFit Recommendation Copied',{tier:r.tier,score:r.score});}catch(_){$('afp-copy').textContent='Copy unavailable';}
  });
  track('AgentFit Full Product Viewed');
  calculate(false);
})();
