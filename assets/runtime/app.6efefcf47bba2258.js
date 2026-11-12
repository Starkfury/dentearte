'use strict';
// Lógica do contato separada da interface: funciona no navegador e na validação local.
(function (scope, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.AuraBooking = api;
})(globalThis, function () {
  function emailUri(email) { return encodeURIComponent(email).replace(/%40/g, '@'); }
  function prepare(config, interest, period, purpose = 'avaliacao', customMessage) {
    config = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
    const text = (value, fallback = '', limit = 180) => typeof value === 'string' ? value.replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit) || fallback : fallback;
    config = {...config, name:text(config.name,'DenteArte'), emailSubject:text(config.emailSubject,'',200)};
    interest = text(interest,'Avaliação inicial');
    period = text(period);
    const preference = period ? (period === 'Sem preferência' ? 'Não tenho preferência de período.' : `Preferência de atendimento: ${period}.`) : ''; 
    let message, subject;
    if (purpose === 'duvida') {
      message = `Olá, conheci a ${config.name} pelo site e gostaria de tirar uma dúvida com o atendimento. Assunto: ${interest}. Poderiam me orientar?`;
      subject = `Dúvida — ${config.name}`;
    } else if (purpose === 'reagendamento') {
      message = `Olá, gostaria de solicitar o reagendamento de uma consulta na ${config.name}.${preference ? ` ${preference}` : ''} Poderiam me orientar sobre a alteração e a nova disponibilidade? Aguardo a confirmação do atendimento.`;
      subject = `Reagendamento — ${config.name}`;
    } else {
      message = `Olá, conheci a ${config.name} pelo site e gostaria de informações para agendar uma avaliação. Tenho interesse em: ${interest}.${preference ? ` ${preference}` : ""} Poderiam me orientar sobre disponibilidade e atendimento?`;
      subject = config.emailSubject || `Agendamento — ${config.name}`;
    }
    // O texto personalizado permanece apenas no formulário e nos links escolhidos.
    if (typeof customMessage === 'string') {
      message = customMessage.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, 2000).replace(/[\uD800-\uDBFF]$/, '').replace(/[\uD800-\uDFFF]/gu, '\uFFFD');
      if (!message.trim()) return {message, channels: []};
    }
    const channels = [];
    if (/^[1-9]\d{9,14}$/.test(config.whatsapp || '')) channels.push({
      key:'whatsapp', label:'Continuar no WhatsApp', external:true,
      href:`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`
    });
    if (typeof config.email === 'string' && config.email.length <= 254 && /^[^\s@<>\u0000-\u001f\u007f]+@[^\s@<>\u0000-\u001f\u007f]+\.[^\s@<>\u0000-\u001f\u007f]+$/.test(config.email)) channels.push({
      key:'email', label:'Continuar por e-mail', external:false,
      href:`mailto:${emailUri(config.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
    });
    if (/^\+?[1-9]\d{9,14}$/.test(config.phone || '')) channels.push({
      key:'phone', label:'Ligar para o consultório', external:false, href:`tel:${config.phone}`
    });
    return {message, channels};
  }
  return {prepare};
});

;
'use strict';

(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  // Uma configuração de contato inválida não deve interromper menu, filtros e artigos.
  let config = {};
  try {
    const parsed = JSON.parse($('#site-data')?.textContent || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) config = parsed;
  } catch { /* Os canais estáticos de Contato continuam disponíveis. */ }
  const menuButton = $('.menu-toggle');
  const navigation = $('#main-nav');
  const contactHref = $('[data-book]')?.getAttribute('href') || 'contato.html';
  const unmodifiedClick = event => !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && (event.button===undefined || event.button===0);

  function closeMenu(returnFocus = false) {
    if (!menuButton || !navigation) return;
    const wasOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
    navigation.classList.remove('is-open');
    if (returnFocus && wasOpen) menuButton.focus();
  }

  if (menuButton && navigation) {
    document.documentElement.classList.add('menu-ready');
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      navigation.classList.toggle('is-open', open);
    });
  }
  navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', event => {
    if (unmodifiedClick(event)) closeMenu();
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.header')) closeMenu();
  });
  document.addEventListener('focusin', event => {
    if (!event.target.closest('.header')) closeMenu();
  });
  const desktop = window.matchMedia?.('(min-width: 1181px)');
  const desktopChange = event => {
    if (event.matches) closeMenu();
  };
  if (desktop?.addEventListener) desktop.addEventListener('change', desktopChange);
  else desktop?.addListener?.(desktopChange);

  // Diálogos nativos: navegação por teclado, Escape e retorno ao botão de origem.
  const dialogTriggers = new WeakMap();
  const silentClosures = new WeakSet();
  function openDialog(dialog, trigger) {
    if (!dialog || typeof dialog.showModal !== 'function') return false;
    if (dialog.open) return true;
    closeMenu();
    try { dialog.showModal(); } catch { return false; }
    $$('.da-video').forEach(video => { if (!video.paused) video.pause(); });
    dialogTriggers.set(dialog, trigger);
    document.body.classList.add('no-scroll');
    return true;
  }
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => {
      const silent = silentClosures.delete(dialog);
      // close é enfileirado pelo navegador; um diálogo pode ter sido reaberto.
      if (dialog.open) return;
      if (!$('dialog[open]')) document.body.classList.remove('no-scroll');
      if (!silent) {
        const trigger = dialogTriggers.get(dialog);
        // O botão de origem pode ficar oculto após mudar a largura da tela.
        if (trigger?.getClientRects && !trigger.getClientRects().length) {
          const fallback = [menuButton, $('#conteudo')].find(node => node?.getClientRects?.().length);
          fallback?.focus();
        }
        else trigger?.focus();
      }
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
  });
  $$('[data-close]').forEach(button => button.addEventListener('click', () => {
    document.getElementById(button.dataset.close)?.close?.();
  }));
  function dialogLink(event,dialog) {
    if (unmodifiedClick(event) && openDialog(dialog,event.currentTarget)) event.preventDefault();
  }
  $('#privacy-open')?.addEventListener('click', event => dialogLink(event,$('#privacy-dialog')));

  $$('[data-article]').forEach(button => button.addEventListener('click', event => {
    dialogLink(event,document.getElementById(button.dataset.article));
  }));

  const bookingDialog = $('#booking-dialog');
  const form = $('#booking-form');
  const result = $('#booking-result');
  const message = $('#message');
  const channels = $('#booking-channels');
  const status = $('#copy-status');
  const interest = $('#interest');
  const period = $('#period');
  const purpose = $('#purpose');
  const copyMessage = $('#copy-message');
  const messageCount = $('#message-count');
  function updateMessageCount() {
    if (messageCount) messageCount.textContent = `${message?.value.length || 0} de 2.000 caracteres`;
  }
  const purposeValue = () => ['duvida','reagendamento'].includes(purpose?.value) ? purpose.value : 'avaliacao';
  function updateContactFields() {
    const reason = purposeValue();
    const interestField = $('#booking-interest-field');
    const periodField = $('#booking-period-field');
    if (interestField) interestField.hidden = reason === 'reagendamento';
    if (periodField) periodField.hidden = reason === 'duvida';
    if (interest) interest.disabled = reason === 'reagendamento';
    if (period) period.disabled = reason === 'duvida';
  }
  purpose?.addEventListener('change', updateContactFields);
  let bookingSession = 0;
  let copyAttempt = 0;
  bookingDialog?.addEventListener('close', () => { if (!bookingDialog.open) { bookingSession++; copyAttempt++; } });
  function contactFallback() {
    status.textContent = 'Não foi possível preparar a mensagem. Use os contatos da página Contato.';
    message.value = '';
    updateMessageCount();
    if (copyMessage) copyMessage.disabled = true;
    form.hidden = true;
    result.hidden = false;
    channels.replaceChildren();
    const fallback = document.createElement('a');
    fallback.href = contactHref;
    fallback.className = 'button button-blue';
    fallback.textContent = 'Ver canais de contato';
    channels.append(fallback);
    fallback.focus();
  }

  $$('[data-book]').forEach(button => button.addEventListener('click', event => {
    // Mantém Ctrl/Cmd/clique alternativo e a abertura nativa em nova aba.
    if (!unmodifiedClick(event)) return;
    event.preventDefault();
    if (!bookingDialog || !form || !result || !status || !interest || !channels || !message) {
      window.location.href = contactHref;
      return;
    }
    bookingSession++;
    copyAttempt++;
    form.reset();
    message.value = '';
    updateMessageCount();
    if (copyMessage) copyMessage.disabled = false;
    form.hidden = false;
    result.hidden = true;
    status.textContent = '';
    if (purpose) purpose.value = ['duvida','reagendamento'].includes(button.dataset.purpose) ? button.dataset.purpose : 'avaliacao';
    interest.value = button.dataset.interest || (purposeValue() === 'duvida' ? 'Informações sobre atendimento' : 'Avaliação inicial');
    if (interest.selectedIndex < 0) interest.selectedIndex = 0;
    updateContactFields();
    channels.replaceChildren();
    if (!openDialog(bookingDialog, button)) window.location.href = contactHref;
    else (purpose || interest).focus();
  }));

  function prepareContact(customMessage) {
      if (typeof window.AuraBooking?.prepare !== 'function') throw new Error('Contact unavailable');
      const prepared = window.AuraBooking.prepare(config, interest.value, period?.value, purposeValue(), customMessage);
      if (typeof prepared?.message !== 'string' || !Array.isArray(prepared.channels)) throw new Error('Invalid contact result');
      if (prepared.channels.some(channel => !channel || typeof channel.label !== 'string' || typeof channel.href !== 'string' || !/^(?:https:\/\/wa\.me\/[1-9]\d{9,14}\?text=|mailto:|tel:\+?[1-9]\d{9,14}$)/.test(channel.href))) throw new Error('Invalid contact channel');
      return prepared;
  }
  function renderContactChannels(prepared) {
    channels.replaceChildren();
    prepared.channels.forEach((channel, index) => {
      const link = document.createElement('a');
      link.className = `button ${index === 0 ? 'button-blue' : 'button-outline'}`;
      link.textContent = channel.label;
      link.href = channel.href;
      if (channel.external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      channels.append(link);
    });
    if (copyMessage) copyMessage.disabled = !prepared.message.trim();
  }
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!message || !result || !channels || !status || !interest) return;
    copyAttempt++;
    let prepared;
    try { prepared = prepareContact(); } catch { contactFallback(); return; }
    message.value = prepared.message;
    updateMessageCount();
    form.hidden = true;
    result.hidden = false;
    renderContactChannels(prepared);
    status.textContent = prepared.channels.length
      ? 'Confira o texto e escolha um canal. O envio ou a ligação depende de sua ação no aplicativo; aguarde a confirmação do consultório.'
      : 'Mensagem preparada. O canal de envio ainda não está disponível; nenhum pedido foi enviado.';
    message.focus();
  });
  message?.addEventListener('input', () => {
    if (!bookingDialog?.open || !result || result.hidden || !channels || !status || !interest) return;
    copyAttempt++;
    let prepared;
    try { prepared = prepareContact(message.value); } catch { contactFallback(); return; }
    // Mantém cursor e seleção durante a digitação; normaliza apenas quando necessário.
    if (message.value !== prepared.message) message.value = prepared.message;
    updateMessageCount();
    renderContactChannels(prepared);
    status.textContent = !prepared.message.trim()
      ? 'Escreva uma mensagem para escolher um canal de contato.'
      : prepared.channels.length ? '' : 'O canal de envio ainda não está disponível. Use os contatos da página Contato.';
  });
  $('#edit-message')?.addEventListener('click', () => {
    if (!result || !form || !interest) return;
    copyAttempt++;
    if (status) status.textContent = '';
    result.hidden = true;
    form.hidden = false;
    (purpose || interest).focus();
  });
  copyMessage?.addEventListener('click', async () => {
    if (!message || !status) return;
    if (!message.value.trim()) return;
    const text = message.value;
    const session = bookingSession;
    const attempt = ++copyAttempt;
    const current = () => session === bookingSession && attempt === copyAttempt && bookingDialog?.open;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if (!current()) return;
      status.textContent = 'Mensagem copiada. Nenhuma mensagem foi enviada pelo site.';
    } catch {
      if (!current()) return;
      message.focus();
      message.select();
      status.textContent = 'O navegador não permitiu copiar automaticamente. O texto está selecionado: use a opção Copiar do seu dispositivo.';
    }
  });
  window.addEventListener('pagehide', () => {
    closeMenu();
    $$('dialog').forEach(dialog => { if (dialog.open) { silentClosures.add(dialog); dialog.close?.(); } });
    document.body.classList.remove('no-scroll');
  });
  if ($('#year')) $('#year').textContent = new Date().getFullYear();
})();
