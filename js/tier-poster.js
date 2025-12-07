(function() {
  const pool = document.getElementById('pool');
  const posterCanvas = document.getElementById('poster-canvas');
  const fileInput = document.getElementById('file-input');
  const resetBtn = document.getElementById('reset-btn');
  const exportBtn = document.getElementById('export-btn');
  const titleInput = document.getElementById('board-title-input');
  const boardTitle = document.getElementById('board-title');
  const tierBlock = document.querySelector('.tier-block.single');

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

  function ensureHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) {
        return resolve(window.html2canvas);
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.onload = () => resolve(window.html2canvas);
      script.onerror = () => reject(new Error('html2canvas load failed'));
      document.head.appendChild(script);
    });
  }

  function exportNode(node, name, cleanup) {
    ensureHtml2Canvas()
      .then((h2c) => {
        const options = {
          backgroundColor: '#0a0f1f',
          scale: 2
        };
        return h2c(node, options);
      })
      .then(canvas => {
        const link = document.createElement('a');
        link.download = `${name}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      })
      .catch(() => {
        alert('导出功能加载失败，请检查网络后重试');
      })
      .finally(() => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
  }

  function buildSnapshotBlock(block) {
    const clone = block.cloneNode(true);
    const sourceTextareas = Array.from(block.querySelectorAll('textarea'));
    clone.querySelectorAll('.export-tier').forEach(btn => btn.remove());
    clone.querySelectorAll('textarea').forEach((area, idx) => {
      const text = document.createElement('div');
      text.className = 'note-readonly';
      text.textContent = sourceTextareas[idx] ? sourceTextareas[idx].value : '';
      area.replaceWith(text);
    });
    return clone;
  }

  fileInput.addEventListener('change', e => handleFiles(e.target.files));
  resetBtn.addEventListener('click', clearAll);
  exportBtn.addEventListener('click', () => {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '16px';
    wrapper.style.background = '#0a0f1f';
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';

    const title = document.createElement('div');
    title.className = 'poster-title';
    title.textContent = boardTitle.textContent;
    wrapper.appendChild(title);
    wrapper.appendChild(buildSnapshotBlock(tierBlock));

    document.body.appendChild(wrapper);
    exportNode(wrapper, `${boardTitle.textContent}-评价`, () => wrapper.remove());
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

  setupCanvas(posterCanvas);
})();
