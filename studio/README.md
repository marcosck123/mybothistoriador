# Historiador Studio

Interface externa e isolada para visualizar a montagem de vídeos verticais.

## Abrir

Na raiz do projeto:

```bash
python3 -m http.server 8090 --directory studio
```

Depois abra `http://localhost:8090`.

## Usar

1. Selecione a pasta `biblioteca/historias` com os JSONs produzidos pelo coletor.
2. Selecione a pasta `biblioteca/videos` ou vídeos locais de fundo, como parkour.
3. Escolha o modo **Manual** ou **Automático**.
4. No manual, escolha a história, título e vídeo antes de montar.
5. No automático, informe o tema, a quantidade de partes e, se quiser, a duração de cada parte.
6. Clique no botão de montagem.

O Studio sorteia uma história que contém o tema informado, divide o texto em partes e sorteia um trecho do vídeo para a primeira prévia. Esta primeira versão é visual local e simula as etapas de geração. A próxima integração conectará Kokoro para criar o áudio e FFmpeg para exportar todos os MP4s finais.

## Formato aceito

O JSON pode ser uma lista de histórias ou um objeto com a chave `stories`/`historias`:

```json
[
  {
    "title": "Título da história",
    "text": "Texto completo da história",
    "author": "autor"
  }
]
```
