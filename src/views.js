import { store, formatDateDisplay, formatDateISO, todayISO, uid } from './data.js';
import { renderMarkdown } from './markdown.js';

// ===== Shared UI helpers =====
let toastTimer = null;
export function toast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  if (toastTimer) clearTimeout(toastTimer);
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = msg;
  document.body.appendChild(el);
  toastTimer = setTimeout(() => el.remove(), 2400);
}

export function openModal(title, bodyHtml, footHtml = '') {
  const previousActiveElement = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const titleId = 'modal-title-' + Math.random().toString(36).slice(2, 10);
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <div class="modal__head">
        <h2 class="modal__title" id="${titleId}">${title}</h2>
        <button class="modal__close" data-close aria-label="모달 닫기">&times;</button>
      </div>
      <div class="modal__body">${bodyHtml}</div>
      ${footHtml ? `<div class="modal__foot">${footHtml}</div>` : ''}
    </div>`;
  document.body.appendChild(backdrop);

  const close = () => {
    backdrop.remove();
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }
  };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.matches('[data-close]')) close();
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Focus trap implementation for A11y
  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  
  // Set initial focus to first input or close button
  setTimeout(() => {
    const focusables = Array.from(backdrop.querySelectorAll(focusableSelectors));
    const firstInput = focusables.find(el => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    if (firstInput) {
      firstInput.focus();
    } else if (focusables.length > 0) {
      focusables[0].focus();
    }
  }, 50);

  const tabHandler = (e) => {
    if (e.key === 'Tab') {
      const focusables = Array.from(backdrop.querySelectorAll(focusableSelectors));
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
  };
  backdrop.addEventListener('keydown', tabHandler);

  return backdrop;
}

export function confirmDialog(msg, onYes) {
  const m = openModal('확인', `<p>${msg}</p>`,
    `<button class="btn btn--ghost" data-close>취소</button><button class="btn btn--danger" data-yes>삭제</button>`);
  m.querySelector('[data-yes]').addEventListener('click', () => { m.remove(); onYes(); });
}

// ===== Birthday helpers =====
function getUpcomingBirthdays() {
  const students = store.getStudents();
  const today = new Date();
  const todayMD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  // Check this week (today + 6 days)
  const weekDates = [];
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

function birthdayBannerHtml() {
  const birthdays = getUpcomingBirthdays();
  if (birthdays.length === 0) return '';
  const names = birthdays.map((b) => b.student.name + (b.isToday ? ' 🎉' : '')).join(', ');
  return `
    <div class="birthday-banner" role="status" aria-live="polite">
      <span class="birthday-banner__icon" aria-hidden="true">🎂</span>
      <span class="birthday-banner__text">
        이번 주 생일 축하합니다 &middot;
        <span class="birthday-banner__names">${names}</span>
      </span>
    </div>`;
}

// ===== Home View =====
export function renderHome(isAdmin) {
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
    : `<div class="empty"><div class="empty__icon" aria-hidden="true">📋</div><div class="empty__text">등록된 광고/주보가 없습니다.</div></div>`;

  const addAdBtn = isAdmin
    ? `<button class="btn btn--navy btn--sm" data-action="add-ad">+ 광고 추가</button>`
    : '';

  return `
    ${birthdayBannerHtml()}
    <section class="word-hero" aria-labelledby="word-title">
      <div class="word-date">${formatDateDisplay(new Date())}</div>
      <div class="word-divider" aria-hidden="true"></div>
      <h2 class="word-label" id="word-title">그날의 말씀</h2>
      ${wordHtml}
      ${isAdmin ? `<div class="word-edit-zone">${editBtn}</div>` : ''}
    </section>
    <section class="card" style="margin-top:24px" aria-labelledby="bulletin-title">
      <div class="card__head">
        <h2 class="card__title" id="bulletin-title">광고 · 주보</h2>
        ${addAdBtn}
      </div>
      <div class="ads-grid">${adCards}</div>
    </section>`;
}

function fontSizePx(size) {
  if (size === 'small') return '0.95rem';
  if (size === 'large') return '1.2rem';
  return '1.05rem';
}

function adCardHtml(ad, isAdmin) {
  const img = ad.image
    ? `<img class="ad-card__img" src="${ad.image}" alt="광고 이미지: ${escapeText(ad.text) || '설명 없음'}" />`
    : `<div class="ad-card__placeholder" aria-hidden="true">✝</div>`;
  const actions = isAdmin
    ? `<div class="ad-card__actions">
         <button class="btn btn--ghost btn--sm" data-action="edit-ad" data-id="${ad.id}">수정</button>
         <button class="btn btn--danger btn--sm" data-action="del-ad" data-id="${ad.id}">삭제</button>
       </div>`
    : '';
  return `
    <article class="ad-card">
      ${img}
      <div class="ad-card__body">
        <div class="ad-card__text">${escapeText(ad.text) || '<span style="color:#999">설명 없음</span>'}</div>
        ${actions}
      </div>
    </article>`;
}

function escapeText(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Word editor modal ---
export function openWordEditor(onDone) {
  const word = store.getWord();
  const m = openModal(
    '그날의 말씀 편집',
    `
    <div class="md-editor">
      <div class="md-editor__toolbar" role="toolbar" aria-label="마크다운 에디터 도구 모음">
        <button class="md-tool" data-md="heading">제목</button>
        <button class="md-tool" data-md="bold">굵게</button>
        <button class="md-tool" data-md="italic">기울임</button>
        <button class="md-tool" data-md="quote">인용</button>
        <button class="md-tool" data-md="ul">목록</button>
        <button class="md-tool" data-md="link">링크</button>
      </div>
      <div class="field">
        <span class="field__label" id="font-size-label">글씨 크기</span>
        <div style="display:flex;gap:6px" role="radiogroup" aria-labelledby="font-size-label">
          <button class="md-size-btn ${word?.fontSize === 'small' ? 'is-active' : ''}" data-size="small" role="radio" aria-checked="${word?.fontSize === 'small'}">작게</button>
          <button class="md-size-btn ${(word?.fontSize || 'medium') === 'medium' ? 'is-active' : ''}" data-size="medium" role="radio" aria-checked="${(word?.fontSize || 'medium') === 'medium'}">보통</button>
          <button class="md-size-btn ${word?.fontSize === 'large' ? 'is-active' : ''}" data-size="large" role="radio" aria-checked="${word?.fontSize === 'large'}">크게</button>
        </div>
      </div>
      <div class="field">
        <label class="field__label" for="word-text">내용 (마크다운 지원)</label>
        <textarea class="textarea" id="word-text" style="min-height:220px" placeholder="# 제목&#10;오늘의 말씀을 입력하세요...">${word?.text || ''}</textarea>
      </div>
      <div class="md-editor__hint">지원: # 제목, **굵게**, *기울임*, &gt; 인용, - 목록, [링크](url)</div>
    </div>`,
    `<button class="btn btn--ghost" data-close>취소</button><button class="btn btn--gold" id="word-save">저장</button>`
  );

  let currentSize = word?.fontSize || 'medium';
  const ta = m.querySelector('#word-text');

  m.querySelectorAll('.md-size-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      currentSize = e.currentTarget.dataset.size;
      m.querySelectorAll('.md-size-btn').forEach((b) => {
        b.classList.remove('is-active');
        b.setAttribute('aria-checked', 'false');
      });
      e.currentTarget.classList.add('is-active');
      e.currentTarget.setAttribute('aria-checked', 'true');
    });
  });

  m.querySelectorAll('.md-tool').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const type = e.currentTarget.dataset.md;
      insertMarkdown(ta, type);
    });
  });

  m.querySelector('#word-save').addEventListener('click', () => {
    const text = ta.value;
    store.saveWord({ text, fontSize: currentSize, updatedAt: new Date().toISOString() });
    m.remove();
    toast('말씀이 저장되었습니다.');
    onDone();
  });
}

function insertMarkdown(ta, type) {
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
export function openAdEditor(existing, onDone) {
  const m = openModal(
    existing ? '광고 수정' : '광고 추가',
    `
    <div class="field">
      <span class="field__label">사진 업로드</span>
      <div class="upload-zone ${existing?.image ? 'has-file' : ''}" id="ad-drop" role="button" tabindex="0" aria-label="사진 업로드 공간. 클릭하여 파일을 선택하거나 사진을 드래그하세요.">
        ${existing?.image
          ? `<img src="${existing.image}" style="max-width:100%;max-height:200px;border-radius:8px" alt="업로드된 광고 이미지" />`
          : '클릭하여 사진을 선택하세요'}
      </div>
      <input type="file" id="ad-file" accept="image/*" style="display:none" aria-label="광고 사진 선택" />
    </div>
    <div class="field">
      <label class="field__label" for="ad-text">설명 텍스트</label>
      <textarea class="textarea" id="ad-text" placeholder="광고/주보 설명을 입력하세요">${existing?.text || ''}</textarea>
    </div>`,
    `<button class="btn btn--ghost" data-close>취소</button><button class="btn btn--gold" id="ad-save">저장</button>`
  );

  let imageData = existing?.image || null;
  const dropZone = m.querySelector('#ad-drop');
  const fileInput = m.querySelector('#ad-file');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('사진은 2MB 이하만 가능합니다.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      imageData = reader.result;
      dropZone.classList.add('has-file');
      dropZone.innerHTML = `<img src="${imageData}" style="max-width:100%;max-height:200px;border-radius:8px;" alt="새로 업로드된 광고 이미지" />`;
    };
    reader.readAsDataURL(file);
  });

  m.querySelector('#ad-save').addEventListener('click', () => {
    const text = m.querySelector('#ad-text').value;
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

export function deleteAd(id, onDone) {
  confirmDialog('이 광고를 삭제하시겠습니까?', () => {
    store.saveAds(store.getAds().filter((a) => a.id !== id));
    toast('광고가 삭제되었습니다.');
    onDone();
  });
}

// ===== Attendance View =====
export function renderAttendance(isAdmin) {
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
              ? `<button type="button" class="attendance-toggle ${isPresent ? 'is-on' : ''}" data-toggle="${s.id}" aria-label="${s.name} (${s.grade}) 출석 상태 토글" aria-pressed="${isPresent}">
                   <span class="attendance-toggle__dot" aria-hidden="true"></span>
                 </button>`
              : `<span style="font-size:13px;color:${isPresent ? 'var(--c-success)' : 'var(--c-muted)'};font-weight:600">
                   ${isPresent ? '출석' : '결석'}
                 </span>`}
          </div>`;
      }).join('')
    : `<div class="empty"><div class="empty__icon" aria-hidden="true">📝</div><div class="empty__text">등록된 학생이 없습니다.${isAdmin ? ' 학생을 추가해주세요.' : ''}</div></div>`;

  const manageBtn = isAdmin
    ? `<button class="btn btn--navy btn--sm" data-action="manage-students">학생 관리</button>`
    : '';

  return `
    <div class="view__title">출석 체크</div>
    <div class="view__subtitle">${formatDateDisplay(new Date())}</div>
    <section class="card" aria-labelledby="attendance-card-title">
      <div class="card__head">
        <h2 class="card__title" id="attendance-card-title">오늘의 출석</h2>
        ${manageBtn}
      </div>
      <div role="region" aria-label="학생 출석 목록" tabindex="0" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--c-line); border-radius: var(--radius-md); margin-bottom: 16px;">
        ${studentRows}
      </div>
      <div class="attendance-stats" role="region" aria-label="출석 현황 요약">
        <div class="stat-box"><div class="stat-box__num">${todayCount}</div><div class="stat-box__label">오늘 출석</div></div>
        <div class="stat-box"><div class="stat-box__num">${weekCount}</div><div class="stat-box__label">이번주 누적</div></div>
        <div class="stat-box"><div class="stat-box__num">${totalCount}</div><div class="stat-box__label">전체 학생</div></div>
      </div>
    </section>`;
}

export function toggleAttendance(studentId, onDone) {
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
export function openStudentManager(onDone) {
  const students = store.getStudents();
  const rows = students.map((s) => `
    <div class="student-row">
      <span class="student-row__name">${s.name}</span>
      <span class="student-row__grade">${s.grade}</span>
      <span style="font-size:12px;color:var(--c-muted)">${s.birthday || '생일 미입력'}</span>
      <button class="btn btn--danger btn--sm" data-del-student="${s.id}" aria-label="${s.name} 학생 삭제">삭제</button>
    </div>`).join('');

  const m = openModal(
    '학생 관리',
    `
    <div style="margin-bottom:16px;padding:16px;background:var(--c-accent-soft);border-radius:14px">
      <div style="font-weight:700;margin-bottom:12px;color:var(--c-navy-800)" id="add-student-title">새 학생 추가</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div style="flex:1;min-width:100px">
          <label class="sr-only" for="s-name">이름</label>
          <input class="input" id="s-name" placeholder="이름" />
        </div>
        <div>
          <label class="sr-only" for="s-grade">학년</label>
          <select class="select" id="s-grade">
            <option value="중1">중1</option>
            <option value="중2">중2</option>
            <option value="중3">중3</option>
          </select>
        </div>
        <div>
          <label class="sr-only" for="s-birthday">생일 (월-일)</label>
          <input class="input" id="s-birthday" placeholder="MM-DD" style="width:80px" aria-describedby="bday-hint" />
        </div>
        <button class="btn btn--gold btn--sm" id="s-add">추가</button>
      </div>
      <div id="bday-hint" class="sr-only">생일 입력 형식은 월과 일을 두 자리 숫자로 표시하고 하이픈으로 연결합니다 (예: 08-08).</div>
    </div>
    <div role="region" aria-label="학생 등록부 목록" tabindex="0" style="max-height: 250px; overflow-y: auto; border: 1px solid var(--c-line); border-radius: var(--radius-md);">
      ${rows || '<div class="empty"><div class="empty__text">등록된 학생이 없습니다.</div></div>'}
    </div>`,
    `<button class="btn btn--ghost" data-close>닫기</button>`
  );

  m.querySelector('#s-add').addEventListener('click', () => {
    const name = m.querySelector('#s-name').value.trim();
    const grade = m.querySelector('#s-grade').value;
    const birthday = m.querySelector('#s-birthday').value.trim();
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
      const id = e.currentTarget.dataset.delStudent;
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
export function renderReading(isAdmin) {
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
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const ds = formatDateISO(date);
    const isRead = reading[ds] ? true : false;
    const isTodayDate = ds === todayStr;
    const dateLabel = `${date.getMonth() + 1}월 ${date.getDate()}일 ${isRead ? '성경 읽기 완료' : '성경 안 읽음'}${isTodayDate ? ' (오늘)' : ''}`;
    
    days.push(`
      <button type="button" class="read-day ${isRead ? 'is-read' : ''} ${isTodayDate ? 'is-today' : ''}"
           data-read-day="${ds}"
           aria-label="${dateLabel}"
           aria-pressed="${isRead}">
        <div class="read-day__num">${date.getDate()}</div>
        ${isRead ? '<div class="read-day__dot" aria-hidden="true"></div>' : ''}
      </button>`);
  }

  const totalRead = Object.values(reading).filter(Boolean).length;
  const manageBtn = isAdmin
    ? `<button class="btn btn--ghost btn--sm" data-action="reading-config">설정</button>`
    : '';

  return `
    <div class="view__title">성경 읽기 챌린지</div>
    <div class="view__subtitle">${config.goal}</div>
    <section class="card" aria-labelledby="reading-card-title">
      <div class="card__head">
        <h2 class="card__title" id="reading-card-title">나의 기록</h2>
        ${manageBtn}
      </div>
      <div class="reading-streak" role="region" aria-label="연속 읽기 기록 요약">
        <div class="streak-pill"><span>🔥 연속</span><span class="streak-pill__num">${streak}</span><span>일</span></div>
        <div class="streak-pill"><span>📖 총</span><span class="streak-pill__num">${totalRead}</span><span>일</span></div>
      </div>
      <div style="font-size:13px;color:var(--c-muted);margin-bottom:8px;text-align:center" id="reading-hint">최근 4주 &middot; 날짜 단추를 선택하여 출석하듯 체크하세요</div>
      <div class="reading-board" role="group" aria-labelledby="reading-hint">
        ${days.join('')}
      </div>
    </section>`;
}

export function toggleReadingDay(date, onDone) {
  const reading = store.getReading();
  reading[date] = !reading[date];
  store.saveReading(reading);
  onDone();
}

export function openReadingConfig(onDone) {
  const config = store.getReadingConfig();
  const m = openModal(
    '챌린지 설정',
    `
    <div class="field">
      <label class="field__label" for="r-goal">챌린지 목표</label>
      <input class="input" id="r-goal" value="${config.goal}" />
    </div>`,
    `<button class="btn btn--ghost" data-close>취소</button><button class="btn btn--gold" id="r-save">저장</button>`
  );
  m.querySelector('#r-save').addEventListener('click', () => {
    config.goal = m.querySelector('#r-goal').value;
    store.saveReadingConfig(config);
    m.remove();
    toast('설정이 저장되었습니다.');
    onDone();
  });
}

// ===== Calendar View =====
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

export function renderCalendar(isAdmin) {
  const events = store.getEvents();
  const today = todayISO();
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push(`<div class="cal-cell is-empty"></div>`);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calYear, calMonth, d);
    const ds = formatDateISO(date);
    const dayEvents = events.filter((e) => e.date === ds);
    const isToday = ds === today;
    
    let eventLabel = '';
    if (dayEvents.length > 0) {
      eventLabel = `, 일정: ${dayEvents.map(e => e.title).join(', ')}`;
    }
    const ariaLabel = `${calYear}년 ${calMonth + 1}월 ${d}일${isToday ? ' (오늘)' : ''}${eventLabel}`;

    cells.push(`
      <button type="button" class="cal-cell ${isToday ? 'is-today' : ''}" data-cal-day="${ds}" aria-label="${ariaLabel}">
        <div class="cal-cell__num">${d}</div>
        ${dayEvents.length
          ? `<div class="cal-cell__events" aria-hidden="true"><span class="cal-event-dot"></span>${dayEvents[0].title}${dayEvents.length > 1 ? ` +${dayEvents.length - 1}` : ''}</div>`
          : ''}
      </button>`);
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
          ${isAdmin ? `<button class="event-item__del" data-del-event="${e.id}" aria-label="${escapeText(e.title)} 일정 삭제">삭제</button>` : ''}
        </div>`).join('')
    : `<div class="empty"><div class="empty__text">예정된 행사가 없습니다.</div></div>`;

  const addBtn = isAdmin
    ? `<button class="btn btn--navy btn--sm" data-action="add-event">+ 행사 추가</button>`
    : '';

  return `
    <div class="view__title">행사 · 모임 캘린더</div>
    <div class="view__subtitle">이번 달 중등부 일정</div>
    <section class="card" aria-label="달력 컨트롤">
      <div class="cal-nav">
        <button class="cal-nav__btn" data-cal-prev aria-label="이전 달">&lt;</button>
        <h2 class="cal-nav__month" aria-live="polite" aria-atomic="true">${calYear}년 ${monthNames[calMonth]}</h2>
        <button class="cal-nav__btn" data-cal-next aria-label="다음 달">&gt;</button>
      </div>
      <div class="cal-grid" role="grid" aria-label="${calYear}년 ${monthNames[calMonth]} 달력">
        <div style="display:contents" role="row">
          ${weekdays.map((w) => `<div class="cal-head" role="columnheader">${w}</div>`).join('')}
        </div>
        <div style="display:contents" role="row">
          ${cells.map(c => {
            if (c.includes('is-empty')) {
              return `<div role="gridcell" class="cal-cell is-empty"></div>`;
            } else {
              return `<div role="gridcell">${c}</div>`;
            }
          }).join('')}
        </div>
      </div>
    </section>
    <section class="card" aria-labelledby="upcoming-events-title">
      <div class="card__head">
        <h2 class="card__title" id="upcoming-events-title">다가오는 행사</h2>
        ${addBtn}
      </div>
      <div class="event-list">${upcomingHtml}</div>
    </section>`;
}

export function navigateCalendar(dir, onDone) {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  onDone();
}

export function openEventEditor(preDate, existing, onDone) {
  const m = openModal(
    existing ? '행사 수정' : '행사 추가',
    `
    <div class="field">
      <label class="field__label" for="e-date">날짜</label>
      <input class="input" id="e-date" type="date" value="${existing?.date || preDate || todayISO()}" />
    </div>
    <div class="field">
      <label class="field__label" for="e-title">제목</label>
      <input class="input" id="e-title" value="${existing?.title || ''}" placeholder="행사 제목" />
    </div>
    <div class="field">
      <label class="field__label" for="e-desc">설명</label>
      <textarea class="textarea" id="e-desc" placeholder="행사 설명 (선택)">${existing?.desc || ''}</textarea>
    </div>`,
    `<button class="btn btn--ghost" data-close>취소</button><button class="btn btn--gold" id="e-save">저장</button>`
  );
  m.querySelector('#e-save').addEventListener('click', () => {
    const date = m.querySelector('#e-date').value;
    const title = m.querySelector('#e-title').value.trim();
    const desc = m.querySelector('#e-desc').value;
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

export function deleteEvent(id, onDone) {
  confirmDialog('이 행사를 삭제하시겠습니까?', () => {
    store.saveEvents(store.getEvents().filter((e) => e.id !== id));
    toast('행사가 삭제되었습니다.');
    onDone();
  });
}

// ===== Prayer Board View =====
export function renderPrayer(isAdmin) {
  const prayers = store.getPrayers().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sid = store.getSessionId();

  const list = prayers.length
    ? prayers.map((p) => {
        const prayed = p.prayedBy.includes(sid);
        const writerLabel = p.isAnonymous ? '익명' : escapeText(p.author);
        return `
          <article class="prayer-item" aria-labelledby="prayer-author-${p.id}">
            <div class="prayer-item__body">
              <div class="prayer-item__author" id="prayer-author-${p.id}">${writerLabel}</div>
              <div class="prayer-item__text">${escapeText(p.text)}</div>
              <div class="prayer-item__meta">
                <button type="button" class="pray-btn ${prayed ? 'is-prayed' : ''}" data-pray="${p.id}" aria-pressed="${prayed}" aria-label="기도할게요 누적 ${p.prayCount}명">
                  🙏 기도할게요 <span>${p.prayCount}</span>
                </button>
                <span class="prayer-item__date" aria-label="작성일">${new Date(p.createdAt).toLocaleDateString('ko-KR')}</span>
                ${isAdmin ? `<button class="prayer-item__del" data-del-prayer="${p.id}" aria-label="${writerLabel}님의 기도 요청글 삭제">삭제</button>` : ''}
              </div>
            </div>
          </article>`;
      }).join('')
    : `<div class="empty"><div class="empty__icon" aria-hidden="true">🙏</div><div class="empty__text">아직 기도 요청이 없습니다. 첫 기도 제목을 올려주세요.</div></div>`;

  return `
    <div class="view__title">기도 요청 게시판</div>
    <div class="view__subtitle">함께 기도해요</div>
    <section class="card" aria-labelledby="prayer-submit-card-title">
      <div class="card__head">
        <h2 class="card__title" id="prayer-submit-card-title">기도 요청 남기기</h2>
      </div>
      <div class="field">
        <span class="field__label" id="writer-type-label">작성자</span>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px" role="radiogroup" aria-labelledby="writer-type-label">
          <label style="font-size:14px;display:flex;align-items:center;gap:4px">
            <input type="radio" name="p-anon" value="false" checked aria-label="실명 등록" /> 실명
          </label>
          <label style="font-size:14px;display:flex;align-items:center;gap:4px">
            <input type="radio" name="p-anon" value="true" aria-label="익명 등록" /> 익명
          </label>
          <label class="sr-only" for="p-author">작성자 이름</label>
          <input class="input" id="p-author" placeholder="이름" style="flex:1;max-width:160px;margin-left:auto" />
        </div>
      </div>
      <div class="field">
        <label class="field__label" for="p-text">기도 제목</label>
        <textarea class="textarea" id="p-text" placeholder="기도 제목을 입력하세요..." style="min-height:100px"></textarea>
      </div>
      <button class="btn btn--gold btn--block" id="p-submit">기도 요청 올리기</button>
    </section>
    <section class="card" aria-labelledby="prayer-list-title">
      <div class="card__head"><h2 class="card__title" id="prayer-list-title">기도 제목 목록</h2></div>
      <div class="prayer-list">${list}</div>
    </section>`;
}

export function submitPrayer(onDone) {
  const authorEl = document.querySelector('#p-author');
  const textEl = document.querySelector('#p-text');
  const isAnon = document.querySelector('input[name="p-anon"]:checked').value === 'true';
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

export function togglePray(id, onDone) {
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

export function deletePrayer(id, onDone) {
  confirmDialog('이 기도 요청을 삭제하시겠습니까?', () => {
    store.savePrayers(store.getPrayers().filter((p) => p.id !== id));
    toast('삭제되었습니다.');
    onDone();
  });
}
