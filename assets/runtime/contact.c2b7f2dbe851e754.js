'use strict';
(() => {
  const button = document.getElementById('copy-address');
  const text = document.getElementById('address-copy-text');
  const fallback = document.getElementById('address-copy-fallback');
  const status = document.getElementById('address-copy-status');
  if (!button || !text || !fallback || !status || !text.value.trim()) return;
  button.hidden = false;
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    status.textContent = '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text.value.trim());
      fallback.hidden = true;
      status.textContent = 'Endereço copiado. Cole no aplicativo de sua preferência.';
    } catch {
      fallback.hidden = false;
      text.focus();
      text.select();
      status.textContent = 'O endereço está selecionado. Use a opção Copiar do seu dispositivo.';
    } finally { button.disabled = false; }
  });
})();
