# PS5 Recon 13.60

Página de telemetria passiva + fork instrumentado do slopkit para mapear divergência FW 13.60.
Repro de GitHub Pages: `https://anarquiaTAB.github.io/ps5-recon-1360/`

## Estrutura

- `index.html` + `recon.js` — página de telemetria passiva (UA, GPU, canvas FP, capabilities, bench)
- `slop/` — fork instrumentado do slopkit (slopkit 9.00-12.00 adaptado: FW 13.60 aceito, beacons por estágio)
- `offsets/13.60.js` — placeholder = offsets validados de 12.00 (para medir onde 13.60 diverge)

## Protocolo de runs (navegador oculto do PS5)

Todos os eventos são POSTed ao webhook de coleta. Cada jbmark/erro também dispara beacon individual.

1. **IDLE / prova de carga** (sem armar):
   `https://anarquiaTAB.github.io/ps5-recon-1360/slop/poops.html?log=debug`

2. **Run A1 — userland + leaks, parada ANTES de tocar kernel** (offset placeholder → risco kernel ~0):
   `.../slop/poops.html?go=1&trigger=none&only=ps0_preflight,ps1_prepare&log=debug&stop=leaks`
   → beacons: `MODULE-BASES` (bases wk/lk/lc reais do 13.60), `WEBKIT-BASE-HC/VTABLE`, `STOP-LEAKS` ou erro.

3. **Run A2 — + find_worker (leitura kernel thread_list), para antes da escritura de stack**:
   `.../slop/poops.html?go=1&trigger=none&only=ps0_preflight,ps1_prepare&log=debug&stop=worker`
   → beacons: `PREP-WORKER-STACK`, `STOP-WORKER` (valida OFFSET_lk__thread_list no 13.60).

4. **Run A3 — prepare() completo (incl. ROP getpid via worker)**:
   `.../slop/poops.html?go=1&trigger=none&only=ps0_preflight,ps1_prepare&log=debug`
   → beacons: `PREP-GETPID-OK` = cadeja kernel-ROP funcional; divergencia = `PREP-CHAIN-DIDNT-RUN`/panic.

5. Stage-0+ (kernel ladder) só quando A3 passe (offsets kernel a adaptar).

Nota: latch one-shot — entre runs, `?clear=1` ou reboot. `?auto=1` limpa latch assumendo reboot.
