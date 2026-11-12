'use strict';
(() => {
  // Mantém a capa e o link utilizáveis se a miniatura externa não carregar.
  document.querySelectorAll('.video-cover img').forEach(image => {
    image.addEventListener('error', () => { image.hidden = true; });
    if (image.complete && image.naturalWidth === 0) image.hidden = true;
  });
  // Um único estado de pausa. Reproduzir sempre avança e reinicia o ciclo.
  const track = document.querySelector('#highlights-track');
  const section = document.querySelector('#destaques');
  const controls = document.querySelector('[data-carousel-controls]');
  const previous = controls?.querySelector('[data-carousel-prev]');
  const next = controls?.querySelector('[data-carousel-next]');
  const toggle = controls?.querySelector('[data-carousel-toggle]');
  const status = document.querySelector('[data-carousel-status]');
  if (track && section && previous && next && toggle && status && track.querySelector('.highlight-card')) {
    const cards = [...track.querySelectorAll('.highlight-card')];
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') || {matches:false};
    const autoDelay = 3000;
    const interactionDelay = 6000;
    let paused = reducedMotion.matches;
    let timer = null;
    let animation = 0;
    let dragging = false;
    let hovering = false;
    let togglePointerPaused = null;
    let visible = true;
    let scrollFrame = 0;
    let suspended = false;
    let visibilityObserved = false;
    const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const step = () => cards.length > 1
      ? cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left
      : track.clientWidth;
    function update() {
      const limit = maxScroll();
      previous.disabled = limit <= 2 || track.scrollLeft <= 2;
      next.disabled = limit <= 2 || track.scrollLeft >= limit - 2;
      // Reproduzir permanece disponível mesmo durante o carregamento do layout.
      toggle.textContent = paused ? 'Reproduzir' : 'Pausar';
      toggle.setAttribute('aria-label', paused ? 'Iniciar rolagem automática' : 'Pausar rolagem automática');
      status.setAttribute('aria-live', paused ? 'polite' : 'off');
      const distance = step();
      if (distance <= 0) return;
      const first = Math.min(cards.length, Math.round(track.scrollLeft / distance) + 1);
      const count = Math.max(1, Math.round(track.clientWidth / distance));
      status.textContent = `Destaques ${first}–${Math.min(cards.length, first + count - 1)} de ${cards.length}.`;
    }
    function stopAnimation() {
      cancelAnimationFrame(animation);
      animation = 0;
      track.classList.remove('is-animating');
    }
    function goTo(left) {
      stopAnimation();
      const target = Math.max(0, Math.min(maxScroll(), left));
      const from = track.scrollLeft;
      // O snap fica desligado durante os frames para não puxar a faixa de volta.
      track.classList.add('is-animating');
      if (reducedMotion.matches || Math.abs(target - from) < 1) {
        track.scrollLeft = target;
        stopAnimation();
        update();
        return;
      }
      let started = null;
      function draw(time) {
        if (started === null) started = time;
        const progress = Math.min(1, (time - started) / 550);
        const eased = 1 - Math.pow(1 - progress, 3);
        track.scrollLeft = from + (target - from) * eased;
        if (progress < 1) animation = requestAnimationFrame(draw);
        else {
          track.scrollLeft = target;
          stopAnimation();
          update();
        }
      }
      animation = requestAnimationFrame(draw);
    }
    function advance() {
      const distance = step();
      if (maxScroll() <= 2 || distance <= 0) return;
      goTo(track.scrollLeft >= maxScroll() - 2 ? 0 : track.scrollLeft + distance);
    }
    function onScreen() {
      const box = section.getBoundingClientRect();
      return box.bottom > 0 && box.top < window.innerHeight;
    }
    function schedule(delay = autoDelay) {
      clearTimeout(timer);
      timer = null;
      update();
      if (!visibilityObserved) visible = onScreen();
      if (paused || hovering || document.hidden || !visible || suspended || maxScroll() <= 2) return;
      timer = setTimeout(() => {
        timer = null;
        if (!document.hidden && !dragging && onScreen()) advance();
        // Reagenda mesmo se o layout ainda estiver carregando ou fora da tela.
        schedule();
      }, delay);
    }
    function pause() {
      paused = true;
      stopAnimation();
      schedule();
    }
    function play() {
      paused = false;
      dragging = false;
      advance();
      schedule();
    }
    function move(direction) {
      goTo(track.scrollLeft + direction * step());
      schedule(interactionDelay);
    }
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    // O foco pausa a rotação. Guarde a ação vista no botão antes do foco
    // causado por um clique, para que clicar em Pausar nunca inicie o movimento.
    toggle.addEventListener('pointerdown', event => { if (event.button===0) togglePointerPaused=paused; });
    toggle.addEventListener('pointercancel', () => { togglePointerPaused=null; });
    toggle.addEventListener('click', event => {
      const start = event.detail>0 && togglePointerPaused!==null ? togglePointerPaused : paused;
      togglePointerPaused=null;
      if (start) play(); else pause();
    });
    track.addEventListener('keydown', event => {
      if (event.target !== track || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        goTo(event.key === 'Home' ? 0 : maxScroll());
        schedule(interactionDelay);
      }
    });
    // Foco também pode vir de tecnologia assistiva, sem keydown anterior.
    // A reprodução só volta por comando explícito depois dessa pausa.
    track.addEventListener('focusin', pause);
    section.addEventListener('focusin', pause);
    section.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      hovering = true;
      stopAnimation();
      schedule();
    });
    section.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      hovering = false;
      schedule();
    });
    track.addEventListener('pointerdown', () => {
      dragging = true;
      stopAnimation();
      schedule(interactionDelay);
    }, {passive:true});
    function releasePointer() {
      if (!dragging) return;
      dragging = false;
      schedule(interactionDelay);
    }
    window.addEventListener('pointerup', releasePointer, {passive:true});
    window.addEventListener('pointercancel', releasePointer, {passive:true});
    track.addEventListener('wheel', () => {
      stopAnimation();
      schedule(interactionDelay);
    }, {passive:true});
    track.addEventListener('scroll', () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; update(); });
    }, {passive:true});
    document.addEventListener('visibilitychange', () => {
      stopAnimation();
      dragging = false;
      schedule();
    });
    window.addEventListener('blur', () => { dragging = false; });
    window.addEventListener('resize', () => { stopAnimation(); schedule(); });
    window.addEventListener('load', () => schedule());
    window.addEventListener('pagehide', () => { suspended = true; hovering = false; dragging = false; togglePointerPaused = null; clearTimeout(timer); timer = null; stopAnimation(); cancelAnimationFrame(scrollFrame); scrollFrame = 0; });
    window.addEventListener('pageshow', () => { suspended = false; schedule(); });
    if (typeof window.IntersectionObserver === 'function') {
      try {
        new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting);
          if (!visible) stopAnimation();
          schedule();
        }, {rootMargin:'0px'}).observe(section);
        visibilityObserved = true;
      } catch { /* A observação é opcional; a rolagem mantém a alternativa. */ }
    }
    if (!visibilityObserved) window.addEventListener('scroll', () => {
      const current = onScreen();
      if (current === visible) return;
      visible = current;
      if (!visible) stopAnimation();
      schedule();
    }, {passive:true});
    const motionChange = event => { if (event.matches) pause(); };
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', motionChange);
    else if (reducedMotion.addListener) reducedMotion.addListener(motionChange);
    if (typeof window.ResizeObserver === 'function') {
      try { new ResizeObserver(() => { if (!timer) schedule(); else update(); }).observe(track); }
      catch { /* Os eventos resize/load continuam atualizando o carrossel. */ }
    }
    controls.hidden = false;
    schedule();
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
