/* =========================================================
   PILOTE - app.js (version stable)
   - Child / Parent / Bilan
   - 100% localStorage
   - Compatible avec ton styles.css actuel
   ========================================================= */

const STORAGE_KEY = 'pilote-state-v1';

const EMOTION_LABELS = {
  1: 'Calme',
  2: 'OK',
  3: 'Chargé',
  4: "Besoin d'aide",
  5: 'Trop plein',
};

const OBJECTIVE_LIBRARY = [
  { id: 'pause', label: "Demander une pause quand c'est trop dur" },
  { id: 'level3', label: 'Repérer quand mon moteur est à 3' },
  { id: 'tool', label: 'Utiliser un outil pour redescendre' },
  { id: 'help', label: "Accepter l'aide d'un adulte" },
  { id: 'return', label: 'Revenir après une pause' },
  { id: 'start', label: 'Commencer une tâche sans repousser' },
  { id: 'first-step', label: 'Faire le premier petit pas' },
  { id: 'ask', label: "Demander de l'aide au lieu d'abandonner" },
  { id: 'say', label: "Dire quand quelque chose m'énerve" },
  { id: 'repair', label: 'Réparer après un débordement' },
  { id: 'listen', label: 'Écouter une consigne courte' },
  { id: 'try-other', label: "Essayer une autre solution quand ça ne marche pas" },
];

const CRISIS_PHRASES = [
  "« Je vois que c'est dur. On met tout en pause. Je suis là. »",
  "« Ton moteur est trop chargé. On fait une pause ensemble. »",
  "« On respire d'abord, on parle après. »",
];

const SCRIPT_LIBRARY = [
  {
    title: 'Avant',
    lines: [
      '« Dans 5 minutes, on change. Tu es prêt ? »',
      '« Tu préfères commencer par A ou B ? »',
      '« On commence par le plus facile. »',
    ],
  },
  {
    title: 'Pendant',
    lines: [
      '« Je vois que ça monte. Pause. »',
      '« On parle après, pas maintenant. »',
      '« Je reste avec toi. »',
    ],
  },
  {
    title: 'Après',
    lines: [
      "« Qu'est-ce qui t'a aidé ? »",
      '« On garde cette idée. »',
      '« La prochaine fois, on essaie plus tôt. »',
    ],
  },
];

const TRIGGER_OPTIONS = [
  { id: 'noise', label: 'Bruit' },
  { id: 'transition', label: 'Transitions' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'frustration', label: 'Frustration' },
  { id: 'crowd', label: 'Beaucoup de monde' },
  { id: 'hunger', label: 'Faim' },
];

const BADGE_RULES = [
  { id: 'pause-pro', label: 'Expert des pauses', check: s => (s.pauseHistory?.length || 0) >= 3 },
  { id: 'steady', label: 'Pilote régulier', check: s => (s.emotionHistory?.length || 0) >= 10 },
  { id: 'repair', label: 'Gardien des objectifs', check: s => (s.objectiveCompletions || 0) >= 5 },
];

const DEFAULT_STATE = {
  pin: '1234',
  pinCustom: false,

  currentLevel: null,
  tokens: 0,
  objectiveCompletions: 0,

  primaryObjectiveId: OBJECTIVE_LIBRARY[0].id,

  strategies: [
    '🤲 Appuyer / serrer (20 s)',
    '🪑 Coin calme (2 min)',
    '🌬️ Respirer 5 fois',
  ],

  objectives: OBJECTIVE_LIBRARY.slice(0, 3),
  objectiveStatus: {},

  rewards: {
    immediate: ['Moment câlin', 'Puzzle ensemble'],
    planned: ['Balade du week-end'],
    symbolic: ['Message audio de fierté'],
    next: '',
  },

  focus: { skill: '', notes: '' },
  routines: { morning: '', homework: '', evening: '' },

  triggerSelections: [],
  triggerNotes: '',

  emotionHistory: [],
  pauseHistory: [],

  reviews: {
    child: { helps: '', proud: '', try: '' },
    parent: { risks: '', strategies: '', structure: '' },
  },
};

let state = loadState();
let crisisIndex = 0;
let breathInterval = null;

/* =========================================================
   Boot / router
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const pageAttr = document.body?.dataset?.page;

  // fallback URL (si jamais data-page absent)
  const path = (location.pathname || '').toLowerCase();
  const page =
    pageAttr ||
    (path.includes('enfant') ? 'child' : path.includes('parent') ? 'parent' : path.includes('bilan') ? 'bilan' : '');

  ensureObjectiveStatus();
  saveState();

  if (page === 'child') initChild();
  if (page === 'parent') initParent();
  if (page === 'bilan') initBilan();
});

/* =========================================================
   Child
   ========================================================= */

function initChild() {
  const refs = {
    meterButtons: document.querySelectorAll('.meter button[data-level]'),
    levelStatus: document.getElementById('levelStatus'),
    pauseCard: document.getElementById('pauseCard'),
    pauseButton: document.getElementById('pauseButton'),
    toolCard: document.getElementById('toolCard'),
    toolList: document.getElementById('toolList'),
    objectiveList: document.getElementById('objectiveList'),
    resetObjectivesBtn: document.getElementById('resetObjectivesBtn'),
    tokenCount: document.getElementById('tokenCount'),
    badgeList: document.getElementById('badgeList'),
    rewardOfDay: document.getElementById('rewardOfDay'),
    focusSummary: document.getElementById('focusSummary'),

    breathTrigger: document.getElementById('tool-breath'),
    breathModal: document.getElementById('breath-modal'),
    breathLabel: document.getElementById('breath-label'),
    breathClose: document.getElementById('breath-close'),
  };

  renderChild(refs);
  setupBreath(refs);

  refs.meterButtons?.forEach(btn => {
    btn.addEventListener('click', () => handleLevelSelect(Number(btn.dataset.level), refs));
  });

  refs.pauseButton?.addEventListener('click', () => handlePause(refs));

  refs.objectiveList?.addEventListener('change', event => {
    const target = event.target;
    if (!target?.matches?.('input[type="checkbox"]')) return;

    const id = target.dataset.objective;
    if (!id) return;

    const checked = Boolean(target.checked);
    const prev = Boolean(state.objectiveStatus?.[id]);

    state.objectiveStatus[id] = checked;

    if (checked && !prev) {
      state.objectiveCompletions += 1;
      addTokens(1, 'Objectif coché');
    }

    saveState();
    renderChild(refs);
  });

  refs.resetObjectivesBtn?.addEventListener('click', () => {
    Object.keys(state.objectiveStatus || {}).forEach(key => (state.objectiveStatus[key] = false));
    saveState();
    renderChild(refs);
    showToast('Objectifs remis à zéro.');
  });
}

function renderChild(refs) {
  refs.meterButtons?.forEach(btn => {
    btn.classList.toggle('is-selected', Number(btn.dataset.level) === state.currentLevel);
  });

  if (refs.levelStatus) {
    refs.levelStatus.textContent = state.currentLevel
      ? `${EMOTION_LABELS[state.currentLevel]} sélectionné`
      : 'Choisis ton niveau pour continuer.';
  }

  const showPause = (state.currentLevel ?? 0) >= 4;

  if (refs.pauseCard) refs.pauseCard.hidden = !showPause;
  if (refs.toolCard) refs.toolCard.hidden = !showPause;

  renderTools(refs.toolList);
  renderChildObjectives(refs.objectiveList);

  if (refs.tokenCount) refs.tokenCount.textContent = String(state.tokens ?? 0);

  renderBadges(refs.badgeList);

  if (refs.rewardOfDay) {
    refs.rewardOfDay.textContent =
      state.rewards?.next ||
      state.rewards?.immediate?.[0] ||
      state.rewards?.planned?.[0] ||
      state.rewards?.symbolic?.[0] ||
      'À définir.';
  }

  renderFocusSummary(refs.focusSummary);
}

function handleLevelSelect(level, refs) {
  state.currentLevel = level;

  state.emotionHistory = state.emotionHistory || [];
  state.emotionHistory.push({ level, timestamp: new Date().toISOString() });
  if (state.emotionHistory.length > 30) state.emotionHistory.shift();

  saveState();
  renderChild(refs);

  if (level >= 4) showToast('Pause conseillée, on baisse le moteur.');
}

function handlePause(refs) {
  state.pauseHistory = state.pauseHistory || [];
  state.pauseHistory.push({ timestamp: new Date().toISOString() });

  addTokens(1, 'Pause demandée');
  saveState();
  renderChild(refs);

  showToast("Bravo d'avoir demandé la pause.");
}

function renderTools(container) {
  if (!container) return;
  container.innerHTML = '';

  (state.strategies || []).slice(0, 3).forEach(text => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = text;
    container.appendChild(btn);
  });
}

function renderChildObjectives(list) {
  if (!list) return;
  list.innerHTML = '';

  (state.objectives || []).forEach(obj => {
    const li = document.createElement('li');

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.objective = obj.id;
    checkbox.checked = Boolean(state.objectiveStatus?.[obj.id]);

    label.append(checkbox, document.createTextNode(' ' + obj.label));
    li.appendChild(label);

    if (checkbox.checked) li.classList.add('completed');
    list.appendChild(li);
  });
}

/* ===== respiration ===== */

function setupBreath(refs) {
  if (!refs.breathTrigger || !refs.breathModal) return;

  const startBreathText = () => {
    clearInterval(breathInterval);
    let inhale = true;
    if (refs.breathLabel) refs.breathLabel.textContent = 'Inspire…';

    // Ton CSS anime déjà la sphère => ici on fait juste le texte
    breathInterval = setInterval(() => {
      inhale = !inhale;
      if (refs.breathLabel) refs.breathLabel.textContent = inhale ? 'Inspire…' : 'Expire…';
    }, 3000);
  };

  const close = () => {
    refs.breathModal.hidden = true;
    clearInterval(breathInterval);
    breathInterval = null;
  };

  refs.breathTrigger.addEventListener('click', () => {
    refs.breathModal.hidden = false;
    startBreathText();
  });

  refs.breathClose?.addEventListener('click', close);

  refs.breathModal.addEventListener('click', event => {
    if (event.target === refs.breathModal) close();
  });

  // échap pour fermer
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !refs.breathModal.hidden) close();
  });
}

/* =========================================================
   Parent (robuste, ne crashe pas si des IDs manquent)
   ========================================================= */

function initParent() {
  const refs = {
    lockBanner: document.getElementById('parentLockBanner'),
    unlockForm: document.getElementById('parentUnlockForm'),
    pinInput: document.getElementById('parentPinInput'),

    pinSetupPanel: document.getElementById('pinSetupPanel'),
    pinSetupForm: document.getElementById('pinSetupForm'),
    pinSetupInput: document.getElementById('pinSetupInput'),

    content: document.getElementById('parentContent'),
    lockBtn: document.querySelector('[data-action="lock-parent"]'),

    crisisPhrase: document.getElementById('crisisPhrase'),
    crisisPhraseBtn: document.getElementById('crisisPhraseBtn'),

    objectiveChoices: document.getElementById('objectiveChoices'),
    primaryBadge: document.getElementById('primaryObjectiveBadge'),

    routineForm: document.getElementById('routineForm'),
    routineFields: document.querySelectorAll('#routineForm textarea[data-routine]'),

    strategyForm: document.getElementById('strategyForm'),
    strategyFields: document.getElementById('strategyFields'),

    triggerForm: document.getElementById('triggerForm'),
    triggerOptions: document.getElementById('triggerOptions'),
    triggerOtherInput: document.getElementById('triggerOtherInput'),

    rewardForm: document.getElementById('rewardForm'),
    rewardInputs: document.querySelectorAll('#rewardForm textarea[data-reward]'),
    plannedNextInput: document.getElementById('plannedNextInput'),

    scriptList: document.getElementById('scriptList'),

    pinForm: document.getElementById('pinForm'),
    pinInputNew: document.getElementById('pinInput'),
  };

  renderScripts(refs.scriptList);
  renderObjectiveChoices(refs);
  renderStrategyFields(refs.strategyFields);
  renderTriggerOptions(refs.triggerOptions);
  populateParentForms(refs);
  updatePinPanels(refs);

  setParentLocked(refs, true);

  refs.unlockForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (refs.pinInput?.value?.trim() === state.pin) {
      setParentLocked(refs, false);
      refs.pinInput.value = '';
      showToast('Tour de contrôle ouverte.');
    } else {
      showToast('Code incorrect.');
    }
  });

  refs.lockBtn?.addEventListener('click', () => setParentLocked(refs, true));

  refs.pinSetupForm?.addEventListener('submit', event => {
    event.preventDefault();
    const newPin = refs.pinSetupInput?.value?.trim() || '';
    if (!/^[0-9]{4,6}$/.test(newPin)) return showToast('Code à 4-6 chiffres.');
    state.pin = newPin;
    state.pinCustom = true;
    if (refs.pinSetupInput) refs.pinSetupInput.value = '';
    saveState();
    updatePinPanels(refs);
    showToast('PIN enregistré.');
  });

  refs.pinForm?.addEventListener('submit', event => {
    event.preventDefault();
    const newPin = refs.pinInputNew?.value?.trim() || '';
    if (!/^[0-9]{4,6}$/.test(newPin)) return showToast('Code à 4-6 chiffres.');
    state.pin = newPin;
    state.pinCustom = true;
    if (refs.pinInputNew) refs.pinInputNew.value = '';
    saveState();
    updatePinPanels(refs);
    showToast('PIN mis à jour.');
  });

  refs.crisisPhraseBtn?.addEventListener('click', () => {
    crisisIndex = (crisisIndex + 1) % CRISIS_PHRASES.length;
    if (refs.crisisPhrase) refs.crisisPhrase.textContent = CRISIS_PHRASES[crisisIndex];
  });

  refs.objectiveChoices?.addEventListener('change', event => {
    const target = event.target;
    if (!target) return;

    if (target.matches('input[type="checkbox"]')) handleObjectiveToggle(refs, target);

    if (target.matches('input[type="radio"]')) {
      state.primaryObjectiveId = target.value;
      ensureObjectiveStatus();
      saveState();
      renderObjectiveChoices(refs);
      showToast('Objectif principal défini.');
    }
  });

  refs.routineForm?.addEventListener('submit', event => {
    event.preventDefault();
    refs.routineFields?.forEach(area => {
      const key = area?.dataset?.routine;
      if (!key) return;
      state.routines[key] = area.value.trim();
    });
    saveState();
    showToast('Routines sauvegardées.');
  });

  refs.strategyForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!refs.strategyFields) return;
    const values = Array.from(refs.strategyFields.querySelectorAll('input'))
      .map(i => i.value.trim())
      .filter(Boolean);
    if (values.length < 3) return showToast('Ajoutez au moins 3 idées.');
    state.strategies = values.slice(0, 5);
    saveState();
    showToast('Stratégies mises à jour.');
  });

  refs.triggerForm?.addEventListener('submit', event => {
    event.preventDefault();
    const selections = Array.from(refs.triggerOptions?.querySelectorAll('input:checked') || []).map(
      i => i.value
    );
    state.triggerSelections = selections;
    state.triggerNotes = refs.triggerOtherInput?.value?.trim() || '';
    saveState();
    showToast('Déclencheurs mis à jour.');
  });

  refs.rewardForm?.addEventListener('submit', event => {
    event.preventDefault();
    refs.rewardInputs?.forEach(area => {
      const key = area?.dataset?.reward;
      if (!key) return;
      state.rewards[key] = splitLines(area.value);
    });
    state.rewards.next = refs.plannedNextInput?.value?.trim() || '';
    saveState();
    showToast('Récompenses validées.');
  });
}

function setParentLocked(refs, locked) {
  if (refs.lockBanner) refs.lockBanner.style.display = locked ? 'block' : 'none';
  if (refs.content) refs.content.classList.toggle('is-locked', locked);
}

function updatePinPanels(refs) {
  const hasCustom = Boolean(state.pinCustom);
  if (refs.pinSetupPanel) refs.pinSetupPanel.hidden = hasCustom;
  if (refs.unlockForm) refs.unlockForm.style.display = hasCustom ? '' : 'none';
}

function renderScripts(container) {
  if (!container) return;
  container.innerHTML = '';
  SCRIPT_LIBRARY.forEach(group => {
    const card = document.createElement('div');
    card.className = 'script-card';

    const title = document.createElement('h3');
    title.textContent = group.title;
    card.appendChild(title);

    group.lines.forEach(line => {
      const row = document.createElement('div');
      row.className = 'script-line';

      const p = document.createElement('p');
      p.textContent = line;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ghost';
      btn.textContent = 'Copier';
      btn.addEventListener('click', () => navigator.clipboard?.writeText(line));

      row.append(p, btn);
      card.appendChild(row);
    });

    container.appendChild(card);
  });
}

function renderObjectiveChoices(refs) {
  if (!refs.objectiveChoices) return;

  refs.objectiveChoices.innerHTML = '';

  OBJECTIVE_LIBRARY.forEach(obj => {
    const wrapper = document.createElement('label');
    wrapper.className = 'objective-choice';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = obj.id;
    checkbox.checked = (state.objectives || []).some(o => o.id === obj.id);

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'primaryObjective';
    radio.value = obj.id;
    radio.disabled = !checkbox.checked;
    radio.checked = state.primaryObjectiveId === obj.id;

    const content = document.createElement('div');
    content.appendChild(document.createTextNode(obj.label));

    const extra = document.createElement('div');
    extra.className = 'choice-extra';
    const span = document.createElement('span');
    span.textContent = 'Objectif principal';
    extra.append(radio, span);

    wrapper.append(checkbox, content, extra);
    refs.objectiveChoices.appendChild(wrapper);
  });

  const primary = getPrimaryObjective();
  if (refs.primaryBadge) {
    refs.primaryBadge.textContent = primary ? `Objectif principal : ${primary.label}` : 'Aucun objectif principal';
  }
}

function handleObjectiveToggle(refs, checkbox) {
  const id = checkbox?.value;
  if (!id) return;

  const selected = new Set((state.objectives || []).map(obj => obj.id));

  if (checkbox.checked) {
    if (selected.size >= 3) {
      checkbox.checked = false;
      showToast('Maximum 3 objectifs.');
      return;
    }
    selected.add(id);
  } else {
    selected.delete(id);
  }

  state.objectives = OBJECTIVE_LIBRARY.filter(obj => selected.has(obj.id));
  ensureObjectiveStatus();
  saveState();
  renderObjectiveChoices(refs);
  showToast('Objectifs mis à jour.');
}

function renderStrategyFields(container) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 5; i += 1) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Idée ${i + 1}`;
    input.value = state.strategies?.[i] || '';
    container.appendChild(input);
  }
}

function renderTriggerOptions(container) {
  if (!container) return;
  container.innerHTML = '';
  TRIGGER_OPTIONS.forEach(option => {
    const label = document.createElement('label');
    label.className = 'trigger-pill';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = option.id;
    checkbox.checked = (state.triggerSelections || []).includes(option.id);
    label.append(checkbox, document.createTextNode(option.label));
    container.appendChild(label);
  });
}

function populateParentForms(refs) {
  refs.routineFields?.forEach(area => {
    const key = area?.dataset?.routine;
    if (!key) return;
    area.value = state.routines?.[key] || '';
  });

  refs.rewardInputs?.forEach(area => {
    const key = area?.dataset?.reward;
    if (!key) return;
    area.value = (state.rewards?.[key] || []).join('\n');
  });

  if (refs.plannedNextInput) refs.plannedNextInput.value = state.rewards?.next || '';
  if (refs.triggerOtherInput) refs.triggerOtherInput.value = state.triggerNotes || '';
}

/* =========================================================
   Bilan
   ========================================================= */

function initBilan() {
  const refs = {
    lockBanner: document.getElementById('bilanLockBanner'),
    unlockForm: document.getElementById('bilanUnlockForm'),
    pinInput: document.getElementById('bilanPinInput'),
    content: document.getElementById('bilanContent'),
    lockBtn: document.querySelector('[data-action="lock-bilan"]'),

    childReviewForm: document.getElementById('childReviewForm'),
    parentReviewForm: document.getElementById('parentReviewForm'),

    childFields: {
      helps: document.getElementById('childHelps'),
      proud: document.getElementById('childProud'),
      try: document.getElementById('childTry'),
    },
    parentFields: {
      risks: document.getElementById('parentRisks'),
      strategies: document.getElementById('parentStrategies'),
      structure: document.getElementById('parentStructure'),
    },

    emotionHistory: document.getElementById('emotionHistory'),
    summaryHelps: document.getElementById('summaryHelps'),
    summaryChallenge: document.getElementById('summaryChallenge'),
    summaryNext: document.getElementById('summaryNext'),

    exportJsonBtn: document.getElementById('exportJsonBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    importFile: document.getElementById('importFile'),
  };

  renderEmotionHistory(refs.emotionHistory);
  renderBilanSummary(refs);
  setBilanLocked(refs, true);

  refs.unlockForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (refs.pinInput?.value?.trim() === state.pin) {
      setBilanLocked(refs, false);
      refs.pinInput.value = '';
      showToast('Espace bilan déverrouillé.');
    } else {
      showToast('Code incorrect.');
    }
  });

  refs.lockBtn?.addEventListener('click', () => setBilanLocked(refs, true));

  refs.childReviewForm?.addEventListener('submit', event => {
    event.preventDefault();
    Object.entries(refs.childFields || {}).forEach(([key, field]) => {
      if (!field) return;
      state.reviews.child[key] = field.value.trim();
    });
    saveState();
    renderBilanSummary(refs);
    showToast('Bilan enfant enregistré.');
  });

  refs.parentReviewForm?.addEventListener('submit', event => {
    event.preventDefault();
    Object.entries(refs.parentFields || {}).forEach(([key, field]) => {
      if (!field) return;
      state.reviews.parent[key] = field.value.trim();
    });
    saveState();
    renderBilanSummary(refs);
    showToast('Bilan parent enregistré.');
  });

  refs.exportJsonBtn?.addEventListener('click', () => {
    downloadBlob(JSON.stringify(state, null, 2), `pilote-${Date.now()}.json`, 'application/json');
  });

  refs.exportCsvBtn?.addEventListener('click', () => {
    const rows = [['type', 'categorie', 'valeur', 'timestamp']];
    (state.emotionHistory || []).forEach(entry => {
      rows.push(['emotion', EMOTION_LABELS[entry.level], entry.level, entry.timestamp]);
    });
    (state.pauseHistory || []).forEach(entry => {
      rows.push(['pause', '', 'pause demandée', entry.timestamp]);
    });
    const csv = rows.map(r => r.map(safeCsvCell).join(',')).join('\n');
    downloadBlob(csv, `pilote-${Date.now()}.csv`, 'text/csv');
  });

  refs.importFile?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        state = mergeState(DEFAULT_STATE, imported);
        ensureObjectiveStatus();
        saveState();
        renderEmotionHistory(refs.emotionHistory);
        renderBilanSummary(refs);
        showToast('Import réussi.');
      } catch (error) {
        console.error(error);
        showToast('Fichier invalide.');
      }
    };
    reader.readAsText(file);
  });
}

function setBilanLocked(refs, locked) {
  if (refs.lockBanner) refs.lockBanner.style.display = locked ? 'block' : 'none';
  if (refs.content) refs.content.classList.toggle('is-locked', locked);
}

function renderEmotionHistory(list) {
  if (!list) return;
  list.innerHTML = '';
  if (!(state.emotionHistory || []).length) {
    const li = document.createElement('li');
    li.textContent = 'Aucune donnée pour le moment.';
    list.appendChild(li);
    return;
  }
  [...state.emotionHistory].slice(-15).reverse().forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${EMOTION_LABELS[entry.level]} – ${formatDate(entry.timestamp)}`;
    list.appendChild(li);
  });
}

function renderBilanSummary(refs) {
  if (refs.summaryHelps) {
    refs.summaryHelps.textContent =
      state.reviews?.child?.helps || state.reviews?.parent?.strategies || 'À compléter.';
  }
  if (refs.summaryChallenge) {
    refs.summaryChallenge.textContent =
      state.reviews?.parent?.risks || state.reviews?.child?.try || 'À compléter.';
  }
  const primary = getPrimaryObjective();
  if (refs.summaryNext) refs.summaryNext.textContent = primary?.label || state.focus?.skill || 'À définir.';
}

/* =========================================================
   Badges (tu avais les styles, je fournis le rendu)
   ========================================================= */

function renderBadges(container) {
  if (!container) return;
  container.innerHTML = '';

  const unlocked = BADGE_RULES.filter(rule => {
    try { return Boolean(rule.check(state)); } catch { return false; }
  });

  if (!unlocked.length) {
    const li = document.createElement('li');
    li.textContent = 'Pas de badge pour le moment (c’est OK).';
    container.appendChild(li);
    return;
  }

  unlocked.forEach(b => {
    const li = document.createElement('li');
    li.textContent = `🏷️ ${b.label}`;
    container.appendChild(li);
  });
}

/* =========================================================
   Shared helpers
   ========================================================= */

function addTokens(amount, message) {
  state.tokens = (state.tokens || 0) + amount;
  saveState();
  if (message) showToast(`${message} (+${amount} jeton${amount > 1 ? 's' : ''})`);
}

function showToast(text) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('visible');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Impossible de sauvegarder (localStorage).', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    return mergeState(DEFAULT_STATE, JSON.parse(raw));
  } catch (error) {
    console.error('Chargement impossible, retour aux valeurs par défaut.', error);
    return structuredClone(DEFAULT_STATE);
  }
}

function mergeState(base, override) {
  if (!override || typeof override !== 'object') return structuredClone(base);
  const result = Array.isArray(base) ? [...base] : { ...base };
  Object.keys(base).forEach(key => {
    if (Array.isArray(base[key])) {
      result[key] = Array.isArray(override[key]) ? override[key] : base[key];
    } else if (typeof base[key] === 'object' && base[key] !== null) {
      result[key] = mergeState(base[key], override[key] || {});
    } else {
      result[key] = typeof override[key] === 'undefined' ? base[key] : override[key];
    }
  });
  return result;
}

function structuredClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function splitLines(text) {
  return String(text || '')
    .split(/\n|,/)
    .map(str => str.trim())
    .filter(Boolean);
}

function safeCsvCell(value) {
  const cell = value == null ? '' : String(value);
  if (cell.includes(',') || cell.includes('"')) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

function downloadBlob(data, filename, type) {
  const blob = new Blob([data], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function formatDate(ts) {
  const date = new Date(ts);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function ensureObjectiveStatus() {
  if (!state.objectiveStatus) state.objectiveStatus = {};

  state.objectives = (state.objectives || [])
    .map(obj => OBJECTIVE_LIBRARY.find(item => item.id === obj.id) || obj)
    .slice(0, 3);

  state.objectives.forEach(obj => {
    if (typeof state.objectiveStatus[obj.id] === 'undefined') state.objectiveStatus[obj.id] = false;
  });

  if (!(state.objectives || []).find(obj => obj.id === state.primaryObjectiveId)) {
    state.primaryObjectiveId = state.objectives[0]?.id || null;
  }
}

function getPrimaryObjective() {
  return (
    OBJECTIVE_LIBRARY.find(obj => obj.id === state.primaryObjectiveId) ||
    (state.objectives || []).find(obj => obj.id === state.primaryObjectiveId) ||
    null
  );
}

function renderFocusSummary(el) {
  if (!el) return;
  const primary = getPrimaryObjective();
  el.textContent = primary ? primary.label : "Ton parent choisira l'objectif ici.";
}
