(function () {
  const isNested = window.location.pathname.includes('/apps/') || window.location.pathname.includes('/archiveApps/');
  const assetBase = isNested ? '../' : '';
  const makeSrc = path => `${assetBase}${path}`;
  const imageSamples = [
    { id: 'img-01', label: 'Sample 01', src: makeSrc('images/sampleimages/sample01.jpg') },
    { id: 'img-02', label: 'Sample 02', src: makeSrc('images/sampleimages/sample02.jpg') },
    { id: 'img-03', label: 'Sample 03', src: makeSrc('images/sampleimages/sample03.jpg') },
    { id: 'img-04', label: 'Sample 04', src: makeSrc('images/sampleimages/sample04.jpg') },
    { id: 'img-05', label: 'Sample 05', src: makeSrc('images/sampleimages/sample05.jpg') },
    { id: 'img-06', label: 'Sample 06', src: makeSrc('images/sampleimages/sample06.jpg') },
    { id: 'img-07', label: 'Sample 07', src: makeSrc('images/sampleimages/sample07.jpg') }
  ];

  const videoSamples = [
    { id: 'vid-01', label: 'Sample Video 01', src: makeSrc("images/samplevideo's/samplevideo1.mp4") },
    { id: 'vid-02', label: 'Sample Video 02', src: makeSrc("images/samplevideo's/samplevideo2.mp4") },
    { id: 'vid-03', label: 'Sample Video 03', src: makeSrc("images/samplevideo's/samplevideo3.mp4") }
  ];

  const store = {
    images: imageSamples,
    videos: videoSamples
  };

  function getList(type) {
    return store[type] || [];
  }

  function getSample(type, value) {
    if (!type || !value) return undefined;
    return getList(type).find(sample => sample.id === value || sample.src === value);
  }

  function populateSelect(select) {
    if (!select) return;
    const type = select.dataset.sampleSource;
    const samples = getList(type);
    if (!samples.length) return;
    const currentValue = select.value;
    const defaultId = select.dataset.defaultSample;
    select.innerHTML = '';
    samples.forEach(sample => {
      const option = document.createElement('option');
      option.value = sample.id;
      option.textContent = sample.label;
      select.appendChild(option);
    });
    if (currentValue && getSample(type, currentValue)) {
      select.value = currentValue;
    } else if (defaultId && getSample(type, defaultId)) {
      select.value = defaultId;
    } else if (!select.value && samples[0]) {
      select.value = samples[0].id;
    }
  }

  function renderPreview(previewEl, sample, type) {
    if (!previewEl) return;
    previewEl.innerHTML = '';
    if (!sample) {
      previewEl.textContent = 'Preview unavailable.';
      return;
    }
    const label = document.createElement('span');
    label.className = 'sample-preview__label';
    label.textContent = sample.label;
    previewEl.appendChild(label);
    if (type === 'videos') {
      const video = document.createElement('video');
      video.src = sample.preview || sample.src;
      video.loop = true;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.controls = false;
      video.play().catch(() => {});
      previewEl.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = sample.preview || sample.src;
      img.alt = sample.label;
      previewEl.appendChild(img);
    }
  }

  function attachPreview(select, previewEl) {
    if (!select || !previewEl) return;
    const type = select.dataset.sampleSource;
    const update = () => {
      const sample = getSample(type, select.value || select.dataset.defaultSample);
      renderPreview(previewEl, sample, type);
    };
    select.addEventListener('change', update);
    update();
  }

  function createCarousel(config = {}) {
    const {
      type = 'images',
      previewEl,
      nameEl,
      prevBtn,
      nextBtn,
      emptyMessage = 'Add samples in sampleMedia.js'
    } = config;

    const samples = getList(type);
    let index = 0;

    const toggleDisabled = (el, disabled) => {
      if (!el) return;
      el.disabled = !!disabled;
    };

    const update = () => {
      if (!samples.length) {
        if (nameEl) nameEl.textContent = 'No samples';
        if (previewEl) {
          previewEl.textContent = emptyMessage;
        }
        toggleDisabled(prevBtn, true);
        toggleDisabled(nextBtn, true);
        return;
      }
      const sample = samples[index];
      if (nameEl) nameEl.textContent = sample.label;
      renderPreview(previewEl, sample, type);
      const disableNav = samples.length <= 1;
      toggleDisabled(prevBtn, disableNav);
      toggleDisabled(nextBtn, disableNav);
    };

    const shift = delta => {
      if (!samples.length) return;
      index = (index + delta + samples.length) % samples.length;
      update();
    };

    prevBtn?.addEventListener('click', () => shift(-1));
    nextBtn?.addEventListener('click', () => shift(1));
    update();

    return {
      hasSamples: samples.length > 0,
      getCurrentSample: () => samples[index],
      shift,
      refresh: update
    };
  }

  window.SampleMedia = {
    getList,
    getSample,
    populateSelect,
    attachPreview,
    renderPreview,
    createCarousel
  };
})();
