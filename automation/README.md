# Automação da pesquisa

O script controla a interface do post Devvit em segundo plano, localiza automaticamente o post do `mybothistoriador` no subreddit de teste e salva apenas os resultados que o bot exibir.

Na primeira execução em modo visível, faça login no Reddit para criar o perfil persistente:

```bash
npx playwright install chromium
node automation/search.mjs --headed --bot-subreddit mybothistoriador_dev --term "relato sobrenatural"
```

O script atual usa modo invisível. Para autenticar, altere temporariamente `headless: true` para `headless: false` em `automation/search.mjs`, execute uma vez e restaure depois.

O script usa o Chrome normal em `/usr/bin/google-chrome`, evitando o bloqueio do Google ao Chrome for Testing. Se o Chrome estiver em outro local, defina `BROWSER_PATH`.

Uso normal:

```bash
npm run search -- --bot-subreddit mybothistoriador_dev --term "relato sobrenatural" --subreddit historias --output historias.json
```

O arquivo `.automation-profile/` guarda a sessão local e nunca deve ser publicado. O script não cria dados fictícios e não usa a API externa; ele lê somente os cards retornados pela UI do Devvit.
