// Data layer — all persistence goes through this module.
// To migrate to Supabase later, replace the localStorage calls below
// with Supabase client calls; the rest of the app won't need to change.

const PREFIX = 'starteens:';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage write failed:', e);
  }
}

// ===== Repository =====
export const store = {
  // --- Word of the day ---
  getWord() {
    return read('word', null);
  },
  saveWord(word) {
    write('word', word);
  },

  // --- Ads / Bulletin ---
  getAds() {
    return read('ads', []);
  },
  saveAds(ads) {
    write('ads', ads);
  },

  // --- Students ---
  getStudents() {
    return read('students', []);
  },
  saveStudents(students) {
    write('students', students);
  },

  // --- Attendance ---
  getAttendance() {
    return read('attendance', {});
  },
  saveAttendance(rec) {
    write('attendance', rec);
  },

  // --- Bible reading ---
  getReading() {
    return read('reading', {});
  },
  saveReading(rec) {
    write('reading', rec);
  },
  getReadingConfig() {
    return read('readingConfig', {
      startDate: todayISO(),
      goal: '매일 성경 한 장 읽기',
    });
  },
  saveReadingConfig(cfg) {
    write('readingConfig', cfg);
  },

  // --- Calendar events ---
  getEvents() {
    return read('events', []);
  },
  saveEvents(events) {
    write('events', events);
  },

  // --- Prayer board ---
  getPrayers() {
    return read('prayers', []);
  },
  savePrayers(prayers) {
    write('prayers', prayers);
  },

  // --- Admin session ---
  getAdmin() {
    return read('admin', false);
  },
  setAdmin(val) {
    write('admin', val);
  },

  // --- Session id for prayer tracking ---
  getSessionId() {
    let sid = read('sid', '');
    if (!sid) {
      sid = 's_' + Math.random().toString(36).slice(2, 10);
      write('sid', sid);
    }
    return sid;
  },
};

// ===== Helpers =====
export function todayISO() {
  const d = new Date();
  return formatDateISO(d);
}

export function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateDisplay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
