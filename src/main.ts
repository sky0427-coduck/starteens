import './style.css';
import { store } from './data';
import * as V from './views';
import type { ViewName } from './views';

// ===== State =====
let isAdmin = store.getAdmin();
let currentView: ViewName = 'home';

const ADMIN_ID = 'admin';
const ADMIN_PW = 'starteens2026';

// ===== App shell =====
function headerHtml(): string {
  const views: { name: ViewName; label: string }[] = [
    { name: 'home', label: '홈' },
    { name: 'attendance', label: '출석' },
    { name: 'reading', label: '성경읽기' },
    { name: 'calendar', label: '캘린더' },
    { name: 'prayer', label: '기도요청' },
  ];
  const navItems = views
    .map(
      (v) =>
        `<button class="nav__btn ${currentView === v.name ? 'is-active' : ''}" data-nav="${v.name}">${v.label}</button>`
    )
    .join('');

  const authArea = isAdmin
    ? `<div class="nav__user">
         <span class="admin-badge">★ 관리자</span>
         <button class="nav__logout" id="logout-btn">로그아웃</button>
       </div>`
    : `<button class="nav__login" id="login-btn">관리자 로그인</button>`;

  return `
    <header class="site-header">
      <div class="site-header__inner">
        <div class="brand" data-nav="home">
          <div class="brand__mark">S</div>
          <div>
            <div class="brand__name">스타틴스</div>
            <div class="brand__sub">YOUTH MINISTRY</div>
          </div>
        </div>
        <button class="menu-toggle" id="menu-toggle">☰</button>
        <nav class="nav" id="nav">
          ${navItems}
          <div class="nav__divider"></div>
          ${authArea}
        </nav>
      </div>
    </header>`;
}

function footerHtml(): string {
  return `
    <footer class="site-footer">
      <div><span class="site-footer__logo">스타틴스</span> · 중등부</div>
      <div style="margin-top:4px">"주의 말씀은 내 발의 등이요 내 길의 빛이니이다" - 시편 119:105</div>
    </footer>`;
}

function render(): void {
  const app = document.querySelector('#app')!;
  app.innerHTML = `${headerHtml()}<main class="main" id="main"></main>${footerHtml()}`;
  renderView();
  bindShell();
}

function renderView(): void {
  const main = document.querySelector('#main') as HTMLElement;
  let html = '';
  switch (currentView) {
    case 'home': html = V.renderHome(isAdmin); break;
    case 'attendance': html = V.renderAttendance(isAdmin); break;
    case 'reading': html = V.renderReading(isAdmin); break;
    case 'calendar': html = V.renderCalendar(isAdmin); break;
    case 'prayer': html = V.renderPrayer(isAdmin); break;
  }
  main.innerHTML = html;
  bindView();
  // close mobile menu
  const nav = document.querySelector('#nav');
  nav?.classList.remove('is-open');
}

function bindShell(): void {
  // navigation
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = (e.currentTarget as HTMLElement).dataset.nav as ViewName;
      if (target) {
        currentView = target;
        render();
      }
    });
  });

  // mobile menu toggle
  document.querySelector('#menu-toggle')?.addEventListener('click', () => {
    document.querySelector('#nav')?.classList.toggle('is-open');
  });

  // login button
  document.querySelector('#login-btn')?.addEventListener('click', openLogin);
  // logout button
  document.querySelector('#logout-btn')?.addEventListener('click', () => {
    isAdmin = false;
    store.setAdmin(false);
    V.toast('로그아웃되었습니다.');
    render();
  });
}

// ===== Login modal =====
function openLogin(): void {
  const m = V.openModal(
    '관리자 로그인',
    `
    <div class="login-form">
      <div class="field">
        <label class="field__label">아이디</label>
        <input class="input" id="login-id" placeholder="아이디" autocomplete="username" />
      </div>
      <div class="field">
        <label class="field__label">비밀번호</label>
        <input class="input" id="login-pw" type="password" placeholder="비밀번호" autocomplete="current-password" />
      </div>
      <div class="login-error" id="login-err"></div>
      <button class="btn btn--gold btn--block" id="login-submit">로그인</button>
    </div>`
  );

  const idInput = m.querySelector('#login-id') as HTMLInputElement;
  const pwInput = m.querySelector('#login-pw') as HTMLInputElement;
  const errEl = m.querySelector('#login-err') as HTMLElement;

  const submit = () => {
    const id = idInput.value.trim();
    const pw = pwInput.value;
    if (id === ADMIN_ID && pw === ADMIN_PW) {
      isAdmin = true;
      store.setAdmin(true);
      m.remove();
      V.toast('관리자로 로그인되었습니다.');
      render();
    } else {
      errEl.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
      pwInput.value = '';
      pwInput.focus();
    }
  };

  m.querySelector('#login-submit')!.addEventListener('click', submit);
  pwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  idInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { pwInput.focus(); }
  });
  idInput.focus();
}

// ===== View event binding =====
function bindView(): void {
  const main = document.querySelector('#main') as HTMLElement;

  // ---- Home ----
  main.querySelector('[data-action="edit-word"]')?.addEventListener('click', () => {
    if (!isAdmin) return;
    V.openWordEditor(() => renderView());
  });
  main.querySelector('[data-action="add-ad"]')?.addEventListener('click', () => {
    if (!isAdmin) return;
    V.openAdEditor(null, () => renderView());
  });
  main.querySelectorAll('[data-action="edit-ad"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (!isAdmin) return;
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      const ad = store.getAds().find((a) => a.id === id) || null;
      V.openAdEditor(ad, () => renderView());
    });
  });
  main.querySelectorAll('[data-action="del-ad"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (!isAdmin) return;
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      V.deleteAd(id, () => renderView());
    });
  });

  // ---- Attendance ----
  main.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (!isAdmin) return;
      const id = (e.currentTarget as HTMLElement).dataset.toggle!;
      V.toggleAttendance(id, () => renderView());
    });
  });
  main.querySelector('[data-action="manage-students"]')?.addEventListener('click', () => {
    if (!isAdmin) return;
    V.openStudentManager(() => renderView());
  });

  // ---- Reading ----
  main.querySelectorAll('[data-read-day]').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      if (!isAdmin) return;
      const ds = (e.currentTarget as HTMLElement).dataset.readDay!;
      V.toggleReadingDay(ds, () => renderView());
    });
  });
  main.querySelector('[data-action="reading-config"]')?.addEventListener('click', () => {
    if (!isAdmin) return;
    V.openReadingConfig(() => renderView());
  });

  // ---- Calendar ----
  main.querySelector('[data-cal-prev]')?.addEventListener('click', () => {
    V.navigateCalendar(-1, () => renderView());
  });
  main.querySelector('[data-cal-next]')?.addEventListener('click', () => {
    V.navigateCalendar(1, () => renderView());
  });
  main.querySelectorAll('[data-cal-day]').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      if (!isAdmin) return;
      const ds = (e.currentTarget as HTMLElement).dataset.calDay!;
      V.openEventEditor(ds, null, () => renderView());
    });
  });
  main.querySelector('[data-action="add-event"]')?.addEventListener('click', () => {
    if (!isAdmin) return;
    V.openEventEditor(null, null, () => renderView());
  });
  main.querySelectorAll('[data-del-event]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (!isAdmin) return;
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).dataset.delEvent!;
      V.deleteEvent(id, () => renderView());
    });
  });

  // ---- Prayer ----
  main.querySelector('#p-submit')?.addEventListener('click', () => {
    V.submitPrayer(() => renderView());
  });
  main.querySelectorAll('[data-pray]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.pray!;
      V.togglePray(id, () => renderView());
    });
  });
  main.querySelectorAll('[data-del-prayer]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (!isAdmin) return;
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).dataset.delPrayer!;
      V.deletePrayer(id, () => renderView());
    });
  });
  // anonymous toggle shows/hides author field
  main.querySelectorAll('input[name="p-anon"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const isAnon = (e.currentTarget as HTMLInputElement).value === 'true';
      const authorEl = main.querySelector('#p-author') as HTMLInputElement;
      authorEl.style.display = isAnon ? 'none' : '';
      if (isAnon) authorEl.value = '';
    });
  });
}

// ===== Bootstrap =====
render();
