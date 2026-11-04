// Serve o site e a rota /api/turn, que gera credenciais TURN temporárias
// (Cloudflare Realtime) pro online funcionar entre redes diferentes.
// A chave fica nos segredos do projeto Pages: TURN_KEY_ID e TURN_KEY_API_TOKEN.
const RESERVA = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/turn") return turn(request, url, env);
    return env.ASSETS.fetch(request);
  },
};

async function turn(request, url, env) {
  // Só entrega credencial pra página do próprio jogo.
  const origem = request.headers.get("Origin") || request.headers.get("Referer") || "";
  if (origem && new URL(origem).host !== url.host) return json({ iceServers: RESERVA }, 403);
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return json({ iceServers: RESERVA, erro: "sem chave" });

  const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ttl: 86400 }),
  });
  if (!r.ok) return json({ iceServers: RESERVA, erro: r.status });

  const dados = await r.json();
  // A porta 53 é bloqueada pelos navegadores e só atrasa a conexão.
  const iceServers = dados.iceServers.map(s => ({ ...s, urls: [].concat(s.urls).filter(u => !/:53(\?|$)/.test(u)) }));
  return json({ iceServers });
}

function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
