# WPPConnect Server — Fix Pack para AchadinhosBot

Pacote de correção para resolver o problema de **sessões zumbis acumulando**
e **bottleneck a partir de 5 usuários simultâneos**.

## O que mudou e por quê

| Arquivo | Mudança | Impacto |
|---|---|---|
| `config.ts` | `customUserDataDir` → `/tmp/userDataDir/` | tmpfs (RAM), limpa em restart, sem acúmulo de GBs no disco |
| `config.ts` | 9 webhook listeners → `false` | -30 a -40% de RAM por sessão (não usamos webhook) |
| `config.ts` | +6 flags Puppeteer anti-leak | Reduz processos filhos vazados do Chromium |
| `Dockerfile` | Boot script limpa `tokens/*.data.json` + `userDataDir/*` | Mata sessões zumbis no startup |
| `Dockerfile` | Chromium do SO (apt) em vez do baixado pelo Puppeteer | Mais estável em containers |
| `railway.toml` | `restartPolicy = ON_FAILURE` + healthcheck | Auto-recupera de crashes |
| `railway.toml` | `NODE_OPTIONS=--max-old-space-size=1536` | Evita OOM kill silencioso |

## Decisão deliberada: NÃO usamos `--single-process`

Foi considerado e **rejeitado**. Em produção, qualquer crash de aba do
Chromium derruba o servidor inteiro. Os outros flags resolvem o vazamento
sem esse risco.

## Como aplicar

1. No seu fork do wppconnect-server (no Railway):
   - Substituir `src/config.ts` pelo arquivo daqui
   - Substituir `Dockerfile` pelo daqui
   - Adicionar `railway.toml` na raiz (se não existir)
2. Commit e push — Railway redeploya automático
3. Após deploy, validar:
   ```bash
   curl https://SEU-WPP.railway.app/healthz
   curl -H "Authorization: Bearer SECRET_KEY" \
        https://SEU-WPP.railway.app/api/SECRET_KEY/show-all-sessions
   ```
   A lista de sessões deve estar **vazia** após o restart (boot script limpa).

## Resultado esperado

- Capacidade aumenta de ~5 para ~20+ usuários simultâneos
- QR code volta a gerar consistentemente em < 5s
- Sessões mortas não acumulam mais entre restarts
- Restart automático se algo travar (ON_FAILURE)
