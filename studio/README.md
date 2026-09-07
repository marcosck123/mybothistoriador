# Historiador Studio

Interface externa e isolada para visualizar a montagem de vídeos verticais.

## Abrir

Na raiz do projeto:

```bash
python3 -m http.server 8090 --directory studio
```

Depois abra `http://localhost:8090`.

## Usar

1. Selecione um JSON de histórias produzido pelo coletor.
2. Selecione um vídeo local de fundo, como parkour.
3. Escolha a voz e a velocidade.
4. Clique em **Gerar prévia**.

Esta primeira versão é uma prévia visual local: ela mostra a história sobre o vídeo e simula as etapas de geração. A próxima integração conectará Kokoro para criar o áudio e FFmpeg para exportar o MP4 final.

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
