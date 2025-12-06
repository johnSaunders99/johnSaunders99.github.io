(function() {
  const imageInput = document.getElementById('image-input');
  const imagePool = document.getElementById('image-pool');
  const clearPoolBtn = document.getElementById('clear-pool');
  const tierDropzones = document.querySelectorAll('.tier-dropzone');

  const uploadedImages = new Map();
  const placements = new Map(); // imageId -> { tier, element }
  let imageCounter = 0;

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

    const img = document.createElement('img');
    img.src = image.src;
    img.alt = image.name;

    const tagList = document.createElement('div');
    tagList.className = 'tag-list';

    const tagInputWrapper = document.createElement('div');
    tagInputWrapper.className = 'tag-input';
    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.placeholder = '输入标签后回车';

    const addTagBtn = document.createElement('button');
    addTagBtn.textContent = '添加标签';

    function addTag() {
      const value = tagInput.value.trim();
      if (!value) return;
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = value;

      const removeTagBtn = document.createElement('button');
      removeTagBtn.type = 'button';
      removeTagBtn.ariaLabel = '移除标签';
      removeTagBtn.textContent = '×';
      removeTagBtn.addEventListener('click', () => tag.remove());

      tag.appendChild(removeTagBtn);
      tagList.appendChild(tag);
      tagInput.value = '';
    }

    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
    });
    addTagBtn.addEventListener('click', addTag);

    tagInputWrapper.append(tagInput, addTagBtn);

    card.append(header, img, tagList, tagInputWrapper);
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

  document.addEventListener('dragend', resetDropzoneState);
})();
