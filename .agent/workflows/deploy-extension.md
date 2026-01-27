---
description: Workflow para empacotar e preparar a Extensão E.I.O para publicação (Web Store).
---

# 📦 Deploy da Extensão E.I.O

Este workflow guia o processo de empacotamento, versão e preparação para upload na Chrome Web Store.

## 1. Verificação Prévia

Antes de empacotar, garanta que:

- O `manifest.json` está com a versão correta.
- Não há erros de lint/sintaxe nos arquivos JS.
- As credenciais de API (Supabase) estão configuradas para produção (se aplicável).

## 2. Empacotamento Automático

O projeto possui scripts automatizados para gerar o arquivo `.zip` pronto para envio.

### Opção A: Script Node.js (Recomendado)

Este script atualiza automaticamente a versão no manifesto e gera o ZIP com nome formatado.

```bash
npm run package
```

### Opção B: PowerShell (Avançado)

Script completo que também gera backups e logs.

```powershell
./package-extension.ps1
```

## 3. Validação do Pacote

Após gerar o ZIP (verifique na pasta raiz algo como `eio-extension-vX.X.X.zip`):

1. Abra `chrome://extensions` no navegador.
2. Ative o "Modo do desenvolvedor".
3. Arraste o ZIP gerado para dentro da janela para testar se ele instala corretamente.

## 4. Publicação

1. Acesse o [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/dev/dashboard).
2. Selecione o item **E.I.O System**.
3. Vá em "Pacote" > "Enviar novo pacote".
4. Faça upload do arquivo ZIP gerado.
