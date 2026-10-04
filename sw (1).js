/* Te Engrena: guarda o app no celular para funcionar sem internet.
   Ao publicar uma versão nova do index.html, aumente o número abaixo. */
const VERSAO = "te-engrena-v4";
const ARQUIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function comPrazo(promessa, ms) {
  return new Promise((ok, erro) => {
    const t = setTimeout(() => erro(new Error("prazo")), ms);
    promessa.then((r) => { clearTimeout(t); ok(r); }, (x) => { clearTimeout(t); erro(x); });
  });
}

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);

  // Página do app: tenta a versão mais nova (3 s); sem sinal, abre a guardada.
  if (r.mode === "navigate") {
    e.respondWith(
      comPrazo(fetch(r), 3000)
        .then((res) => { const cp = res.clone(); caches.open(VERSAO).then((c) => c.put("./index.html", cp)); return res; })
        .catch(() => caches.match("./index.html").then((x) => x || caches.match("./")))
    );
    return;
  }

  // Ícones, arquivos do app e fontes: usa o que estiver guardado, senão baixa e guarda.
  const fonte = u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com";
  if (u.origin === self.location.origin || fonte) {
    e.respondWith(
      caches.match(r).then((x) => x || fetch(r).then((res) => {
        if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(VERSAO).then((c) => c.put(r, cp)); }
        return res;
      }))
    );
  }
});
