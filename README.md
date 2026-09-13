# PS5 Recon 13.60

Página de telemetria passiva para reconhecimento ao vivo via navegador do PS5 (GitHub Pages).

## Como usar

1. Abra no navegador do PS5: `https://anarquiaTAB.github.io/ps5-recon-1360/`
2. Deixe a página aberta — ela envia dados a cada ~10s
3. Acompanhe os dados no painel de coleta

## O que coleta (somente passivo, sem payloads)

- User-Agent / versão do firmware
- WebGL renderer/vendor (GPU)
- Canvas fingerprint
- Probes de capabilities (Worker, SAB, WASM, fetch, sendBeacon, IndexedDB…)
- Benchmark JS do engine (WebKit)
- Referer (como a página foi aberta: URL manual, user guide, media pkg…)

## Estrutura

- `index.html` — página
- `recon.js` — telemetria + beacon
- `cache.appcache` — manifest p/ AppCache do PS5
