// app.js

// Simple tab switcher on index.html
(function tabs() {
  const tabBtns = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  if (!tabBtns.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.tab);
      panel.classList.add('active');
    });
  });
})();

// Login form handler
(function loginHandler() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';
    const fd = new FormData(form);
    const body = {
      email: fd.get('email'),
      password: fd.get('password'),
    };

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      // go to profile
      window.location.href = '/profile.html';
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
})();

// Signup form handler
(function signupHandler() {
  const form = document.getElementById('signupForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('signupError');
    errorEl.textContent = '';
    const fd = new FormData(form);
    const body = {
      name: fd.get('name'),
      email: fd.get('email'),
      password: fd.get('password'),
    };

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign up failed');
      // go to profile
      window.location.href = '/profile.html';
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
})();

// Profile page logic (auto-save)
(function profilePage() {
  const nameInput = document.getElementById('nameInput');
  const bioInput = document.getElementById('bioInput');
  const avatarInput = document.getElementById('avatarInput');
  const avatarImg = document.getElementById('avatarImg');
  const status = document.getElementById('status');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!nameInput || !bioInput || !avatarInput) return;

  // load current user
  async function loadMe() {
    try {
      const res = await fetch('/api/me');
      if (res.status === 401) {
        window.location.href = '/';
        return;
      }
      const data = await res.json();
      const u = data.user;
      nameInput.value = u.name || '';
      bioInput.value = u.bio || '';
      avatarInput.value = u.avatar || '';
      avatarImg.src = u.avatar || 'https://avatars.githubusercontent.com/u/583231?v=4'; // fallback
      status.textContent = 'Profile loaded. Start typing — it saves automatically.';
    } catch (err) {
      status.textContent = 'Could not load profile.';
    }
  }

  // debounce helper to avoid too many requests
  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  const saveProfile = debounce(async () => {
    status.textContent = 'Saving…';
    try {
      const body = {
        name: nameInput.value,
        bio: bioInput.value,
        avatar: avatarInput.value,
      };
      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        window.location.href = '/';
        return;
      }
      const data = await res.json();
      // update avatar preview
      avatarImg.src = data.user.avatar || avatarImg.src;
      status.textContent = 'Saved ✔';
    } catch (err) {
      status.textContent = 'Save failed. Check your connection.';
    }
  }, 500); // saves 0.5s after you stop typing

  nameInput.addEventListener('input', saveProfile);
  bioInput.addEventListener('input', saveProfile);
  avatarInput.addEventListener('input', saveProfile);

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });

  loadMe();
})();
