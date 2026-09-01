(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const track = (name, data = {}) => {
    try { if (typeof window.va === 'function') window.va('event', { name, data }); } catch (_) {}
  };

  const machines = [];
  let corePose = null;
  let pointerFrame = 0;
  let scrollFrame = 0;

  const pointer = {
    x: innerWidth * .5, y: innerHeight * .5,
    renderedX: innerWidth * .5, renderedY: innerHeight * .5,
    lastX: innerWidth * .5, lastY: innerHeight * .5,
    lastTime: performance.now(), velocity: 0, velocityTarget: 0,
    material: null, lastMaterial: null
  };

  function resetMaterial(element) {
    if (!element) return;
    element.classList.remove('has-inspection-light');
    element.style.setProperty('--lx', '68%');
    element.style.setProperty('--ly', '28%');
    element.style.setProperty('--mat-angle', '210deg');
    element.style.setProperty('--mat-energy', '0');
    element.style.setProperty('--art-rx', '0deg');
    element.style.setProperty('--art-ry', '0deg');
    element.style.setProperty('--art-z', '0px');
  }

  function requestPointerFrame() {
    if (!pointerFrame && !reduced) pointerFrame = requestAnimationFrame(renderPointer);
  }

  function renderPointer() {
    pointerFrame = 0;
    pointer.renderedX = lerp(pointer.renderedX, pointer.x, .24);
    pointer.renderedY = lerp(pointer.renderedY, pointer.y, .24);
    pointer.velocity = lerp(pointer.velocity, pointer.velocityTarget, .18);
    pointer.velocityTarget *= .82;
    root.style.setProperty('--mx', `${pointer.renderedX.toFixed(1)}px`);
    root.style.setProperty('--my', `${pointer.renderedY.toFixed(1)}px`);
    root.style.setProperty('--pointer-velocity', pointer.velocity.toFixed(3));

    if (pointer.material !== pointer.lastMaterial) {
      resetMaterial(pointer.lastMaterial);
      pointer.lastMaterial = pointer.material;
    }
    if (pointer.material?.isConnected) {
      const rect = pointer.material.getBoundingClientRect();
      const nx = clamp((pointer.renderedX - rect.left) / Math.max(1, rect.width));
      const ny = clamp((pointer.renderedY - rect.top) / Math.max(1, rect.height));
      const x = nx - .5;
      const y = ny - .5;
      pointer.material.classList.add('has-inspection-light');
      pointer.material.style.setProperty('--lx', `${(nx * 100).toFixed(1)}%`);
      pointer.material.style.setProperty('--ly', `${(ny * 100).toFixed(1)}%`);
      pointer.material.style.setProperty('--mat-angle', `${(188 + nx * 74 - ny * 22).toFixed(1)}deg`);
      pointer.material.style.setProperty('--mat-x', nx.toFixed(3));
      pointer.material.style.setProperty('--mat-y', ny.toFixed(3));
      pointer.material.style.setProperty('--mat-energy', clamp(.08 + pointer.velocity * .24, .08, .32).toFixed(3));
      if (pointer.material.matches('.artifact-frame') && !pointer.material.hasAttribute('data-direct-drag')) {
        pointer.material.style.setProperty('--art-ry', `${(x * 2.1).toFixed(2)}deg`);
        pointer.material.style.setProperty('--art-rx', `${(-y * 1.55).toFixed(2)}deg`);
        pointer.material.style.setProperty('--art-z', `${(pointer.velocity * 2.5).toFixed(2)}px`);
      }
    }

    let coreNeedsFrame = false;
    if (corePose) {
      corePose.rx = lerp(corePose.rx, corePose.targetRx, corePose.dragging ? .2 : .11);
      corePose.ry = lerp(corePose.ry, corePose.targetRy, corePose.dragging ? .2 : .11);
      corePose.core.style.setProperty('--core-rx', `${corePose.rx.toFixed(2)}deg`);
      corePose.core.style.setProperty('--core-ry', `${corePose.ry.toFixed(2)}deg`);
      coreNeedsFrame = Math.abs(corePose.rx - corePose.targetRx) > .015 || Math.abs(corePose.ry - corePose.targetRy) > .015;
    }
    const pointerNeedsFrame = Math.abs(pointer.renderedX - pointer.x) > .25 || Math.abs(pointer.renderedY - pointer.y) > .25 || pointer.velocity > .002 || pointer.velocityTarget > .002;
    if (pointerNeedsFrame || coreNeedsFrame) requestPointerFrame();
  }

  function initPointerLight() {
    if (reduced) return;
    addEventListener('pointermove', (event) => {
      const now = performance.now();
      const elapsed = Math.max(12, now - pointer.lastTime);
      pointer.velocityTarget = clamp(Math.hypot(event.clientX - pointer.lastX, event.clientY - pointer.lastY) / elapsed / 1.5);
      pointer.x = event.clientX; pointer.y = event.clientY;
      pointer.lastX = event.clientX; pointer.lastY = event.clientY; pointer.lastTime = now;
      const target = event.target instanceof Element ? event.target : null;
      pointer.material = target?.closest('[data-material]') || null;
      requestPointerFrame();
    }, { passive: true });
    addEventListener('pointerout', (event) => {
      if (event.relatedTarget) return;
      pointer.material = null; pointer.velocityTarget = 0; requestPointerFrame();
    }, { passive: true });
  }

  class InstrumentMachine {
    constructor(frame, config) {
      this.frame = frame; this.config = config; this.id = config.id;
      this.states = new Set(['rest', ...(config.states || []), config.complete || 'complete']);
      this.sequence = config.sequence || [];
      this.state = 'rest'; this.running = false; this.visible = true; this.paused = false;
      this.timer = 0; this.deadline = 0; this.remaining = 0; this.sequenceIndex = -1; this.token = 0;
      this.pinned = null; this.pinnedSource = null; this.previewSource = null; this.inspectables = new Set();
      frame.dataset.instrument = this.id;
      frame.dataset.instrumentState = 'rest';
      frame.dataset.interactionLevel = '1';

      this.status = document.createElement('div');
      this.status.className = 'instrument-state';
      this.status.setAttribute('aria-live', 'polite');
      this.status.innerHTML = `<small>LEVEL 01 / MATERIAL</small><strong>${config.restLabel || 'READY / INSPECT'}</strong>`;
      frame.append(this.status);

      if (config.trigger !== false) {
        this.trigger = document.createElement('button');
        this.trigger.className = 'instrument-trigger';
        this.trigger.type = 'button';
        this.trigger.setAttribute('aria-label', config.triggerAria || config.triggerLabel || 'Run system');
        this.trigger.innerHTML = `<span>${config.triggerLabel || 'RUN SYSTEM'}</span><i aria-hidden="true"></i>`;
        this.trigger.addEventListener('click', (event) => { event.stopPropagation(); this.activate('button'); });
        frame.append(this.trigger);
      } else {
        this.cue = document.createElement('div');
        this.cue.className = 'instrument-cue';
        this.cue.textContent = config.cue || 'MOVE / INSPECT';
        frame.append(this.cue);
      }
      machines.push(this);
      this.setState('rest', { level: 1, label: config.restLabel, announce: false });
    }

    setState(state, options = {}) {
      if (!this.states.has(state)) return;
      const level = options.level || (this.running ? 3 : state === 'rest' ? 1 : 2);
      this.state = state;
      this.frame.dataset.instrumentState = state;
      this.frame.dataset.interactionLevel = String(level);
      const levelNames = { 1: 'MATERIAL', 2: 'INSPECTION', 3: 'ACTIVATION' };
      const label = options.label || this.config.labels?.[state] || state.replaceAll('-', ' ').toUpperCase();
      this.status.querySelector('small').textContent = `LEVEL 0${level} / ${levelNames[level]}`;
      this.status.querySelector('strong').textContent = label;
      this.config.onState?.(state, this, options);
      this.frame.dispatchEvent(new CustomEvent('instrumentstatechange', { detail: { id: this.id, state, level } }));
    }

    registerInspectable(element) { this.inspectables.add(element); }
    updatePressedState() {
      this.inspectables.forEach((element) => {
        if (element.hasAttribute('aria-pressed')) element.setAttribute('aria-pressed', String(element === this.pinnedSource));
      });
    }
    preview(state, label, source) {
      if (this.running) return;
      this.previewSource = source;
      this.setState(state, { level: 2, label });
    }
    clearPreview(source) {
      if (this.running || (source && this.previewSource && source !== this.previewSource)) return;
      this.previewSource = null;
      if (this.pinned) this.setState(this.pinned, { level: 2, label: this.config.labels?.[this.pinned] });
      else this.setState('rest', { level: 1, label: this.config.restLabel });
    }
    pin(state, label, source) {
      if (this.running) return;
      if (this.pinned === state && this.pinnedSource === source) {
        this.pinned = null; this.pinnedSource = null; this.updatePressedState();
        this.setState('rest', { level: 1, label: this.config.restLabel });
        return;
      }
      this.pinned = state; this.pinnedSource = source; this.previewSource = null;
      this.updatePressedState();
      this.setState(state, { level: 2, label });
      track('System Component Pinned', { system: this.id, state });
    }
    activate(source = 'canvas') {
      if (!this.sequence.length) { this.config.activate?.(this, source); return; }
      this.cancelTimer(); this.token += 1; this.running = true; this.paused = false; this.sequenceIndex = -1;
      this.pinned = null; this.pinnedSource = null; this.updatePressedState();
      this.frame.classList.add('is-running');
      if (this.trigger) this.trigger.querySelector('span').textContent = 'RESTART SYSTEM';
      track('System Activated', { system: this.id, source });
      if (reduced) {
        const last = this.sequence.at(-1);
        this.setState(last?.state || this.config.complete || 'complete', { level: 3, label: last?.label || this.config.completeLabel });
        this.finish(); return;
      }
      this.advance(this.token);
    }
    advance(token) {
      if (token !== this.token || !this.running) return;
      this.sequenceIndex += 1;
      if (this.sequenceIndex >= this.sequence.length) { this.finish(); return; }
      const step = this.sequence[this.sequenceIndex];
      this.setState(step.state, { level: 3, label: step.label });
      this.schedule(step.duration || 650, () => this.advance(token));
    }
    schedule(duration, callback) {
      this.cancelTimer(); this.remaining = duration; this.deadline = performance.now() + duration; this.nextCallback = callback;
      if (!this.visible || document.hidden) { this.paused = true; this.frame.dataset.paused = 'true'; return; }
      this.timer = setTimeout(callback, duration);
    }
    cancelTimer() { if (this.timer) clearTimeout(this.timer); this.timer = 0; }
    setVisible(visible) {
      this.visible = visible; this.frame.classList.toggle('is-inview', visible);
      if (!visible && this.running && this.timer) {
        this.remaining = Math.max(30, this.deadline - performance.now()); this.cancelTimer();
        this.paused = true; this.frame.dataset.paused = 'true';
      } else if (visible && this.running && this.paused && !document.hidden) {
        this.paused = false; delete this.frame.dataset.paused; this.schedule(this.remaining || 120, this.nextCallback);
      }
    }
    finish() {
      this.cancelTimer(); this.running = false; this.paused = false; delete this.frame.dataset.paused;
      this.frame.classList.remove('is-running');
      const completeState = this.config.complete || this.sequence.at(-1)?.state || 'complete';
      this.setState(completeState, { level: 3, label: this.config.completeLabel || this.config.labels?.[completeState] || 'SYSTEM COMPLETE' });
      if (this.trigger) this.trigger.querySelector('span').textContent = this.config.replayLabel || 'REPLAY SYSTEM';
    }
    reset() {
      this.token += 1; this.cancelTimer(); this.running = false; this.paused = false; this.sequenceIndex = -1;
      this.pinned = null; this.pinnedSource = null; this.previewSource = null; delete this.frame.dataset.paused;
      this.frame.classList.remove('is-running'); this.updatePressedState();
      if (this.trigger) this.trigger.querySelector('span').textContent = this.config.triggerLabel || 'RUN SYSTEM';
      this.setState('rest', { level: 1, label: this.config.restLabel });
      this.config.onReset?.(this);
    }
  }

  function bindInspectable(machine, element, state, label) {
    if (!element) return;
    element.classList.add('instrument-inspectable');
    element.dataset.inspectState = state;
    if (!element.matches('button,a,input')) { element.tabIndex = 0; element.setAttribute('role', 'button'); }
    element.setAttribute('aria-label', `Inspect ${label.toLowerCase()}`);
    element.setAttribute('aria-pressed', 'false');
    machine.registerInspectable(element);
    element.addEventListener('pointerenter', () => machine.preview(state, label, element));
    element.addEventListener('pointerleave', () => { if (document.activeElement !== element) machine.clearPreview(element); });
    element.addEventListener('focus', () => machine.preview(state, label, element));
    element.addEventListener('blur', () => machine.clearPreview(element));
    element.addEventListener('click', (event) => { event.stopPropagation(); machine.pin(state, label, element); });
    element.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault(); element.click();
    });
  }

  function bindProjectCopy(machine, logicStates = [], metricStates = []) {
    const project = machine.frame.closest('.project');
    if (!project) return;
    const logicRows = [...project.querySelectorAll('.project-logic > div')];
    const metricRows = [...project.querySelectorAll('.impact-ruler > span')];
    logicStates.forEach(([state, label], index) => bindInspectable(machine, logicRows[index], state, label));
    metricStates.forEach(([state, label], index) => bindInspectable(machine, metricRows[index], state, label));
  }

  const systemConfigs = {
    iport: {
      id: 'iport', restLabel: 'READY / CLICK TO RUN', triggerLabel: 'RUN ORCHESTRATION', replayLabel: 'REPLAY ORCHESTRATION', complete: 'complete', completeLabel: '3 PARALLEL LANES / ACTIVE',
      states: ['manual','context','judgment','actions','control','operator','parallel','complete'],
      labels: { manual:'MANUAL / SEQUENTIAL',context:'LIVE CONTEXT',judgment:'AGENT JUDGMENT',actions:'TYPED ACTIONS',control:'DETERMINISTIC CONTROL',operator:'OPERATOR VISIBILITY',parallel:'PARALLEL CAPACITY',complete:'3 PARALLEL LANES / ACTIVE' },
      sequence: [
        {state:'manual',label:'01 / MANUAL SEQUENTIAL SETUP',duration:620},{state:'context',label:'02 / CONTEXT INGESTION',duration:560},{state:'judgment',label:'03 / JUDGMENT',duration:600},{state:'actions',label:'04 / TYPED ACTION',duration:560},{state:'control',label:'05 / CONTROL CHECK',duration:560},{state:'operator',label:'06 / OPERATOR VISIBILITY',duration:540},{state:'parallel',label:'07 / PARALLEL EXECUTION',duration:900}
      ]
    },
    coco: {
      id:'coco',restLabel:'DISTRIBUTED EVIDENCE / READY',triggerLabel:'RESOLVE INVESTIGATION',replayLabel:'REPLAY INVESTIGATION',complete:'resolved',completeLabel:'ROOT CAUSE / EVIDENCE LOCKED',
      states:['run-state','config','telemetry','knowledge','noise','evidence','match','explanation','root','resolved'],
      labels:{'run-state':'RUN STATE',config:'CONFIG',telemetry:'TELEMETRY',knowledge:'SUPPORT KNOWLEDGE',noise:'NOISY SIGNALS',evidence:'EVIDENCE SELECTED',match:'EVIDENCE MATCH',explanation:'EXPLANATION PATH',root:'ROOT CAUSE',resolved:'ROOT CAUSE / EVIDENCE LOCKED'},
      sequence:[{state:'noise',label:'01 / NOISE',duration:560},{state:'evidence',label:'02 / EVIDENCE',duration:700},{state:'match',label:'03 / MATCH',duration:680},{state:'explanation',label:'04 / EXPLANATION',duration:720},{state:'root',label:'05 / ROOT CAUSE',duration:920}]
    },
    crosscurrency: {
      id:'crosscurrency',restLabel:'GROSS NETWORK / READY',triggerLabel:'RUN COMPRESSION',replayLabel:'REPLAY COMPRESSION',complete:'net',completeLabel:'NET EXPOSURE / COMPARE READY',
      states:['gross','path','match','optimize','collapse','net','compare'],
      labels:{gross:'GROSS EXPOSURE',path:'ISOLATED NETWORK PATH',match:'OFFSET MATCH',optimize:'NETWORK OPTIMIZATION',collapse:'COLLAPSING GROSS FLOWS',net:'NET EXPOSURE',compare:'BEFORE / AFTER COMPARISON'},
      sequence:[{state:'gross',label:'01 / GROSS EXPOSURE',duration:560},{state:'match',label:'02 / MATCH',duration:620},{state:'optimize',label:'03 / OPTIMIZE',duration:720},{state:'collapse',label:'04 / COLLAPSE',duration:780},{state:'net',label:'05 / NET EXPOSURE',duration:900}]
    },
    simplified: {
      id:'simplified',restLabel:'DUAL SOURCE / READY',triggerLabel:'RUN RECONCILIATION',replayLabel:'REPLAY RECONCILIATION',complete:'verified',completeLabel:'VERIFIED CYCLE / STABLE',
      states:['source-a','source-b','mismatch','reconcile','validate','verified'],
      labels:{'source-a':'SOURCE A / VALUATION','source-b':'SOURCE B / CONTROL',mismatch:'SPECTRAL MISMATCH',reconcile:'RECONCILING SOURCES',validate:'VALIDATION CHECK',verified:'VERIFIED CYCLE / STABLE'},
      sequence:[{state:'source-a',label:'01 / SOURCE A',duration:540},{state:'source-b',label:'02 / SOURCE B',duration:540},{state:'mismatch',label:'03 / MISMATCH',duration:620},{state:'reconcile',label:'04 / RECONCILE',duration:760},{state:'validate',label:'05 / VALIDATE',duration:640},{state:'verified',label:'06 / VERIFIED',duration:900}]
    },
    forex: {
      id:'forex',restLabel:'PORTFOLIO ROUTES / READY',triggerLabel:'RUN VALIDATION',replayLabel:'REPLAY VALIDATION',complete:'accepted',completeLabel:'PROPOSAL / ACCEPTED',
      states:['portfolio','route','checkpoint-1','checkpoint-2','checkpoint-3','checkpoint-4','api','accepted'],
      labels:{portfolio:'PORTFOLIO INPUT',route:'ROUTING LATTICE','checkpoint-1':'CHECK 01','checkpoint-2':'CHECK 02','checkpoint-3':'CHECK 03','checkpoint-4':'CHECK 04',api:'MARGIN API / PRE-LIVE',accepted:'PROPOSAL / ACCEPTED'},
      sequence:[{state:'portfolio',label:'01 / PORTFOLIO INPUT',duration:520},{state:'checkpoint-1',label:'02 / VALIDATION GATE 01',duration:440},{state:'checkpoint-2',label:'03 / VALIDATION GATE 02',duration:440},{state:'api',label:'04 / MARGIN API',duration:620},{state:'checkpoint-3',label:'05 / VALIDATION GATE 03',duration:440},{state:'checkpoint-4',label:'06 / VALIDATION GATE 04',duration:440},{state:'accepted',label:'07 / PROPOSAL ACCEPTED',duration:900}]
    }
  };

  function initIport(frame, machine) {
    [['.input-stack','manual','Manual sequential setup'],['.reasoning-prism','judgment','Agent judgment'],['.typed-rails','actions','Typed actions'],['.deterministic-ring','control','Deterministic control'],['.approval-plane','operator','Operator visibility'],['.output-lanes','parallel','Parallel capacity']].forEach(([selector,state,label]) => bindInspectable(machine,frame.querySelector(selector),state,label));
    bindProjectCopy(machine,[['manual','MANUAL / SEQUENTIAL CONSTRAINT'],['judgment','BOUNDED AGENT DECISION'],['control','CONTROL + OPERATOR VISIBILITY']],[['actions','WORKFLOW / 3.5H → 8M'],['parallel','PARALLEL CAPACITY / 3×'],['control','QUALITY CONTROL / ZERO ERRORS']]);
  }

  function initCoco(frame, machine) {
    bindInspectable(machine,frame.querySelector('.source-a'),'run-state','Run state and telemetry');
    bindInspectable(machine,frame.querySelector('.source-b'),'knowledge','Support knowledge');
    const states=['run-state','config','telemetry','knowledge','config','telemetry','run-state','knowledge'];
    const labels=['RUN STATE','CONFIG','TELEMETRY','SUPPORT KNOWLEDGE','CONFIG','TELEMETRY','RUN STATE','SUPPORT KNOWLEDGE'];
    [...frame.querySelectorAll('.ev')].forEach((node,index)=>bindInspectable(machine,node,states[index],labels[index]));
    bindInspectable(machine,frame.querySelector('.root-cause'),'root','Root cause');
    bindProjectCopy(machine,[['noise','DISTRIBUTED PRODUCTION KNOWLEDGE'],['evidence','EVIDENCE-BACKED DIAGNOSIS'],['root','CONFIDENCE BOUNDARY + ESCALATION']],[['explanation','INVESTIGATION PATH / 11M'],['root','ESCALATION REDUCTION'],['evidence','ENGINEERING CAPACITY RETURNED']]);
  }

  function initCrossCurrency(frame, machine) {
    bindInspectable(machine,frame.querySelector('.knot-before'),'gross','Gross exposure network');
    bindInspectable(machine,frame.querySelector('.optimizer-core'),'optimize','Multilateral optimizer');
    bindInspectable(machine,frame.querySelector('.knot-after'),'net','Net exposure');
    bindProjectCopy(machine,[['gross','BILATERAL EXPOSURE'],['optimize','MULTILATERAL PRODUCT DECISION'],['collapse','EXECUTABLE SETTLEMENT CONSTRAINT']],[['gross','ELIGIBLE NETWORK SCALE'],['path','PARTICIPATING BANKS'],['net','NOTIONAL REDUCTION / +34%']]);

    const control=document.createElement('div');
    control.className='compression-compare';
    control.innerHTML='<span>BEFORE</span><div class="compression-track" role="slider" tabindex="0" aria-label="Compare gross and compressed exposure" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i><b></b></div><span>AFTER</span>';
    frame.append(control);
    const trackElement=control.querySelector('.compression-track');
    let value=0,dragging=false;
    const setValue=(next,userInitiated=false)=>{
      value=clamp(next); frame.style.setProperty('--compare',value.toFixed(3));
      trackElement.style.setProperty('--compare-position',`${(value*100).toFixed(1)}%`);
      trackElement.setAttribute('aria-valuenow',String(Math.round(value*100)));
      if(userInitiated){const label=value<.18?'GROSS EXPOSURE':value>.82?'NET EXPOSURE':`COMPARE / ${Math.round(value*100)}% COMPRESSED`;machine.setState('compare',{level:3,label});}
    };
    const fromEvent=(event)=>{const rect=trackElement.getBoundingClientRect();setValue((event.clientX-rect.left)/Math.max(1,rect.width),true);};
    trackElement.addEventListener('pointerdown',(event)=>{event.stopPropagation();dragging=true;trackElement.setPointerCapture(event.pointerId);fromEvent(event);});
    trackElement.addEventListener('pointermove',(event)=>{if(!dragging)return;event.preventDefault();fromEvent(event);});
    const release=(event)=>{if(!dragging)return;dragging=false;if(trackElement.hasPointerCapture(event.pointerId))trackElement.releasePointerCapture(event.pointerId);track('Compression Compared',{value:Math.round(value*100)});};
    trackElement.addEventListener('pointerup',release);trackElement.addEventListener('pointercancel',release);trackElement.addEventListener('click',(event)=>event.stopPropagation());
    trackElement.addEventListener('keydown',(event)=>{const delta=(event.key==='ArrowRight'||event.key==='ArrowUp') ? .05 : (event.key==='ArrowLeft'||event.key==='ArrowDown') ? -.05 : 0;if(!delta)return;event.preventDefault();setValue(value+delta,true);});
    machine.config.onState=(state)=>{const positions={rest:0,gross:0,path:.08,match:.22,optimize:.46,collapse:.72,net:1};if(state in positions)setValue(positions[state],false);};
    machine.config.onReset=()=>setValue(0,false);setValue(0,false);
  }

  function initReconciliation(frame, machine) {
    bindInspectable(machine,frame.querySelector('.sp-a'),'source-a','Source A valuation');bindInspectable(machine,frame.querySelector('.sp-b'),'source-b','Source B control');bindInspectable(machine,frame.querySelector('.interference'),'mismatch','Mismatch interference');
    bindProjectCopy(machine,[['mismatch','LATE VALUATION MISMATCH'],['reconcile','DUAL-SOURCE RECONCILIATION'],['validate','UPSTREAM VALIDATION CONTROL']],[['verified','INSTITUTION-SCALE CYCLE'],['mismatch','EARLIER MISMATCH DETECTION'],['verified','STABLE RESUBMISSION RATE']]);
  }

  function initForex(frame, machine) {
    bindInspectable(machine,frame.querySelector('.fx-lattice'),'route','Portfolio routing lattice');
    [...frame.querySelectorAll('.fx-checkpoints i')].forEach((checkpoint,index)=>bindInspectable(machine,checkpoint,`checkpoint-${index+1}`,`Validation checkpoint ${index+1}`));
    bindInspectable(machine,frame.querySelector('.fx-gate'),'api','Margin API gate');bindInspectable(machine,frame.querySelector('.fx-output'),'accepted','Accepted proposal');
    bindProjectCopy(machine,[['route','PORTFOLIO + DATA ROUTES'],['api','MARGIN API PRODUCT DECISION'],['checkpoint-4','PRE-LIVE RELIABILITY CONTROL']],[['portfolio','LIVE RUNS'],['accepted','PROPOSAL ACCEPTANCE'],['checkpoint-4','FAILURE REDUCTION']]);
  }

  function initAgentFit(frame) {
    const machine=new InstrumentMachine(frame,{id:'agentfit',trigger:false,cue:'DRAG MARKER / USE SLIDERS',restLabel:'LIVE DECISION SURFACE',states:['assist','supervised','bounded'],labels:{assist:'ASSIST / HUMAN EXECUTES',supervised:'SUPERVISED / HUMAN APPROVES',bounded:'BOUNDED / POLICY CONTROL'},complete:'bounded'});
    const surface=frame.querySelector('.decision-surface'),marker=frame.querySelector('.decision-marker');
    const inputs={access:document.getElementById('af-access'),reverse:document.getElementById('af-reverse')};
    const allInputs=[...document.querySelectorAll('.agentfit-mini-controls input[type="range"]')];
    const syncState=(level=1)=>{const text=document.getElementById('af-autonomy')?.textContent.toLowerCase()||'';const state=text.includes('bounded')?'bounded':text.includes('supervised')?'supervised':'assist';machine.setState(state,{level,label:machine.config.labels[state]});[...frame.querySelectorAll('.autonomy-axis span')].forEach(item=>item.classList.toggle('is-active',item.textContent.toLowerCase()===state));};
    allInputs.forEach(input=>input.addEventListener('input',()=>requestAnimationFrame(()=>syncState(3))));syncState(1);
    if(surface&&marker&&inputs.access&&inputs.reverse){
      marker.tabIndex=0;marker.setAttribute('role','group');marker.setAttribute('aria-label','Directly adjust system access and reversibility. The sliders remain the primary accessible inputs.');marker.classList.add('direct-marker');
      let dragging=false,startX=0,startY=0,moved=false;
      const update=(event)=>{const rect=surface.getBoundingClientRect();const x=clamp((event.clientX-rect.left)/Math.max(1,rect.width),.1,.9);const y=clamp((event.clientY-rect.top)/Math.max(1,rect.height),.1,.9);inputs.access.value=String(clamp(Math.round(1+x*4),1,5));inputs.reverse.value=String(clamp(Math.round(1+(1-y)*4),1,5));inputs.access.dispatchEvent(new Event('input',{bubbles:true}));inputs.reverse.dispatchEvent(new Event('input',{bubbles:true}));};
      surface.addEventListener('pointerdown',(event)=>{event.stopPropagation();dragging=true;moved=false;startX=event.clientX;startY=event.clientY;frame.setAttribute('data-direct-drag','true');surface.setPointerCapture(event.pointerId);if(event.pointerType!=='touch')update(event);});
      surface.addEventListener('pointermove',(event)=>{if(!dragging)return;const dx=event.clientX-startX,dy=event.clientY-startY;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;if(event.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)*1.1)return;event.preventDefault();update(event);});
      const release=(event)=>{if(!dragging)return;if(event.pointerType==='touch'&&!moved)update(event);dragging=false;frame.removeAttribute('data-direct-drag');if(surface.hasPointerCapture(event.pointerId))surface.releasePointerCapture(event.pointerId);track('AgentFit Surface Dragged',{access:inputs.access.value,reversibility:inputs.reverse.value});};
      surface.addEventListener('pointerup',release);surface.addEventListener('pointercancel',release);surface.addEventListener('click',(event)=>event.stopPropagation());
      marker.addEventListener('keydown',(event)=>{const horizontal=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;const vertical=event.key==='ArrowUp'?1:event.key==='ArrowDown'?-1:0;if(!horizontal&&!vertical)return;event.preventDefault();if(horizontal)inputs.access.value=String(clamp(+inputs.access.value+horizontal,1,5));if(vertical)inputs.reverse.value=String(clamp(+inputs.reverse.value+vertical,1,5));(horizontal?inputs.access:inputs.reverse).dispatchEvent(new Event('input',{bubbles:true}));});
    }
    const axisStates=[['assist','ASSIST / HUMAN EXECUTES'],['supervised','SUPERVISED / HUMAN APPROVES'],['bounded','BOUNDED / POLICY CONTROL']];
    [...frame.querySelectorAll('.autonomy-axis span')].forEach((item,index)=>bindInspectable(machine,item,axisStates[index][0],axisStates[index][1]));
    bindProjectCopy(machine,[['assist','WORKFLOW ECONOMICS'],['supervised','AUTONOMY AS PRODUCT DECISION'],['bounded','CONTROL POSTURE']],[['supervised','FIT SCORE'],['bounded','AUTONOMY RECOMMENDATION'],['assist','CAPACITY RETURNED']]);
    return machine;
  }

  function initCapital(frame) {
    const machine=new InstrumentMachine(frame,{id:'margin',trigger:false,cue:'DRAG SCENARIO / ARROW KEYS',restLabel:'PRE-TRADE SURFACE / READY',states:['trade','scenario-low','scenario-balanced','scenario-high','consequence'],labels:{trade:'TRADE IDEA','scenario-low':'LOWER CAPITAL ZONE','scenario-balanced':'BALANCED CAPITAL ZONE','scenario-high':'HIGHER CAPITAL ZONE',consequence:'CAPITAL CONSEQUENCE'},complete:'consequence'});
    const surface=frame.querySelector('[data-capital-surface]'),plane=frame.querySelector('.capital-plane'),marker=frame.querySelector('.capital-marker'),readout=frame.querySelector('.capital-readout strong');
    let x=.66,y=.34,dragging=false,startX=0,startY=0,moved=false;
    const paint=(nextX,nextY,userInitiated=false)=>{x=clamp(nextX,.1,.88);y=clamp(nextY,.12,.82);surface.style.setProperty('--capital-x',`${(x*100).toFixed(1)}%`);surface.style.setProperty('--capital-y',`${(y*100).toFixed(1)}%`);const state=y<.34?'scenario-low':y>.62?'scenario-high':'scenario-balanced';const label=machine.config.labels[state];if(readout)readout.textContent=label;if(userInitiated)machine.setState(state,{level:3,label});marker?.setAttribute('aria-valuetext',`${label}; horizontal scenario position ${Math.round(x*100)} percent`);};
    const fromEvent=(event)=>{const rect=plane.getBoundingClientRect();paint((event.clientX-rect.left)/Math.max(1,rect.width),(event.clientY-rect.top)/Math.max(1,rect.height),true);};
    if(plane&&marker){marker.tabIndex=0;marker.setAttribute('role','group');marker.setAttribute('aria-label','Move the pre-trade capital scenario. Use arrow keys for controlled movement.');marker.classList.add('direct-marker');
      plane.addEventListener('pointerdown',(event)=>{event.stopPropagation();dragging=true;moved=false;startX=event.clientX;startY=event.clientY;frame.setAttribute('data-direct-drag','true');plane.setPointerCapture(event.pointerId);if(event.pointerType!=='touch')fromEvent(event);});
      plane.addEventListener('pointermove',(event)=>{if(!dragging)return;const dx=event.clientX-startX,dy=event.clientY-startY;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;if(event.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)*1.1)return;event.preventDefault();fromEvent(event);});
      const release=(event)=>{if(!dragging)return;if(event.pointerType==='touch'&&!moved)fromEvent(event);dragging=false;frame.removeAttribute('data-direct-drag');if(plane.hasPointerCapture(event.pointerId))plane.releasePointerCapture(event.pointerId);track('Capital Scenario Dragged',{x:Math.round(x*100),y:Math.round(y*100)});};
      plane.addEventListener('pointerup',release);plane.addEventListener('pointercancel',release);plane.addEventListener('click',(event)=>event.stopPropagation());
      marker.addEventListener('keydown',(event)=>{const dx=event.key==='ArrowRight' ? .04 : event.key==='ArrowLeft' ? -.04 : 0;const dy=event.key==='ArrowDown' ? .04 : event.key==='ArrowUp' ? -.04 : 0;if(!dx&&!dy)return;event.preventDefault();paint(x+dx,y+dy,true);});
    }
    bindProjectCopy(machine,[['trade','CURRENT MARGIN / NO FORWARD VIEW'],['scenario-balanced','MODEL PRE-TRADE SCENARIO'],['consequence','CAPITAL CONSEQUENCE AT ALLOCATION']],[['trade','0→1 PRODUCT'],['scenario-low','LOWER-MARGIN SCENARIO'],['consequence','ENTERPRISE DECISION SURFACE']]);
    machine.config.onReset=()=>paint(.66,.34,false);paint(x,y,false);return machine;
  }

  function initArtifactMachines() {
    const frames=[...document.querySelectorAll('.artifact-frame[data-artifact]')];
    frames.forEach(frame=>{
      const id=frame.dataset.artifact;
      if(id==='agentfit'){initAgentFit(frame);return;}if(id==='margin'){initCapital(frame);return;}
      const config=systemConfigs[id];if(!config)return;
      const machine=new InstrumentMachine(frame,{...config});
      if(id==='iport')initIport(frame,machine);if(id==='coco')initCoco(frame,machine);if(id==='crosscurrency')initCrossCurrency(frame,machine);if(id==='simplified')initReconciliation(frame,machine);if(id==='forex')initForex(frame,machine);
      frame.querySelector('.artifact')?.addEventListener('click',(event)=>{if(event.target.closest('.instrument-inspectable,.instrument-trigger,.compression-compare,.direct-marker'))return;machine.activate('canvas');});
    });
    if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>machines.find(item=>item.frame===entry.target)?.setVisible(entry.isIntersecting)),{threshold:.08,rootMargin:'140px 0px 140px'});frames.forEach(frame=>observer.observe(frame));}else machines.forEach(machine=>machine.setVisible(true));
  }

  function initCore() {
    const wrap=document.querySelector('.systems-core-wrap'),core=document.getElementById('systems-core');if(!wrap||!core)return null;
    const machine=new InstrumentMachine(wrap,{id:'systems-core',trigger:false,cue:'MOVE / INSPECT',restLabel:'SYSTEMS CORE / READY',states:['context','judgment','tools','action','control','value','workflow','capacity','scale','spatial'],labels:{context:'CONTEXT / MCP · DATA · PRODUCTION STATE',judgment:'JUDGMENT / PROBABILISTIC TRACE',tools:'TOOLS / TYPED SERVICE PATHS',action:'BOUNDED ACTION / CONTROLLED WRITE',control:'CONTROL / DETERMINISTIC BOUNDARY',value:'VALUE / MEASURED OUTPUT',workflow:'WORKFLOW → BOUNDED ACTION',capacity:'PARALLEL CAPACITY / 3×',scale:'INFRASTRUCTURE SCALE / $6.5T',spatial:'AUTHORED ANGLE / CONSTRAINED'},complete:'value'});
    machine.status.classList.add('core-readout');
    [[core.querySelector('.node-context'),'context','Context'],[core.querySelector('.core-prism'),'judgment','Judgment'],[core.querySelector('.node-tools'),'tools','Tools'],[core.querySelector('.node-action'),'action','Bounded action'],[core.querySelector('.node-control'),'control','Control'],[core.querySelector('.node-value'),'value','Value']].forEach(([element,state,label])=>bindInspectable(machine,element,state,label));
    const metricStates=[['workflow','WORKFLOW → ACTION / 3.5H → 8M'],['capacity','PARALLEL CAPACITY / 3×'],['value','COMMERCIAL VALUE / $3M+'],['scale','INFRASTRUCTURE SCALE / $6.5T']];
    [...wrap.querySelectorAll('.core-measure')].forEach((metric,index)=>bindInspectable(machine,metric,metricStates[index][0],metricStates[index][1]));
    const noteStates=[['workflow','WORKFLOW / PRODUCT'],['scale','DOMAIN / INFRASTRUCTURE'],['control','MODE / HUMAN-SUPERVISED AI']];
    [...document.querySelectorAll('.hero-note span')].forEach((note,index)=>bindInspectable(machine,note,noteStates[index][0],noteStates[index][1]));
    corePose={core,wrap,machine,rx:-8,ry:8,targetRx:-8,targetRy:8,dragging:false,moved:false,startX:0,startY:0,startRx:-8,startRy:8};
    wrap.addEventListener('pointermove',(event)=>{if(reduced)return;const rect=wrap.getBoundingClientRect();if(corePose.dragging){const dx=event.clientX-corePose.startX,dy=event.clientY-corePose.startY;if(Math.abs(dx)+Math.abs(dy)>5)corePose.moved=true;if(event.pointerType!=='touch'||Math.abs(dx)>Math.abs(dy)*1.05)event.preventDefault();corePose.targetRy=8+clamp((corePose.startRy-8)+dx*.025,-5,5);corePose.targetRx=-8+clamp((corePose.startRx+8)-dy*.021,-4,4);}else{const x=(event.clientX-rect.left)/Math.max(1,rect.width)-.5,y=(event.clientY-rect.top)/Math.max(1,rect.height)-.5;corePose.targetRy=8+x*4.8;corePose.targetRx=-8-y*3.5;}requestPointerFrame();},{passive:false});
    wrap.addEventListener('pointerleave',()=>{if(corePose.dragging)return;corePose.targetRx=-8;corePose.targetRy=8;requestPointerFrame();});
    core.addEventListener('pointerdown',(event)=>{if(reduced||event.target.closest('.instrument-inspectable'))return;corePose.dragging=true;corePose.moved=false;corePose.startX=event.clientX;corePose.startY=event.clientY;corePose.startRx=corePose.rx;corePose.startRy=corePose.ry;core.setPointerCapture(event.pointerId);wrap.classList.add('is-core-dragging');machine.setState('spatial',{level:3,label:machine.config.labels.spatial});});
    const releaseCore=(event)=>{if(!corePose.dragging)return;corePose.dragging=false;if(core.hasPointerCapture(event.pointerId))core.releasePointerCapture(event.pointerId);wrap.classList.remove('is-core-dragging');corePose.targetRx=-8+clamp((corePose.targetRx+8)*.35,-1.4,1.4);corePose.targetRy=8+clamp((corePose.targetRy-8)*.35,-1.6,1.6);requestPointerFrame();setTimeout(()=>machine.clearPreview(),280);if(corePose.moved)track('Systems Core Dragged');};
    core.addEventListener('pointerup',releaseCore);core.addEventListener('pointercancel',releaseCore);core.addEventListener('click',(event)=>{if(event.target.closest('.instrument-inspectable'))return;if(!corePose.moved)machine.reset();});
    if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>machine.setVisible(entry.isIntersecting)),{threshold:.04,rootMargin:'140px 0px 140px'});observer.observe(wrap);}else machine.setVisible(true);
    return{wrap,core,machine};
  }

  function updateCoreDisassembly(controller) {
    if(!controller||reduced)return;const rect=controller.wrap.getBoundingClientRect(),progress=clamp((innerHeight*.52-rect.top)/(innerHeight*.75)),ease=progress*progress*(3-2*progress),core=controller.core;
    core.style.setProperty('--disassembly-z',`${(62*ease).toFixed(1)}px`);core.style.setProperty('--disassembly-scale',(1-.07*ease).toFixed(3));core.style.setProperty('--disassembly-prism-x',`${(-5*ease).toFixed(2)}deg`);core.style.setProperty('--disassembly-prism-y',`${(18*ease).toFixed(2)}deg`);
    const ringOffsets=[[-36,-16],[38,-10],[10,34]];[...core.querySelectorAll('.core-ring')].forEach((ring,index)=>{ring.style.setProperty('--dis-x',`${(ringOffsets[index][0]*ease).toFixed(1)}px`);ring.style.setProperty('--dis-y',`${(ringOffsets[index][1]*ease).toFixed(1)}px`);ring.style.opacity=String(1-.25*ease);});
    const nodeOffsets=[[-45,-25],[44,-28],[48,28],[-42,33],[0,46]];[...core.querySelectorAll('.core-node')].forEach((node,index)=>{node.style.setProperty('--dis-x',`${(nodeOffsets[index][0]*ease).toFixed(1)}px`);node.style.setProperty('--dis-y',`${(nodeOffsets[index][1]*ease).toFixed(1)}px`);});
    [...core.querySelectorAll('.core-channel')].forEach(channel=>{channel.style.opacity=String(1-.4*ease);channel.style.filter=`blur(${(.4*ease).toFixed(2)}px)`;});const cage=core.querySelector('.core-cage');if(cage)cage.style.opacity=String(1-.35*ease);
  }

  function initStandaloneAgentFit() {
    const topology=document.querySelector('.af-topology'),score=document.getElementById('afp-score'),rules=document.getElementById('afp-rules'),reverse=document.getElementById('afp-reverse');if(!topology||!score||!rules||!reverse)return;
    topology.tabIndex=0;topology.setAttribute('role','group');topology.setAttribute('aria-label','Direct decision surface. Horizontal movement changes rule clarity; vertical movement changes reversibility. Sliders remain the primary accessible controls.');topology.classList.add('direct-topology');let dragging=false,startX=0,startY=0,moved=false;
    const sync=()=>{const value=clamp(+score.textContent||50,0,100);topology.style.setProperty('--topology-x',`${(20+value*.6).toFixed(1)}%`);topology.style.setProperty('--topology-y',`${(76-value*.5).toFixed(1)}%`);topology.setAttribute('aria-valuetext',`${value} out of 100; ${document.getElementById('afp-autonomy')?.textContent||'recommendation pending'}`);};
    const update=(event)=>{const rect=topology.getBoundingClientRect(),x=clamp((event.clientX-rect.left)/Math.max(1,rect.width)),y=clamp((event.clientY-rect.top)/Math.max(1,rect.height));rules.value=String(clamp(Math.round(1+x*4),1,5));reverse.value=String(clamp(Math.round(1+(1-y)*4),1,5));rules.dispatchEvent(new Event('input',{bubbles:true}));reverse.dispatchEvent(new Event('input',{bubbles:true}));requestAnimationFrame(sync);};
    topology.addEventListener('pointerdown',(event)=>{dragging=true;moved=false;startX=event.clientX;startY=event.clientY;topology.setPointerCapture(event.pointerId);if(event.pointerType!=='touch')update(event);});topology.addEventListener('pointermove',(event)=>{if(!dragging)return;const dx=event.clientX-startX,dy=event.clientY-startY;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;if(event.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)*1.1)return;event.preventDefault();update(event);});
    const release=(event)=>{if(!dragging)return;if(event.pointerType==='touch'&&!moved)update(event);dragging=false;if(topology.hasPointerCapture(event.pointerId))topology.releasePointerCapture(event.pointerId);track('AgentFit Workbench Surface Dragged',{rules:rules.value,reversibility:reverse.value});};topology.addEventListener('pointerup',release);topology.addEventListener('pointercancel',release);
    topology.addEventListener('keydown',(event)=>{const horizontal=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0,vertical=event.key==='ArrowUp'?1:event.key==='ArrowDown'?-1:0;if(!horizontal&&!vertical)return;event.preventDefault();if(horizontal)rules.value=String(clamp(+rules.value+horizontal,1,5));if(vertical)reverse.value=String(clamp(+reverse.value+vertical,1,5));(horizontal?rules:reverse).dispatchEvent(new Event('input',{bubbles:true}));requestAnimationFrame(sync);});
    [...document.querySelectorAll('.af-controls input[type="range"]')].forEach(input=>input.addEventListener('input',()=>requestAnimationFrame(sync)));sync();
  }

  function initReveal() {
    const reveals=[...document.querySelectorAll('.reveal:not(.is-visible)')];reveals.forEach(element=>{if(element.dataset.delay)element.style.setProperty('--delay',`${element.dataset.delay}ms`);});
    if(!('IntersectionObserver'in window)){reveals.forEach(element=>element.classList.add('is-visible'));return;}
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add('is-visible');observer.unobserve(entry.target);}),{threshold:.08,rootMargin:'0px 0px -28px'});reveals.forEach(element=>observer.observe(element));
  }

  function initChrome() {
    const header=document.querySelector('.site-header'),sections=[...document.querySelectorAll('[data-chrome]')];
    if(header&&'IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{const candidates=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>Math.abs(a.boundingClientRect.top)-Math.abs(b.boundingClientRect.top));if(candidates.length)header.classList.toggle('is-light',candidates[0].target.dataset.chrome==='light');},{rootMargin:'-8% 0px -82% 0px',threshold:0});sections.forEach(section=>observer.observe(section));}
    const projects=[...document.querySelectorAll('.project')];if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)body.dataset.activeSystem=entry.target.classList[1]||'';}),{rootMargin:'-32% 0px -48% 0px',threshold:0});projects.forEach(project=>observer.observe(project));}
    const materials=[...document.querySelectorAll('[data-material]')];if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('is-material-visible',entry.isIntersecting)),{threshold:.01,rootMargin:'180px 0px 180px'});materials.forEach(material=>observer.observe(material));}else materials.forEach(material=>material.classList.add('is-material-visible'));
    document.querySelectorAll('.case-link,.text-cta,.contact-links a,.header-actions a').forEach(element=>{element.addEventListener('pointerdown',()=>element.classList.add('is-pressed'));const release=()=>element.classList.remove('is-pressed');element.addEventListener('pointerup',release);element.addEventListener('pointercancel',release);element.addEventListener('pointerleave',release);});
  }

  function updateScroll(controller) {
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);root.style.setProperty('--progress',`${(scrollY/max)*100}%`);document.querySelector('.site-header')?.classList.toggle('scrolled',scrollY>20);updateCoreDisassembly(controller);scrollFrame=0;
  }

  initPointerLight();initReveal();initChrome();initArtifactMachines();
  let coreController=null;
  try{coreController=initCore();}catch(error){console.error('[Systems Instrument] core initialization failed',error);}
  try{initStandaloneAgentFit();}catch(error){console.error('[Systems Instrument] AgentFit initialization failed',error);}
  const safelyUpdateScroll=()=>{try{updateScroll(coreController);}catch(error){scrollFrame=0;console.error('[Systems Instrument] scroll update failed',error);}};
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(safelyUpdateScroll);},{passive:true});safelyUpdateScroll();
  document.addEventListener('keydown',(event)=>{if(event.key!=='Escape')return;machines.forEach(machine=>machine.reset());if(corePose){corePose.targetRx=-8;corePose.targetRy=8;requestPointerFrame();}});
  document.addEventListener('visibilitychange',()=>{body.classList.toggle('document-paused',document.hidden);machines.forEach(machine=>{if(document.hidden)machine.setVisible(false);else{const rect=machine.frame.getBoundingClientRect();machine.setVisible(rect.bottom>-120&&rect.top<innerHeight+120);}});});
})();
