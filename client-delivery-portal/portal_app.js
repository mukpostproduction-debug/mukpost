
// ==========================================================================
// MUK POST // CLIENT DELIVERY PORTAL APP SCRIPT (EMLIA & JOHN)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabs = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `pane-${tab.dataset.tab}`;
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });

  // Chapter Seek Click handlers
  const chapterCards = document.querySelectorAll('.chapter-card');
  chapterCards.forEach(card => {
    card.addEventListener('click', () => {
      const timecode = card.dataset.seek;
      showToast(`Seeking Highlight Film to ${timecode} [${card.querySelector('.ch-name').innerText}]`);
    });
  });

  // Play button click simulation
  const playButtons = document.querySelectorAll('.play-trigger');
  playButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast('Master 4K Video Player Initialized. Ready for client review streaming.');
    });
  });
});

// Toast notification helper
function showToast(message) {
  let toast = document.getElementById('muk-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'muk-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.background = '#ffffff';
    toast.style.color = '#000000';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '4px';
    toast.style.fontFamily = "'Space Mono', monospace";
    toast.style.fontSize = '11px';
    toast.style.fontWeight = 'bold';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    toast.style.zIndex = '9999';
    toast.style.transition = 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
  }, 3200);
}

// Download action trigger
function triggerDownload(assetName) {
  showToast(`Initiating direct high-speed transfer for: ${assetName}`);
}
