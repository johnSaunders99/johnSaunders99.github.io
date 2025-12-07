(function() {
  const fileInput = document.getElementById('file-input');
  const pool = document.getElementById('pool');
  const drops = document.querySelectorAll('.tier-drop');
  const resetBtn = document.getElementById('reset-btn');
  const exportBtn = document.getElementById('export-btn');
  const titleInput = document.getElementById('board-title-input');
  const boardTitle = document.getElementById('board-title');
  const board = document.getElementById('board');

  const items = new Map();
  let counter = 0;

  function updateTitle() {
    const value = titleInput.value.trim() || '强度评价表';
    boardTitle.textContent = value;
    document.title = value;
  }

  function createCard(id, name, src, note = '') {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.dataset.id = id;

    const img = document.createElement('img');
    img.src = src;
    img.alt = name || '图片';

    const textarea = document.createElement('textarea');
    textarea.placeholder = '在这里写下评价...';
    textarea.value = note;
    textarea.addEventListener('input', () => {
      const data = items.get(id);
      if (data) data.note = textarea.value;
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove';
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removeItem(id));

    card.append(img, textarea, removeBtn);

    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      drops.forEach((zone) => zone.classList.remove('is-over'));
    });

    return card;
  }

  function addFiles(files) {
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      const id = `card-${Date.now()}-${counter++}`;
      reader.onload = (evt) => {
        const data = { id, name: file.name, src: evt.target.result, note: '' };
        items.set(id, data);
        pool.appendChild(createCard(id, data.name, data.src, data.note));
      };
      reader.readAsDataURL(file);
    });
    fileInput.value = '';
  }

  function removeItem(id) {
    items.delete(id);
    document.querySelectorAll(`[data-id="${id}"]`).forEach((node) => node.remove());
  }

  function handleDrop(zone, event) {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    if (!id || !items.has(id)) return;
    const card = document.querySelector(`.card[data-id="${id}"]`);
    if (card) {
      zone.appendChild(card);
    }
    zone.classList.remove('is-over');
  }

  fileInput?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  });

  titleInput?.addEventListener('input', updateTitle);

  drops.forEach((zone) => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('is-over');
      e.dataTransfer.dropEffect = 'move';
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => handleDrop(zone, e));
  });

  pool?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  pool?.addEventListener('drop', (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id || !items.has(id)) return;
    const card = document.querySelector(`.card[data-id="${id}"]`);
    if (card) {
      pool.appendChild(card);
    }
  });

  resetBtn?.addEventListener('click', () => {
    items.clear();
    pool.innerHTML = '';
    drops.forEach((z) => (z.innerHTML = ''));
    fileInput.value = '';
    titleInput.value = '强度评价表';
    updateTitle();
  });

  exportBtn?.addEventListener('click', async () => {
    if (!board || typeof html2canvas !== 'function') return;
    exportBtn.disabled = true;
    const original = exportBtn.textContent;
    exportBtn.textContent = '导出中...';
    try {
      const canvas = await html2canvas(board, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        scale: 2,
      });
      const name = (titleInput.value || 'tier-notes').trim().replace(/\s+/g, '-');
      const link = document.createElement('a');
      link.download = `${name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = original || '导出图片';
    }
  });

  updateTitle();
})();
