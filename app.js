/* ====== BLOC 1/3 : config + state + boot + CHILD ====== */

/* =========================================================
   PILOTE - app.js (version stable v2)
   - 100% localStorage
   - Sans backend / sans lib / sans tracking
   - Robuste si des éléments HTML manquent
   ========================================================= */

const STORAGE_KEY = 'pilote-state-v2';
const LEGACY_KEYS = ['pilote-state-v1']; // migration douce

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
  {
    say: "« Je vois que c'est dur. On met tout en pause. Je suis là. »",
    do: 'Faire baisser les stimulations. Une seule consigne courte.',
    after: 'Quand ça redescend : “On répare doucement. On recommence petit.”',
  },
  {
    say: "« Ton moteur est trop chargé. Pause ensemble. »",
    do: 'Se mettre à côté, respirer lentement, voix basse.',
    after: '“Merci d’être revenu. On garde ce qui a aidé.”',
  },
  {
    say: "« On respire d'abord, on parle après. »",
    do: 'Proposer un outil (sphère / coin calme / pression 20s).',
    after: '“La prochaine fois, on pause plus tôt.”',
  },
];

const SCRIPT_LIBRARY = [
  {
    title: 'Avant',
    lines: [
      '« Dans 5 minutes, on change. Tu veux A ou B ? »',
      '« On commence par le plus facile. »',
      '« Je suis avec toi, on fait un petit pas. »',
    ],
  },
  {
    title: 'Pendant',
    lines: [
      '« Je vois que ça monte. Pause. »',
      '« Une seule chose : on souffle. »',
      '« Je reste là. »',
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

  strategies: ['🤲 Appuyer / serrer (20 s)', '🪑 Coin calme (2 min)', '🌬️ Respirer 5 fois'],

  objectives: OBJECTIVE_LIBRARY.slice(0, 3),
  objectiveStatus: {},

  rewards: {
    immediate: ['Moment câlin', 'Puzzle ensemble'],
    planned: ['Balade du week-end'],
    symbolic: ['Message audio de fierté'],
    next: '',
  },

  routines: {
    morning: '',
    homework: '',
    evening: '',
    planBMorning: '',
    planBHomework: '',
    planBEvening: '',
  },

  triggerSelections: [],
  triggerNotes: '',

  emotionHistory: [],
  pauseHistory: [],

  reviews: {
    child: { helps: '', proud: '', try: '' },
    parent: { risks: '', strategies: '', structure: '' },
  },

  landing: {
    childEmoji: '🚀',
    selectedDate: null,
    weekAnchor: null,
    calendar: {},
  },

  counter: {
    label: '',
    participants: [],
    weekAnchor: null,
    selectedDate: null,
  },
};

const HELP_CONTENT = {
  default: `
    <h2>🧭 PILOTE — Mode d’emploi</h2>
    <p>Une application simple pour aider un enfant à se réguler et un parent à rester au clair. Tout est local, sans compte.</p>
    <section>
      <h3>🏠 Accueil – « Choisis ton espace »</h3>
      <p>Trois portes : 👧 Enfant (mon cockpit), 🧑‍🧑‍🧒 Parent (tour de contrôle) et 🤝 Bilan (à deux, quand tout est calme).</p>
    </section>
    <section>
      <h3>🗓️ Calendrier apaisé</h3>
      <ul>
        <li>Ajoute des étapes avec emoji, heure (début/fin) et description personalisable.</li>
        <li>Duplique ta journée sur la semaine, un mois ou plusieurs mois en cochant simplement les jours concernés.</li>
        <li>Bouton « Enregistrer à l’année » pour appliquer le même motif sur les 12 mois.</li>
        <li>Boutons Exporter / Importer pour sauvegarder ton calendrier (JSON local).</li>
      </ul>
    </section>
    <section>
      <h3>👧 Enfant – Mon cockpit</h3>
      <p>Baromètre 1 à 5 pour dire où en est le moteur. À 4/5 : pause guidée, outils (max 3) + jetons symboliques, sphère de respiration, carnet (objectifs, jetons, badges, récompense du jour).</p>
    </section>
    <section>
      <h3>🧑‍🧑‍🧒 Parent – Tour de contrôle</h3>
      <p>Protégé par PIN. On y trouve :</p>
      <ul>
        <li>Mode crise (dire/faire/après en 3 lignes)</li>
        <li>Objectifs (1 principal + 2 max secondaires)</li>
        <li>Scripts avant / pendant / après (copiables)</li>
        <li>Routines matin / devoirs / soir + plan B</li>
        <li>Stratégies, déclencheurs, récompenses</li>
      </ul>
    </section>
    <section>
      <h3>🤝 Bilan – Temps de compréhension</h3>
      <p>Verrouillé par PIN. 3 questions pour l’enfant (ce qui aide, fierté, piste), 3 pour l’adulte (risques, stratégies, structure). Historique émotionnel, export JSON/CSV.</p>
    </section>
    <section>
      <h3>📱 Compatibilité & philosophie</h3>
      <p>Smartphone / tablette / ordinateur, hors ligne, ajoutable à l’écran d’accueil. Pas de diagnostic, pas de jugement : relation & régulation avant la performance.</p>
    </section>
  `,
  calendar: `
    <h2>🗓️ Calendrier apaisé</h2>
    <p>Remplis la semaine avec ton enfant, duplique les journées qui fonctionnent et imprime-les si besoin.</p>
    <ul>
      <li>Ajoute des étapes avec emoji, heure de début/fin et un texte libre.</li>
      <li>Copie une journée sur d’autres dates, un mois complet ou toute l’année.</li>
      <li>Export/Import JSON pour sauvegarder localement et partager.</li>
      <li>Bouton Impression : journée seule ou la semaine entière.</li>
    </ul>
  `,

  counter: `
    <h2>🧮 Compteur</h2>
    <p>Choisis un comportement, une action positive ou un mot à suivre, puis assigne-le à plusieurs enfants.</p>
    <ul>
      <li>Écris l’observable (“Je dis merci”, “Bonnes actions”) et ajoute les prénoms (séparés par des virgules ou retours à la ligne).</li>
      <li>Chaque carte affiche un bouton “+1” libre d’accès.</li>
      <li>Les boutons “−” et “Remettre à zéro” sont protégés par un code parent.</li>
      <li>Tout reste stocké localement : parfait pour un suivi quotidien partagé.</li>
    </ul>
  `,
};

const WEEKDAY_SHORT_FORMAT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const DAY_MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });
const DAY_FULL_FORMAT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const TASK_COLOR_PALETTE = [
  { bg: '#f6eee7', border: '#eedccd' },
  { bg: '#eef5f3', border: '#d9ebe5' },
  { bg: '#eef1fb', border: '#d7def4' },
  { bg: '#f5eef8', border: '#e4d9ec' },
  { bg: '#f3f6ea', border: '#e0e8cf' },
  { bg: '#fdf1ec', border: '#f2dcd1' },
];

const COUNTER_COLOR_PALETTE = [
  { bg: '#fff2e6', border: '#ffd2a8' },
  { bg: '#f2f9ff', border: '#cfe7ff' },
  { bg: '#fef2fb', border: '#f7cae6' },
  { bg: '#f1fff7', border: '#c2f0d6' },
  { bg: '#fef7e8', border: '#f4dfb5' },
  { bg: '#f2f2ff', border: '#d4d4ff' },
];

const COUNTER_PROTECTION_CODE = '57';

let state = loadState();
let crisisIndex = 0;

let breathInterval = null;
let lastOpenedModal = null;
let landingSelectedDate = null;
let landingWeekAnchor = null;
let landingAutoLabel = '';
let helpModal = null;
let counterWeekAnchor = null;
let counterSelectedDateKey = null;
let counterEditing = false;

/* =========================================================
   Boot / router
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const pageAttr = document.body?.dataset?.page;

  const path = (location.pathname || '').toLowerCase();
  const page =
    pageAttr ||
    (path.includes('enfant')
      ? 'child'
      : path.includes('parent')
      ? 'parent'
      : path.includes('bilan')
      ? 'bilan'
      : path.includes('compteur') || path.includes('counter')
      ? 'counter'
      : path.includes('calendrier') || path.includes('calendar')
      ? 'calendar'
      : 'landing');

  ensureObjectiveStatus();
  ensureLandingDefaults();
  ensureCounterDefaults();
  saveState();

  // Global: Escape ferme la modale la plus récente
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (lastOpenedModal) closeModal(lastOpenedModal);
    }
  });

  if (page === 'child') initChild();
  if (page === 'parent') initParent();
  if (page === 'bilan') initBilan();
  if (page === 'counter') initCounter();
  if (page === 'landing' || page === 'calendar') initLanding(page);
});

/* =========================================================
   Landing
   ========================================================= */

function initLanding(pageKey = 'landing') {
  ensureLandingDefaults();
  setupHelpButton(pageKey);

  const refs = {
    childEmojiSelect: document.getElementById('childEmojiSelect'),
    childEmojiDisplay: document.getElementById('childEmojiDisplay'),
    week: document.getElementById('calendarWeek'),
    weekPrev: document.getElementById('weekPrev'),
    weekNext: document.getElementById('weekNext'),
    dayLabel: document.getElementById('selectedDayLabel'),
    dayList: document.getElementById('dayTaskList'),
    dayFullscreen: document.getElementById('dayFullscreen'),
    dayFullscreenLabel: document.getElementById('fullscreenDayLabel'),
    dayFullscreenList: document.getElementById('dayTaskFullscreenList'),
    dayFullscreenClose: document.getElementById('closeDayFullscreen'),
    openDayFullscreen: document.getElementById('openDayFullscreen'),
    openCopyDay: document.getElementById('openCopyDay'),
    form: document.getElementById('dayTaskForm'),
    taskEmoji: document.getElementById('taskEmoji'),
    taskTime: document.getElementById('taskTime'),
    taskEndTime: document.getElementById('taskEndTime'),
    taskLabel: document.getElementById('taskLabel'),
    customEmojiFields: document.getElementById('customEmojiFields'),
    customEmojiInput: document.getElementById('customEmojiInput'),
    copyModal: document.getElementById('copyDayModal'),
    copyWeekTargets: document.getElementById('copyWeekTargets'),
    copyMonthList: document.getElementById('copyMonthList'),
    copyMonthInput: document.getElementById('copyMonthInput'),
    addCopyMonth: document.getElementById('addCopyMonth'),
    printWeekButton: document.getElementById('printWeekButton'),
    printModal: document.getElementById('printOptionsModal'),
    printDaySelect: document.getElementById('printDaySelect'),
    printDaySubmit: document.getElementById('printDaySubmit'),
    printWeekSubmit: document.getElementById('printWeekSubmit'),
    closePrintModalBtn: document.getElementById('closePrintModal'),
    cancelPrintModalBtn: document.getElementById('cancelPrintModal'),
    copyForm: document.getElementById('copyDayForm'),
    copyCancel: document.getElementById('cancelCopyDay'),
    copyClose: document.getElementById('closeCopyDay'),
    applyYearButton: document.getElementById('applyYearButton'),
    exportCalendar: document.getElementById('exportCalendar'),
    importCalendar: document.getElementById('importCalendar'),
    importCalendarInput: document.getElementById('importCalendarInput'),
    printFullscreen: document.getElementById('printFullscreenDay'),
  };

  const handleTaskDelete = e => {
    const btn = e.target.closest('button[data-delete-task]');
    if (!btn?.dataset?.deleteTask) return;
    removeLandingTask(landingSelectedDate, btn.dataset.deleteTask);
    renderLandingWeek(refs);
    renderLandingDay(refs);
  };

  const handleTaskToggle = e => {
    const checkbox = e.target.closest('input[data-task-toggle]');
    if (!checkbox?.dataset?.taskToggle) return;
    toggleLandingTaskCompletion(landingSelectedDate, checkbox.dataset.taskToggle, checkbox.checked);
    renderLandingWeek(refs);
    renderLandingDay(refs);
  };

  const handleLandingEsc = e => {
    if (e.key !== 'Escape') return;
    if (refs.dayFullscreen && !refs.dayFullscreen.hidden) closeLandingDayFullscreen(refs);
    if (refs.copyModal && !refs.copyModal.hidden) closeCopyDayModal(refs);
  };

  const todayKey = toDateKey(new Date());
  landingSelectedDate = state.landing.selectedDate || todayKey;
  const anchorDate =
    parseDateKey(state.landing.weekAnchor) || parseDateKey(landingSelectedDate) || new Date();
  landingWeekAnchor = startOfWeek(anchorDate);
  ensureLandingWeekContainsSelection();
  state.landing.weekAnchor = toDateKey(landingWeekAnchor);
  if (!state.landing.selectedDate) state.landing.selectedDate = landingSelectedDate;
  saveState();

  syncChildEmojiPicker(refs);

  renderLandingWeek(refs);
  renderLandingDay(refs);
  updateCustomEmojiFields(refs);
  autoFillTaskLabel(refs);

  refs.week?.addEventListener('click', e => {
    const card = e.target.closest('.calendar-day-card');
    if (!card?.dataset?.date) return;
    const clickedDate = card.dataset.date;
    const wasSelected = clickedDate === landingSelectedDate;
    landingSelectedDate = clickedDate;
    state.landing.selectedDate = landingSelectedDate;
    ensureLandingWeekContainsSelection();
    state.landing.weekAnchor = toDateKey(landingWeekAnchor);
    saveState();
    renderLandingWeek(refs);
    renderLandingDay(refs);
    if (wasSelected) openLandingDayFullscreen(refs);
  });

  refs.weekPrev?.addEventListener('click', () => shiftLandingWeek(-1, refs));
  refs.weekNext?.addEventListener('click', () => shiftLandingWeek(1, refs));

  refs.form?.addEventListener('submit', e => {
    e.preventDefault();
    const selectedEmoji = (refs.taskEmoji?.value || '⭐️').trim();
    let emoji = selectedEmoji;
    if (selectedEmoji === 'custom') {
      emoji = (refs.customEmojiInput?.value || '').trim();
      if (!emoji) {
        alert('Choisis un emoji pour personnaliser cette activité.');
        return;
      }
    }
    const time = refs.taskTime?.value || '';
    const endTime = refs.taskEndTime?.value || '';
    if (endTime && time && endTime < time) {
      alert('L’heure de fin doit être après l’heure de début.');
      return;
    }
    const label = (refs.taskLabel?.value || '').trim();
    if (!label) {
      alert('Ajoute un petit descriptif pour cette étape.');
      return;
    }

    const targetDate = landingSelectedDate || todayKey;
    addLandingTask(targetDate, { emoji, time, endTime, label });
    refs.form.reset();
    if (refs.taskEmoji) refs.taskEmoji.value = selectedEmoji === 'custom' ? 'custom' : selectedEmoji;
    if (selectedEmoji === 'custom' && refs.customEmojiInput) refs.customEmojiInput.value = '';
    landingAutoLabel = '';
    updateCustomEmojiFields(refs);
    autoFillTaskLabel(refs);
    refs.taskEndTime && (refs.taskEndTime.value = '');
    renderLandingWeek(refs);
    renderLandingDay(refs);
  });

  refs.taskEmoji?.addEventListener('change', () => {
    updateCustomEmojiFields(refs);
    autoFillTaskLabel(refs);
  });

  [refs.dayList, refs.dayFullscreenList].forEach(list => {
    list?.addEventListener('click', handleTaskDelete);
    list?.addEventListener('change', handleTaskToggle);
  });

  refs.openDayFullscreen?.addEventListener('click', () => openLandingDayFullscreen(refs));
  refs.dayFullscreenClose?.addEventListener('click', () => closeLandingDayFullscreen(refs));
  refs.dayFullscreen?.addEventListener('click', e => {
    if (e.target === refs.dayFullscreen) closeLandingDayFullscreen(refs);
  });
  refs.openCopyDay?.addEventListener('click', () => openCopyDayModal(refs));
  refs.copyClose?.addEventListener('click', () => closeCopyDayModal(refs));
  refs.copyCancel?.addEventListener('click', () => closeCopyDayModal(refs));
  refs.copyModal?.addEventListener('click', e => {
    if (e.target === refs.copyModal) closeCopyDayModal(refs);
  });

  refs.copyForm?.addEventListener('submit', e => {
    e.preventDefault();
    handleCopyApply(refs);
  });

  refs.applyYearButton?.addEventListener('click', () => handleCopyApply(refs, { fullYear: true }));

  refs.addCopyMonth?.addEventListener('click', () => {
    const value = refs.copyMonthInput?.value;
    if (!value) {
      alert('Choisis un mois à ajouter.');
      return;
    }
    addCopyMonthBlock(refs, value);
    if (refs.copyMonthInput) refs.copyMonthInput.value = nextMonthValue(value);
  });

  refs.printWeekButton?.addEventListener('click', () => openPrintModal(refs));
  refs.printDaySubmit?.addEventListener('click', () => handlePrintDaySubmit(refs));
  refs.printWeekSubmit?.addEventListener('click', () => {
    closePrintModal(refs);
    handlePrintWeek(refs);
  });
  refs.closePrintModalBtn?.addEventListener('click', () => closePrintModal(refs));
  refs.cancelPrintModalBtn?.addEventListener('click', () => closePrintModal(refs));
  refs.printModal?.addEventListener('click', e => {
    if (e.target === refs.printModal) closePrintModal(refs);
  });

  refs.exportCalendar?.addEventListener('click', () => exportLandingCalendar());
  refs.importCalendar?.addEventListener('click', () => refs.importCalendarInput?.click());
  refs.importCalendarInput?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    importLandingCalendar(file, refs);
    e.target.value = '';
  });

  document.addEventListener('keydown', handleLandingEsc);

  refs.childEmojiSelect?.addEventListener('change', e => {
    state.landing.childEmoji = e.target.value;
    syncChildEmojiPicker(refs);
    saveState();
  });

  refs.printFullscreen?.addEventListener('click', () => handlePrintDay(refs, landingSelectedDate));
}

function syncChildEmojiPicker(refs) {
  const value = getChildEmojiValue();
  if (refs.childEmojiSelect) refs.childEmojiSelect.value = value;
  applyChildEmojiToTarget(refs.childEmojiDisplay, value);
  applyChildEmojiToTarget(refs.childEmojiBadge, value);
}

function applyChildEmojiToTarget(target, value) {
  if (!target) return;
  const output = value || '🚀';
  if (output.startsWith('img:')) {
    const img = document.createElement('img');
    img.src = output.replace(/^img:/, '');
    img.alt = 'Emoji personnalisé';
    const size = Number(target.dataset?.emojiSize) || 48;
    img.width = size;
    img.height = size;
    target.innerHTML = '';
    target.appendChild(img);
    return;
  }
  target.textContent = output;
}

function getChildEmojiValue() {
  return state.landing?.childEmoji || DEFAULT_STATE.landing.childEmoji || '🚀';
}

function shiftLandingWeek(delta, refs) {
  const selected = parseDateKey(landingSelectedDate) || new Date();
  selected.setDate(selected.getDate() + delta * 7);
  landingSelectedDate = toDateKey(selected);
  landingWeekAnchor = startOfWeek(selected);
  state.landing.selectedDate = landingSelectedDate;
  state.landing.weekAnchor = toDateKey(landingWeekAnchor);
  saveState();
  renderLandingWeek(refs);
  renderLandingDay(refs);
}

function renderLandingWeek(refs) {
  if (!refs.week) return;
  const weekDates = getWeekDates(landingWeekAnchor || new Date());
  const html = weekDates
    .map(date => {
      const key = toDateKey(date);
      const tasks = state.landing.calendar[key] || [];
      const summary = tasks.slice(0, 3).map(task => task.emoji).join(' ');
      const dayName = capitalizeLabel(WEEKDAY_SHORT_FORMAT.format(date));
      return `<button type="button" class="calendar-day-card${
        key === landingSelectedDate ? ' is-selected' : ''
      }" data-date="${key}">
        <strong>${dayName}</strong>
        <small>${DAY_MONTH_FORMAT.format(date)}</small>
        <span class="calendar-day-emojis">${summary || '&nbsp;'}</span>
      </button>`;
    })
    .join('');
  refs.week.innerHTML = html;
}

function renderLandingDay(refs) {
  if (!refs.dayLabel) return;
  const date = parseDateKey(landingSelectedDate) || new Date();
  const label = capitalizeLabel(DAY_FULL_FORMAT.format(date));
  refs.dayLabel.textContent = label;
  if (refs.dayFullscreenLabel) refs.dayFullscreenLabel.textContent = label;

  const tasks = [...(state.landing.calendar[landingSelectedDate] || [])]
    .map(task => ({ ...task, completed: Boolean(task.completed) }))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  renderLandingTasks(refs.dayList, tasks);
  renderLandingTasks(refs.dayFullscreenList, tasks);
}

function renderLandingTasks(container, tasks) {
  if (!container) return;
  container.innerHTML = '';

  if (!tasks.length) {
    const empty = document.createElement('li');
    empty.className = 'calendar-task empty';
    empty.textContent = 'Aucune étape enregistrée pour cette journée.';
    container.appendChild(empty);
    return;
  }

  const buckets = splitTasksByPeriod(tasks);
  container.appendChild(buildTaskColumn('Matin (6h-12h)', buckets.morning, 'morning'));
  container.appendChild(buildMiddayBlock(buckets.midday));
  container.appendChild(buildTaskColumn('Après-midi (14h-18h)', buckets.afternoon, 'afternoon'));
  container.appendChild(buildTaskColumn('Soir (18h-minuit)', buckets.evening, 'evening'));
}

function buildTaskColumn(title, items, modifier) {
  const li = document.createElement('li');
  li.className = `calendar-column calendar-column-${modifier}`;

  const head = document.createElement('div');
  head.className = 'calendar-column-head';
  const label = document.createElement('p');
  label.className = 'eyebrow';
  label.textContent = title;
  head.appendChild(label);
  li.appendChild(head);

  const list = document.createElement('ul');
  list.className = 'calendar-task-list';
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'calendar-task empty';
    empty.textContent = 'À définir.';
    list.appendChild(empty);
  } else {
    items.forEach(task => list.appendChild(buildTaskElement(task)));
  }
  li.appendChild(list);
  return li;
}

function buildMiddayBlock(items) {
  const li = document.createElement('li');
  li.className = 'calendar-midday-block';
  const label = document.createElement('p');
  label.className = 'eyebrow';
  label.textContent = 'Midi (12h-14h)';
  li.appendChild(label);

  const list = document.createElement('ul');
  list.className = 'calendar-task-list';
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'calendar-task empty';
    empty.textContent = 'Pause ou repas prévu.';
    list.appendChild(empty);
  } else {
    items.forEach(task => list.appendChild(buildTaskElement(task)));
  }
  li.appendChild(list);
  return li;
}

function buildTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'calendar-task';
  if (task.completed) li.classList.add('is-completed');
  li.dataset.taskId = task.id;
  const color = getTaskColor(task);
  li.style.setProperty('--task-bg', color.bg);
  li.style.setProperty('--task-border', color.border);

  const checkLabel = document.createElement('label');
  checkLabel.className = 'calendar-task-checkbox';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean(task.completed);
  checkbox.dataset.taskToggle = task.id;
  checkbox.setAttribute(
    'aria-label',
    `${checkbox.checked ? 'Décocher' : 'Valider'} ${task.label || 'cette étape'}`
  );

  const checkMark = document.createElement('span');
  checkMark.textContent = checkbox.checked ? '✅' : '◻️';

  checkLabel.append(checkbox, checkMark);

  const info = document.createElement('div');
  info.className = 'calendar-task-info';

  const emoji = document.createElement('span');
  emoji.className = 'calendar-task-emoji';
  emoji.textContent = task.emoji || '⭐️';

  const textWrap = document.createElement('div');
  textWrap.className = 'calendar-task-text';

  const timeEl = document.createElement('span');
  timeEl.className = 'calendar-task-time';
  timeEl.textContent = formatTaskTime(task);

  const labelEl = document.createElement('span');
  labelEl.className = 'calendar-task-label';
  labelEl.textContent = task.label;

  textWrap.append(timeEl, labelEl);
  info.append(emoji, textWrap);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.dataset.deleteTask = task.id;
  removeBtn.setAttribute('aria-label', `Supprimer ${task.label || 'cette étape'}`);
  removeBtn.textContent = '×';

  li.append(checkLabel, info, removeBtn);
  return li;
}

function splitTasksByPeriod(tasks) {
  const buckets = { morning: [], midday: [], afternoon: [], evening: [] };
  tasks.forEach(task => {
    const slot = categorizeTaskSlot(task, buckets);
    buckets[slot].push(task);
  });
  return buckets;
}

function categorizeTaskSlot(task, buckets) {
  const label = (task.label || '').toLowerCase();
  const time = task.time || '';
  if (isMiddayTask(time, label)) return 'midday';
  const minutes = getTimeMinutes(time);
  if (minutes !== null) {
    if (minutes < 360) return 'evening';
    if (minutes < 720) return 'morning';
    if (minutes < 840) return 'midday';
    if (minutes < 1080) return 'afternoon';
    return 'evening';
  }
  const order = ['morning', 'midday', 'afternoon', 'evening'];
  return order.reduce((best, key) => {
    if (!best) return key;
    return buckets[key].length < buckets[best].length ? key : best;
  }, 'morning');
}

function isMiddayTask(time, label) {
  const breakfastWords = ['petit déjeuner', 'petit-dejeuner', 'petitdej', 'petit dej'];
  if (breakfastWords.some(word => label.includes(word))) return false;
  const middayWords = ['déjeuner', 'dejeuner', 'repas', 'midi'];
  if (middayWords.some(word => label.includes(word))) return true;
  if (!time) return false;
  const minutes = getTimeMinutes(time);
  if (minutes === null) return false;
  return minutes >= 720 && minutes < 840;
}

function getTimeMinutes(time) {
  if (!time) return null;
  const [hourStr, minuteStr] = time.split(':');
  const hours = Number(hourStr);
  const minutes = Number(minuteStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function openLandingDayFullscreen(refs) {
  if (!refs?.dayFullscreen) return;
  refs.dayFullscreen.hidden = false;
  refs.dayFullscreen.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  document.body.classList.add('calendar-focus');
  renderLandingDay(refs);
  const focusTarget = refs.dayFullscreen.querySelector('button, [href], input, select, textarea');
  focusTarget?.focus?.();
}

function formatTaskTime(task) {
  if (task.time && task.endTime) return `${task.time} – ${task.endTime}`;
  if (task.time) return task.time;
  if (task.endTime) return task.endTime;
  return '—';
}

function autoFillTaskLabel(refs) {
  if (!refs?.taskLabel || !refs.taskEmoji) return;
  const option = refs.taskEmoji.selectedOptions?.[0];
  if (!option) return;
  if (option.value === 'custom') {
    if (!refs.taskLabel.value || refs.taskLabel.value === landingAutoLabel) {
      refs.taskLabel.value = '';
    }
    landingAutoLabel = '';
    return;
  }
  const text = option.textContent?.trim();
  if (!text) return;
  refs.taskLabel.value = text;
  landingAutoLabel = text;
}

function getTaskColor(task) {
  const seed = `${task.emoji || ''}|${task.label || ''}|${task.id || ''}`;
  const hash = stringHash(seed);
  const paletteIndex = Math.abs(hash) % TASK_COLOR_PALETTE.length;
  return TASK_COLOR_PALETTE[paletteIndex];
}

function stringHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function setupHelpButton(page) {
  const content = HELP_CONTENT[page] || HELP_CONTENT.default;
  if (!content) return;
  let btn = document.querySelector('.help-button');
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'help-button';
    btn.textContent = '❓ Aide';
    document.body.appendChild(btn);
  }
  btn.dataset.helpPage = page;
  btn.onclick = () => openHelpModal(page);
}

function ensureHelpModal() {
  if (helpModal) return helpModal;
  const modal = document.createElement('div');
  modal.className = 'modal help-modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Mode d’emploi PILOTE');

  const panel = document.createElement('div');
  panel.className = 'help-panel';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'day-fullscreen-close';
  closeBtn.setAttribute('aria-label', 'Fermer l’aide');
  closeBtn.textContent = '×';

  const body = document.createElement('div');
  body.className = 'help-panel-body';

  panel.append(closeBtn, body);
  modal.append(panel);
  document.body.appendChild(modal);

  closeBtn.addEventListener('click', closeHelpModal);
  modal.addEventListener('click', e => {
    if (e.target === modal) closeHelpModal();
  });

  helpModal = modal;
  return modal;
}

function openHelpModal(page) {
  const modal = ensureHelpModal();
  const body = modal.querySelector('.help-panel-body');
  body.innerHTML = HELP_CONTENT[page] || HELP_CONTENT.default || '<p>Aucune aide disponible.</p>';
  openModal(modal);
}

function closeHelpModal() {
  if (!helpModal) return;
  closeModal(helpModal);
}

function closeLandingDayFullscreen(refs) {
  if (!refs?.dayFullscreen) return;
  refs.dayFullscreen.hidden = true;
  refs.dayFullscreen.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  document.body.classList.remove('calendar-focus');
}

function updateCustomEmojiFields(refs) {
  if (!refs?.customEmojiFields || !refs.taskEmoji) return;
  const isCustom = refs.taskEmoji.value === 'custom';
  refs.customEmojiFields.classList.toggle('is-visible', isCustom);
  refs.customEmojiFields.setAttribute('aria-hidden', isCustom ? 'false' : 'true');
}

function openCopyDayModal(refs) {
  if (!refs?.copyModal) return;
  renderCopyWeekTargets(refs);
  resetCopyMonthBlocks(refs);
  refs.copyModal.hidden = false;
  refs.copyModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  const focusTarget = refs.copyModal.querySelector('input, button, select, textarea');
  focusTarget?.focus?.();
}

function closeCopyDayModal(refs) {
  if (!refs?.copyModal) return;
  refs.copyModal.hidden = true;
  refs.copyModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  refs.copyForm?.reset?.();
  refs.copyMonthList && (refs.copyMonthList.innerHTML = '');
}

function openPrintModal(refs) {
  if (!refs?.printModal) return;
  renderPrintDayOptions(refs);
  refs.printModal.hidden = false;
  refs.printModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  refs.printDaySelect?.focus?.();
}

function closePrintModal(refs) {
  if (!refs?.printModal) return;
  refs.printModal.hidden = true;
  refs.printModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
}

function renderPrintDayOptions(refs) {
  if (!refs?.printDaySelect) return;
  const weekDates = getWeekDates(landingWeekAnchor || new Date());
  refs.printDaySelect.innerHTML = weekDates
    .map(date => {
      const key = toDateKey(date);
      const label = capitalizeLabel(DAY_FULL_FORMAT.format(date));
      return `<option value="${key}">${label}</option>`;
    })
    .join('');
  refs.printDaySelect.value = landingSelectedDate;
}

function renderCopyWeekTargets(refs) {
  if (!refs?.copyWeekTargets) return;
  const weekDates = getWeekDates(landingWeekAnchor || new Date());
  refs.copyWeekTargets.innerHTML = '';
  weekDates.forEach(date => {
    const key = toDateKey(date);
    const label = capitalizeLabel(WEEKDAY_SHORT_FORMAT.format(date));
    const dayLabel = DAY_MONTH_FORMAT.format(date);
    const wrapper = document.createElement('label');
    wrapper.className = 'copy-day-target';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.date = key;
    checkbox.disabled = key === landingSelectedDate;

    const text = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = label;
    const small = document.createElement('small');
    small.textContent = dayLabel;
    text.append(strong, small);

    wrapper.append(checkbox, text);
    refs.copyWeekTargets.appendChild(wrapper);
  });
}

function resetCopyMonthBlocks(refs) {
  if (!refs?.copyMonthList) return;
  refs.copyMonthList.innerHTML = '';
  const selected = parseDateKey(landingSelectedDate) || new Date();
  const monthValue = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}`;
  if (refs.copyMonthInput) refs.copyMonthInput.value = monthValue;
  addCopyMonthBlock(refs, monthValue, false);
}

const WEEKDAY_CHOICES = [
  { value: 1, label: 'Lundi', short: 'Lu' },
  { value: 2, label: 'Mardi', short: 'Ma' },
  { value: 3, label: 'Mercredi', short: 'Me' },
  { value: 4, label: 'Jeudi', short: 'Je' },
  { value: 5, label: 'Vendredi', short: 'Ve' },
  { value: 6, label: 'Samedi', short: 'Sa' },
  { value: 0, label: 'Dimanche', short: 'Di' },
];

function addCopyMonthBlock(refs, monthValue, selectAll = false) {
  if (!refs?.copyMonthList || !monthValue) return;
  const [year, month] = (monthValue || '').split('-').map(Number);
  if (!year || !month) return;

  const exists = Array.from(refs.copyMonthList.querySelectorAll('.copy-month-block input[type="month"]')).some(
    input => input.value === monthValue
  );
  if (exists) {
    alert('Ce mois est déjà ajouté.');
    return;
  }

  const block = document.createElement('article');
  block.className = 'copy-month-block';

  const header = document.createElement('div');
  header.className = 'copy-month-block-header';

  const monthInput = document.createElement('input');
  monthInput.type = 'month';
  monthInput.value = monthValue;

  const actions = document.createElement('div');
  actions.className = 'copy-month-block-actions';

  const fillBtn = document.createElement('button');
  fillBtn.type = 'button';
  fillBtn.className = 'btn ghost btn-small';
  fillBtn.textContent = 'Tout le mois';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn ghost btn-small';
  removeBtn.textContent = 'Supprimer';

  actions.append(fillBtn, removeBtn);
  header.append(monthInput, actions);

  const weekdayWrap = document.createElement('div');
  weekdayWrap.className = 'copy-month-weekdays';

  WEEKDAY_CHOICES.forEach(day => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.weekday = String(day.value);
    checkbox.checked = Boolean(selectAll);
    const text = document.createElement('span');
    text.textContent = day.short;
    label.append(checkbox, text);
    weekdayWrap.append(label);
  });

  block.append(header, weekdayWrap);
  refs.copyMonthList.appendChild(block);

  fillBtn.addEventListener('click', () => setMonthBlockChecks(block, true));
  removeBtn.addEventListener('click', () => block.remove());
}

function setMonthBlockChecks(block, checked) {
  block?.querySelectorAll('input[data-weekday]')?.forEach(input => {
    input.checked = checked;
  });
}

function nextMonthValue(value) {
  const [year, month] = (value || '').split('-').map(Number);
  if (!year || !month) return value;
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function handleCopyApply(refs, { fullYear = false } = {}) {
  const weekTargets = collectWeekTargets(refs);
  const monthTargets = fullYear ? collectYearTargets(refs) : collectMonthTargets(refs);
  const allTargets = Array.from(new Set([...weekTargets, ...monthTargets]));
  if (!allTargets.length) {
    alert('Choisis au moins une journée à remplir.');
    return;
  }
  copyLandingTasksToDates(landingSelectedDate, allTargets);
  closeCopyDayModal(refs);
  renderLandingWeek(refs);
  renderLandingDay(refs);
}

function collectWeekTargets(refs) {
  return Array.from(refs.copyWeekTargets?.querySelectorAll('input[type="checkbox"]') || [])
    .filter(input => input.checked && input.dataset.date)
    .map(input => input.dataset.date);
}

function collectMonthTargets(refs) {
  const blocks = Array.from(refs.copyMonthList?.querySelectorAll('.copy-month-block') || []);
  const targets = [];
  blocks.forEach(block => {
    const monthInput = block.querySelector('input[type="month"]');
    const value = monthInput?.value;
    if (!value) return;
    const [year, month] = value.split('-').map(Number);
    if (!year || !month) return;
    const weekdays = getBlockWeekdays(block);
    if (!weekdays.length) return;
    targets.push(...getMonthWeekdayDates(year, month - 1, weekdays));
  });
  return targets;
}

function collectYearTargets(refs) {
  const template = refs.copyMonthList?.querySelector('.copy-month-block');
  if (!template) return [];
  const monthInput = template.querySelector('input[type="month"]');
  let year = monthInput?.value ? Number(monthInput.value.split('-')[0]) : null;
  if (!year) year = (parseDateKey(landingSelectedDate) || new Date()).getFullYear();
  const weekdays = getBlockWeekdays(template);
  if (!weekdays.length) return [];
  const targets = [];
  for (let month = 0; month < 12; month += 1) {
    targets.push(...getMonthWeekdayDates(year, month, weekdays));
  }
  return targets;
}

function getBlockWeekdays(block) {
  return Array.from(block.querySelectorAll('input[data-weekday]'))
    .filter(input => input.checked)
    .map(input => Number(input.dataset.weekday));
}

function handlePrintDaySubmit(refs) {
  const value = refs.printDaySelect?.value;
  if (!value) {
    alert('Choisis un jour à imprimer.');
    return;
  }
  closePrintModal(refs);
  handlePrintDay(refs, value);
}

function handlePrintDay(refs, dateKey) {
  const node = buildPrintDay(dateKey);
  openPrintWindow(`Journée – ${node.querySelector('h3')?.textContent || ''}`, [node]);
}

function handlePrintWeek(refs) {
  const node = buildPrintWeek();
  openPrintWindow('Semaine apaisée', [node]);
}

function buildPrintDay(dateKey) {
  const date = parseDateKey(dateKey) || new Date();
  const section = document.createElement('section');
  section.className = 'print-day';

  const panel = document.createElement('div');
  panel.className = 'day-fullscreen-panel day-fullscreen-panel-print';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Journée complète';
  const title = document.createElement('h3');
  title.textContent = capitalizeLabel(DAY_FULL_FORMAT.format(date));
  panel.append(eyebrow, title);

  const list = document.createElement('ul');
  list.className = 'calendar-tasks calendar-tasks-stack';
  const tasks = [...(state.landing.calendar[dateKey] || [])].sort((a, b) =>
    (a.time || '').localeCompare(b.time || '')
  );
  renderLandingTasks(list, tasks);
  list.querySelectorAll('button[data-delete-task]').forEach(btn => btn.remove());
  panel.appendChild(list);
  section.appendChild(panel);
  return section;
}

function buildPrintWeek() {
  const section = document.createElement('section');
  section.className = 'print-week card';

  const header = document.createElement('div');
  header.className = 'day-header';
  const info = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Semaine';
  const title = document.createElement('h3');
  const dates = getWeekDates(landingWeekAnchor || new Date());
  const first = DAY_MONTH_FORMAT.format(dates[0]);
  const last = DAY_MONTH_FORMAT.format(dates[dates.length - 1]);
  title.textContent = `${first} – ${last}`;
  info.append(eyebrow, title);
  header.appendChild(info);
  section.appendChild(header);

  const table = document.createElement('table');
  table.className = 'print-week-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  const emptyTh = document.createElement('th');
  emptyTh.textContent = 'Étapes';
  headRow.appendChild(emptyTh);

  const weekTasks = dates.map(date => {
    const dateKey = toDateKey(date);
    const list = [...(state.landing.calendar[dateKey] || [])].sort((a, b) =>
      (a.time || '').localeCompare(b.time || '')
    );
    return { date, tasks: list };
  });

  weekTasks.forEach(({ date }) => {
    const th = document.createElement('th');
    const dayName = capitalizeLabel(WEEKDAY_SHORT_FORMAT.format(date));
    th.textContent = `${dayName} ${DAY_MONTH_FORMAT.format(date)}`;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const maxRows = Math.max(0, ...weekTasks.map(item => item.tasks.length));

  if (maxRows === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = weekTasks.length + 1;
    cell.textContent = 'Aucune étape planifiée cette semaine.';
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    for (let i = 0; i < maxRows; i += 1) {
      const row = document.createElement('tr');
      const labelCell = document.createElement('th');
      labelCell.scope = 'row';
      labelCell.textContent = `Étape ${i + 1}`;
      row.appendChild(labelCell);

      weekTasks.forEach(({ tasks }) => {
        const cell = document.createElement('td');
        const task = tasks[i];
        if (task) {
          const wrap = document.createElement('div');
          wrap.className = 'print-week-cell';

          const time = document.createElement('strong');
          time.textContent = formatTaskTime(task);

          const label = document.createElement('span');
          label.textContent = `${task.emoji || '⭐️'} ${task.label || ''}`;

          const checkbox = document.createElement('span');
          checkbox.className = 'print-checkbox';
          checkbox.textContent = '☐';

          wrap.append(time, label, checkbox);
          cell.appendChild(wrap);
        } else {
          cell.innerHTML = '&nbsp;';
        }
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    }
  }

  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}

function openPrintWindow(title, nodes) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Impossible d’ouvrir la fenêtre d’impression (bloqueur de pop-up ?).');
    return;
  }
  const stylesheetHref = document.querySelector('link[rel="stylesheet"]')?.getAttribute('href') || 'styles.css';
  const stylesheet = new URL(stylesheetHref, window.location.href).href;
  const content = nodes.map(node => node.outerHTML).join('');
  win.document.write(`<!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <link rel="stylesheet" href="${stylesheet}" />
    <style>
      body { background: #fff; padding: 20px; }
      main { max-width: 1100px; margin: 0 auto; }
      .print-day { break-after: page; }
      .calendar-task button,
      .calendar-task .calendar-task-checkbox input { display: none !important; }
    </style>
  </head>
  <body>
    <main>${content}</main>
    <script>
      window.addEventListener('load', () => setTimeout(() => window.print(), 150));
    </script>
  </body>
  </html>`);
  win.document.close();
}

function exportLandingCalendar() {
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    landing: {
      childEmoji: state.landing.childEmoji,
      calendar: state.landing.calendar,
      selectedDate: state.landing.selectedDate,
      weekAnchor: state.landing.weekAnchor,
    },
  };
  downloadBlob(JSON.stringify(payload, null, 2), `pilote-calendrier-${Date.now()}.json`, 'application/json');
}

function importLandingCalendar(file, refs) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!data?.landing?.calendar) throw new Error('format invalide');
      state.landing = mergeState(DEFAULT_STATE.landing, data.landing);
      ensureLandingDefaults();
      saveState();
      renderLandingWeek(refs);
      renderLandingDay(refs);
      showToast('Calendrier importé.');
    } catch (error) {
      console.error(error);
      alert("Impossible d'importer ce fichier.");
    }
  };
  reader.readAsText(file);
}

/* =========================================================
   Counter
   ========================================================= */

function initCounter() {
  ensureCounterDefaults();
  counterSelectedDateKey = state.counter.selectedDate || toDateKey(new Date());
  counterWeekAnchor = parseDateKey(state.counter.weekAnchor) || startOfWeek(new Date());
  setupHelpButton('counter');

  const refs = {
    labelForm: document.getElementById('counterLabelForm'),
    labelInput: document.getElementById('counterLabelInput'),
    labelDisplay: document.getElementById('counterDisplayLabel'),
    participantsInput: document.getElementById('counterParticipantsInput'),
    list: document.getElementById('counterList'),
    weekPrev: document.getElementById('counterWeekPrev'),
    weekNext: document.getElementById('counterWeekNext'),
    weekLabel: document.getElementById('counterWeekLabel'),
    selectedDayLabel: document.getElementById('counterSelectedDayLabel'),
    weekDays: document.getElementById('counterWeekDays'),
    page: document.querySelector('.counter-page'),
    editButton: document.getElementById('counterEditButton'),
    configCard: document.getElementById('counterConfigCard'),
  };

  if (refs.labelInput) refs.labelInput.value = state.counter.label || '';
  fillCounterParticipantsInput(refs);
  updateCounterLayout(refs);
  renderCounter(refs);

  refs.labelForm?.addEventListener('submit', event => {
    event.preventDefault();
    applyCounterLabel(refs);
  });

  refs.list?.addEventListener('click', event => handleCounterListClick(event, refs));
  refs.weekPrev?.addEventListener('click', () => shiftCounterWeek(-1, refs));
  refs.weekNext?.addEventListener('click', () => shiftCounterWeek(1, refs));
  refs.weekDays?.addEventListener('click', event => handleCounterDaySelect(event, refs));
  refs.editButton?.addEventListener('click', () => toggleCounterEditing(refs));
}

function applyCounterLabel(refs) {
  ensureCounterDefaults();
  const label = refs.labelInput?.value?.trim() || '';
  const names = parseCounterParticipantsInput(refs.participantsInput?.value);
  const hadParticipants = (state.counter.participants || []).length > 0;
  if (!names.length && !hadParticipants) {
    alert('Ajoute au moins un prénom (séparés par virgules ou retours à la ligne).');
    return;
  }
  state.counter.label = label;
  if (names.length) setCounterParticipants(names);
  ensureCounterDefaults();
  if (!state.counter.participants.length) {
    alert('Ajoute au moins un prénom.');
    return;
  }
  saveState();
  fillCounterParticipantsInput(refs);
  renderCounter(refs);
  counterEditing = false;
  updateCounterLayout(refs);
  updateCounterEditButton(refs);
  showToast('Paramètres enregistrés.');
}

function handleCounterListClick(event, refs) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const plusBtn = target.closest('button[data-counter-plus]');
  if (plusBtn?.dataset?.counterPlus) {
    changeCounterParticipantValue(plusBtn.dataset.counterPlus, 1, false, refs);
    return;
  }

  const minusBtn = target.closest('button[data-counter-minus]');
  if (minusBtn?.dataset?.counterMinus) {
    changeCounterParticipantValue(minusBtn.dataset.counterMinus, -1, true, refs);
    return;
  }

  const resetBtn = target.closest('button[data-counter-reset]');
  if (resetBtn?.dataset?.counterReset) {
    resetCounterParticipant(resetBtn.dataset.counterReset, refs);
  }
}

function handleCounterDaySelect(event, refs) {
  const target = event.target.closest('button[data-counter-date]');
  if (!target) return;
  setCounterSelectedDate(target.dataset.counterDate, refs);
}

function shiftCounterWeek(delta, refs) {
  if (!counterWeekAnchor) counterWeekAnchor = startOfWeek(new Date());
  counterWeekAnchor.setDate(counterWeekAnchor.getDate() + delta * 7);
  counterWeekAnchor = startOfWeek(counterWeekAnchor);
  state.counter.weekAnchor = toDateKey(counterWeekAnchor);
  const weekDates = getCounterWeekDates();
  if (!weekDates.includes(counterSelectedDateKey)) {
    counterSelectedDateKey = weekDates[0];
    state.counter.selectedDate = counterSelectedDateKey;
  }
  saveState();
  renderCounterWeek(refs);
  renderCounter(refs);
}

function setCounterSelectedDate(dateKey, refs) {
  if (!dateKey) return;
  counterSelectedDateKey = dateKey;
  state.counter.selectedDate = counterSelectedDateKey;
  saveState();
  renderCounterWeek(refs);
  renderCounter(refs);
}

function changeCounterParticipantValue(participantId, delta, requireCode, refs) {
  if (!participantId) return;
  if (requireCode && !verifyCounterCode()) return;
  ensureCounterDefaults();
  const participant = state.counter.participants.find(p => p.id === participantId);
  if (!participant) return;
  const dateKey = counterSelectedDateKey || state.counter.selectedDate || toDateKey(new Date());
  counterSelectedDateKey = dateKey;
  state.counter.selectedDate = dateKey;
  participant.entries = participant.entries || {};
  const current = getCounterParticipantValue(participant, dateKey);
  const next = Math.max(0, current + delta);
  participant.entries[dateKey] = next;
  saveState();
  renderCounter(refs);
}

function resetCounterParticipant(participantId, refs) {
  if (!participantId || !verifyCounterCode()) return;
  ensureCounterDefaults();
  const participant = state.counter.participants.find(p => p.id === participantId);
  if (!participant) return;
  participant.entries = {};
  saveState();
  renderCounter(refs);
  showToast(`Compteur remis à zéro pour ${participant.name || 'ce participant'}.`);
}

function verifyCounterCode() {
  const input = window.prompt('Code parent requis pour cette action.');
  if (input === null) return false;
  if (input.trim() !== COUNTER_PROTECTION_CODE) {
    alert('Code incorrect.');
    return false;
  }
  return true;
}

function renderCounter(refs) {
  ensureCounterDefaults();
  const label = (state.counter?.label || '').trim();
  if (refs.labelDisplay) refs.labelDisplay.textContent = label || 'Définis ton observable ci-dessus';
  renderCounterWeek(refs);
  updateCounterLayout(refs);
  renderCounterList(refs);
  updateCounterEditButton(refs);
}

function renderCounterList(refs) {
  if (!refs?.list) return;
  refs.list.innerHTML = '';
  const participants = state.counter.participants || [];
  if (!participants.length) {
    const empty = document.createElement('p');
    empty.className = 'micro-copy';
    empty.textContent = 'Ajoute des prénoms ci-dessus pour commencer.';
    refs.list.appendChild(empty);
    return;
  }
  const weekDates = getCounterWeekDates();
  participants.forEach((participant, index) => {
    const card = document.createElement('article');
    card.className = 'counter-person';
    const color = participant.color || COUNTER_COLOR_PALETTE[index % COUNTER_COLOR_PALETTE.length];
    if (color?.bg) card.style.setProperty('--counter-card-bg', color.bg);
    if (color?.border) card.style.setProperty('--counter-card-border', color.border);

    const head = document.createElement('div');
    head.className = 'counter-person-head';
    const nameEl = document.createElement('h3');
    nameEl.textContent = participant.name || 'Participant';
    if (participant.emoji) {
      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'counter-person-emoji';
      emojiSpan.textContent = participant.emoji;
      nameEl.prepend(emojiSpan);
    }
    head.appendChild(nameEl);
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn ghost counter-reset-btn';
    resetBtn.dataset.counterReset = participant.id;
    resetBtn.textContent = 'Remettre à zéro';
    head.appendChild(resetBtn);
    card.appendChild(head);

    const note = document.createElement('p');
    note.className = 'micro-copy';
    note.textContent = state.counter.label
      ? `${capitalizeLabel(state.counter.label)} de ${participant.name}`
      : 'Observable en attente';
    card.appendChild(note);

    const valueWrap = document.createElement('div');
    valueWrap.className = 'counter-value';
    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.className = 'counter-btn';
    minusBtn.dataset.counterMinus = participant.id;
    minusBtn.setAttribute('aria-label', `Retirer un point pour ${participant.name || 'ce participant'}`);
    minusBtn.textContent = '−';
    const value = document.createElement('span');
    value.textContent = String(getCounterParticipantValue(participant, counterSelectedDateKey));
    value.setAttribute('aria-live', 'polite');
    value.setAttribute('aria-atomic', 'true');
    valueWrap.append(minusBtn, value);
    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.className = 'counter-btn counter-btn-plus';
    plusBtn.dataset.counterPlus = participant.id;
    plusBtn.setAttribute('aria-label', `Ajouter un point pour ${participant.name || 'ce participant'}`);
    plusBtn.textContent = '+1';
    valueWrap.appendChild(plusBtn);
    card.appendChild(valueWrap);

    const weekRow = document.createElement('div');
    weekRow.className = 'counter-person-week';
    weekDates.forEach(dateKey => {
      const cell = document.createElement('div');
      cell.className = 'counter-person-day';
      if (dateKey === counterSelectedDateKey) cell.classList.add('is-selected');
      const dayLabel = document.createElement('strong');
      const date = parseDateKey(dateKey);
      const weekday = capitalizeLabel(WEEKDAY_SHORT_FORMAT.format(date));
      dayLabel.textContent = `${weekday} ${String(date.getDate()).padStart(2, '0')}`;
      const dayValue = document.createElement('span');
      dayValue.textContent = String(getCounterParticipantValue(participant, dateKey));
      cell.title = `${capitalizeLabel(DAY_FULL_FORMAT.format(date))}`;
      cell.append(dayLabel, dayValue);
      weekRow.appendChild(cell);
    });
    card.appendChild(weekRow);

    refs.list.appendChild(card);
  });
}

function getCounterParticipantValue(participant, dateKey) {
  if (!participant?.entries) return 0;
  const value = participant.entries[dateKey];
  return Math.max(0, Number(value) || 0);
}

function renderCounterWeek(refs) {
  if (!refs) return;
  const weekDates = getCounterWeekDates();
  if (!weekDates.length) return;
  if (!counterSelectedDateKey) {
    counterSelectedDateKey = weekDates[0];
    state.counter.selectedDate = counterSelectedDateKey;
    saveState();
  }
  const first = parseDateKey(weekDates[0]);
  const last = parseDateKey(weekDates[weekDates.length - 1]);
  if (refs.weekLabel) {
    refs.weekLabel.textContent = `${DAY_MONTH_FORMAT.format(first)} – ${DAY_MONTH_FORMAT.format(last)}`;
  }
  const current = parseDateKey(counterSelectedDateKey) || new Date();
  if (refs.selectedDayLabel) refs.selectedDayLabel.textContent = capitalizeLabel(DAY_FULL_FORMAT.format(current));
  if (refs.weekDays) {
    refs.weekDays.innerHTML = '';
    weekDates.forEach(dateKey => {
      const item = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.counterDate = dateKey;
      const date = parseDateKey(dateKey);
      const weekday = capitalizeLabel(WEEKDAY_SHORT_FORMAT.format(date));
      const dayNumber = String(date.getDate()).padStart(2, '0');
      btn.textContent = `${weekday} ${dayNumber}`;
      btn.setAttribute('aria-label', capitalizeLabel(DAY_FULL_FORMAT.format(date)));
      const isSelected = dateKey === counterSelectedDateKey;
      if (isSelected) btn.classList.add('is-selected');
      btn.setAttribute('aria-pressed', String(isSelected));
      item.appendChild(btn);
      refs.weekDays.appendChild(item);
    });
  }
}

function getCounterWeekDates() {
  if (!counterWeekAnchor) {
    counterWeekAnchor = startOfWeek(new Date());
    state.counter.weekAnchor = toDateKey(counterWeekAnchor);
    saveState();
  }
  const anchor = new Date(counterWeekAnchor);
  const dates = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(anchor);
    day.setDate(anchor.getDate() + i);
    dates.push(toDateKey(day));
  }
  return dates;
}

function toggleCounterEditing(refs) {
  counterEditing = !counterEditing;
  fillCounterParticipantsInput(refs);
  updateCounterLayout(refs);
  updateCounterEditButton(refs);
}

function updateCounterLayout(refs) {
  const page = refs?.page || document.querySelector('.counter-page');
  if (!page) return;
  const hasParticipants = (state.counter.participants || []).length > 0;
  page.classList.toggle('counter-ready', hasParticipants && !counterEditing);
  page.classList.toggle('counter-editing', counterEditing);
}

function updateCounterEditButton(refs) {
  if (!refs?.editButton) return;
  const hasParticipants = (state.counter.participants || []).length > 0;
  refs.editButton.hidden = !hasParticipants;
  refs.editButton.textContent = counterEditing ? 'Masquer les paramètres' : 'Modifier les paramètres';
}

function parseCounterParticipantsInput(text) {
  return String(text || '')
    .split(/[\n,;]+/)
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      let name = entry;
      let emoji = '';
      const separatorMatch = entry.match(/^(.*?)\s*[|:=]\s*(.+)$/);
      if (separatorMatch) {
        name = separatorMatch[1].trim();
        emoji = separatorMatch[2].trim();
      } else {
        const parts = entry.split(/\s+/);
        const last = parts[parts.length - 1];
        if (looksLikeEmoji(last)) {
          emoji = last.trim();
          parts.pop();
          name = parts.join(' ').trim();
        }
      }
      if (!name) return null;
      return { name, emoji };
    })
    .filter(Boolean);
}

const LOOKS_LIKE_EMOJI_REGEX = /\p{Extended_Pictographic}/u;

function looksLikeEmoji(text) {
  if (!text) return false;
  return LOOKS_LIKE_EMOJI_REGEX.test(text);
}

function setCounterParticipants(entries) {
  ensureCounterDefaults();
  const normalized = [];
  entries.forEach(entry => {
    const name = entry?.name?.trim();
    if (!name) return;
    const lower = name.toLowerCase();
    if (!normalized.some(item => item.lower === lower)) {
      normalized.push({ lower, name, emoji: entry.emoji?.trim() || '' });
    }
  });
  const current = state.counter.participants || [];
  let paletteIndex = current.length;
  state.counter.participants = normalized.map(entry => {
    const existing = current.find(participant => participant.name.toLowerCase() === entry.name.toLowerCase());
    if (existing) {
      return {
        ...existing,
        name: entry.name,
        emoji: entry.emoji || existing.emoji || '',
      };
    }
    const color = COUNTER_COLOR_PALETTE[paletteIndex % COUNTER_COLOR_PALETTE.length];
    paletteIndex += 1;
    return { id: generateCounterParticipantId(), name: entry.name, entries: {}, color, emoji: entry.emoji || '' };
  });
}

function fillCounterParticipantsInput(refs) {
  if (!refs?.participantsInput) return;
  const lines = (state.counter.participants || []).map(participant =>
    participant.emoji ? `${participant.name} : ${participant.emoji}` : participant.name
  );
  refs.participantsInput.value = lines.join('\n');
}

/* =========================================================
   Child
   ========================================================= */

function initChild() {
  setupHelpButton('child');
  const refs = {
    childEmojiBadge: document.getElementById('childEmojiBadge'),
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

    // Optionnel si tu l’as dans ton HTML
    breathTrigger: document.getElementById('tool-breath'),
    breathModal: document.getElementById('breath-modal'),
    breathLabel: document.getElementById('breath-label'),
    breathClose: document.getElementById('breath-close'),
  };

  renderChild(refs);

  refs.meterButtons?.forEach(btn => {
    btn.addEventListener('click', () => handleLevelSelect(Number(btn.dataset.level), refs));
  });

  refs.pauseButton?.addEventListener('click', () => handlePause(refs));

  // Objectifs semaine (checkbox)
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

  setupBreath(refs);

  // Freins: mini-modale au clic
  refs.toolList?.addEventListener('click', event => {
    const btn = event.target?.closest?.('button[data-strategy]');
    if (!btn) return;
    const strategyText = String(btn.dataset.strategy || btn.textContent || '').trim();
    if (!strategyText) return;
    openStrategyModal(strategyText);
  });
}

function renderChild(refs) {
  refs.meterButtons?.forEach(btn => {
    btn.classList.toggle('is-selected', Number(btn.dataset.level) === state.currentLevel);
    btn.setAttribute('aria-pressed', Number(btn.dataset.level) === state.currentLevel ? 'true' : 'false');
  });

  if (refs.levelStatus) {
    refs.levelStatus.textContent = state.currentLevel
      ? `${EMOTION_LABELS[state.currentLevel]} sélectionné`
      : 'Choisis ton niveau.';
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
  applyChildEmojiToTarget(refs.childEmojiBadge, getChildEmojiValue());
}

function handleLevelSelect(level, refs) {
  state.currentLevel = level;

  state.emotionHistory = state.emotionHistory || [];
  state.emotionHistory.push({ level, timestamp: new Date().toISOString() });
  if (state.emotionHistory.length > 30) state.emotionHistory.shift();

  saveState();
  renderChild(refs);

  if (level >= 4) showToast('Pause conseillée… on baisse le moteur.');
}

function handlePause(refs) {
  state.pauseHistory = state.pauseHistory || [];
  state.pauseHistory.push({ timestamp: new Date().toISOString() });
  if (state.pauseHistory.length > 30) state.pauseHistory.shift();

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
    btn.dataset.strategy = text;
    btn.setAttribute('aria-haspopup', 'dialog');
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

/* ===== Respiration (plein écran) ===== */

function setupBreath(refs) {
  if (!refs.breathTrigger && !refs.breathModal) return;

  const modal = ensureBreathModal(refs.breathModal);
  const label = modal.querySelector('[data-breath-label]');
  const closeBtn = modal.querySelector('[data-breath-close]');

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const startBreathText = () => {
    stopBreathText();
    let inhale = true;
    if (label) label.textContent = 'Inspire…';

    breathInterval = setInterval(() => {
      inhale = !inhale;
      if (label) label.textContent = inhale ? 'Inspire…' : 'Expire…';
    }, 3000);
  };

  const open = () => {
    openModal(modal);
    modal.classList.toggle('reduced-motion', Boolean(reducedMotion));
    startBreathText();
  };

  const close = () => {
    closeModal(modal);
    stopBreathText();
  };

  if (refs.breathTrigger) refs.breathTrigger.addEventListener('click', open);

  closeBtn?.addEventListener('click', close);

  modal.addEventListener('click', event => {
    if (event.target === modal) close();
  });

  refs.breathClose?.addEventListener('click', close);
}

function stopBreathText() {
  if (breathInterval) clearInterval(breathInterval);
  breathInterval = null;
}

function ensureBreathModal(existing) {
  if (existing) {
    existing.classList.add('modal', 'fullscreen');
    existing.setAttribute('role', 'dialog');
    existing.setAttribute('aria-modal', 'true');

    if (!existing.querySelector('[data-breath-label]') && document.getElementById('breath-label')) {
      document.getElementById('breath-label')?.setAttribute('data-breath-label', 'true');
    }
    if (!existing.querySelector('[data-breath-close]') && document.getElementById('breath-close')) {
      document.getElementById('breath-close')?.setAttribute('data-breath-close', 'true');
    }
    return existing;
  }

  const modal = document.createElement('div');
  modal.id = 'breath-modal';
  modal.className = 'modal fullscreen';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Respiration avec la sphère');

  const panel = document.createElement('div');
  panel.className = 'modal-panel breath-panel';

  const sphere = document.createElement('div');
  sphere.className = 'breath-sphere';
  sphere.setAttribute('aria-hidden', 'true');

  const label = document.createElement('div');
  label.className = 'breath-label';
  label.textContent = 'Inspire…';
  label.setAttribute('data-breath-label', 'true');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn';
  btn.textContent = "J’ai fini";
  btn.setAttribute('data-breath-close', 'true');

  panel.append(sphere, label, btn);
  modal.append(panel);
  document.body.appendChild(modal);
  return modal;
}

/* ===== Freins : mini-modale actionnable ===== */

function openStrategyModal(strategyText) {
  const cleanLabel = String(strategyText || '').trim();
  const { title, instruction, finishText, rewardOnFinish } = getStrategyInstruction(cleanLabel);
  const visibleTitle = cleanLabel || title;

  const modal = ensureMiniModal('strategy-modal', title);
  const content = modal.querySelector('[data-modal-content]');
  const finishBtn = modal.querySelector('[data-modal-finish]');
  const titleEl = modal.querySelector('.modal-title');

  if (titleEl) titleEl.textContent = visibleTitle || 'Un petit outil';
  modal.setAttribute('aria-label', visibleTitle || 'Un petit outil');

  if (content) {
    if (cleanLabel && instruction && !instruction.toLowerCase().includes(cleanLabel.toLowerCase())) {
      content.textContent = `${cleanLabel} · ${instruction}`;
    } else {
      content.textContent = instruction || cleanLabel || 'Fais-le doucement, à ton rythme.';
    }
  }

  finishBtn.onclick = () => {
    closeModal(modal);
    if (rewardOnFinish) addTokens(1, 'Bravo');
    showToast(finishText);
  };

  openModal(modal);
}

function getStrategyInstruction(text) {
  const t = (text || '').toLowerCase();

  if (t.includes('appuyer') || t.includes('serrer') || t.includes('pression')) {
    return {
      title: '🤲 Appuyer / serrer',
      instruction: 'Pose tes mains l’une contre l’autre. Appuie doucement. Relâche. Encore une fois. (Tout doux.)',
      finishText: 'Bien joué. Ton corps redescend.',
      rewardOnFinish: true,
    };
  }

  if (t.includes('coin') || t.includes('calme')) {
    return {
      title: '🪑 Coin calme',
      instruction: 'Choisis un endroit plus calme. Assieds-toi. Regarde un point fixe. On fait petit à petit.',
      finishText: 'Bravo. Tu as pris de l’air.',
      rewardOnFinish: true,
    };
  }

  if (t.includes('respirer') || t.includes('souffle') || t.includes('🌬')) {
    return {
      title: '🌬️ Respirer',
      instruction: 'Souffle doucement comme si tu embuais une vitre. Encore 5 fois. Lentement.',
      finishText: 'Merci. On reprend quand tu veux.',
      rewardOnFinish: true,
    };
  }

  return {
    title: 'Un petit outil',
    instruction: 'Fais-le doucement, juste un peu. Tu peux t’arrêter quand tu veux.',
    finishText: 'Bien joué.',
    rewardOnFinish: true,
  };
}
/* ====== BLOC 2/3 : PARENT + BILAN + BADGES ====== */

function initParent() {
  setupHelpButton('parent');
  const refs = {
    lockBanner: document.getElementById('parentLockBanner'),
    unlockForm: document.getElementById('parentUnlockForm'),
    pinInput: document.getElementById('parentPinInput'),

    pinSetupPanel: document.getElementById('pinSetupPanel'),
    pinSetupForm: document.getElementById('pinSetupForm'),
    pinSetupInput: document.getElementById('pinSetupInput'),

    content: document.getElementById('parentContent'),
    lockBtn: document.querySelector('[data-action="lock-parent"]'),

    // CRISE
    crisisSay: document.getElementById('crisisSay'),
    crisisDo: document.getElementById('crisisDo'),
    crisisAfter: document.getElementById('crisisAfter'),
    crisisPhraseBtn: document.getElementById('crisisPhraseBtn'),

    // PERSONNALISER
    objectiveChoices: document.getElementById('objectiveChoices'),
    primaryBadge: document.getElementById('primaryObjectiveBadge'),

    routineForm: document.getElementById('routineForm'),
    routineFields: document.querySelectorAll('#routineForm textarea[data-routine], #routineForm input[data-routine]'),

    strategyForm: document.getElementById('strategyForm'),
    strategyFields: document.getElementById('strategyFields'),

    triggerForm: document.getElementById('triggerForm'),
    triggerOptions: document.getElementById('triggerOptions'),
    triggerOtherInput: document.getElementById('triggerOtherInput'),

    rewardForm: document.getElementById('rewardForm'),
    rewardInputs: document.querySelectorAll('#rewardForm textarea[data-reward]'),
    plannedNextInput: document.getElementById('plannedNextInput'),

    scriptList: document.getElementById('scriptList'),
  };

  renderScripts(refs.scriptList);
  renderObjectiveChoices(refs);
  renderStrategyFields(refs.strategyFields);
  renderTriggerOptions(refs.triggerOptions);
  populateParentForms(refs);
  updatePinPanels(refs);

  setParentLocked(refs, true);
  renderCrisis(refs);

  refs.unlockForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (refs.pinInput?.value?.trim() === state.pin) {
      setParentLocked(refs, false);
      refs.pinInput.value = '';
      showToast('Tour de contrôle ouvert.');
    } else {
      showToast('Code incorrect.');
    }
  });

  refs.lockBtn?.addEventListener('click', () => setParentLocked(refs, true));

  refs.pinSetupForm?.addEventListener('submit', event => {
    event.preventDefault();
    const newPin = refs.pinSetupInput?.value?.trim() || '';
    if (!/^[0-9]{4,6}$/.test(newPin)) return showToast('Code à 4–6 chiffres.');
    state.pin = newPin;
    state.pinCustom = true;
    if (refs.pinSetupInput) refs.pinSetupInput.value = '';
    saveState();
    updatePinPanels(refs);
    showToast('PIN enregistré.');
  });

  refs.crisisPhraseBtn?.addEventListener('click', () => {
    crisisIndex = (crisisIndex + 1) % CRISIS_PHRASES.length;
    renderCrisis(refs);
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
    refs.routineFields?.forEach(field => {
      const key = field?.dataset?.routine;
      if (!key) return;
      state.routines[key] = String(field.value || '').trim();
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
    const selections = Array.from(refs.triggerOptions?.querySelectorAll('input:checked') || []).map(i => i.value);
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
    showToast('Récompenses mises à jour.');
  });
}

function renderCrisis(refs) {
  const c = CRISIS_PHRASES[crisisIndex] || CRISIS_PHRASES[0];
  if (refs.crisisSay) refs.crisisSay.textContent = c.say;
  if (refs.crisisDo) refs.crisisDo.textContent = c.do;
  if (refs.crisisAfter) refs.crisisAfter.textContent = c.after;

  const legacy = document.getElementById('crisisPhrase');
  if (legacy) legacy.textContent = c.say;
}

function setParentLocked(refs, locked) {
  if (refs.lockBanner) refs.lockBanner.style.display = locked ? 'block' : 'none';
  if (refs.content) refs.content.classList.toggle('is-locked', locked);

  if (refs.content) {
    const controls = refs.content.querySelectorAll('input, textarea, button, select');
    controls.forEach(el => {
      if (el.matches('[data-action="lock-parent"]')) return;
      el.disabled = Boolean(locked);
    });
  }
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
      btn.addEventListener('click', () => copyToClipboard(line));

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
  refs.routineFields?.forEach(field => {
    const key = field?.dataset?.routine;
    if (!key) return;
    field.value = state.routines?.[key] || '';
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
  setupHelpButton('bilan');
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

  hydrateBilanForms(refs);
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
        hydrateBilanForms(refs);
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

function hydrateBilanForms(refs) {
  Object.entries(refs.childFields || {}).forEach(([key, field]) => {
    if (!field) return;
    field.value = state.reviews?.child?.[key] || '';
  });
  Object.entries(refs.parentFields || {}).forEach(([key, field]) => {
    if (!field) return;
    field.value = state.reviews?.parent?.[key] || '';
  });
}

function setBilanLocked(refs, locked) {
  if (refs.lockBanner) refs.lockBanner.style.display = locked ? 'block' : 'none';
  if (refs.content) refs.content.classList.toggle('is-locked', locked);

  if (refs.content) {
    const controls = refs.content.querySelectorAll('input, textarea, button, select');
    controls.forEach(el => {
      if (el.matches('[data-action="lock-bilan"]')) return;
      el.disabled = Boolean(locked);
    });
  }
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
  if (refs.summaryNext) refs.summaryNext.textContent = primary?.label || 'À définir.';
}

/* =========================================================
   Badges
   ========================================================= */

function renderBadges(container) {
  if (!container) return;
  container.innerHTML = '';

  const unlocked = BADGE_RULES.filter(rule => {
    try {
      return Boolean(rule.check(state));
    } catch {
      return false;
    }
  });

  if (!unlocked.length) {
    const li = document.createElement('li');
    li.textContent = 'Pas de badge pour le moment (c’est OK).';
    container.appendChild(li);
    return;
  }

  unlocked.slice(0, 3).forEach(b => {
    const li = document.createElement('li');
    li.textContent = `🏷️ ${b.label}`;
    container.appendChild(li);
  });
}
/* ====== BLOC 3/3 : MODALES + HELPERS + FIN (fix planBEvening) ====== */

/* =========================================================
   Modales (mini + plein écran)
   - Fonctionnent même si le HTML ne contient rien
   ========================================================= */

function ensureMiniModal(id, title) {
  let modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    return modal;
  }

  modal = document.createElement('div');
  modal.id = id;
  modal.className = 'modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', title || 'Boîte de dialogue');

  const panel = document.createElement('div');
  panel.className = 'modal-panel';

  const h = document.createElement('h2');
  h.className = 'modal-title';
  h.textContent = title || 'Un petit outil';

  const p = document.createElement('p');
  p.className = 'modal-text';
  p.setAttribute('data-modal-content', 'true');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn';
  btn.textContent = "J’ai fini";
  btn.setAttribute('data-modal-finish', 'true');

  panel.append(h, p, btn);
  modal.append(panel);
  document.body.appendChild(modal);

  // clic fond ferme
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal(modal);
  });

  return modal;
}

function openModal(modal) {
  if (!modal) return;
  modal.hidden = false;
  lastOpenedModal = modal;

  // Focus simple : premier bouton à l’intérieur
  const focusable = modal.querySelector(
    'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
  );
  focusable?.focus?.();
}

function closeModal(modal) {
  if (!modal) return;
  modal.hidden = true;
  if (lastOpenedModal === modal) lastOpenedModal = null;
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
    // v2 direct
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return mergeState(DEFAULT_STATE, JSON.parse(raw));

    // migration depuis v1 si présent
    for (const k of LEGACY_KEYS) {
      const legacy = localStorage.getItem(k);
      if (legacy) {
        const migrated = mergeState(DEFAULT_STATE, JSON.parse(legacy));
        // on sauvegarde en v2 sans supprimer l’ancien (safe)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }

    return deepClone(DEFAULT_STATE);
  } catch (error) {
    console.error('Chargement impossible, retour aux valeurs par défaut.', error);
    return deepClone(DEFAULT_STATE);
  }
}

function mergeState(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : [...base];
  }

  const normalizedBase = isPlainObject(base) ? base : {};
  const normalizedOverride = isPlainObject(override) ? override : {};
  const result = { ...normalizedBase };
  const keys = new Set([...Object.keys(normalizedBase), ...Object.keys(normalizedOverride)]);

  keys.forEach(key => {
    const baseValue = normalizedBase[key];
    const overrideValue = normalizedOverride[key];

    if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
      result[key] = Array.isArray(overrideValue)
        ? overrideValue
        : Array.isArray(baseValue)
        ? baseValue
        : [];
      return;
    }

    if (isPlainObject(baseValue) || isPlainObject(overrideValue)) {
      result[key] = mergeState(
        isPlainObject(baseValue) ? baseValue : {},
        isPlainObject(overrideValue) ? overrideValue : {}
      );
      return;
    }

    result[key] = typeof overrideValue === 'undefined' ? baseValue : overrideValue;
  });

  return result;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepClone(obj) {
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
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) return `"${cell.replace(/"/g, '""')}"`;
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

/* =========================================================
   Fin : objectifs + focus + clipboard
   ========================================================= */

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

  // Compat: routines planB si ancien state
  if (!state.routines) state.routines = deepClone(DEFAULT_STATE.routines);
  if (typeof state.routines.planBMorning === 'undefined') state.routines.planBMorning = '';
  if (typeof state.routines.planBHomework === 'undefined') state.routines.planBHomework = '';
  if (typeof state.routines.planBEvening === 'undefined') state.routines.planBEvening = '';
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

function copyToClipboard(text) {
  try {
    navigator.clipboard?.writeText(text);
    showToast('Copié.');
  } catch {
    showToast('Impossible de copier.');
  }
}

function ensureLandingDefaults() {
  if (!state.landing) state.landing = deepClone(DEFAULT_STATE.landing);
  if (!state.landing.calendar) state.landing.calendar = {};
  if (!state.landing.childEmoji) state.landing.childEmoji = DEFAULT_STATE.landing.childEmoji;
  Object.keys(state.landing.calendar).forEach(dateKey => {
    state.landing.calendar[dateKey] = (state.landing.calendar[dateKey] || []).map(task => ({
      id: task.id || generateLandingTaskId(),
      emoji: task.emoji || '⭐️',
      time: task.time || '',
      endTime: task.endTime || '',
      label: task.label || '',
      completed: Boolean(task.completed),
    }));
  });
}

function ensureCounterDefaults() {
  if (!state.counter || typeof state.counter !== 'object') {
    state.counter = deepClone(DEFAULT_STATE.counter);
  }
  if (typeof state.counter.label !== 'string') state.counter.label = '';
  if (!Array.isArray(state.counter.participants)) state.counter.participants = [];
  const todayKey = toDateKey(new Date());

  if (typeof state.counter.value !== 'undefined' && !state.counter.participants.length) {
    const fallbackName = state.counter.label ? state.counter.label : 'Participant';
    const value = Math.max(0, Number(state.counter.value) || 0);
    state.counter.participants = [
      {
        id: generateCounterParticipantId(),
        name: capitalizeLabel(fallbackName),
        entries: { [todayKey]: value },
      },
    ];
    delete state.counter.value;
  }

  state.counter.participants = state.counter.participants.map((participant, idx) => {
    const safeName = (participant.name || 'Participant').trim() || 'Participant';
    const entries = isPlainObject(participant.entries) ? { ...participant.entries } : {};
    if (typeof participant.value !== 'undefined') {
      entries[todayKey] = Math.max(0, Number(participant.value) || 0);
    }
    const color = participant.color || COUNTER_COLOR_PALETTE[idx % COUNTER_COLOR_PALETTE.length];
    return {
      id: participant.id || generateCounterParticipantId(),
      name: safeName,
      entries,
      color,
      emoji: participant.emoji || '',
    };
  });

  const selected = parseDateKey(state.counter.selectedDate) || new Date();
  counterSelectedDateKey = toDateKey(selected);
  state.counter.selectedDate = counterSelectedDateKey;

  const anchor = parseDateKey(state.counter.weekAnchor) || startOfWeek(selected);
  counterWeekAnchor = anchor;
  state.counter.weekAnchor = toDateKey(anchor);
}

function addLandingTask(dateKey, task) {
  if (!dateKey) return;
  const tasks = state.landing.calendar[dateKey] ? [...state.landing.calendar[dateKey]] : [];
  tasks.push({
    id: generateLandingTaskId(),
    emoji: task.emoji || '⭐️',
    time: task.time || '',
    endTime: task.endTime || '',
    label: task.label,
    completed: false,
  });
  state.landing.calendar[dateKey] = tasks;
  saveState();
}

function removeLandingTask(dateKey, taskId) {
  if (!dateKey || !taskId) return;
  const tasks = state.landing.calendar[dateKey] || [];
  const next = tasks.filter(task => task.id !== taskId);
  if (next.length) state.landing.calendar[dateKey] = next;
  else delete state.landing.calendar[dateKey];
  saveState();
}

function toggleLandingTaskCompletion(dateKey, taskId, completed) {
  if (!dateKey || !taskId) return;
  const tasks = state.landing.calendar[dateKey] || [];
  const idx = tasks.findIndex(task => task.id === taskId);
  if (idx === -1) return;
  const updated = { ...tasks[idx], completed: Boolean(completed) };
  state.landing.calendar[dateKey] = [...tasks.slice(0, idx), updated, ...tasks.slice(idx + 1)];
  saveState();
}

function copyLandingTasksToDates(sourceKey, targetKeys) {
  if (!sourceKey || !targetKeys?.length) return;
  const sourceTasks = state.landing.calendar[sourceKey] || [];
  targetKeys.forEach(key => {
    if (key === sourceKey) return;
    state.landing.calendar[key] = sourceTasks.map(task => ({
      emoji: task.emoji,
      time: task.time,
      endTime: task.endTime || '',
      label: task.label,
      completed: false,
      id: generateLandingTaskId(),
    }));
  });
  saveState();
}

function ensureLandingWeekContainsSelection() {
  const selected = parseDateKey(landingSelectedDate) || new Date();
  if (!landingWeekAnchor) {
    landingWeekAnchor = startOfWeek(selected);
    return;
  }
  const start = startOfWeek(landingWeekAnchor);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  if (selected < start || selected > end) landingWeekAnchor = startOfWeek(selected);
}

function getWeekDates(baseDate) {
  const start = startOfWeek(baseDate);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function getMonthWeekdayDates(year, monthIndex, weekdays) {
  const days = [];
  const cursor = new Date(year, monthIndex, 1);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getMonth() === monthIndex) {
    if (weekdays.includes(cursor.getDay())) days.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function startOfWeek(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = (day + 6) % 7; // lundi = 0
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
  if (!key) return null;
  const parts = key.split('-').map(Number);
  if (parts.length !== 3 || Number.isNaN(parts[0])) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function generateLandingTaskId() {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateCounterParticipantId() {
  return `counter-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function capitalizeLabel(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}
