const STORAGE_KEY = 'pilote-state-v1';
const EMOTION_LEVELS = {
  1: 'Calme',
  2: 'Bien',
  3: 'Chargé',
  4: 'Très chargé',
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
    title: 'Prévention',
    lines: [
      '« On teste ensemble cette routine, tu me dis ce qui t’aide. »',
      '« Si tu sens que ça monte, on appuie sur pause tous les deux. »',
      '« Tu as le droit d’être comme tu es, on va trouver la bonne manette. »',
    ],
  },
  {
    title: 'Pendant la montée',
    lines: [
      '« Je vois que ça déborde, je suis là avec toi. »',
      '« On met la situation en pause, ton corps est prioritaire. »',
      '« Respire avec moi, on libère la pression doucement. »',
    ],
  },
  {
    title: 'Après la crise',
    lines: [
      '« Merci d’avoir réparé, ça montre ta force d’essayer. »',
      '« Qu’est-ce qui t’aiderait la prochaine fois ? On cherche ensemble. »',
      '« Ce n’est pas un échec, c’est une info pour mieux te protéger. »',
    ],
  },
];

const DEFAULT_STATE = {
  pin: '1234',
  currentLevel: null,
  tokens: 0,
  objectiveCompletions: 0,
  strategies: [
    'Respirer 5 fois comme une vague',
    'Appuyer fort ses mains sur la table',
    'Coin calme avec coussin',
    'Boire un verre d’eau en conscience',
    'Mettre le casque silence',
  ],
  objectives: [
    { id: 'obj-1', label: 'Demander une pause' },
    { id: 'obj-2', label: 'Commencer doucement une tâche' },
    { id: 'obj-3', label: 'Réparer après un débordement' },
  ],
  objectiveStatus: {},
  rewards: {
    immediate: ['Moment câlin', 'Puzzle rapide', 'Jeu coopératif de 10 min'],
    planned: ['Balade du week-end', 'Sortie vélo', 'Cinéma choisi ensemble'],
    symbolic: ['Badge Expert des pauses', 'Message audio de fierté'],
  },
  focus: { skill: '', notes: '' },
  routines: { morning: '', homework: '', evening: '' },
  triggers: '',
  reviews: {
    child: { helps: '', proud: '', try: '' },
    parent: { risks: '', strategies: '', structure: '' },
  },
  emotionHistory: [],
  pauseHistory: [],
  badges: {},
};

let state = loadState();

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
    toolList: document.getElementById('toolList'),
    objectiveList: document.getElementById('objectiveList'),
    resetObjectivesBtn: document.getElementById('resetObjectivesBtn'),
    tokenCount: document.getElementById('tokenCount'),
    badgeList: document.getElementById('badgeList'),
    rewardOfDay: document.getElementById('rewardOfDay'),
    focusSummary: document.getElementById('focusSummary'),
    moreToggle: document.getElementById('moreToggle'),
    morePanel: document.getElementById('morePanel'),
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

  refs.moreToggle?.addEventListener('click', () => {
    const hidden = refs.morePanel?.hidden ?? true;
    if (refs.morePanel) {
      refs.morePanel.hidden = !hidden;
    }
    refs.moreToggle.textContent = hidden ? 'Fermer mon carnet' : 'Mon carnet';
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
  const reward = state.rewards.immediate?.[0]
    || state.rewards.planned?.[0]
    || 'Ton parent choisira une récompense douce ici.';
  el.textContent = reward;
}

function renderFocusSummary(el) {
  if (!el) return;
  if (state.focus.skill) {
    const notes = state.focus.notes ? ` – ${state.focus.notes}` : '';
    el.textContent = `Objectif de la semaine : ${state.focus.skill}${notes}`;
  } else {
    el.textContent = 'Ton parent ajoutera ici l’objectif du moment.';
  }
}

function initParentPage() {
  const refs = {
    lockBanner: document.getElementById('parentLockBanner'),
    content: document.getElementById('parentContent'),
    unlockForm: document.getElementById('parentUnlockForm'),
    pinInput: document.getElementById('parentPinInput'),
    lockBtn: document.querySelector('[data-action="lock-parent"]'),
    clearFocusBtn: document.querySelector('[data-action="clear-focus"]'),
    focusForm: document.getElementById('focusForm'),
    focusInput: document.getElementById('focusInput'),
    focusNotes: document.getElementById('focusNotes'),
    routineForm: document.getElementById('routineForm'),
    routineFields: document.querySelectorAll('#routineForm textarea[data-routine]'),
    triggerForm: document.getElementById('triggerForm'),
    triggerInput: document.getElementById('triggerInput'),
    strategyForm: document.getElementById('strategyForm'),
    strategyFields: document.getElementById('strategyFields'),
    objectiveForm: document.getElementById('objectiveForm'),
    objectiveFields: document.getElementById('objectiveFields'),
    rewardForm: document.getElementById('rewardForm'),
    rewardInputs: document.querySelectorAll('#rewardForm textarea[data-reward]'),
    scriptList: document.getElementById('scriptList'),
    pinForm: document.getElementById('pinForm'),
    pinInputNew: document.getElementById('pinInput'),
  };

  if (!refs.unlockForm) return;

  setParentLocked(refs, true);
  renderScripts(refs.scriptList);
  renderStrategyFields(refs.strategyFields);
  renderObjectiveFields(refs.objectiveFields);
  populateParentForms(refs);

  refs.unlockForm.addEventListener('submit', event => {
    event.preventDefault();
    if (refs.pinInput?.value.trim() === state.pin) {
      setParentLocked(refs, false);
      refs.pinInput.value = '';
      showToast('Tour de contrôle ouverte.');
    } else {
      showToast('Code incorrect.');
    }
  });

  refs.lockBtn?.addEventListener('click', () => setParentLocked(refs, true));

  refs.clearFocusBtn?.addEventListener('click', () => {
    state.focus = { skill: '', notes: '' };
    populateParentForms(refs);
    saveState();
    showToast('Objectif hebdo effacé.');
  });

  refs.focusForm?.addEventListener('submit', event => {
    event.preventDefault();
    state.focus.skill = refs.focusInput?.value.trim() || '';
    state.focus.notes = refs.focusNotes?.value.trim() || '';
    saveState();
    showToast('Objectif hebdo mis à jour.');
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
    state.triggers = refs.triggerInput?.value.trim() || '';
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

  refs.objectiveForm?.addEventListener('submit', event => {
    event.preventDefault();
    const inputs = Array.from(refs.objectiveFields?.querySelectorAll('input') || []);
    const newObjectives = [];
    inputs.forEach((input, index) => {
      const label = input.value.trim();
      if (!label) return;
      const existing = state.objectives[index];
      const id = existing ? existing.id : `obj-${Date.now()}-${index}`;
      newObjectives.push({ id, label });
    });
    if (!newObjectives.length) {
      showToast('Indiquez au moins un micro-objectif.');
      return;
    }
    state.objectives = newObjectives;
    ensureObjectiveStatus();
    saveState();
    showToast('Micro-objectifs enregistrés.');
  });

  refs.rewardForm?.addEventListener('submit', event => {
    event.preventDefault();
    refs.rewardInputs?.forEach(textarea => {
      state.rewards[textarea.dataset.reward] = splitLines(textarea.value);
    });
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
    refs.pinInputNew.value = '';
    saveState();
    showToast('Code PIN mis à jour.');
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
  if (refs.focusInput) refs.focusInput.value = state.focus.skill || '';
  if (refs.focusNotes) refs.focusNotes.value = state.focus.notes || '';
  refs.routineFields?.forEach(area => {
    area.value = state.routines[area.dataset.routine] || '';
  });
  if (refs.triggerInput) refs.triggerInput.value = state.triggers || '';
  refs.rewardInputs?.forEach(textarea => {
    textarea.value = (state.rewards[textarea.dataset.reward] || []).join('\n');
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

function renderObjectiveFields(container) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 3; i += 1) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Objectif ${i + 1}`;
    input.value = state.objectives[i]?.label || '';
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
      const p = document.createElement('p');
      p.textContent = line;
      card.appendChild(p);
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
    return mergeState(DEFAULT_STATE, parsed);
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
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('visible'), 3000);
}
