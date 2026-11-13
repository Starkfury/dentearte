'use strict';
(() => {
  // Mantém a capa e o link utilizáveis se a miniatura externa não carregar.
  document.querySelectorAll('.video-cover img').forEach(image => {
    image.addEventListener('error', () => { image.hidden = true; });
    if (image.complete && image.naturalWidth === 0) image.hidden = true;
  });
  const highlights = document.querySelector('#destaques');
  const track = highlights?.querySelector('#highlights-track');
  const controls = highlights?.querySelector('[data-carousel-controls]');
  const previous = controls?.querySelector('[data-carousel-prev]');
  const next = controls?.querySelector('[data-carousel-next]');
  const status = highlights?.querySelector('[data-carousel-status]');
  const cards = track ? [...track.querySelectorAll('.highlight-card')] : [];

  if (previous && next && status && cards.length) {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const step = () => cards.length > 1
      ? cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left
      : track.clientWidth;

    function update() {
      const limit = maxScroll();
      previous.disabled = limit <= 2 || track.scrollLeft <= 2;
      next.disabled = limit <= 2 || track.scrollLeft >= limit - 2;
      const distance = step();
      if (distance <= 0) return;
      const first = Math.min(cards.length, Math.round(track.scrollLeft / distance) + 1);
      const count = Math.max(1, Math.round(track.clientWidth / distance));
      const message = `Destaques ${first}–${Math.min(cards.length, first + count - 1)} de ${cards.length}.`;
      if (status.textContent !== message) status.textContent = message;
    }

    function goTo(left) {
      track.scrollTo({
        left: Math.max(0, Math.min(maxScroll(), left)),
        behavior: reducedMotion?.matches ? 'instant' : 'smooth',
      });
    }

    previous.addEventListener('click', () => goTo(track.scrollLeft - step()));
    next.addEventListener('click', () => goTo(track.scrollLeft + step()));
    track.addEventListener('keydown', event => {
      if (event.target !== track || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(track.scrollLeft + (event.key === 'ArrowLeft' ? -1 : 1) * step());
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        goTo(event.key === 'Home' ? 0 : maxScroll());
      }
    });
    track.addEventListener('scroll', update, {passive: true});
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    controls.hidden = false;
    update();
  }
  // Sem JavaScript, os dois grupos permanecem disponíveis no documento.
  document.querySelectorAll('[data-story-tabs]').forEach(tablist => {
    const tabs = [...tablist.querySelectorAll('[data-story-target]')];
    // Falha em um painel não deve ocultar os demais conteúdos.
    const panels = tabs.map(tab=>document.getElementById(tab.dataset.storyTarget));
    const labels = tabs.map(tab=>tab.getAttribute('id'));
    if (!tabs.length || panels.some(panel=>!panel) || new Set(panels).size!==tabs.length || labels.some(id=>!id) || new Set(labels).size!==tabs.length) return;
    panels.forEach((panel,index) => {
      panel.setAttribute('role','tabpanel');
      panel.setAttribute('aria-labelledby',labels[index]);
      panel.tabIndex = 0;
    });
    function select(tab, focus = false) {
      tabs.forEach((item,index) => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        panels[index].hidden = !selected;
      });
      if (focus) tab.focus();
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        let target;
        if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') target = 0;
        if (event.key === 'End') target = tabs.length - 1;
        if (target !== undefined) { event.preventDefault(); select(tabs[target], true); }
      });
    });
    if (tabs.length) { tablist.hidden = false; select(tabs[0]); }
  });
})();
