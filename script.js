/* ==========================================================================
   HALAL ROUTINE & HYDRATION SYSTEM — APPLICATION LOGIC
   ========================================================================== */

// --- Default Data State ---
const DEFAULT_PLAN = {
  id: 'standard-cut',
  name: 'Standard Weight Loss Routine',
  isRamadanMode: false,
  targetCalories: 1420,
  targetProtein: 110,
  waterNotes: {
    glassesPerReminder: 2,
    glassesWithMeals: 1,
    totalTargetGlasses: 10,
  },
  items: [
    { id: '1', time: '07:30', label: 'Breakfast', type: 'meal', foods: ['3 Scrambled Eggs with Spinach', '1 Slice Whole Grain Toast', '1/2 Avocado'], waterGlasses: 2, completed: false, enabled: true },
    { id: '2', time: '10:30', label: 'Mid-Morning Hydration', type: 'water', foods: [], waterGlasses: 2, completed: false, enabled: true },
    { id: '3', time: '13:00', label: 'Lunch', type: 'meal', foods: ['Grilled Halal Chicken Breast (180g)', 'Large Mixed Greens & Cucumber Salad', '1/2 cup Quinoa'], waterGlasses: 1, completed: false, enabled: true },
    { id: '4', time: '16:00', label: 'Afternoon Snack & Water', type: 'snack', foods: ['1 cup High Protein Greek Yogurt', '1 handful Blueberries & Almonds'], waterGlasses: 2, completed: false, enabled: true },
    { id: '5', time: '19:00', label: 'Dinner', type: 'meal', foods: ['Baked Atlantic Salmon or Halal Lean Beef', 'Steamed Asparagus & Roasted Carrots'], waterGlasses: 1, completed: false, enabled: true },
    { id: '6', time: '21:30', label: 'Pre-Sleep Hydration', type: 'water', foods: [], waterGlasses: 2, completed: false, enabled: true },
  ]
};

const RAMADAN_PRESET = {
  id: 'ramadan-plan',
  name: 'Ramadan Fasting Schedule',
  isRamadanMode: true,
  targetCalories: 1450,
  targetProtein: 115,
  waterNotes: { glassesPerReminder: 2, glassesWithMeals: 1, totalTargetGlasses: 10 },
  items: [
    { id: 'r1', time: '04:15', label: 'Suhoor (Pre-Fajr)', type: 'suhoor', foods: ['Rolled Oats with Chia Seeds & Almond Milk', '3 Boiled Eggs', '1 Banana'], waterGlasses: 3, completed: false, enabled: true },
    { id: 'r2', time: '04:45', label: 'Final Pre-Dawn Water', type: 'water', foods: [], waterGlasses: 1, completed: false, enabled: true },
    { id: 'r3', time: '18:45', label: 'Iftar (Sunset Break Fast)', type: 'iftar', foods: ['3 Medjool Dates', 'Warm Lentil Soup', 'Grilled Halal Chicken Thighs'], waterGlasses: 2, completed: false, enabled: true },
    { id: 'r4', time: '20:30', label: 'Post-Taraweeh Meal', type: 'meal', foods: ['Lean Halal Beef Skewers', 'Mixed Veggie Stir-fry', 'Brown Rice'], waterGlasses: 2, completed: false, enabled: true },
    { id: 'r5', time: '22:30', label: 'Evening Hydration', type: 'water', foods: [], waterGlasses: 2, completed: false, enabled: true },
  ]
};

// --- Application State ---
let currentPlan = JSON.parse(localStorage.getItem('halal_plan')) || DEFAULT_PLAN;
let consumedGlasses = parseInt(localStorage.getItem('halal_water')) || 0;
let soundEnabled = true;
let browserNotifyEnabled = false;
let activeAlertItem = null;

// --- Web Audio Synthesizer ---
class AudioEngine {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
  }
  playChime(type = 'crystal') {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (type === 'droplet') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'cyber') {
      [1046, 1318, 1567, 2093].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const st = now + idx * 0.04;
        osc.frequency.setValueAtTime(f, st);
        gain.gain.setValueAtTime(0.2, st);
        gain.gain.exponentialRampToValueAtTime(0.0001, st + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(st);
        osc.stop(st + 0.35);
      });
    } else {
      // 4-Note Crystal Chime (C5, E5, G5, C6)
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const st = now + idx * 0.09;
        osc.frequency.setValueAtTime(freq, st);
        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.25, st + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, st + 0.8);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(st);
        osc.stop(st + 0.85);
      });
    }
  }
}

const audio = new AudioEngine();

// --- Save & Persistence ---
function saveState() {
  localStorage.setItem('halal_plan', JSON.stringify(currentPlan));
  localStorage.setItem('halal_water', consumedGlasses.toString());
  renderAll();
}

// --- Render Functions ---
function renderAll() {
  renderClock();
  renderRamadanBanner();
  renderMetrics();
  renderWaterGrid();
  renderTimeline();
  renderSchedule();
  renderAdminTriggers();
}

function renderClock() {
  const d = new Date();
  document.getElementById('live-clock').innerText = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function renderRamadanBanner() {
  const banner = document.getElementById('ramadan-banner');
  if (currentPlan.isRamadanMode) {
    banner.classList.remove('hidden');
    document.getElementById('btn-ramadan-toggle').innerText = '☀️ Standard Mode';
  } else {
    banner.classList.add('hidden');
    document.getElementById('btn-ramadan-toggle').innerText = '🌙 Ramadan Mode';
  }
}

function renderMetrics() {
  const targetWater = currentPlan.waterNotes.totalTargetGlasses || 10;
  const completedCount = currentPlan.items.filter(i => i.completed).length;
  const totalCount = currentPlan.items.length;
  const adherence = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const waterPct = Math.min(Math.round((consumedGlasses / targetWater) * 100), 100);

  document.getElementById('metric-calories').innerText = currentPlan.targetCalories || 1420;
  document.getElementById('metric-protein').innerText = currentPlan.targetProtein || 110;
  document.getElementById('metric-water-count').innerText = consumedGlasses;
  document.getElementById('metric-water-target').innerText = targetWater;
  document.getElementById('metric-adherence').innerText = `${adherence}%`;

  document.getElementById('prog-water').style.width = `${waterPct}%`;
  document.getElementById('prog-adherence').style.width = `${adherence}%`;
}

function renderWaterGrid() {
  const grid = document.getElementById('glass-grid');
  grid.innerHTML = '';
  const total = currentPlan.waterNotes.totalTargetGlasses || 10;

  for (let i = 0; i < total; i++) {
    const isFilled = i < consumedGlasses;
    const btn = document.createElement('button');
    btn.className = `glass-btn ${isFilled ? 'filled' : ''}`;
    btn.innerHTML = `
      <span class="glass-icon">💧</span>
      <span class="glass-num">${isFilled ? '✓' : '#' + (i + 1)}</span>
    `;
    btn.onclick = () => {
      consumedGlasses = (i + 1 === consumedGlasses) ? i : (i + 1);
      audio.playChime('droplet');
      saveState();
    };
    grid.appendChild(btn);
  }

  document.getElementById('input-water-per-reminder').value = currentPlan.waterNotes.glassesPerReminder;
  document.getElementById('input-water-with-meals').value = currentPlan.waterNotes.glassesWithMeals;
  document.getElementById('input-water-total-target').value = currentPlan.waterNotes.totalTargetGlasses;
}

function renderTimeline() {
  const track = document.getElementById('timeline-track');
  const existingNodes = track.querySelectorAll('.timeline-node');
  existingNodes.forEach(n => n.remove());

  const now = new Date();
  const currentPct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  document.getElementById('time-needle').style.left = `${Math.min(Math.max(currentPct, 0), 100)}%`;

  currentPlan.items.forEach(item => {
    const [h, m] = item.time.split(':').map(Number);
    const pct = ((h * 60 + m) / 1440) * 100;
    const node = document.createElement('div');
    node.className = 'timeline-node';
    node.style.left = `${pct}%`;
    node.style.background = item.completed ? '#059669' : (item.type === 'water' ? '#0ea5e9' : '#10b981');
    node.innerText = item.type === 'water' ? '💧' : '🍽️';
    node.title = `${item.time} - ${item.label}`;
    node.onclick = () => triggerAlert(item);
    track.appendChild(node);
  });
}

function renderSchedule() {
  const list = document.getElementById('schedule-list');
  list.innerHTML = '';

  currentPlan.items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = `schedule-item-card ${item.completed ? 'completed' : ''}`;
    
    card.innerHTML = `
      <div class="item-top-row">
        <div class="item-left">
          <input type="checkbox" class="item-checkbox" ${item.completed ? 'checked' : ''} onchange="toggleItemDone('${item.id}')" />
          <input type="time" class="item-time-input" value="${item.time}" onchange="updateItemTime('${item.id}', this.value)" />
          <input type="text" class="item-label-input" value="${item.label}" onchange="updateItemLabel('${item.id}', this.value)" />
        </div>
        <div class="item-right">
          <span class="badge badge-emerald">💧 ${item.waterGlasses} glasses</span>
          <button class="btn btn-slate text-xs" onclick="deleteItem('${item.id}')">🗑</button>
        </div>
      </div>
      ${item.type !== 'water' ? `
        <div class="item-foods-row">
          <strong>Foods:</strong>
          ${item.foods.map((food, fIdx) => `
            <input type="text" class="food-pill-input" value="${food}" onchange="updateFood('${item.id}', ${fIdx}, this.value)" />
          `).join(' + ')}
          <button class="btn btn-slate text-xs" onclick="addFoodSlot('${item.id}')">+ Add Food</button>
        </div>
      ` : ''}
    `;
    list.appendChild(card);
  });
}

// --- Schedule Operations ---
window.toggleItemDone = function(id) {
  currentPlan.items = currentPlan.items.map(i => {
    if (i.id === id) {
      const next = !i.completed;
      if (next) confetti({ particleCount: 50, spread: 60 });
      return { ...i, completed: next };
    }
    return i;
  });
  saveState();
};

window.updateItemTime = function(id, val) {
  const item = currentPlan.items.find(i => i.id === id);
  if (item) item.time = val;
  saveState();
};

window.updateItemLabel = function(id, val) {
  const item = currentPlan.items.find(i => i.id === id);
  if (item) item.label = val;
  saveState();
};

window.updateFood = function(id, foodIdx, val) {
  const item = currentPlan.items.find(i => i.id === id);
  if (item && item.foods) item.foods[foodIdx] = val;
  saveState();
};

window.addFoodSlot = function(id) {
  const item = currentPlan.items.find(i => i.id === id);
  if (item) {
    item.foods.push('New Food Item');
    saveState();
  }
};

window.deleteItem = function(id) {
  currentPlan.items = currentPlan.items.filter(i => i.id !== id);
  saveState();
};

// --- Presets ---
window.loadPreset = function(type) {
  if (type === 'ramadan') currentPlan = JSON.parse(JSON.stringify(RAMADAN_PRESET));
  else if (type === 'highprotein') {
    currentPlan = JSON.parse(JSON.stringify(DEFAULT_PLAN));
    currentPlan.name = 'High-Protein Cut';
    currentPlan.targetProtein = 135;
  } else {
    currentPlan = JSON.parse(JSON.stringify(DEFAULT_PLAN));
  }
  confetti({ particleCount: 60, spread: 60 });
  saveState();
};

// --- Notification & Alert Popup ---
function triggerAlert(item) {
  activeAlertItem = item;
  document.getElementById('alert-item-time').innerText = item.time;
  document.getElementById('alert-item-title').innerText = item.label;
  document.getElementById('alert-water-amount').innerText = `${item.waterGlasses || 2} glasses (~500ml)`;

  const foodBox = document.getElementById('alert-foods-box');
  if (item.foods && item.foods.length > 0) {
    foodBox.innerHTML = `<strong>Menu Formula:</strong><br>${item.foods.join(' + ')}`;
    foodBox.classList.remove('hidden');
  } else {
    foodBox.classList.add('hidden');
  }

  audio.playChime('crystal');
  document.getElementById('modal-alert').classList.remove('hidden');

  // Native Browser Notification
  if (browserNotifyEnabled && Notification.permission === 'granted') {
    new Notification(`⏰ ${item.time} — ${item.label}`, {
      body: `💧 Drink ${item.waterGlasses} glasses of water. ${item.foods.join(', ')}`,
      icon: '🌙'
    });
  }
}

// Check every 15 seconds for matching times
setInterval(() => {
  renderClock();
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  currentPlan.items.forEach(item => {
    if (item.enabled && !item.completed && item.time === timeStr && now.getSeconds() < 16) {
      triggerAlert(item);
    }
  });
}, 15000);

// --- Admin Panel Logic ---
function renderAdminTriggers() {
  const grid = document.getElementById('admin-triggers-grid');
  if (!grid) return;
  grid.innerHTML = '';

  currentPlan.items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'admin-trigger-item';
    div.innerHTML = `
      <span><strong>${item.time}</strong> ${item.label}</span>
      <button class="btn btn-amber text-xs" onclick='adminTrigger("${item.id}")'>Test Alert</button>
    `;
    grid.appendChild(div);
  });

  document.getElementById('admin-json-textarea').value = JSON.stringify(currentPlan, null, 2);
}

window.adminTrigger = function(id) {
  const item = currentPlan.items.find(i => i.id === id);
  if (item) triggerAlert(item);
};

window.switchAdminTab = function(tabName) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(`admin-tab-${tabName}`).classList.add('active');
};

window.playSound = function(type) {
  audio.playChime(type);
};

// --- Event Listeners Setup ---
document.addEventListener('DOMContentLoaded', () => {
  renderAll();

  // Water buttons
  document.getElementById('btn-water-plus').onclick = () => { consumedGlasses++; audio.playChime('droplet'); saveState(); };
  document.getElementById('btn-water-minus').onclick = () => { if (consumedGlasses > 0) consumedGlasses--; saveState(); };
  document.getElementById('btn-water-reset').onclick = () => { consumedGlasses = 0; saveState(); };

  // Water inputs
  document.getElementById('input-water-total-target').onchange = (e) => {
    currentPlan.waterNotes.totalTargetGlasses = parseInt(e.target.value) || 10;
    saveState();
  };

  // Add Item buttons
  document.getElementById('btn-add-meal').onclick = () => {
    currentPlan.items.push({ id: Date.now().toString(), time: '12:00', label: 'New Meal', type: 'meal', foods: ['Grilled Protein', 'Fresh Salad'], waterGlasses: 1, completed: false, enabled: true });
    saveState();
  };
  document.getElementById('btn-add-water').onclick = () => {
    currentPlan.items.push({ id: Date.now().toString(), time: '15:00', label: 'Hydration Break', type: 'water', foods: [], waterGlasses: 2, completed: false, enabled: true });
    saveState();
  };
  document.getElementById('btn-add-snack').onclick = () => {
    currentPlan.items.push({ id: Date.now().toString(), time: '16:30', label: 'Healthy Snack', type: 'snack', foods: ['Greek Yogurt', 'Berries'], waterGlasses: 1, completed: false, enabled: true });
    saveState();
  };

  // Ramadan Toggle
  document.getElementById('btn-ramadan-toggle').onclick = () => {
    loadPreset(currentPlan.isRamadanMode ? 'standard' : 'ramadan');
  };
  document.getElementById('btn-exit-ramadan').onclick = () => loadPreset('standard');

  // Test sound
  document.getElementById('btn-test-sound').onclick = () => audio.playChime('crystal');

  // Notification Permissions
  document.getElementById('btn-notify-perm').onclick = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      browserNotifyEnabled = (perm === 'granted');
      document.getElementById('btn-notify-perm').innerText = browserNotifyEnabled ? '🔔 Alerts: On' : '🔔 Alerts: Denied';
    }
  };

  // Alert Modal Buttons
  document.getElementById('btn-alert-done').onclick = () => {
    if (activeAlertItem) toggleItemDone(activeAlertItem.id);
    document.getElementById('modal-alert').classList.add('hidden');
  };
  document.getElementById('btn-alert-snooze').onclick = () => {
    document.getElementById('modal-alert').classList.add('hidden');
  };
  document.getElementById('btn-alert-close').onclick = () => {
    document.getElementById('modal-alert').classList.add('hidden');
  };

  // Admin Modal Handlers
  const adminModal = document.getElementById('modal-admin');
  document.getElementById('btn-admin').onclick = () => {
    renderAdminTriggers();
    adminModal.classList.remove('hidden');
  };
  document.getElementById('btn-close-admin').onclick = () => adminModal.classList.add('hidden');

  // Admin Actions
  document.getElementById('btn-admin-confetti').onclick = () => confetti({ particleCount: 150, spread: 90 });
  document.getElementById('btn-admin-complete-all').onclick = () => {
    currentPlan.items.forEach(i => i.completed = true);
    consumedGlasses = currentPlan.waterNotes.totalTargetGlasses;
    confetti({ particleCount: 120, spread: 80 });
    saveState();
  };
  document.getElementById('btn-fast-run-day').onclick = () => {
    let idx = 0;
    const intv = setInterval(() => {
      if (idx < currentPlan.items.length) {
        triggerAlert(currentPlan.items[idx]);
        idx++;
      } else {
        clearInterval(intv);
      }
    }, 1200);
  };
  document.getElementById('btn-admin-apply-json').onclick = () => {
    try {
      currentPlan = JSON.parse(document.getElementById('admin-json-textarea').value);
      saveState();
      alert('JSON Plan Applied Successfully!');
    } catch (e) {
      alert('Invalid JSON');
    }
  };
  document.getElementById('btn-admin-copy-json').onclick = () => {
    navigator.clipboard.writeText(JSON.stringify(currentPlan, null, 2));
    alert('JSON copied to clipboard!');
  };

  // Keyboard shortcut for Admin (Ctrl+Shift+A or Cmd+Shift+A)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      adminModal.classList.toggle('hidden');
      if (!adminModal.classList.contains('hidden')) renderAdminTriggers();
    }
  });
});
