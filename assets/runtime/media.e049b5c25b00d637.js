'use strict';
(() => {
  const videos = [...document.querySelectorAll('.da-video')];
  const attempts = new WeakMap();
  const invalidate = video => { const attempt = (attempts.get(video) || 0) + 1; attempts.set(video, attempt); return attempt; };
  const pauseAll = () => {
    for (const video of videos) { invalidate(video); video.pause(); }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); });
  window.addEventListener('pagehide', pauseAll);
  const statusFor = video => document.getElementById(`${video.id}-status`);
  const errorMessage = video => {
    const status = statusFor(video);
    if (status) {
      status.hidden = false;
      status.textContent = 'Não foi possível iniciar o vídeo. Tente novamente nos controles ou use “Baixar vídeo”.';
    }
  };
  const clearMessage = video => {
    const status = statusFor(video);
    if (status) { status.textContent = ''; status.hidden = true; }
  };
  const play = video => {
    const attempt = invalidate(video);
    const failed = error => {
      if (error?.name === 'AbortError' || document.hidden || attempts.get(video) !== attempt) return;
      errorMessage(video);
      video.focus();
    };
    try {
      if (video.error) video.load();
      Promise.resolve(video.play()).catch(failed);
    } catch (error) { failed(error); }
  };
  for (const video of videos) {
    const shell = video.closest('.da-media-shell');
    const button = shell?.querySelector('.da-media-play');
    if (!shell || !button) continue;
    const sync = () => {
      const playing = !video.paused && !video.ended;
      button.hidden = playing;
      if (playing) shell.dataset.playing = '';
      else delete shell.dataset.playing;
    };
    sync();
    button.addEventListener('click', () => play(video));
    video.addEventListener('play', () => {
      if (document.hidden) { video.pause(); return; }
      sync();
      clearMessage(video);
      for (const other of videos) if (other !== video && !other.paused) other.pause();
      if (document.activeElement === button) video.focus();
    });
    for (const event of ['pause', 'ended']) video.addEventListener(event, sync);
    video.addEventListener('pause', () => invalidate(video));
    video.addEventListener('error', () => { sync(); errorMessage(video); });
    for (const source of video.querySelectorAll('source')) source.addEventListener('error', () => errorMessage(video));
  }
  for (const link of document.querySelectorAll('[data-play-media]')) {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || (event.button !== undefined && event.button !== 0)) return;
      const video = document.getElementById(link.dataset.playMedia);
      if (!videos.includes(video)) return;
      event.preventDefault();
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      video.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'center'});
      video.focus({preventScroll: true});
      play(video);
    });
  }
})();
