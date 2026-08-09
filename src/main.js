import { store } from './data.js';
import * as V from './views.js';

// ===== State =====
let isAdmin = store.getAdmin();
let currentView = 'home';

const ADMIN_ID = 'admin';
const ADMIN_PW = 'starteens2026';

// ===== App shell =====
function headerHtml() {
  const views = [
    { name: 'home', label: '홈' },
    { name: 'attendance', label: '출석' },
    { name: 'reading', label: '성경읽기' },
    { name: 'calendar', label: '캘린더' },
    { name: 'prayer', label: '기도요청' },
  ];
  
  const navItems = views
    .map(
      (v) =>
        `<button class="nav__btn ${currentView === v.name ? 'is-active' : ''}" data-nav="${v.name}" aria-current="${currentView === v.name ? 'page' : 'false'}">${v.label}</button>`
    )
    .join('');

  const authArea = isAdmin
    ? `<div class="nav__user">
         <span class="admin-badge"><span aria-hidden="true">★</span> 관리자</span>
         <button class="nav__logout" id="logout-btn">로그아웃</button>
       </div>`
    : `<button class="nav__login" id="login-btn">관리자 로그인</button>`;

  // Check if nav exists safely
  const nav = document.querySelector('#nav');
  const isMenuOpen = nav ? nav.classList.contains('is-open') : false;

  return `
    <header class="site-header">
      <div class="site-header__inner">
        <div class="brand" data-nav="home" role="link" tabindex="0" aria-label="스타틴스 홈으로 이동">
          <div class="brand__mark" aria-hidden="true">S</div>
          <div>
            <div class="brand__name">별빛틴즈</div>
            <div class="brand__sub">YOUTH MINISTRY</div>
          </div>
        </div>
        <button class="menu-toggle" id="menu-toggle" aria-label="메인 메뉴 열기" aria-expanded="${isMenuOpen}" aria-controls="nav">☰</button>
        <nav class="nav" id="nav" aria-label="주요 서비스 내비게이션">
          ${navItems}
          <div class="nav__divider" aria-hidden="true"></div>
          ${authArea}
        </nav>
      </div>
    </header>`;
}

function footerHtml() {
  return `
    <footer class="site-footer">
      <div><span class="site-footer__logo">별빛틴즈</span></div>
      <div style="margin-top:4px" lang="ko">"주의 말씀은 내 발의 등이요 내 길의 빛이니이다" - 시편 119:105</div>
    </footer>`;
}

function render() {
  const app = document.querySelector('#app');
  if (!app) {
    console.error('App container not found!');
    return;
  }
  app.innerHTML = `
    <a href="#main" class="skip-link">본문 바로가기</a>
    ${headerHtml()}
    <main class="main" id="main" tabindex="-1"></main>
    ${footerHtml()}`;
  renderView();
  bindShell();
}

function renderView() {
  const main = document.querySelector('#main');
  if (!main) return;

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
  
  // Close mobile menu and update toggle attribute
  const nav = document.querySelector('#nav');
  if (nav) {
    nav.classList.remove('is-open');
    const toggleBtn = document.querySelector('#menu-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('aria-label', '메인 메뉴 열기');
    }
  }
}

function bindShell() {
  // Navigation
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = e.currentTarget.dataset.nav;
      if (target) {
        currentView = target;
        render();
        // Focus on main title or container for screen reader focus placement
        const main = document.querySelector('#main');
        if (main) main.focus();
      }
    });
    // Add enter/space keys support for logo
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const target = e.currentTarget.dataset.nav;
        if (target) {
          currentView = target;
          render();
          const main = document.querySelector('#main');
          if (main) main.focus();
        }
      }
    });
  });

  // Mobile menu toggle
  document.querySelector('#menu-toggle')?.addEventListener('click', (e) => {
    const nav = document.querySelector('#nav');
    if (nav) {
      const isOpen = nav.classList.toggle('is-open');
      e.currentTarget.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      e.currentTarget.setAttribute('aria-label', isOpen ? '메인 메뉴 닫기' : '메인 메뉴 열기');
    }
  });

  // Login button
  document.querySelector('#login-btn')?.addEventListener('click', openLogin);
  
  // Logout button
  document.querySelector('#logout-btn')?.addEventListener('click', () => {
    isAdmin = false;
    store.setAdmin(false);
    V.toast('로그아웃되었습니다.');
    render();
  });
}

// ===== Login modal =====
function openLogin() {
  const m = V.openModal(
    '관리자 로그인',
    `
    <div class="login-form">
      <div class="field">
        <label class="field__label" for="login-id">아이디</label>
        <input class="input" id="login-id" placeholder="아이디" autocomplete="username" />
      </div>
      <div class="field">
        <label class="field__label" for="login-pw">비밀번호</label>
        <input class="input" id="login-pw" type="password" placeholder="비밀번호" autocomplete="current-password" />
      </div>
      <div class="login-error" id="login-err" role="alert" aria-live="assertive"></div>
      <button class="btn btn--gold btn--block" id="login-submit">로그인</button>
    </div>`
  );

  const idInput = m.querySelector('#login-id');
  const pwInput = m.querySelector('#login-pw');
  const errEl = m.querySelector('#login-err');

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

  m.querySelector('#login-submit').addEventListener('click', submit);
  pwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  idInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { pwInput.focus(); }
  });
  idInput.focus();
}

// ===== View event binding =====
function bindView() {
  const main = document.querySelector('#main');
  if (!main) return;

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
      const id = e.currentTarget.dataset.id;
      const ad = store.getAds().find((a) => a.id === id) || null;
      V.openAdEditor(ad, () => renderView());
    });
  });
  main.querySelectorAll('[data-action="del-ad"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (!isAdmin) return;
      const id = e.currentTarget.dataset.id;
      V.deleteAd(id, () => renderView());
    });
  });

  // ---- Attendance ----
  main.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (!isAdmin) return;
      const id = e.currentTarget.dataset.toggle;
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
      const ds = e.currentTarget.dataset.readDay;
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
      const ds = e.currentTarget.dataset.calDay;
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
      const id = e.currentTarget.dataset.delEvent;
      V.deleteEvent(id, () => renderView());
    });
  });

  // ---- Prayer ----
  main.querySelector('#p-submit')?.addEventListener('click', () => {
    V.submitPrayer(() => renderView());
  });
  main.querySelectorAll('[data-pray]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.pray;
      V.togglePray(id, () => renderView());
    });
  });
  main.querySelectorAll('[data-del-prayer]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (!isAdmin) return;
      e.stopPropagation();
      const id = e.currentTarget.dataset.delPrayer;
      V.deletePrayer(id, () => renderView());
    });
  });
  // anonymous toggle shows/hides author field
  main.querySelectorAll('input[name="p-anon"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const isAnon = e.currentTarget.value === 'true';
      const authorEl = main.querySelector('#p-author');
      authorEl.style.display = isAnon ? 'none' : '';
      if (isAnon) authorEl.value = '';
    });
  });
}

// ===== Bootstrap =====
document.addEventListener('DOMContentLoaded', render);
