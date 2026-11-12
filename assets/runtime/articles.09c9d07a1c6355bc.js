'use strict';
// Busca somente no catálogo já presente no HTML, sem rede ou armazenamento.
(() => {
  const $ = selector => document.querySelector(selector);
  const form = $('#article-search');
  const query = $('#article-query');
  const clear = $('#article-clear');
  const reset = $('#article-reset');
  const status = $('#article-status');
  const empty = $('#article-empty');
  const results = $('#article-results');
  if (![form,query,clear,reset,status,empty,results].every(Boolean)) return;
  const cards = [...results.querySelectorAll('.article-directory-card')];
  if (!cards.length) return;
  const filterGroup = $('#article-filters');
  const filters = [...(filterGroup?.querySelectorAll('[data-article-filter]') || [])];
  const canFilter = new Set(cards.map(card => card.dataset.articleCategory)).size > 1
    && filters.some(button => button.dataset.articleFilter === '');
  let category = '';
  const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const text = new Map(cards.map(card => [card, fold(card.textContent)]));
  function apply() {
    const words = fold(query.value.slice(0,120)).trim().split(/\s+/).filter(Boolean);
    let count = 0;
    cards.forEach(card => {
      const inCategory = !category || card.dataset.articleCategory === category;
      card.hidden = !(inCategory && words.every(word => text.get(card).includes(word)));
      if (!card.hidden) count++;
    });
    if (canFilter) filters.forEach(button => {
      const active = button.dataset.articleFilter === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    empty.hidden = count !== 0;
    clear.disabled = !query.value;
    status.textContent = `Exibindo ${count} de ${cards.length} ${cards.length === 1 ? 'artigo' : 'artigos'}.` + (category ? ` Assunto: ${category}.` : '');
  }
  function clearSearch() {
    query.value = '';
    apply();
    query.focus();
  }
  query.addEventListener('input', apply);
  form.addEventListener('submit', event => { event.preventDefault(); apply(); });
  clear.addEventListener('click', clearSearch);
  reset.addEventListener('click', () => { category = ''; clearSearch(); });
  if (canFilter) {
    filters.forEach(button => button.addEventListener('click', () => {
      category = button.dataset.articleFilter;
      apply();
    }));
    filterGroup.hidden = false;
  }
  // Reaplica o campo restaurado pelo navegador sem alterar foco ou rolagem.
  window.addEventListener('pageshow', apply);
  apply();
  form.hidden = false;
  status.hidden = false;
})();
