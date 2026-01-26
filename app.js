const STORAGE_KEY = 'pilote-state-v1';
const EMOTION_LEVELS = {
  1: 'Calme',
  2: 'OK',
  3: 'Chargé',
  4: 'Besoin d’aide',
  5: 'Trop plein',
};

const BADGE_RULES = [
  {
    id: 'pause-pro',
    label: 'Expert des pauses',
    description: '3 pauses demandées en autonomie',
    check: state => state.pauseHistory.length >= 3,
  },
  {
    id: 'steady-pilot',
    label: 'Pilote régulier',
    description: '10 relevés du baromètre dans la semaine',
    check: state => state.emotionHistory.length >= 10,
  },
  {
    id: 'objective-ace',
    label: 'Gardien des objectifs',
    description: '5 objectifs cochés avec effort',
    check: state => state.objectiveCompletions >= 5,
  },
];

const SCRIPT_LIBRARY = [
  {
    title: 'Avant (prévention)',
    lines: [
      '« Dans 5 minutes, on change. Je te le rappelle. »',
      '« Tu préfères A ou B ? »',
      '« On commence par le plus facile. »',
    ],
  },
  {
    title: 'Pendant (tension)',
    lines: [
      '« Je vois que ça monte. Pause. »',
      '« On parle après, pas maintenant. »',
      '« Je suis là. »',
    ],
  },
  {
    title: 'Après (apprentissage)',
    lines: [
      '« Qu’est-ce qui t’a aidé ? »',
      '« On garde cette idée. »',
      '« On essaiera plus tôt la prochaine fois. »',
    ],
  },
];

const OBJECTIVE_LIBRARY = [
  { id: 'reg-pause', label: 'Demander une pause quand ça devient trop dur' },
  { id: 'reg-level', label: 'Repérer quand mon moteur est à 3' },
  { id: 'reg-tool', label: 'Utiliser un outil pour redescendre' },
  { id: 'reg-help', label: 'Accepter l’aide d’un adulte' },
  { id: 'reg-return', label: 'Revenir après une pause' },
  { id: 'eng-start', label: 'Commencer une tâche sans repousser' },
  { id: 'eng-step', label: 'Faire le premier petit pas' },
  { id: 'eng-ask', label: 'Demander de l’aide au lieu d’abandonner' },
  { id: 'rel-say', label: 'Dire quand quelque chose m’énerve' },
  { id: 'rel-repair', label: 'Réparer après un débordement' },
  { id: 'rel-listen', label: 'Écouter une consigne courte' },
  { id: 'rel-try', label: 'Essayer une autre solution quand ça ne marche pas' },
];

const CRISIS_PHRASES = [
  '« Je vois que c’est dur pour toi. On fait une pause. Je suis là. »',
  '« Ton moteur est trop chargé. On fait une pause. »',
  '« Je t’aide. On respire d’abord. »',
];

const TRIGGER_OPTIONS = [
  { id: 'noise', label: 'Bruit' },
  { id: 'transition', label: 'Transitions' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'frustration', label: 'Frustration / tâche difficile' },
  { id: 'crowd', label: 'Beaucoup de monde' },
  { id: 'hunger', label: 'Faim' },
];

const DEFAULT_STATE = {
  pin: '1234',
  pinCustom: false,
  currentLevel: null,
  tokens: 0,
  objectiveCompletions: 0,
  primaryObjectiveId: OBJECTIVE_LIBRARY[0].id,
  strategies: [
    '🌬️ Respire avec moi (30 sec)',
    '🤲 Appuie fort (20 sec)',
    '🪑 Coin calme (2 min)',
  ],
  objectives: OBJECTIVE_LIBRARY.slice(0, 3).map(obj => ({ id: obj.id, label: obj.label })),
  objectiveStatus: {},
  rewards: {
    immediate: ['Moment câlin', 'Puzzle rapide', 'Jeu coopératif de 10 min'],
    planned: ['Balade du week-end', 'Sortie vélo', 'Cinéma choisi ensemble'],
    symbolic: ['Badge Expert des pauses', 'Message audio de fierté'],
  },
  focus: { skill: '', notes: '' },
  routines: { morning: '', homework: '', evening: '' },
  triggers: '',
  triggerSelections: [],
  triggerNotes: '',
  reviews: {
    child: { helps: '', proud: '', try: '' },
    parent: { risks: '', strategies: '', structure: '' },
  },
  rewardNext: '',
  emotionHistory: [],
  pauseHistory: [],
  badges: {},
};

let state = loadState();
let crisisPhraseIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  ensureObjectiveStatus();
  const page = document.body?.dataset?.page;
  if (page === 'child') {
    initChildPage();
  } else if (page === 'parent') {
    initParentPage();
  } else if (page === 'bilan') {
    initBilanPage();
  }
});

function initChildPage() {
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
  };

  renderChildView(refs);

  refs.meterButtons.forEach(button => {
    button.addEventListener('click', () => handleLevelSelection(Number(button.dataset.level), refs));
  });

  refs.pauseButton?.addEventListener('click', () => handlePauseRequest(refs));

  refs.objectiveList?.addEventListener('change', event => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    const id = event.target.dataset.objective;
    const checked = event.target.checked;
    const previous = state.objectiveStatus[id];
    state.objectiveStatus[id] = checked;
    if (checked && !previous) {
      addTokens(1, 'Objectif validé');
      state.objectiveCompletions += 1;
    }
    saveState();
    renderChildView(refs);
  });

  refs.resetObjectivesBtn?.addEventListener('click', () => {
    Object.keys(state.objectiveStatus).forEach(key => {
      state.objectiveStatus[key] = false;
    });
    saveState();
    renderChildView(refs);
    showToast('Nouvelle journée, on repart sereinement.');
  });

}

function renderChildView(refs) {
  if (!refs) return;
  refs.meterButtons?.forEach(button => {
    button.classList.toggle('is-selected', Number(button.dataset.level) === state.currentLevel);
  });
  if (refs.levelStatus) {
    refs.levelStatus.textContent = state.currentLevel
      ? `${state.currentLevel} – ${EMOTION_LEVELS[state.currentLevel]}`
      : 'Choisis ton niveau pour continuer.';
  }
  const showPause = Number(state.currentLevel) >= 4;
  if (refs.pauseCard) {
    refs.pauseCard.hidden = !showPause;
    if (showPause) {
      refs.pauseCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  if (refs.toolCard) {
    refs.toolCard.hidden = !showPause;
  }
  renderTools(refs.toolList);
  renderChildObjectives(refs.objectiveList);
  renderTokenCount(refs.tokenCount);
  renderBadges(refs.badgeList);
  renderRewardOfDay(refs.rewardOfDay);
  renderFocusSummary(refs.focusSummary);
}

function handleLevelSelection(level, refs) {
  state.currentLevel = level;
  state.emotionHistory.push({ level, timestamp: new Date().toISOString() });
  if (state.emotionHistory.length > 30) {
    state.emotionHistory.shift();
  }
  saveState();
  renderChildView(refs);
  if (level >= 4) {
    showToast('Pause conseillée, tu peux demander de l’aide.');
  }
}

function handlePauseRequest(refs) {
  state.pauseHistory.push({ timestamp: new Date().toISOString() });
  addTokens(1, 'Pause demandée');
  saveState();
  renderChildView(refs);
  showToast('Pause enclenchée. Respire, tu gères !');
}

function renderTools(container) {
  if (!container) return;
  container.innerHTML = '';
  const strategies = (state.strategies && state.strategies.length ? state.strategies : DEFAULT_STATE.strategies)
    .slice(0, 3);
  strategies.forEach(text => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = text;
    container.appendChild(button);
  });
  if (!strategies.length) {
    const p = document.createElement('p');
    p.className = 'small';
    p.textContent = 'Le parent ajoutera ici les idées calmes.';
    container.appendChild(p);
  }
}

function renderChildObjectives(list) {
  if (!list) return;
  list.innerHTML = '';
  state.objectives.forEach(obj => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.objective = obj.id;
    checkbox.checked = Boolean(state.objectiveStatus[obj.id]);
    const span = document.createElement('span');
    span.textContent = obj.label;
    label.append(checkbox, span);
    li.appendChild(label);
    if (checkbox.checked) {
      li.classList.add('completed');
    }
    list.appendChild(li);
  });
}

function renderTokenCount(el) {
  if (el) {
    el.textContent = String(state.tokens);
  }
}

function renderBadges(container) {
  if (!container) return;
  if (!state.badges) {
    state.badges = {};
  }
  container.innerHTML = '';
  BADGE_RULES.forEach(rule => {
    const earned = rule.check(state);
    state.badges[rule.id] = earned;
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = rule.label;
    const status = document.createElement('span');
    status.textContent = earned ? 'Gagné' : 'À venir';
    status.className = earned ? 'badge-earned' : 'tiny';
    li.append(label, status);
    container.appendChild(li);
  });
  saveState();
}

function renderRewardOfDay(el) {
  if (!el) return;
  const reward = state.rewardNext
    || state.rewards.immediate?.[0]
    || state.rewards.planned?.[0]
    || 'Ton parent choisira une récompense douce ici.';
  el.textContent = reward;
}

function renderFocusSummary(el) {
  if (!el) return;
  const primary = getPrimaryObjective();
  if (primary) {
    el.textContent = `Objectif principal : ${primary.label}`;
    return;
  }
  if (state.focus?.skill) {
    const notes = state.focus.notes ? ` – ${state.focus.notes}` : '';
    el.textContent = `Objectif du moment : ${state.focus.skill}${notes}`;
    return;
  }
  el.textContent = 'Ton parent ajoutera ici l’objectif du moment.';
}

function initParentPage() {
  const refs = {
    lockBanner: document.getElementById('parentLockBanner'),
    content: document.getElementById('parentContent'),
    unlockForm: document.getElementById('parentUnlockForm'),
    pinInput: document.getElementById('parentPinInput'),
    pinReminder: document.getElementById('pinReminder'),
    lockBtn: document.querySelector('[data-action="lock-parent"]'),
    crisisPhrase: document.getElementById('crisisPhrase'),
    crisisPhraseBtn: document.getElementById('crisisPhraseBtn'),
    objectiveChoices: document.getElementById('objectiveChoices'),
    primaryObjectiveBadge: document.getElementById('primaryObjectiveBadge'),
    routineForm: document.getElementById('routineForm'),
    routineFields: document.querySelectorAll('#routineForm textarea[data-routine]'),
    triggerForm: document.getElementById('triggerForm'),
    triggerOptions: document.getElementById('triggerOptions'),
    triggerOtherInput: document.getElementById('triggerOtherInput'),
    strategyForm: document.getElementById('strategyForm'),
    strategyFields: document.getElementById('strategyFields'),
    rewardForm: document.getElementById('rewardForm'),
    rewardInputs: document.querySelectorAll('#rewardForm textarea[data-reward]'),
    plannedNextInput: document.getElementById('plannedNextInput'),
    scriptList: document.getElementById('scriptList'),
    pinForm: document.getElementById('pinForm'),
    pinInputNew: document.getElementById('pinInput'),
  };

  if (!refs.unlockForm) return;

  setParentLocked(refs, true);
  renderCrisisPhrase(refs);
  renderScripts(refs.scriptList);
  renderStrategyFields(refs.strategyFields);
  renderObjectiveChoices(refs);
  renderTriggerOptions(refs);
  populateParentForms(refs);

  if (refs.pinReminder) {
    refs.pinReminder.style.display = state.pinCustom ? 'none' : 'block';
  }

  refs.unlockForm.addEventListener('submit', event => {
    event.preventDefault();
    if (refs.pinInput?.value.trim() === state.pin) {
      setParentLocked(refs, false);
      refs.pinInput.value = '';
      showToast('Tour de contrôle ouverte pour cette session.');
    } else {
      showToast('Code incorrect.');
    }
  });

  refs.lockBtn?.addEventListener('click', () => setParentLocked(refs, true));

  refs.crisisPhraseBtn?.addEventListener('click', () => {
    cycleCrisisPhrase(refs);
  });

  refs.objectiveChoices?.addEventListener('change', event => {
    const target = event.target;
    if (target.matches('input[type="checkbox"][data-objective]')) {
      handleObjectiveToggle(target, refs);
    }
    if (target.matches('input[type="radio"][name="primaryObjective"]')) {
      state.primaryObjectiveId = target.value;
      ensurePrimaryObjective();
      saveState();
      renderObjectiveChoices(refs);
      showToast('Objectif principal défini.');
    }
  });

  refs.routineForm?.addEventListener('submit', event => {
    event.preventDefault();
    refs.routineFields?.forEach(area => {
      state.routines[area.dataset.routine] = area.value.trim();
    });
    saveState();
    showToast('Routines sauvegardées.');
  });

  refs.triggerForm?.addEventListener('submit', event => {
    event.preventDefault();
    const selections = Array.from(
      refs.triggerOptions?.querySelectorAll('input[type="checkbox"]:checked') || []
    );
    state.triggerSelections = selections.map(input => input.value);
    state.triggerNotes = refs.triggerOtherInput?.value.trim() || '';
    state.triggers = state.triggerNotes;
    saveState();
    showToast('Déclencheurs mis à jour.');
  });

  refs.strategyForm?.addEventListener('submit', event => {
    event.preventDefault();
    const values = Array.from(refs.strategyFields?.querySelectorAll('input') || [])
      .map(input => input.value.trim())
      .filter(Boolean);
    if (values.length < 3) {
      showToast('Ajoutez au moins 3 idées stables.');
      return;
    }
    state.strategies = values.slice(0, 5);
    saveState();
    showToast('Stratégies mises à jour.');
  });

  refs.rewardForm?.addEventListener('submit', event => {
    event.preventDefault();
    refs.rewardInputs?.forEach(textarea => {
      state.rewards[textarea.dataset.reward] = splitLines(textarea.value);
    });
    state.rewardNext = refs.plannedNextInput?.value.trim() || '';
    saveState();
    showToast('Récompenses publiées.');
  });

  refs.pinForm?.addEventListener('submit', event => {
    event.preventDefault();
    const newPin = refs.pinInputNew?.value.trim();
    if (!/^[0-9]{4,6}$/.test(newPin)) {
      showToast('Le code doit comporter 4 à 6 chiffres.');
      return;
    }
    state.pin = newPin;
    state.pinCustom = true;
    refs.pinInputNew.value = '';
    saveState();
    showToast('Code PIN mis à jour.');
    if (refs.pinReminder) {
      refs.pinReminder.style.display = 'none';
    }
  });
}

function setParentLocked(refs, locked) {
  if (refs.lockBanner) {
    refs.lockBanner.style.display = locked ? 'block' : 'none';
  }
  if (refs.content) {
    refs.content.classList.toggle('is-locked', locked);
  }
}

function populateParentForms(refs) {
  refs.routineFields?.forEach(area => {
    area.value = state.routines[area.dataset.routine] || '';
  });
  if (refs.triggerOtherInput) {
    refs.triggerOtherInput.value = state.triggerNotes || state.triggers || '';
  }
  Array.from(refs.triggerOptions?.querySelectorAll('input[type="checkbox"]') || []).forEach(
    checkbox => {
      checkbox.checked = state.triggerSelections?.includes(checkbox.value) || false;
    }
  );
  refs.rewardInputs?.forEach(textarea => {
    textarea.value = (state.rewards[textarea.dataset.reward] || []).join('\n');
  });
  if (refs.plannedNextInput) {
    refs.plannedNextInput.value = state.rewardNext || '';
  }
}

function renderCrisisPhrase(refs) {
  if (!refs?.crisisPhrase) return;
  refs.crisisPhrase.textContent = CRISIS_PHRASES[crisisPhraseIndex];
}

function cycleCrisisPhrase(refs) {
  crisisPhraseIndex = (crisisPhraseIndex + 1) % CRISIS_PHRASES.length;
  renderCrisisPhrase(refs);
}

function renderObjectiveChoices(refs) {
  if (!refs?.objectiveChoices) return;
  refs.objectiveChoices.innerHTML = '';
  const selectedIds = state.objectives.map(obj => obj.id);
  OBJECTIVE_LIBRARY.forEach(obj => {
    const wrapper = document.createElement('label');
    wrapper.className = 'objective-choice';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.objective = obj.id;
    checkbox.checked = selectedIds.includes(obj.id);
    const content = document.createElement('div');
    const main = document.createElement('p');
    main.className = 'choice-main';
    main.textContent = obj.label;
    const extra = document.createElement('div');
    extra.className = 'choice-extra';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'primaryObjective';
    radio.value = obj.id;
    radio.disabled = !checkbox.checked;
    radio.checked = state.primaryObjectiveId === obj.id;
    const span = document.createElement('span');
    span.textContent = 'Objectif principal';
    extra.append(radio, span);
    content.append(main, extra);
    wrapper.append(checkbox, content);
    refs.objectiveChoices.appendChild(wrapper);
  });
  updatePrimaryObjectiveBadge(refs);
}

function handleObjectiveToggle(input, refs) {
  const id = input.dataset.objective;
  const selectedIds = new Set(state.objectives.map(obj => obj.id).filter(Boolean));
  if (input.checked) {
    if (selectedIds.size >= 3) {
      input.checked = false;
      showToast('Limite de 3 objectifs par semaine.');
      return;
    }
    selectedIds.add(id);
  } else {
    selectedIds.delete(id);
  }
  const normalized = Array.from(selectedIds);
  state.objectives = OBJECTIVE_LIBRARY.filter(obj => normalized.includes(obj.id));
  ensureObjectiveStatus();
  saveState();
  renderObjectiveChoices(refs);
  showToast('Objectifs mis à jour.');
}

function updatePrimaryObjectiveBadge(refs) {
  if (!refs?.primaryObjectiveBadge) return;
  const primary = getPrimaryObjective();
  refs.primaryObjectiveBadge.textContent = primary
    ? `Objectif principal : ${primary.label}`
    : 'Aucun objectif principal';
}

function renderTriggerOptions(refs) {
  if (!refs?.triggerOptions) return;
  refs.triggerOptions.innerHTML = '';
  TRIGGER_OPTIONS.forEach(option => {
    const label = document.createElement('label');
    label.className = 'trigger-pill';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = option.id;
    checkbox.checked = state.triggerSelections?.includes(option.id) || false;
    label.append(checkbox, document.createTextNode(option.label));
    refs.triggerOptions.appendChild(label);
  });
}

function renderStrategyFields(container) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 5; i += 1) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Idée ${i + 1}`;
    input.value = state.strategies[i] || '';
    container.appendChild(input);
  }
}

function renderScripts(container) {
  if (!container) return;
  container.innerHTML = '';
  SCRIPT_LIBRARY.forEach(script => {
    const card = document.createElement('div');
    card.className = 'script-card';
    const title = document.createElement('h3');
    title.textContent = script.title;
    card.appendChild(title);
    script.lines.forEach(line => {
      const row = document.createElement('div');
      row.className = 'script-line';
      const p = document.createElement('p');
      p.textContent = line;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ghost tiny-btn';
      btn.textContent = 'Copier';
      btn.addEventListener('click', () => {
        copyText(line);
      });
      row.append(p, btn);
      card.appendChild(row);
    });
    container.appendChild(card);
  });
}

function initBilanPage() {
  const refs = {
    lockBanner: document.getElementById('bilanLockBanner'),
    content: document.getElementById('bilanContent'),
    unlockForm: document.getElementById('bilanUnlockForm'),
    pinInput: document.getElementById('bilanPinInput'),
    lockBtn: document.querySelector('[data-action="lock-bilan"]'),
    childReviewForm: document.getElementById('childReviewForm'),
    parentReviewForm: document.getElementById('parentReviewForm'),
    childReviewFields: {
      helps: document.getElementById('childHelps'),
      proud: document.getElementById('childProud'),
      try: document.getElementById('childTry'),
    },
    parentReviewFields: {
      risks: document.getElementById('parentRisks'),
      strategies: document.getElementById('parentStrategies'),
      structure: document.getElementById('parentStructure'),
    },
    emotionHistory: document.getElementById('emotionHistory'),
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    importFile: document.getElementById('importFile'),
  };

  if (!refs.unlockForm) return;

  setBilanLocked(refs, true);
  populateReviewForms(refs);
  renderEmotionHistory(refs.emotionHistory);

  refs.unlockForm.addEventListener('submit', event => {
    event.preventDefault();
    if (refs.pinInput?.value.trim() === state.pin) {
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
    Object.entries(refs.childReviewFields).forEach(([key, field]) => {
      state.reviews.child[key] = field.value.trim();
    });
    saveState();
    showToast('Bilan enfant enregistré.');
  });

  refs.parentReviewForm?.addEventListener('submit', event => {
    event.preventDefault();
    Object.entries(refs.parentReviewFields).forEach(([key, field]) => {
      state.reviews.parent[key] = field.value.trim();
    });
    saveState();
    showToast('Bilan parent enregistré.');
  });

  refs.exportJsonBtn?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `pilote-${new Date().toISOString()}.json`);
  });

  refs.exportCsvBtn?.addEventListener('click', () => {
    const rows = [['type', 'categorie', 'valeur', 'timestamp']];
    state.emotionHistory.forEach(entry => {
      rows.push(['emotion', EMOTION_LEVELS[entry.level], entry.level, entry.timestamp]);
    });
    state.pauseHistory.forEach(entry => {
      rows.push(['pause', '', 'pause demandée', entry.timestamp]);
    });
    state.objectives.forEach(obj => {
      rows.push(['objectif', obj.label, state.objectiveStatus[obj.id] ? 'coché' : 'en cours', '']);
    });
    ['immediate', 'planned', 'symbolic'].forEach(category => {
      (state.rewards[category] || []).forEach(value => {
        rows.push(['recompense', category, value, '']);
      });
    });
    const csv = rows.map(row => row.map(safeCsvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `pilote-${new Date().toISOString()}.csv`);
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
        populateReviewForms(refs);
        renderEmotionHistory(refs.emotionHistory);
        showToast('Import réussi.');
      } catch (error) {
        console.error(error);
        showToast('Fichier invalide.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  });
}

function setBilanLocked(refs, locked) {
  if (refs.lockBanner) {
    refs.lockBanner.style.display = locked ? 'block' : 'none';
  }
  if (refs.content) {
    refs.content.classList.toggle('is-locked', locked);
  }
}

function populateReviewForms(refs) {
  Object.entries(refs.childReviewFields || {}).forEach(([key, field]) => {
    if (field) field.value = state.reviews.child[key] || '';
  });
  Object.entries(refs.parentReviewFields || {}).forEach(([key, field]) => {
    if (field) field.value = state.reviews.parent[key] || '';
  });
}

function renderEmotionHistory(list) {
  if (!list) return;
  list.innerHTML = '';
  if (!state.emotionHistory.length) {
    const li = document.createElement('li');
    li.textContent = 'Aucune donnée pour le moment.';
    list.appendChild(li);
    return;
  }
  [...state.emotionHistory].slice(-15).reverse().forEach(entry => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${entry.level} – ${EMOTION_LEVELS[entry.level]}`;
    const time = document.createElement('span');
    time.textContent = formatTime(entry.timestamp);
    li.append(label, time);
    list.appendChild(li);
  });
}

function addTokens(amount, reason) {
  state.tokens += amount;
  if (reason) {
    showToast(`${reason} (+${amount} jeton)`);
  }
  saveState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return deepClone(DEFAULT_STATE);
    }
    const parsed = JSON.parse(raw);
    const merged = mergeState(DEFAULT_STATE, parsed);
    if (!merged.triggerNotes && merged.triggers) {
      merged.triggerNotes = merged.triggers;
    }
    if (typeof merged.triggerSelections === 'undefined') {
      merged.triggerSelections = [];
    }
    if (typeof merged.primaryObjectiveId === 'undefined') {
      merged.primaryObjectiveId = merged.focus?.skill
        ? OBJECTIVE_LIBRARY.find(obj => obj.label === merged.focus.skill)?.id || null
        : null;
    }
    return merged;
  } catch (error) {
    console.warn('Impossible de charger les données, retour aux valeurs par défaut.', error);
    return deepClone(DEFAULT_STATE);
  }
}

function mergeState(base, override) {
  if (!override || typeof override !== 'object') {
    return deepClone(base);
  }
  const result = Array.isArray(base) ? [] : { ...base };
  Object.keys(base).forEach(key => {
    if (Array.isArray(base[key])) {
      result[key] = Array.isArray(override[key]) ? override[key] : base[key];
    } else if (typeof base[key] === 'object' && base[key] !== null) {
      result[key] = mergeState(base[key], override[key] || {});
    } else {
      result[key] = typeof override[key] !== 'undefined' ? override[key] : base[key];
    }
  });
  Object.keys(override).forEach(key => {
    if (typeof result[key] === 'undefined') {
      result[key] = override[key];
    }
  });
  return result;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function splitLines(value) {
  return value
    .split(/\n|,/)
    .map(line => line.trim())
    .filter(Boolean);
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function safeCsvCell(value) {
  const cell = value == null ? '' : String(value);
  if (cell.includes(',') || cell.includes('"')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function ensureObjectiveStatus() {
  if (!state.objectiveStatus) {
    state.objectiveStatus = {};
  }
  state.objectives = state.objectives.map(obj => {
    if (obj?.id) return obj;
    const match = OBJECTIVE_LIBRARY.find(item => item.label === obj?.label);
    return match ? { id: match.id, label: match.label } : obj;
  });
  if (state.objectives.length > 3) {
    state.objectives = state.objectives.slice(0, 3);
  }
  state.objectives.forEach(obj => {
    if (typeof state.objectiveStatus[obj.id] === 'undefined') {
      state.objectiveStatus[obj.id] = false;
    }
  });
  Object.keys(state.objectiveStatus).forEach(key => {
    if (!state.objectives.find(obj => obj.id === key)) {
      delete state.objectiveStatus[key];
    }
  });
  ensurePrimaryObjective();
}

function ensurePrimaryObjective() {
  const selectedIds = state.objectives.map(obj => obj.id);
  if (!selectedIds.includes(state.primaryObjectiveId)) {
    state.primaryObjectiveId = selectedIds[0] || null;
  }
  if (state.primaryObjectiveId) {
    const primary = getPrimaryObjective();
    if (primary) {
      state.focus = { skill: primary.label, notes: '' };
    }
  }
}

function getPrimaryObjective() {
  if (!state.primaryObjectiveId) return null;
  return (
    OBJECTIVE_LIBRARY.find(obj => obj.id === state.primaryObjectiveId) ||
    state.objectives.find(obj => obj.id === state.primaryObjectiveId) ||
    null
  );
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast('Phrase copiée.'),
      () => fallbackCopy(text)
    );
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const temp = document.createElement('textarea');
  temp.value = text;
  temp.setAttribute('readonly', '');
  temp.style.position = 'absolute';
  temp.style.left = '-9999px';
  document.body.appendChild(temp);
  temp.select();
  try {
    document.execCommand('copy');
    showToast('Phrase copiée.');
  } catch (error) {
    console.warn('Copy failed', error);
  }
  document.body.removeChild(temp);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('visible'), 3000);
}
