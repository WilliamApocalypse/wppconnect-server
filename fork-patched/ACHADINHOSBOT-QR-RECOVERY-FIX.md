# WPPConnect Server — patch AchadinhosBot v3.13.25

## Causa raiz dos usuários que ficavam sem QR (rutero, drimoura, karynalima33)

Após análise dos endpoints `close-session`, `logout-session` e `clear-session-data`
do fork rodando no Railway, identifiquei **3 bugs encadeados** que impediam a
recuperação automática de sessões wedged:

### 1. `clear-session-data` NUNCA apagava o token do disco (bug crítico)
`src/controller/miscController.ts` original:
```ts
const pathToken = __dirname + `../../../tokens/${session}.data.json`;
```
Concatenação de string sem separador → gera caminho inválido tipo
`/app/dist/controller../../../tokens/user_XXXX.data.json`.
`fs.existsSync()` retorna `false`, o token **nunca** é removido, e o próximo
`start-session` recarrega o mesmo token corrompido → wedge em `INITIALIZING` →
`catchQR` nunca dispara → QR nunca renderiza.

Mesmo bug em `logOutSession` (`sessionController.ts`).

O caminho correto usado pelo `FileTokenStore` do WPPConnect é:
```ts
path.resolve(process.cwd(), 'tokens', `${session}.data.json`)  // ex: /app/tokens/user_XXXX.data.json
```

### 2. `client.logout()` / `client.close()` sem timeout
Quando o Chromium está wedged, essas chamadas ficam penduradas para sempre.
Resultado: o endpoint inteiro (`clear-session-data`, `logout-session`, `close-session`)
trava até o proxy do Railway matar a conexão (~5 min). Nesse meio-tempo o
AchadinhosBot fica em loop de retry.

Fix: envolver todas as chamadas em `Promise.race([..., setTimeout(8000)])`.

### 3. Janela de detecção de INITIALIZING travado longa demais
Em `createSessionUtil.ts` a heurística disparava só depois de **120s**.
Como o `CREATE_TIMEOUT` interno é de 90s, na prática essa branch quase nunca
rodava — e quando rodava, além de não apagar o token corrompido do disco,
chamava `client.close()` sem timeout, wedgando o próximo `start-session`.

Fix: janela reduzida para **60s** + `close()` com timeout + limpeza do
`tokens/*.data.json` e do `userDataDir/`.

---

## Arquivos alterados

- `src/controller/miscController.ts` — `clearSessionData` corrigido
- `src/controller/sessionController.ts` — `closeSession` + `logOutSession` corrigidos
- `src/util/createSessionUtil.ts` — janela 60s + `close()` com timeout + limpeza token/userDataDir

Todos os patches marcados com o comentário `AchadinhosBot patch:`.

## Como aplicar no Railway

1. Extrair o zip por cima do repositório atual do fork.
2. `npm install --legacy-peer-deps && npm run build`
3. Deploy Railway padrão.

Depois disso: `clear-session-data` de fato apaga o token, `close-session` e
`logout-session` não travam mais quando o Chromium morre, e sessões
wedged em `INITIALIZING` são recuperadas automaticamente em ≤60s pelo próprio
servidor, sem depender do AchadinhosBot chamar.
