(function() {
  const pool = document.getElementById('pool');
  const tierCanvases = document.querySelectorAll('.tier-canvas');
  const fileInput = document.getElementById('file-input');
  const resetBtn = document.getElementById('reset-btn');
  const exportAllBtn = document.getElementById('export-all-btn');
  const titleInput = document.getElementById('board-title-input');
  const boardTitle = document.getElementById('board-title');
  const tierExports = document.querySelectorAll('.export-tier');

  let idCounter = 0;

  function createCard(src) {
    const card = document.createElement('div');
    card.className = 'poster-card';
    card.draggable = true;
    card.dataset.id = `card-${idCounter++}`;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.style.backgroundImage = `url(${src})`;

    const note = document.createElement('textarea');
    note.placeholder = '写下这一件装备的评价...';

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const del = document.createElement('button');
    del.className = 'small ghost remove';
    del.textContent = '×';
    del.title = '删除卡片';
    actions.appendChild(del);

    card.append(thumb, note, actions);

    del.addEventListener('click', () => card.remove());
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    return card;
  }

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const card = createCard(e.target.result);
        pool.appendChild(card);
      };
      reader.readAsDataURL(file);
    });
  }

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    requestAnimationFrame(() => e.target.classList.add('dragging'));
  }

  function handleDragEnd(e) {
    e.target.classList.remove('dragging');
  }

  function setupCanvas(canvas) {
    canvas.addEventListener('dragover', e => {
      e.preventDefault();
      canvas.classList.add('drag-over');
    });

    canvas.addEventListener('dragleave', () => {
      canvas.classList.remove('drag-over');
    });

    canvas.addEventListener('drop', e => {
      e.preventDefault();
      canvas.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const card = document.querySelector(`[data-id="${id}"]`);
      if (card) {
        canvas.appendChild(card);
      }
    });
  }

  function clearAll() {
    document.querySelectorAll('.poster-card').forEach(el => el.remove());
  }

  function syncTitle() {
    boardTitle.textContent = titleInput.value.trim() || '段位评价图';
  }

  function exportNode(node, name) {
    const options = {
      backgroundColor: '#0a0f1f',
      scale: 2
    };
    html2canvas(node, options).then(canvas => {
      const link = document.createElement('a');
      link.download = `${name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  function setupTierExports() {
    tierExports.forEach(btn => {
      btn.addEventListener('click', () => {
        const tier = btn.dataset.tier;
        const block = document.querySelector(`.tier-block[data-tier="${tier}"]`);
        if (block) {
          const clone = block.cloneNode(true);
          clone.querySelectorAll('.export-tier').forEach(btn => btn.remove());
          clone.querySelectorAll('textarea').forEach(area => {
            const text = document.createElement('div');
            text.className = 'note-readonly';
            text.textContent = area.value;
            area.replaceWith(text);
          });
          const wrapper = document.createElement('div');
          wrapper.style.padding = '16px';
          wrapper.style.background = '#0a0f1f';
          const title = document.createElement('div');
          title.className = 'poster-title';
          title.textContent = boardTitle.textContent;
          wrapper.append(title, clone);
          exportNode(wrapper, `${boardTitle.textContent}-${tier}段位评价`);
        }
      });
    });
  }

  fileInput.addEventListener('change', e => handleFiles(e.target.files));
  resetBtn.addEventListener('click', clearAll);
  exportAllBtn.addEventListener('click', () => {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '16px';
    wrapper.style.background = '#0a0f1f';
    const title = document.createElement('div');
    title.className = 'poster-title';
    title.textContent = boardTitle.textContent;
    wrapper.appendChild(title);
    document.querySelectorAll('.tier-block').forEach(block => {
      const clone = block.cloneNode(true);
      clone.querySelectorAll('.export-tier').forEach(btn => btn.remove());
      clone.querySelectorAll('textarea').forEach(area => {
        const text = document.createElement('div');
        text.className = 'note-readonly';
        text.textContent = area.value;
        area.replaceWith(text);
      });
      wrapper.appendChild(clone);
    });
    exportNode(wrapper, `${boardTitle.textContent}-全部段位评价`);
  });

  titleInput.addEventListener('input', syncTitle);
  syncTitle();

  pool.addEventListener('dragover', e => e.preventDefault());
  pool.addEventListener('drop', e => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
      pool.appendChild(card);
    }
  });

  tierCanvases.forEach(setupCanvas);
  setupTierExports();
})();
