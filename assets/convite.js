const VALID_CODE = /^[A-Z0-9]{5}$/;

export function roomInvite(code, track, href = location.href) {
  code = code.trim().toUpperCase();
  if (!VALID_CODE.test(code)) throw new Error('Código de sala inválido');
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  if (track === 'cidreira') url.searchParams.set('pista', 'cidreira');
  url.searchParams.set('sala', code);
  return {
    title: 'Vermes Kart',
    text: `Bora correr no Vermes Kart? Sala ${code} · Pista: ${track === 'cidreira' ? 'Cidreira' : 'Gravataí'}.`,
    url: url.href,
  };
}

export function setupRoomSharing({ getTrack, join }) {
  const button = document.getElementById('compartilhar-sala');
  const status = document.getElementById('compartilhar-status');
  const fallback = document.getElementById('convite-manual');
  const input = document.getElementById('convite-texto');
  button.addEventListener('click', async () => {
    const code = document.getElementById('sala-codigo').textContent.trim();
    if (!VALID_CODE.test(code)) return;
    const invite = roomInvite(code, getTrack());
    status.textContent = '';
    fallback.hidden = true;
    button.disabled = true;
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(invite))) {
        try {
          await navigator.share(invite);
          status.textContent = 'Compartilhamento aberto.';
          return;
        } catch (error) {
          if (error.name === 'AbortError') return;
        }
      }
      const text = `${invite.text}\n${invite.url}`;
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = 'Convite com código e link copiado! Cola no grupo pra chamar a galera.';
      } catch {
        input.value = text;
        fallback.hidden = false;
        input.focus();
        input.select();
        status.textContent = 'Copia o convite abaixo e manda pra galera.';
      }
    } finally {
      button.disabled = false;
    }
  });

  // A new room must never display a stale invitation from the previous one.
  new MutationObserver(() => {
    fallback.hidden = true;
    input.value = '';
    status.textContent = '';
  }).observe(document.getElementById('sala-codigo'), { childList: true, characterData: true, subtree: true });

  const url = new URL(location.href);
  if (!url.searchParams.has('sala')) return;
  const code = url.searchParams.get('sala').trim().toUpperCase();
  url.searchParams.delete('sala');
  history.replaceState(history.state, '', url.href);
  if (VALID_CODE.test(code)) setTimeout(() => join(code), 0);
  else document.getElementById('modo-erro').textContent = 'Convite inválido. Pede o código de 5 letras ou números pra quem criou a sala.';
}
