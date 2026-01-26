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
const panelLocks = { parent: true, bilan: true };
const refs = {};

init();

function init() {
  cacheElements();
  ensureObjectiveStatus();
  setupNavigation();
  setupBarometer();
  setupPauseButton();
  setupObjectives();
  setupParentForms();
  setupLocking();
  setupReviewForms();
  setupExportImport();
  renderScripts();
  renderAll();
}

function cacheElements() {
  refs.navButtons = document.querySelectorAll('.nav-link');
  refs.sections = document.querySelectorAll('main .panel');
  refs.currentWeekLabel = document.getElementById('currentWeekLabel');
  refs.currentLevelLabel = document.getElementById('currentLevelLabel');
  refs.barometerButtons = document.querySelectorAll('.barometer-step');
  refs.pauseButton = document.getElementById('pauseButton');
  refs.strategyList = document.getElementById('strategyList');
  refs.rewardList = document.getElementById('rewardList');
  refs.objectiveList = document.getElementById('objectiveList');
  refs.focusSummary = document.getElementById('focusSummary');
  refs.tokenCount = document.getElementById('tokenCount');
  refs.badgeList = document.getElementById('badgeList');
  refs.emotionHistory = document.getElementById('emotionHistory');
  refs.resetObjectivesBtn = document.getElementById('resetObjectivesBtn');
  refs.parentLockBanner = document.getElementById('parentLockBanner');
  refs.parentContent = document.getElementById('parentContent');
  refs.bilanLockBanner = document.getElementById('bilanLockBanner');
  refs.bilanContent = document.getElementById('bilanContent');
  refs.parentUnlockForm = document.getElementById('parentUnlockForm');
  refs.parentPinInput = document.getElementById('parentPinInput');
  refs.bilanUnlockForm = document.getElementById('bilanUnlockForm');
  refs.bilanPinInput = document.getElementById('bilanPinInput');
  refs.focusForm = document.getElementById('focusForm');
  refs.focusInput = document.getElementById('focusInput');
  refs.focusNotes = document.getElementById('focusNotes');
  refs.routineForm = document.getElementById('routineForm');
  refs.routineFields = document.querySelectorAll('#routineForm textarea[data-routine]');
  refs.triggerForm = document.getElementById('triggerForm');
  refs.triggerInput = document.getElementById('triggerInput');
  refs.strategyForm = document.getElementById('strategyForm');
  refs.strategyFields = document.getElementById('strategyFields');
  refs.objectiveForm = document.getElementById('objectiveForm');
  refs.objectiveFields = document.getElementById('objectiveFields');
  refs.rewardForm = document.getElementById('rewardForm');
  refs.rewardInputs = document.querySelectorAll('#rewardForm textarea[data-reward]');
  refs.scriptList = document.getElementById('scriptList');
  refs.pinForm = document.getElementById('pinForm');
  refs.pinInput = document.getElementById('pinInput');
  refs.childReviewForm = document.getElementById('childReviewForm');
  refs.parentReviewForm = document.getElementById('parentReviewForm');
  refs.childReviewFields = {
    helps: document.getElementById('childHelps'),
    proud: document.getElementById('childProud'),
    try: document.getElementById('childTry'),
  };
  refs.parentReviewFields = {
    risks: document.getElementById('parentRisks'),
    strategies: document.getElementById('parentStrategies'),
    structure: document.getElementById('parentStructure'),
  };
  refs.exportJsonBtn = document.getElementById('exportJsonBtn');
  refs.exportCsvBtn = document.getElementById('exportCsvBtn');
  refs.importFile = document.getElementById('importFile');
  refs.toast = document.getElementById('toast');
  refs.lockParentBtn = document.querySelector('[data-action="lock-parent"]');
  refs.lockBilanBtn = document.querySelector('[data-action="lock-bilan"]');
  refs.clearFocusBtn = document.querySelector('[data-action="clear-focus"]');
}

function setupNavigation() {
  refs.navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      refs.navButtons.forEach(btn => btn.classList.toggle('active', btn === button));
      refs.sections.forEach(section => {
        section.classList.toggle('active', section.id === target);
      });
    });
  });
}

function setupBarometer() {
  refs.barometerButtons.forEach(button => {
    button.addEventListener('click', () => {
      const level = Number(button.dataset.level);
      handleLevelSelection(level);
    });
  });
}

function setupPauseButton() {
  refs.pauseButton.addEventListener('click', () => {
    state.pauseHistory.push({ timestamp: new Date().toISOString() });
    addTokens(1, 'Pause demandée');
    saveState();
    renderBadges();
    showToast('Pause enclenchée. Respire, tu gères !');
  });
}

function setupObjectives() {
  renderObjectiveFields();
  refs.objectiveList.addEventListener('change', event => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    const id = event.target.dataset.objective;
    const checked = event.target.checked;
    const previous = state.objectiveStatus[id];
    state.objectiveStatus[id] = checked;
    if (checked && !previous) {
      addTokens(1, 'Objectif validé');
      state.objectiveCompletions += 1;
      renderBadges();
    }
    saveState();
    renderObjectives();
  });

  refs.resetObjectivesBtn.addEventListener('click', () => {
    Object.keys(state.objectiveStatus).forEach(key => {
      state.objectiveStatus[key] = false;
    });
    saveState();
    renderObjectives();
    showToast('Nouvelle journée, on repart sereinement.');
  });
}

function setupParentForms() {
  renderStrategyFields();
  refs.focusForm.addEventListener('submit', event => {
    event.preventDefault();
    state.focus.skill = refs.focusInput.value.trim();
    state.focus.notes = refs.focusNotes.value.trim();
    saveState();
    renderFocusSummary();
    showToast('Objectif hebdo mis à jour.');
  });

  refs.routineForm.addEventListener('submit', event => {
    event.preventDefault();
    refs.routineFields.forEach(area => {
      state.routines[area.dataset.routine] = area.value.trim();
    });
    saveState();
    showToast('Routines sauvegardées.');
  });

  refs.triggerForm.addEventListener('submit', event => {
    event.preventDefault();
    state.triggers = refs.triggerInput.value.trim();
    saveState();
    showToast('Déclencheurs mis à jour.');
  });

  refs.strategyForm.addEventListener('submit', event => {
    event.preventDefault();
    const values = Array.from(refs.strategyFields.querySelectorAll('input'))
      .map(input => input.value.trim())
      .filter(Boolean);
    if (values.length < 3) {
      showToast('Ajoutez au moins 3 idées stables.');
      return;
    }
    state.strategies = values.slice(0, 5);
    saveState();
    renderStrategies();
    showToast('Nouvelles stratégies proposées.');
  });

  refs.objectiveForm.addEventListener('submit', event => {
    event.preventDefault();
    const inputs = Array.from(refs.objectiveFields.querySelectorAll('input'));
    const newObjectives = [];
    inputs.forEach((input, index) => {
      const label = input.value.trim();
      if (!label) return;
      const existing = state.objectives[index];
      const id = existing ? existing.id : `obj-${Date.now()}-${index}`;
      newObjectives.push({ id, label });
    });
    if (newObjectives.length === 0) {
      showToast('Indiquez au moins un micro-objectif.');
      return;
    }
    state.objectives = newObjectives;
    ensureObjectiveStatus();
    saveState();
    renderObjectives();
    showToast('Micro-objectifs enregistrés.');
  });

  refs.rewardForm.addEventListener('submit', event => {
    event.preventDefault();
    refs.rewardInputs.forEach(textarea => {
      state.rewards[textarea.dataset.reward] = splitLines(textarea.value);
    });
    saveState();
    renderRewards();
    showToast('Récompenses publiées.');
  });

  refs.pinForm.addEventListener('submit', event => {
    event.preventDefault();
    const newPin = refs.pinInput.value.trim();
    if (!/^[0-9]{4,6}$/.test(newPin)) {
      showToast('Le code doit comporter 4 à 6 chiffres.');
      return;
    }
    state.pin = newPin;
    refs.pinInput.value = '';
    saveState();
    showToast('Code PIN mis à jour.');
  });
  if (refs.clearFocusBtn) {
    refs.clearFocusBtn.addEventListener('click', () => {
      state.focus = { skill: '', notes: '' };
      refs.focusInput.value = '';
      refs.focusNotes.value = '';
      saveState();
      renderFocusSummary();
      showToast('Objectif hebdo effacé.');
    });
  }
}

function setupLocking() {
  setPanelLock('parent', true);
  setPanelLock('bilan', true);

  refs.parentUnlockForm.addEventListener('submit', event => {
    event.preventDefault();
    if (refs.parentPinInput.value.trim() === state.pin) {
      setPanelLock('parent', false);
      refs.parentPinInput.value = '';
      showToast('Tour de contrôle ouverte.');
    } else {
      showToast('Code incorrect.');
    }
  });

  refs.bilanUnlockForm.addEventListener('submit', event => {
    event.preventDefault();
    if (refs.bilanPinInput.value.trim() === state.pin) {
      setPanelLock('bilan', false);
      refs.bilanPinInput.value = '';
      showToast('Espace bilan déverrouillé.');
    } else {
      showToast('Code incorrect.');
    }
  });

  refs.lockParentBtn.addEventListener('click', () => setPanelLock('parent', true));
  refs.lockBilanBtn.addEventListener('click', () => setPanelLock('bilan', true));
}

function setupReviewForms() {
  refs.childReviewForm.addEventListener('submit', event => {
    event.preventDefault();
    Object.entries(refs.childReviewFields).forEach(([key, field]) => {
      state.reviews.child[key] = field.value.trim();
    });
    saveState();
    showToast('Bilan enfant enregistré.');
  });

  refs.parentReviewForm.addEventListener('submit', event => {
    event.preventDefault();
    Object.entries(refs.parentReviewFields).forEach(([key, field]) => {
      state.reviews.parent[key] = field.value.trim();
    });
    saveState();
    showToast('Bilan parent enregistré.');
  });
}

function setupExportImport() {
  refs.exportJsonBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `pilote-${new Date().toISOString()}.json`);
  });

  refs.exportCsvBtn.addEventListener('click', () => {
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
      state.rewards[category].forEach(value => {
        rows.push(['recompense', category, value, '']);
      });
    });
    const csv = rows.map(row => row.map(safeCsvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `pilote-${new Date().toISOString()}.csv`);
  });

  refs.importFile.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        state = mergeState(DEFAULT_STATE, imported);
        ensureObjectiveStatus();
        saveState();
        renderAll();
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

function renderAll() {
  updateWeekLabel();
  renderBarometer();
  renderStrategies();
  renderObjectives();
  renderFocusSummary();
  renderTokens();
  renderBadges();
  renderRewards();
  renderEmotionHistory();
  populateParentForms();
  populateReviewForms();
}

function updateWeekLabel() {
  if (!refs.currentWeekLabel) return;
  const today = new Date();
  const monday = startOfWeek(today);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const formatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });
  refs.currentWeekLabel.textContent = `${formatter.format(monday)} – ${formatter.format(sunday)}`;
}

function renderBarometer() {
  refs.barometerButtons.forEach(button => {
    const level = Number(button.dataset.level);
    button.classList.toggle('active', state.currentLevel === level);
  });
  if (state.currentLevel) {
    refs.currentLevelLabel.textContent = `${state.currentLevel} – ${EMOTION_LEVELS[state.currentLevel]}`;
  } else {
    refs.currentLevelLabel.textContent = 'Pas encore choisi';
  }
  refs.pauseButton.hidden = !state.currentLevel || state.currentLevel < 4;
}

function handleLevelSelection(level) {
  state.currentLevel = level;
  state.emotionHistory.push({ level, timestamp: new Date().toISOString() });
  if (state.emotionHistory.length > 30) {
    state.emotionHistory.shift();
  }
  saveState();
  renderBarometer();
  renderEmotionHistory();
  renderBadges();
}

function renderStrategies() {
  if (!refs.strategyList) return;
  refs.strategyList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  (state.strategies && state.strategies.length ? state.strategies : DEFAULT_STATE.strategies).forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    fragment.appendChild(li);
  });
  refs.strategyList.appendChild(fragment);

  renderStrategyFields();
}

function renderRewards() {
  if (!refs.rewardList) return;
  refs.rewardList.innerHTML = '';
  const categories = [
    { id: 'immediate', title: 'Immédiates (0-15 min)' },
    { id: 'planned', title: 'Programmées' },
    { id: 'symbolic', title: 'Symboliques' },
  ];
  categories.forEach(category => {
    const section = document.createElement('section');
    const h4 = document.createElement('h4');
    h4.textContent = category.title;
    const list = document.createElement('ul');
    const entries = state.rewards[category.id] || [];
    if (!entries.length) {
      const li = document.createElement('li');
      li.textContent = 'À définir avec ton parent';
      list.appendChild(li);
    }
    entries.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    section.appendChild(h4);
    section.appendChild(list);
    refs.rewardList.appendChild(section);
  });
}

function renderObjectives() {
  if (!refs.objectiveList) return;
  refs.objectiveList.innerHTML = '';
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
    refs.objectiveList.appendChild(li);
  });
}

function renderFocusSummary() {
  if (!refs.focusSummary) return;
  if (state.focus.skill) {
    const notes = state.focus.notes ? ` – ${state.focus.notes}` : '';
    refs.focusSummary.textContent = `Objectif de la semaine : ${state.focus.skill}${notes}`;
  } else {
    refs.focusSummary.textContent = 'Ton parent ajoutera ici l’objectif hebdomadaire.';
  }
}

function renderTokens() {
  refs.tokenCount.textContent = String(state.tokens);
}

function renderBadges() {
  if (!state.badges) {
    state.badges = {};
  }
  refs.badgeList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  BADGE_RULES.forEach(rule => {
    const earned = rule.check(state);
    state.badges[rule.id] = earned;
    const li = document.createElement('li');
    const title = document.createElement('span');
    title.textContent = rule.label;
    const status = document.createElement('span');
    status.textContent = earned ? 'Gagné' : 'À venir';
    status.className = earned ? 'badge-earned' : '';
    li.append(title, status);
    fragment.appendChild(li);
  });
  refs.badgeList.appendChild(fragment);
  saveState();
}

function renderEmotionHistory() {
  refs.emotionHistory.innerHTML = '';
  if (!state.emotionHistory.length) {
    const li = document.createElement('li');
    li.textContent = 'Aucune donnée pour le moment.';
    refs.emotionHistory.appendChild(li);
    return;
  }
  const fragment = document.createDocumentFragment();
  [...state.emotionHistory].slice(-15).reverse().forEach(entry => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${entry.level} – ${EMOTION_LEVELS[entry.level]}`;
    const time = document.createElement('span');
    time.textContent = formatTime(entry.timestamp);
    li.append(label, time);
    fragment.appendChild(li);
  });
  refs.emotionHistory.appendChild(fragment);
}

function populateParentForms() {
  refs.focusInput.value = state.focus.skill || '';
  refs.focusNotes.value = state.focus.notes || '';
  refs.routineFields.forEach(area => {
    area.value = state.routines[area.dataset.routine] || '';
  });
  refs.triggerInput.value = state.triggers || '';
  refs.rewardInputs.forEach(textarea => {
    textarea.value = (state.rewards[textarea.dataset.reward] || []).join('\n');
  });
}

function populateReviewForms() {
  Object.entries(refs.childReviewFields).forEach(([key, field]) => {
    field.value = state.reviews.child[key] || '';
  });
  Object.entries(refs.parentReviewFields).forEach(([key, field]) => {
    field.value = state.reviews.parent[key] || '';
  });
}

function renderStrategyFields() {
  if (!refs.strategyFields) return;
  refs.strategyFields.innerHTML = '';
  const total = 5;
  for (let i = 0; i < total; i += 1) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Idée ${i + 1}`;
    input.value = state.strategies[i] || '';
    refs.strategyFields.appendChild(input);
  }
}

function renderObjectiveFields() {
  if (!refs.objectiveFields) return;
  refs.objectiveFields.innerHTML = '';
  const total = 3;
  for (let i = 0; i < total; i += 1) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Objectif ${i + 1}`;
    input.value = state.objectives[i]?.label || '';
    refs.objectiveFields.appendChild(input);
  }
}

function renderScripts() {
  if (!refs.scriptList) return;
  refs.scriptList.innerHTML = '';
  SCRIPT_LIBRARY.forEach(script => {
    const card = document.createElement('div');
    card.className = 'script-card';
    const title = document.createElement('h4');
    title.textContent = script.title;
    card.appendChild(title);
    script.lines.forEach(line => {
      const p = document.createElement('p');
      p.textContent = line;
      card.appendChild(p);
    });
    refs.scriptList.appendChild(card);
  });
}

function setPanelLock(type, locked) {
  panelLocks[type] = locked;
  const banner = type === 'parent' ? refs.parentLockBanner : refs.bilanLockBanner;
  const content = type === 'parent' ? refs.parentContent : refs.bilanContent;
  if (banner) {
    banner.style.display = locked ? 'block' : 'none';
  }
  if (content) {
    content.classList.toggle('is-locked', locked);
  }
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

function handleToastVisibility(show) {
  if (!refs.toast) return;
  refs.toast.classList.toggle('visible', show);
}

function showToast(message) {
  if (!refs.toast) return;
  refs.toast.textContent = message;
  handleToastVisibility(true);
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => handleToastVisibility(false), 3000);
}

function addTokens(amount, reason) {
  state.tokens += amount;
  renderTokens();
  saveState();
  if (reason) {
    showToast(`${reason} (+${amount} jeton)`);
  }
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
  const result = { ...base };
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

function startOfWeek(date) {
  const cloned = new Date(date);
  const day = cloned.getDay();
  const diff = cloned.getDate() - day + (day === 0 ? -6 : 1);
  cloned.setDate(diff);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
}
