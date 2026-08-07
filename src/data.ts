// Data layer — all persistence goes through this module.
// To migrate to Supabase later, replace the localStorage calls below
// with Supabase client calls; the rest of the app won't need to change.

const PREFIX = 'starteens:';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage write failed:', e);
  }
}

// ===== Types =====
export interface WordPost {
  text: string;
  fontSize: 'small' | 'medium' | 'large';
  updatedAt: string;
}

export interface AdItem {
  id: string;
  image: string | null; // data URL
  text: string;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  birthday: string | null; // MM-DD
  createdAt: string;
}

export interface AttendanceRecord {
  // date string YYYY-MM-DD -> set of student ids
  [date: string]: string[];
}

export interface ReadingDay {
  // date string YYYY-MM-DD -> true
  [date: string]: boolean;
}

export interface ReadingConfig {
  startDate: string; // YYYY-MM-DD
  goal: string;
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  desc: string;
}

export interface PrayerPost {
  id: string;
  author: string;
  text: string;
  isAnonymous: boolean;
  prayCount: number;
  prayedBy: string[]; // session ids
  createdAt: string;
}

// ===== Repository =====
export const store = {
  // --- Word of the day ---
  getWord(): WordPost | null {
    return read<WordPost | null>('word', null);
  },
  saveWord(word: WordPost): void {
    write('word', word);
  },

  // --- Ads / Bulletin ---
  getAds(): AdItem[] {
    return read<AdItem[]>('ads', []);
  },
  saveAds(ads: AdItem[]): void {
    write('ads', ads);
  },

  // --- Students ---
  getStudents(): Student[] {
    return read<Student[]>('students', []);
  },
  saveStudents(students: Student[]): void {
    write('students', students);
  },

  // --- Attendance ---
  getAttendance(): AttendanceRecord {
    return read<AttendanceRecord>('attendance', {});
  },
  saveAttendance(rec: AttendanceRecord): void {
    write('attendance', rec);
  },

  // --- Bible reading ---
  getReading(): ReadingDay {
    return read<ReadingDay>('reading', {});
  },
  saveReading(rec: ReadingDay): void {
    write('reading', rec);
  },
  getReadingConfig(): ReadingConfig {
    return read<ReadingConfig>('readingConfig', {
      startDate: todayISO(),
      goal: '매일 성경 한 장 읽기',
    });
  },
  saveReadingConfig(cfg: ReadingConfig): void {
    write('readingConfig', cfg);
  },

  // --- Calendar events ---
  getEvents(): CalendarEvent[] {
    return read<CalendarEvent[]>('events', []);
  },
  saveEvents(events: CalendarEvent[]): void {
    write('events', events);
  },

  // --- Prayer board ---
  getPrayers(): PrayerPost[] {
    return read<PrayerPost[]>('prayers', []);
  },
  savePrayers(prayers: PrayerPost[]): void {
    write('prayers', prayers);
  },

  // --- Admin session ---
  getAdmin(): boolean {
    return read<boolean>('admin', false);
  },
  setAdmin(val: boolean): void {
    write('admin', val);
  },

  // --- Session id for prayer tracking ---
  getSessionId(): string {
    let sid = read<string>('sid', '');
    if (!sid) {
      sid = 's_' + Math.random().toString(36).slice(2, 10);
      write('sid', sid);
    }
    return sid;
  },
};

// ===== Helpers =====
export function todayISO(): string {
  const d = new Date();
  return formatDateISO(d);
}

export function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateDisplay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
