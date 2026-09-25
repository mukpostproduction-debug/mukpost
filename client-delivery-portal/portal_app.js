// ==========================================================================
// MUK POST // CLIENT DELIVERY PORTAL APP SCRIPT (EMLIA & JOHN)
// Enhanced via: Vercel Web Guidelines (A11y/Keyboard) + TasteSkill (Motion)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Accessible Tab Switching with Keyboard Support
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

  // 2. Chapter Seek Click & Keyboard handlers
  const chapterCards = document.querySelectorAll('.chapter-card');
  chapterCards.forEach(card => {
    const handleSeek = () => {
      const timecode = card.dataset.seek;
      const chapterName = card.querySelector('.ch-name').innerText;
      
      // Update active state
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

  // 3. Play button click simulation
  const playButtons = document.querySelectorAll('.play-trigger, .play-sm');
  playButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast('▶ Master 4K Video Player Initialized. Ready for client review streaming.');
    });
  });

  // 4. Lightbox Modal for 5 Visual Style Suites (ImageToCode & A11y)
  const modal = document.getElementById('style-lightbox-modal');
  const modalImg = document.getElementById('lightbox-img');
  const modalTitle = document.getElementById('lightbox-title');
  const modalDesc = document.getElementById('lightbox-desc');
  const modalSpecs = document.getElementById('lightbox-specs');
  const modalMacroBtn = document.getElementById('lightbox-macro-btn');
  const closeBtn = document.getElementById('lightbox-close-btn');

  const styleCards = document.querySelectorAll('.style-card');
  styleCards.forEach(card => {
    const openCard = () => {
      const imgPath = card.dataset.preview;
      const title = card.dataset.title;
      const desc = card.dataset.desc;
      const specs = card.dataset.specs;
      const macroPath = card.dataset.macro;

      modalImg.src = imgPath;
      modalImg.alt = `${title} 4K Preview`;
      modalTitle.innerText = title;
      modalDesc.innerText = desc;
      modalSpecs.innerText = specs;
      modalMacroBtn.href = macroPath;

      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      closeBtn.focus();
    };

    card.addEventListener('click', openCard);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openCard();
      }
    });
  });

  const closeModal = () => {
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeModal();
    }
  });
});

// Tab activator helper
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

// Toast notification helper (WCAG AA compliant status announcer)
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
  }, 3400);
}

// Accessible download action trigger
function triggerDownload(assetName) {
  showToast(`⏳ Initiating direct high-speed transfer for: ${assetName}`);
}
