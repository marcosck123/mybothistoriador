# Automação da pesquisa

O script controla a interface do post Devvit em segundo plano, localiza automaticamente o post do `mybothistoriador` no subreddit de teste e salva apenas os resultados que o bot exibir.

Na primeira execução em modo visível, faça login no Reddit para criar o perfil persistente:

```bash
npx playwright install chromium
node automation/search.mjs --headed --bot-subreddit mybothistoriador_dev --term "relato sobrenatural"
```

O script usa o navegador visível por padrão, porque o Reddit pode bloquear a renderização em modo headless. Use `--headless` apenas quando o ambiente já permitir esse modo.

Por padrão, o script usa o Chromium instalado pelo Playwright em um perfil separado, evitando conflitos com o Chrome do sistema/WSL. Se precisar usar outro navegador, defina `BROWSER_PATH`.

Uso normal:

```bash
npm run search -- --bot-subreddit mybothistoriador_dev --term "relato sobrenatural" --subreddit historias --output historias.json
```

O arquivo `.automation-profile/` guarda a sessão local e nunca deve ser publicado. O script não cria dados fictícios e não usa a API externa; ele lê somente os cards retornados pela UI do Devvit.
