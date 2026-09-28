// ==========================================================================
// MUK POST // CLIENT DELIVERY PORTAL APP SCRIPT (AMELIA & JOHN)
// Features: ENJ26 Password Gate + Session Persistence + Accessible Tab Controls
// ==========================================================================

const PASSKEY = 'ENJ26';
const AUTH_KEY = 'enj_wedding_auth';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Password Gate Initialization
  initPasswordGate();

  // 2. Accessible Tab Switching with Keyboard Support
  initTabs();

  // 3. Chapter Seek Click & Keyboard Handlers
  initChapterSeekers();

  // 4. Play Button Triggers
  initPlayTriggers();
});

// --------------------------------------------------------------------------
// 1. Password Gate (ENJ26) & Session Auth
// --------------------------------------------------------------------------
function initPasswordGate() {
  const gateOverlay = document.getElementById('password-gate');
  const gateInput = document.getElementById('gate-password-input');
  const toggleBtn = document.getElementById('toggle-pw-btn');

  // Check if previously authenticated in this session
  if (sessionStorage.getItem(AUTH_KEY) === 'true') {
    if (gateOverlay) {
      gateOverlay.classList.add('unlocked');
    }
  } else {
    // Focus input field for immediate entry
    if (gateInput) {
      setTimeout(() => gateInput.focus(), 250);
    }
  }

  // Toggle password visibility
  if (toggleBtn && gateInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = gateInput.type === 'password';
      gateInput.type = isPassword ? 'text' : 'password';
      toggleBtn.setAttribute('aria-label', isPassword ? 'Hide passkey' : 'Show passkey');
    });
  }
}

// Global submit handler for gate form
window.handleGateSubmit = function() {
  const gateOverlay = document.getElementById('password-gate');
  const gateCard = document.querySelector('.gate-card');
  const gateInput = document.getElementById('gate-password-input');
  const errorEl = document.getElementById('gate-error');

  if (!gateInput) return;
  const enteredVal = gateInput.value.trim().toUpperCase();

  if (enteredVal === PASSKEY) {
    // Authentication successful
    sessionStorage.setItem(AUTH_KEY, 'true');
    if (errorEl) errorEl.textContent = '';
    
    if (gateOverlay) {
      gateOverlay.classList.add('unlocked');
    }
    showToast('✨ Welcome Amelia & John. Your wedding vault is unlocked.');
  } else {
    // Authentication failed
    if (errorEl) {
      errorEl.textContent = 'Incorrect passkey. Please check credentials or contact Muk Post.';
    }
    if (gateCard) {
      gateCard.classList.remove('shake');
      // Trigger reflow to restart animation
      void gateCard.offsetWidth;
      gateCard.classList.add('shake');
    }
    gateInput.select();
    gateInput.focus();
  }
};

// --------------------------------------------------------------------------
// 2. Accessible Tab Switching
// --------------------------------------------------------------------------
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab, panes, tabButtons));

    // Keyboard navigation (Arrow keys left/right)
    tab.addEventListener('keydown', (e) => {
      let targetTab = null;
      if (e.key === 'ArrowRight') {
        targetTab = tabButtons[(index + 1) % tabButtons.length];
      } else if (e.key === 'ArrowLeft') {
        targetTab = tabButtons[(index - 1 + tabButtons.length) % tabButtons.length];
      }
      if (targetTab) {
        targetTab.focus();
        activateTab(targetTab, panes, tabButtons);
      }
    });
  });
}

function activateTab(tab, panes, allTabs) {
  allTabs.forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  panes.forEach(p => p.classList.remove('active'));

  tab.classList.add('active');
  tab.setAttribute('aria-selected', 'true');
  const targetId = `pane-${tab.dataset.tab}`;
  const targetPane = document.getElementById(targetId);
  if (targetPane) {
    targetPane.classList.add('active');
  }
}

// --------------------------------------------------------------------------
// 3. Chapter Seeker Module
// --------------------------------------------------------------------------
function initChapterSeekers() {
  const chapterCards = document.querySelectorAll('.chapter-card');
  chapterCards.forEach(card => {
    const handleSeek = () => {
      const timecode = card.dataset.seek;
      const chapterName = card.querySelector('.ch-name').innerText;
      
      // Update active highlight border
      chapterCards.forEach(c => c.style.borderColor = 'var(--border-subtle)');
      card.style.borderColor = 'var(--gold-primary)';

      showToast(`🎬 Seeking Highlight Film to ${timecode} — [${chapterName}]`);
    };

    card.addEventListener('click', handleSeek);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSeek();
      }
    });
  });
}

// --------------------------------------------------------------------------
// 4. Video Play Trigger Simulation
// --------------------------------------------------------------------------
function initPlayTriggers() {
  const playButtons = document.querySelectorAll('.play-trigger, .play-sm');
  playButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast('▶ Master 4K Video Player Initialized. Ready for streaming.');
    });
  });
}

// --------------------------------------------------------------------------
// 5. Toast Announcements & Downloads
// --------------------------------------------------------------------------
function showToast(message) {
  let toast = document.getElementById('muk-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'muk-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  clearTimeout(window.mukToastTimer);
  window.mukToastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
  }, 3500);
}

function triggerDownload(assetName) {
  showToast(`⏳ Initiating direct high-speed transfer for: ${assetName}`);
}
