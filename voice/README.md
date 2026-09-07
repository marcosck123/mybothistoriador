# Narração local com Kokoro

Este módulo transforma o campo `text` de `historias.json` em arquivos WAV usando o Kokoro localmente.

## Instalação

Use Python 3.10–3.12 em um ambiente virtual. Python 3.14 pode não ser compatível com todas as dependências de áudio.

```bash
python3.12 -m venv .venv-voice
source .venv-voice/bin/activate
pip install --upgrade pip
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r voice/requirements.txt
```

## Uso

```bash
python voice/generate.py historias.json --output audio --voice pm_alex
```

O texto não é enviado para um serviço externo. A voz padrão `pm_alex` é uma opção em português brasileiro; confira a licença do modelo/voz antes de publicar comercialmente.
