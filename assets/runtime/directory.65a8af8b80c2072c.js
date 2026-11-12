'use strict';

// Busca e âncoras carregadas somente em Tratamentos e Dúvidas.
(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const unmodifiedClick = event => !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && (event.button===undefined || event.button===0);

  // Tratamentos: filtros mantêm todos os cartões no HTML para leitura sem JavaScript.
  // Busca local: sem requisições, armazenamento ou alteração do endereço da página.
  const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const terms = input => fold(input?.value?.slice(0,120)).trim().split(/\s+/).filter(Boolean);
  const matches = (text, words) => words.every(word => text.includes(word));
  const filters = $$('[data-filter]');
  const cards = $$('.treatment-card[data-category]');
  const treatmentSearch = $('#treatment-search');
  const treatmentQuery = $('#treatment-query');
  const treatmentClear = $('#treatment-clear');
  const treatmentText = new Map(cards.map(card => [card, fold(card.textContent)]));
  let activeFilter = filters.find(button => button.dataset.filter === 'all');
  function applyFilter(button) {
    if (!button) return;
    activeFilter = button;
    filters.forEach(filter => {
      const active = filter === button;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    let count = 0;
    const words = terms(treatmentQuery);
    cards.forEach(card => {
      const category = button.dataset.filter === 'all' || (card.dataset.category || '').split(' ').includes(button.dataset.filter);
      const show = category && matches(treatmentText.get(card), words);
      card.hidden = !show;
      if (show) count++;
    });
    const status = $('#filter-status');
    if (status) status.textContent = `${count} de ${cards.length} ${count === 1 ? 'cuidado exibido' : 'cuidados exibidos'}.`;
    const empty = $('#treatment-empty');
    if (empty) empty.hidden = count !== 0;
    if (treatmentClear) treatmentClear.disabled = !treatmentQuery?.value;
  }
  filters.forEach(button => button.addEventListener('click', () => applyFilter(button)));
  function resetTreatments() {
    if (treatmentQuery) treatmentQuery.value = '';
    applyFilter(filters.find(button => button.dataset.filter === 'all'));
  }
  if (cards.length && activeFilter) {
    const filterGroup = $('[data-treatment-filters]');
    if (filterGroup) filterGroup.hidden = false;
    if (treatmentSearch && treatmentQuery) {
      treatmentQuery.addEventListener('input', () => applyFilter(activeFilter));
      treatmentSearch.addEventListener('submit', event => { event.preventDefault(); applyFilter(activeFilter); });
      treatmentClear?.addEventListener('click', () => { treatmentQuery.value = ''; applyFilter(activeFilter); treatmentQuery.focus(); });
      $('#treatment-reset')?.addEventListener('click', () => { resetTreatments(); treatmentQuery.focus(); });
      treatmentSearch.hidden = false;
      applyFilter(activeFilter);
    }
  }

  const faqItems = $$('[data-faq-item]');
  const faqFilters = $$('[data-faq-filter]');
  const faqSearch = $('#faq-search');
  const faqQuery = $('#faq-query');
  const faqClear = $('#faq-clear');
  const faqActions = $('#faq-actions');
  const faqExpand = $('#faq-expand');
  const faqCollapse = $('#faq-collapse');
  const faqText = new Map(faqItems.map(item => [item, fold(`${item.querySelector('summary')?.textContent || ''} ${item.querySelector('.faq-answer')?.textContent || ''}`)]));
  let activeFaqFilter = faqFilters.find(button => button.dataset.faqFilter === '');
  function syncFaqActions() {
    const visible = faqItems.filter(item => !item.hidden);
    if (faqExpand) faqExpand.disabled = !visible.some(item => !item.open);
    if (faqCollapse) faqCollapse.disabled = !visible.some(item => item.open);
  }
  function setVisibleAnswers(open) {
    faqItems.forEach(item => { if (!item.hidden) item.open = open; });
    syncFaqActions();
  }
  function applyFaq(button = activeFaqFilter) {
    if (!button) return;
    activeFaqFilter = button;
    faqFilters.forEach(filter => {
      const selected = filter === button;
      filter.classList.toggle('active', selected);
      filter.setAttribute('aria-pressed', String(selected));
    });
    const words = terms(faqQuery);
    let count = 0;
    faqItems.forEach(item => {
      const category = !button.dataset.faqFilter || item.dataset.faqCategory === button.dataset.faqFilter;
      item.hidden = !(category && matches(faqText.get(item), words));
      if (!item.hidden) count++;
    });
    const status = $('#faq-status');
    if (status) status.textContent = `${count} de ${faqItems.length} ${count === 1 ? 'pergunta exibida' : 'perguntas exibidas'}.`;
    const empty = $('#faq-empty');
    if (empty) empty.hidden = count !== 0;
    if (faqClear) faqClear.disabled = !faqQuery?.value;
    syncFaqActions();
  }
  function resetFaq() {
    if (faqQuery) faqQuery.value = '';
    applyFaq(faqFilters.find(button => button.dataset.faqFilter === ''));
  }
  if (faqItems.length && activeFaqFilter && faqSearch && faqQuery) {
    faqFilters.forEach(button => button.addEventListener('click', () => applyFaq(button)));
    faqQuery.addEventListener('input', () => applyFaq());
    faqSearch.addEventListener('submit', event => { event.preventDefault(); applyFaq(); });
    faqClear?.addEventListener('click', () => { faqQuery.value = ''; applyFaq(); faqQuery.focus(); });
    $('#faq-reset')?.addEventListener('click', () => { resetFaq(); faqQuery.focus(); });
    const filterGroup = $('[data-faq-filters]');
    if (filterGroup) filterGroup.hidden = false;
    faqSearch.hidden = false;
    if (faqActions && faqExpand && faqCollapse) {
      faqExpand.addEventListener('click', () => setVisibleAnswers(true));
      faqCollapse.addEventListener('click', () => setVisibleAnswers(false));
      faqItems.forEach(item => item.addEventListener('toggle', syncFaqActions));
      faqActions.hidden = false;
    }
    applyFaq();
  }
  function revealHash(focus = false) {
    let id;
    try { id = decodeURIComponent(window.location.hash?.slice(1) || ''); } catch { return; }
    const target = id && document.getElementById(id);
    const all = filters.find(button => button.dataset.filter === 'all');
    if (target && cards.includes(target) && target.hidden && all) {
      resetTreatments();
      target.scrollIntoView?.({block:'start',behavior:'auto'});
    }
    if (target && faqItems.includes(target)) {
      if (target.hidden) resetFaq();
      target.open = true;
      syncFaqActions();
      target.scrollIntoView?.({block:'start',behavior:'auto'});
      if (focus) target.querySelector('summary')?.focus({preventScroll:true});
    }
  }
  window.addEventListener('hashchange', () => revealHash(true));
  window.addEventListener('pageshow', event => {
    if (treatmentSearch && treatmentQuery) applyFilter(activeFilter);
    if (faqSearch && faqQuery) applyFaq();
    // O histórico já restaurou posição, filtros e respostas abertas.
    if (!event.persisted) revealHash();
  });
  $$('.faq-permalink').forEach(link => link.addEventListener('click', event => {
    // O hash pode já estar no endereço: nesse caso não haverá hashchange.
    if (unmodifiedClick(event) && link.getAttribute('href') === window.location.hash) revealHash(true);
  }));
  revealHash();

})();
