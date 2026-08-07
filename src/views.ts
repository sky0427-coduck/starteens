import { store, formatDateDisplay, formatDateISO, todayISO, uid,
  type WordPost, type AdItem, type Student, type CalendarEvent } from './data';
import { renderMarkdown } from './markdown';

export type ViewName = 'home' | 'attendance' | 'reading' | 'calendar' | 'prayer';

// ===== Shared UI helpers =====
let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(msg: string): void {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  if (toastTimer) clearTimeout(toastTimer);
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  toastTimer = setTimeout(() => el.remove(), 2400);
}

export function openModal(title: string, bodyHtml: string, footHtml = ''): HTMLElement {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal__head">
        <div class="modal__title">${title}</div>
        <button class="modal__close" data-close>&times;</button>
      </div>
      <div class="modal__body">${bodyHtml}</div>
      ${footHtml ? `<div class="modal__foot">${footHtml}</div>` : ''}
    </div>`;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || (e.target as HTMLElement).matches('[data-close]')) close();
  });
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
  return backdrop;
}

export function confirmDialog(msg: string, onYes: () => void): void {
  const m = openModal('확인', `<p>${msg}</p>`,
    `<button class="btn btn--ghost" data-close>취소</button><button class="btn btn--danger" data-yes>삭제</button>`);
  m.querySelector('[data-yes]')!.addEventListener('click', () => { m.remove(); onYes(); });
}

// ===== Birthday helpers =====
function getUpcomingBirthdays(): { student: Student; isToday: boolean }[] {
  const students = store.getStudents();
  const today = new Date();
  const todayMD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  // Check this week (today + 6 days)
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    weekDates.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return students
    .filter((s) => s.birthday && weekDates.includes(s.birthday))
    .map((s) => ({ student: s, isToday: s.birthday === todayMD }))
    .sort((a, b) => (a.student.birthday || '').localeCompare(b.student.birthday || ''));
}

function birthdayBannerHtml(): string {
  const birthdays = getUpcomingBirthdays();
  if (birthdays.length === 0) return '';
  const names = birthdays.map((b) => b.student.name + (b.isToday ? ' 🎉' : '')).join(', ');
  return `
    <div class="birthday-banner">
      <span class="birthday-banner__icon">🎂</span>
      <span class="birthday-banner__text">
        이번 주 생일 축하합니다 &middot;
        <span class="birthday-banner__names">${names}</span>
      </span>
    </div>`;
}

// ===== Home View =====
export function renderHome(isAdmin: boolean): string {
  const word = store.getWord();
  const ads = store.getAds();
  const fontSizeClass = word?.fontSize || 'medium';

  const wordHtml = word
    ? `<div class="word-body" style="font-size:${fontSizePx(fontSizeClass)}">${renderMarkdown(word.text)}</div>`
    : `<div class="word-body"></div>`;

  const editBtn = isAdmin
    ? `<button class="btn btn--gold btn--sm" data-action="edit-word">말씀 편집</button>`
    : '';

  const adCards = ads.length
    ? ads.map((ad) => adCardHtml(ad, isAdmin)).join('')
    : `<div class="empty"><div class="empty__icon">📋</div><div class="empty__text">등록된 광고/주보가 없습니다.</div></div>`;

  const addAdBtn = isAdmin
    ? `<button class="btn btn--navy btn--sm" data-action="add-ad">+ 광고 추가</button>`
    : '';

  return `
    ${birthdayBannerHtml()}
    <div class="word-hero">
      <div class="word-date">${formatDateDisplay(new Date())}</div>
      <div class="word-divider"></div>
      <div class="word-label">그날의 말씀</div>
      ${wordHtml}
      ${isAdmin ? `<div class="word-edit-zone">${editBtn}</div>` : ''}
    </div>
    <div class="card" style="margin-top:24px">
      <div class="card__head">
        <div class="card__title">광고 · 주보</div>
        ${addAdBtn}
      </div>
      <div class="ads-grid">${adCards}</div>
    </div>`;
}

function fontSizePx(size: string): string {
  if (size === 'small') return '0.95rem';
  if (size === 'large') return '1.2rem';
  return '1.05rem';
}

function adCardHtml(ad: AdItem, isAdmin: boolean): string {
  const img = ad.image
    ? `<img class="ad-card__img" src="${ad.image}" alt="광고 이미지" />`
    : `<div class="ad-card__placeholder">✝</div>`;
  const actions = isAdmin
    ? `<div class="ad-card__actions">
         <button class="btn btn--ghost btn--sm" data-action="edit-ad" data-id="${ad.id}">수정</button>
         <button class="btn btn--danger btn--sm" data-action="del-ad" data-id="${ad.id}">삭제</button>
       </div>`
    : '';
  return `
    <div class="ad-card">
      ${img}
      <div class="ad-card__body">
        <div class="ad-card__text">${escapeText(ad.text) || '<span style="color:#999">설명 없음</span>'}</div>
        ${actions}
      </div>
    </div>`;
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Word editor modal ---
export function openWordEditor(onDone: () => void): void {
  const word = store.getWord();
  const m = openModal(
    '그날의 말씀 편집',
    `
    <div class="md-editor">
      <div class="md-editor__toolbar">
        <button class="md-tool" data-md="heading">제목</button>
        <button class="md-tool" data-md="bold">굵게</button>
        <button class="md-tool" data-md="italic">기울임</button>
        <button class="md-tool" data-md="quote">인용</button>
        <button class="md-tool" data-md="ul">목록</button>
        <button class="md-tool" data-md="link">링크</button>
      </div>
      <div class="field">
        <label class="field__label">글씨 크기</label>
        <div style="display:flex;gap:6px">
          <button class="md-size-btn ${word?.fontSize === 'small' ? 'is-active' : ''}" data-size="small">작게</button>
          <button class="md-size-btn ${(word?.fontSize || 'medium') === 'medium' ? 'is-active' : ''}" data-size="medium">보통</button>
          <button class="md-size-btn ${word?.fontSize === 'large' ? 'is-active' : ''}" data-size="large">크게</button>
        </div>
      </div>
      <div class="field">
        <label class="field__label">내용 (마크다운 지원)</label>
        <textarea class="textarea" id="word-text" style="min-height:220px" placeholder="# 제목&#10;오늘의 말씀을 입력하세요...">${word?.text || ''}</textarea>
      </div>
      <div class="md-editor__hint">지원: # 제목, **굵게**, *기울임*, &gt; 인용, - 목록, [링크](url)</div>
    </div>`,
    `<button class="btn btn--ghost" data-close>취소</button><button class="btn btn--gold" id="word-save">저장</button>`
  );

  let currentSize: WordPost['fontSize'] = word?.fontSize || 'medium';
  const ta = m.querySelector('#word-text') as HTMLTextAreaElement;

  m.querySelectorAll('.md-size-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      currentSize = (e.currentTarget as HTMLElement).dataset.size as WordPost['fontSize'];
      m.querySelectorAll('.md-size-btn').forEach((b) => b.classList.remove('is-active'));
      (e.currentTarget as HTMLElement).classList.add('is-active');
    });
  });

  m.querySelectorAll('.md-tool').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const type = (e.currentTarget as HTMLElement).dataset.md as string;
      insertMarkdown(ta, type);
    });
  });

  m.querySelector('#word-save')!.addEventListener('click', () => {
    const text = ta.value;
    store.saveWord({ text, fontSize: currentSize, updatedAt: new Date().toISOString() });
    m.remove();
    toast('말씀이 저장되었습니다.');
    onDone();
  });
}

function insertMarkdown(ta: HTMLTextAreaElement, type: string): void {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const sel = ta.value.substring(start, end);
  let wrap = '';
  let pre = '';
  let placeholder = '내용';
  switch (type) {
    case 'heading': pre = '## '; placeholder = '제목'; break;
    case 'bold': wrap = '**'; placeholder = '굵게'; break;
    case 'italic': wrap = '*'; placeholder = '기울임'; break;
    case 'quote': pre = '> '; placeholder = '인용'; break;
    case 'ul': pre = '- '; placeholder = '항목'; break;
    case 'link': {
      const text = sel || '링크';
      ta.value = ta.value.substring(0, start) + `[${text}](https://)` + ta.value.substring(end);
      ta.focus();
      const urlPos = start + text.length + 3;
      ta.setSelectionRange(urlPos, urlPos + 8);
      return;
    }
  }
  const inner = sel || placeholder;
  const insert = pre + wrap + inner + wrap;
  ta.value = ta.value.substring(0, start) + insert + ta.value.substring(end);
  ta.focus();
  ta.setSelectionRange(start + pre.length + wrap.length, start + pre.length + wrap.length + inner.length);
}

// --- Ad editor modal ---
export function openAdEditor(existing: AdItem | null, onDone: () => void): void {
  const m = openModal(
    existing ? '광고 수정' : '광고 추가',
    `
    <div class="field">
      <label class="field__label">사진 업로드</label>
      <div class="upload-zone ${existing?.image ? 'has-file' : ''}" id="ad-drop">
        ${existing?.image
          ? `<img src="${existing.image}" style="max-width:100%;max-height:200px;border-radius:8px" />`
          : '클릭하여 사진을 선택하세요'}
      </div>
      <input type="file" id="ad-file" accept="image/*" style="display:none" />
    </div>
    <div class="field">
      <label class="field__label">설명 텍스트</label>
      <textarea class="textarea" id="ad-text" placeholder="광고/주보 설명을 입력하세요">${existing?.text || ''}</textarea>
    </div>`,
    `<button class="btn btn--ghost" data-close>취소</button><button class="btn btn--gold" id="ad-save">저장</button>`
  );

  let imageData: string | null = existing?.image || null;
  const dropZone = m.querySelector('#ad-drop') as HTMLElement;
  const fileInput = m.querySelector('#ad-file') as HTMLInputElement;

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('사진은 2MB 이하만 가능합니다.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      imageData = reader.result as string;
      dropZone.classList.add('has-file');
      dropZone.innerHTML = `<img src="${imageData}" style="max-width:100%;max-height:200px;border-radius:8px" />`;
    };
    reader.readAsDataURL(file);
  });

  m.querySelector('#ad-save')!.addEventListener('click', () => {
    const text = (m.querySelector('#ad-text') as HTMLTextAreaElement).value;
    const ads = store.getAds();
    if (existing) {
      const idx = ads.findIndex((a) => a.id === existing.id);
      if (idx >= 0) {
        ads[idx] = { ...ads[idx], image: imageData, text };
      }
    } else {
      ads.unshift({ id: uid(), image: imageData, text, createdAt: new Date().toISOString() });
    }
    store.saveAds(ads);
    m.remove();
    toast('광고가 저장되었습니다.');
    onDone();
  });
}

export function deleteAd(id: string, onDone: () => void): void {
  confirmDialog('이 광고를 삭제하시겠습니까?', () => {
    store.saveAds(store.getAds().filter((a) => a.id !== id));
    toast('광고가 삭제되었습니다.');
    onDone();
  });
}

// ===== Attendance View =====
export function renderAttendance(isAdmin: boolean): string {
  const students = store.getStudents();
  const today = todayISO();
  const attendance = store.getAttendance();
  const presentIds = attendance[today] || [];

  const todayCount = presentIds.length;
  const totalCount = students.length;

  // weekly stats
  const weekStart = new Date();
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - day);
  let weekCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const ds = formatDateISO(d);
    weekCount += (attendance[ds] || []).length;
  }

  const studentRows = students.length
    ? students.map((s) => {
        const isPresent = presentIds.includes(s.id);
        return `
          <div class="student-row">
            <span class="student-row__name">${s.name}</span>
            <span class="student-row__grade">${s.grade}</span>
            ${isAdmin
              ? `<button class="attendance-toggle ${isPresent ? 'is-on' : ''}" data-toggle="${s.id}">
                   <span class="attendance-toggle__dot"></span>
                 </button>`
              : `<span style="font-size:13px;color:${isPresent ? 'var(--c-success)' : 'var(--c-muted)'};font-weight:600">
                   ${isPresent ? '출석' : '결석'}
                 </span>`}
          </div>`;
      }).join('')
    : `<div class="empty"><div class="empty__icon">📝</div><div class="empty__text">등록된 학생이 없습니다.${isAdmin ? ' 학생을 추가해주세요.' : ''}</div></div>`;

  const manageBtn = isAdmin
    ? `<button class="btn btn--navy btn--sm" data-action="manage-students">학생 관리</button>`
    : '';

  return `
    <div class="view__title">출석 체크</div>
    <div class="view__subtitle">${formatDateDisplay(new Date())}</div>
    <div class="card">
      <div class="card__head">
        <div class="card__title">오늘의 출석</div>
        ${manageBtn}
      </div>
      <div>${studentRows}</div>
      <div class="attendance-stats">
        <div class="stat-box"><div class="stat-box__num">${todayCount}</div><div class="stat-box__label">오늘 출석</div></div>
        <div class="stat-box"><div class="stat-box__num">${weekCount}</div><div class="stat-box__label">이번주 누적</div></div>
        <div class="stat-box"><div class="stat-box__num">${totalCount}</div><div class="stat-box__label">전체 학생</div></div>
      </div>
    </div>`;
}

export function toggleAttendance(studentId: string, onDone: () => void): void {
  const today = todayISO();
  const attendance = store.getAttendance();
  if (!attendance[today]) attendance[today] = [];
  const idx = attendance[today].indexOf(studentId);
  if (idx >= 0) attendance[today].splice(idx, 1);
  else attendance[today].push(studentId);
  store.saveAttendance(attendance);
  onDone();
}

// --- Student management modal ---
export function openStudentManager(onDone: () => void): void {
  const students = store.getStudents();
  const rows = students.map((s) => `
    <div class="student-row">
      <span class="student-row__name">${s.name}</span>
      <span class="student-row__grade">${s.grade}</span>
      <span style="font-size:12px;color:var(--c-muted)">${s.birthday || '생일 미입력'}</span>
      <button class="btn btn--danger btn--sm" data-del-student="${s.id}">삭제</button>
    </div>`).join('');

  const m = openModal(
    '학생 관리',
    `
    <div style="margin-bottom:16px;padding:16px;background:var(--c-accent-soft);border-radius:14px">
      <div style="font-weight:700;margin-bottom:12px;color:var(--c-navy-800)">새 학생 추가</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input class="input" id="s-name" placeholder="이름" style="flex:1;min-width:100px" />
        <select class="select" id="s-grade" style="width:auto">
          <option value="중1">중1</option>
          <option value="중2">중2</option>
          <option value="중3">중3</option>
        </select>
        <input class="input" id="s-birthday" placeholder="MM-DD" style="width:80px" />
        <button class="btn btn--gold btn--sm" id="s-add">추가</button>
      </div>
    </div>
    <div>${rows || '<div class="empty"><div class="empty__text">등록된 학생이 없습니다.</div></div>'}</div>`,
    `<button class="btn btn--ghost" data-close>닫기</button>`
  );

  m.querySelector('#s-add')!.addEventListener('click', () => {
    const name = (m.querySelector('#s-name') as HTMLInputElement).value.trim();
    const grade = (m.querySelector('#s-grade') as HTMLSelectElement).value;
    const birthday = (m.querySelector('#s-birthday') as HTMLInputElement).value.trim();
    if (!name) { toast('이름을 입력하세요.'); return; }
    const students = store.getStudents();
    students.push({ id: uid(), name, grade, birthday: birthday || null, createdAt: new Date().toISOString() });
    store.saveStudents(students);
    toast('학생이 추가되었습니다.');
    m.remove();
    openStudentManager(onDone);
  });

  m.querySelectorAll('[data-del-student]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.delStudent!;
      confirmDialog(`${students.find((s) => s.id === id)?.name} 학생을 삭제하시겠습니까?`, () => {
        store.saveStudents(students.filter((s) => s.id !== id));
        toast('학생이 삭제되었습니다.');
        m.remove();
        openStudentManager(onDone);
      });
    });
  });
}

// ===== Bible Reading Challenge View =====
export function renderReading(isAdmin: boolean): string {
  const reading = store.getReading();
  const config = store.getReadingConfig();
  const today = new Date();
  const todayStr = formatDateISO(today);

  // Calculate streak
  let streak = 0;
  const d = new Date(today);
  while (reading[formatDateISO(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  // Build last 28 days board (4 weeks)
  const days: string[] = [];
  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const ds = formatDateISO(date);
    days.push(`
      <div class="read-day ${reading[ds] ? 'is-read' : ''} ${ds === todayStr ? 'is-today' : ''}"
           data-read-day="${ds}">
        <div class="read-day__num">${date.getDate()}</div>
        ${reading[ds] ? '<div class="read-day__dot"></div>' : ''}
      </div>`);
  }

  const totalRead = Object.values(reading).filter(Boolean).length;
  const manageBtn = isAdmin
    ? `<button class="btn btn--ghost btn--sm" data-action="reading-config">설정</button>`
    : '';

  return `
    <div class="view__title">성경 읽기 챌린지</div>
    <div class="view__subtitle">${config.goal}</div>
    <div class="card">
      <div class="card__head">
        <div class="card__title">나의 기록</div>
        ${manageBtn}
      </div>
      <div class="reading-streak">
        <div class="streak-pill"><span>🔥 연속</span><span class="streak-pill__num">${streak}</span><span>일</span></div>
        <div class="streak-pill"><span>📖 총</span><span class="streak-pill__num">${totalRead}</span><span>일</span></div>
      </div>
      <div style="font-size:13px;color:var(--c-muted);margin-bottom:8px;text-align:center">최근 4주 · 날짜를 눌러 체크하세요</div>
      <div class="reading-board">${days.join('')}</div>
    </div>`;
}

export function toggleReadingDay(date: string, onDone: () => void): void {
  const reading = store.getReading();
  reading[date] = !reading[date];
  store.saveReading(reading);
  onDone();
}

export function openReadingConfig(onDone: () => void): void {
  const config = store.getReadingConfig();
  const m = openModal(
    '챌린지 설정',
    `
    <div class="field">
      <label class="field__label">챌린지 목표</label>
      <input class="input" id="r-goal" value="${config.goal}" />
    </div>`,
    `<button class="btn btn--ghost" data-close>취소</button><button class="btn btn--gold" id="r-save">저장</button>`
  );
  m.querySelector('#r-save')!.addEventListener('click', () => {
    config.goal = (m.querySelector('#r-goal') as HTMLInputElement).value;
    store.saveReadingConfig(config);
    m.remove();
    toast('설정이 저장되었습니다.');
    onDone();
  });
}

// ===== Calendar View =====
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

export function renderCalendar(isAdmin: boolean): string {
  const events = store.getEvents();
  const today = todayISO();
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  const cells: string[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push(`<div class="cal-cell is-empty"></div>`);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calYear, calMonth, d);
    const ds = formatDateISO(date);
    const dayEvents = events.filter((e) => e.date === ds);
    const isToday = ds === today;
    cells.push(`
      <div class="cal-cell ${isToday ? 'is-today' : ''}" data-cal-day="${ds}">
        <div class="cal-cell__num">${d}</div>
        ${dayEvents.length
          ? `<div class="cal-cell__events"><span class="cal-event-dot"></span>${dayEvents[0].title}${dayEvents.length > 1 ? ` +${dayEvents.length - 1}` : ''}</div>`
          : ''}
      </div>`);
  }

  // Upcoming events list
  const upcoming = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const upcomingHtml = upcoming.length
    ? upcoming.map((e) => `
        <div class="event-item">
          <div class="event-item__date">${formatDateDisplay(new Date(e.date))}</div>
          <div class="event-item__body">
            <div class="event-item__title">${escapeText(e.title)}</div>
            ${e.desc ? `<div class="event-item__desc">${escapeText(e.desc)}</div>` : ''}
          </div>
          ${isAdmin ? `<button class="event-item__del" data-del-event="${e.id}">삭제</button>` : ''}
        </div>`).join('')
    : `<div class="empty"><div class="empty__text">예정된 행사가 없습니다.</div></div>`;

  const addBtn = isAdmin
    ? `<button class="btn btn--navy btn--sm" data-action="add-event">+ 행사 추가</button>`
    : '';

  return `
    <div class="view__title">행사 · 모임 캘린더</div>
    <div class="view__subtitle">이번 달 중등부 일정</div>
    <div class="card">
      <div class="cal-nav">
        <button class="cal-nav__btn" data-cal-prev>&lt;</button>
        <div class="cal-nav__month">${calYear}년 ${monthNames[calMonth]}</div>
        <button class="cal-nav__btn" data-cal-next>&gt;</button>
      </div>
      <div class="cal-grid">
        ${weekdays.map((w) => `<div class="cal-head">${w}</div>`).join('')}
        ${cells.join('')}
      </div>
    </div>
    <div class="card">
      <div class="card__head">
        <div class="card__title">다가오는 행사</div>
        ${addBtn}
      </div>
      <div class="event-list">${upcomingHtml}</div>
    </div>`;
}

export function navigateCalendar(dir: number, onDone: () => void): void {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  onDone();
}

export function openEventEditor(preDate: string | null, existing: CalendarEvent | null, onDone: () => void): void {
  const m = openModal(
    existing ? '행사 수정' : '행사 추가',
    `
    <div class="field">
      <label class="field__label">날짜</label>
      <input class="input" id="e-date" type="date" value="${existing?.date || preDate || todayISO()}" />
    </div>
    <div class="field">
      <label class="field__label">제목</label>
      <input class="input" id="e-title" value="${existing?.title || ''}" placeholder="행사 제목" />
    </div>
    <div class="field">
      <label class="field__label">설명</label>
      <textarea class="textarea" id="e-desc" placeholder="행사 설명 (선택)">${existing?.desc || ''}</textarea>
    </div>`,
    `<button class="btn btn--ghost" data-close>취소</button><button class="btn btn--gold" id="e-save">저장</button>`
  );
  m.querySelector('#e-save')!.addEventListener('click', () => {
    const date = (m.querySelector('#e-date') as HTMLInputElement).value;
    const title = (m.querySelector('#e-title') as HTMLInputElement).value.trim();
    const desc = (m.querySelector('#e-desc') as HTMLTextAreaElement).value;
    if (!title) { toast('제목을 입력하세요.'); return; }
    const events = store.getEvents();
    if (existing) {
      const idx = events.findIndex((e) => e.id === existing.id);
      if (idx >= 0) events[idx] = { ...events[idx], date, title, desc };
    } else {
      events.push({ id: uid(), date, title, desc });
    }
    store.saveEvents(events);
    m.remove();
    toast('행사가 저장되었습니다.');
    onDone();
  });
}

export function deleteEvent(id: string, onDone: () => void): void {
  confirmDialog('이 행사를 삭제하시겠습니까?', () => {
    store.saveEvents(store.getEvents().filter((e) => e.id !== id));
    toast('행사가 삭제되었습니다.');
    onDone();
  });
}

// ===== Prayer Board View =====
export function renderPrayer(isAdmin: boolean): string {
  const prayers = store.getPrayers().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sid = store.getSessionId();

  const list = prayers.length
    ? prayers.map((p) => {
        const prayed = p.prayedBy.includes(sid);
        return `
          <div class="prayer-item">
            <div class="prayer-item__body">
              <div class="prayer-item__author">${p.isAnonymous ? '익명' : escapeText(p.author)}</div>
              <div class="prayer-item__text">${escapeText(p.text)}</div>
              <div class="prayer-item__meta">
                <button class="pray-btn ${prayed ? 'is-prayed' : ''}" data-pray="${p.id}">
                  🙏 기도할게요 <span>${p.prayCount}</span>
                </button>
                <span class="prayer-item__date">${new Date(p.createdAt).toLocaleDateString('ko-KR')}</span>
                ${isAdmin ? `<button class="prayer-item__del" data-del-prayer="${p.id}">삭제</button>` : ''}
              </div>
            </div>
          </div>`;
      }).join('')
    : `<div class="empty"><div class="empty__icon">🙏</div><div class="empty__text">아직 기도 요청이 없습니다. 첫 기도 제목을 올려주세요.</div></div>`;

  return `
    <div class="view__title">기도 요청 게시판</div>
    <div class="view__subtitle">함께 기도해요</div>
    <div class="card">
      <div class="card__head">
        <div class="card__title">기도 요청 남기기</div>
      </div>
      <div class="field">
        <label class="field__label">작성자</label>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
          <label style="font-size:14px;display:flex;align-items:center;gap:4px">
            <input type="radio" name="p-anon" value="false" checked /> 실명
          </label>
          <label style="font-size:14px;display:flex;align-items:center;gap:4px">
            <input type="radio" name="p-anon" value="true" /> 익명
          </label>
          <input class="input" id="p-author" placeholder="이름" style="flex:1;max-width:160px;margin-left:auto" />
        </div>
      </div>
      <div class="field">
        <textarea class="textarea" id="p-text" placeholder="기도 제목을 입력하세요..." style="min-height:100px"></textarea>
      </div>
      <button class="btn btn--gold btn--block" id="p-submit">기도 요청 올리기</button>
    </div>
    <div class="card">
      <div class="card__head"><div class="card__title">기도 제목</div></div>
      <div class="prayer-list">${list}</div>
    </div>`;
}

export function submitPrayer(onDone: () => void): void {
  const authorEl = document.querySelector('#p-author') as HTMLInputElement;
  const textEl = document.querySelector('#p-text') as HTMLTextAreaElement;
  const isAnon = (document.querySelector('input[name="p-anon"]:checked') as HTMLInputElement).value === 'true';
  const author = authorEl.value.trim();
  const text = textEl.value.trim();
  if (!text) { toast('기도 제목을 입력하세요.'); return; }
  if (!isAnon && !author) { toast('이름을 입력하거나 익명을 선택하세요.'); return; }
  const prayers = store.getPrayers();
  prayers.push({
    id: uid(),
    author: isAnon ? '' : author,
    text,
    isAnonymous: isAnon,
    prayCount: 0,
    prayedBy: [],
    createdAt: new Date().toISOString(),
  });
  store.savePrayers(prayers);
  toast('기도 요청이 올라갔습니다.');
  onDone();
}

export function togglePray(id: string, onDone: () => void): void {
  const sid = store.getSessionId();
  const prayers = store.getPrayers();
  const p = prayers.find((x) => x.id === id);
  if (!p) return;
  if (p.prayedBy.includes(sid)) {
    p.prayedBy = p.prayedBy.filter((s) => s !== sid);
    p.prayCount = Math.max(0, p.prayCount - 1);
  } else {
    p.prayedBy.push(sid);
    p.prayCount++;
  }
  store.savePrayers(prayers);
  onDone();
}

export function deletePrayer(id: string, onDone: () => void): void {
  confirmDialog('이 기도 요청을 삭제하시겠습니까?', () => {
    store.savePrayers(store.getPrayers().filter((p) => p.id !== id));
    toast('삭제되었습니다.');
    onDone();
  });
}
