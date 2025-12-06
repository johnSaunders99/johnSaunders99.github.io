(function() {
  const imageInput = document.getElementById('image-input');
  const imagePool = document.getElementById('image-pool');
  const clearPoolBtn = document.getElementById('clear-pool');
  const tierDropzones = document.querySelectorAll('.tier-dropzone');
  const exportBtn = document.getElementById('export-tierlist');

  const uploadedImages = new Map();
  const placements = new Map(); // imageId -> { tier, element }
  let imageCounter = 0;
  const MAX_TAGS = 3;

  function handleFiles(files) {
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      const id = `img-${Date.now()}-${imageCounter++}`;
      reader.onload = (event) => {
        const image = { id, name: file.name, src: event.target.result };
        uploadedImages.set(id, image);
        imagePool.appendChild(createPoolCard(image));
      };
      reader.readAsDataURL(file);
    });
    imageInput.value = '';
  }

  function createPoolCard(image) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.draggable = true;
    card.dataset.id = image.id;

    card.addEventListener('dragstart', (e) => setDragData(e, image.id));

    const header = document.createElement('header');
    header.textContent = image.name;
    header.title = image.name;

    const img = document.createElement('img');
    img.src = image.src;
    img.alt = image.name;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger';
    deleteBtn.textContent = '删除';
    deleteBtn.addEventListener('click', () => removeImage(image.id));

    actions.appendChild(deleteBtn);

    card.append(header, img, actions);
    return card;
  }

  function createTierCard(image) {
    const card = document.createElement('div');
    card.className = 'tier-card';
    card.dataset.id = image.id;
    card.draggable = true;
    card.addEventListener('dragstart', (e) => setDragData(e, image.id));

    const header = document.createElement('header');
    const name = document.createElement('span');
    name.textContent = image.name;
    name.title = image.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'danger';
    removeBtn.textContent = '移除';
    removeBtn.addEventListener('click', () => removePlacement(image.id));

    header.append(name, removeBtn);

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'image-wrapper';

    const img = document.createElement('img');
    img.src = image.src;
    img.alt = image.name;

    const tagBadges = document.createElement('div');
    tagBadges.className = 'tag-badges';

    imageWrapper.append(img, tagBadges);

    const tagInputWrapper = document.createElement('div');
    tagInputWrapper.className = 'tag-input';

    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.placeholder = '输入标签（最多3个）';

    const colorSelect = document.createElement('select');
    ['red', 'yellow', 'blue'].forEach((color) => {
      const option = document.createElement('option');
      option.value = color;
      option.textContent = color === 'red' ? '红' : color === 'yellow' ? '黄' : '蓝';
      colorSelect.appendChild(option);
    });

    const addTagBtn = document.createElement('button');
    addTagBtn.textContent = '添加标签';

    const limitNote = document.createElement('div');
    limitNote.className = 'tag-limit';

    function updateLimitText() {
      const count = tagBadges.children.length;
      limitNote.textContent = `已添加 ${count}/${MAX_TAGS} 标签`;
      if (count >= MAX_TAGS) {
        limitNote.classList.add('active');
      } else {
        limitNote.classList.remove('active');
      }
    }

    function addTag() {
      const value = tagInput.value.trim();
      if (!value) return;
      if (tagBadges.children.length >= MAX_TAGS) {
        updateLimitText();
        return;
      }
      const color = colorSelect.value || 'red';
      const tag = document.createElement('span');
      tag.className = `tag ${color}`;
      tag.textContent = value;

      const removeTagBtn = document.createElement('button');
      removeTagBtn.type = 'button';
      removeTagBtn.ariaLabel = '移除标签';
      removeTagBtn.textContent = '×';
      removeTagBtn.addEventListener('click', () => {
        tag.remove();
        updateLimitText();
      });

      tag.appendChild(removeTagBtn);
      tagBadges.appendChild(tag);
      tagInput.value = '';
      updateLimitText();
    }

    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
    });
    addTagBtn.addEventListener('click', addTag);

    tagInputWrapper.append(tagInput, colorSelect, addTagBtn);

    updateLimitText();

    card.append(header, imageWrapper, tagInputWrapper, limitNote);
    return card;
  }

  function setDragData(event, id) {
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
  }

  function removeImage(id) {
    uploadedImages.delete(id);
    const poolCard = imagePool.querySelector(`[data-id="${id}"]`);
    if (poolCard) poolCard.remove();
    removePlacement(id);
  }

  function removePlacement(id) {
    const placement = placements.get(id);
    if (placement) {
      placement.element.remove();
      placements.delete(id);
    }
  }

  function placeImageInTier(id, tier) {
    const image = uploadedImages.get(id);
    if (!image) return;
    removePlacement(id);
    const tierZone = document.querySelector(`.tier-dropzone[data-tier="${tier}"]`);
    if (!tierZone) return;
    const card = createTierCard(image);
    tierZone.appendChild(card);
    placements.set(id, { tier, element: card });
  }

  function resetDropzoneState() {
    tierDropzones.forEach((zone) => zone.classList.remove('is-over'));
  }

  imageInput?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  });

  clearPoolBtn?.addEventListener('click', () => {
    uploadedImages.clear();
    placements.clear();
    imagePool.innerHTML = '';
    tierDropzones.forEach((zone) => (zone.innerHTML = ''));
  });

  tierDropzones.forEach((zone) => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('is-over');
      e.dataTransfer.dropEffect = 'move';
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('is-over');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      resetDropzoneState();
      const id = e.dataTransfer.getData('text/plain');
      if (!id) return;
      placeImageInTier(id, zone.dataset.tier);
    });
  });

  exportBtn?.addEventListener('click', async () => {
    const board = document.getElementById('tier-board');
    if (!board || typeof html2canvas !== 'function') return;
    exportBtn.disabled = true;
    const originalText = exportBtn.textContent;
    exportBtn.textContent = '导出中...';
    try {
      const canvas = await html2canvas(board, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `tierlist-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = originalText || '导出为图片';
    }
  });

  document.addEventListener('dragend', resetDropzoneState);
})();
