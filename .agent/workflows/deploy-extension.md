---
description: Workflow para empacotar e preparar a Extensão E.I.O para publicação (Web Store).
---

# Deploy da Extensão E.I.O

Este workflow executa o release completo: incrementa a versão, atualiza todos os arquivos, empacota o ZIP e faz o deploy.

## Pré-Requisitos

- Node.js >= 18
- `archiver` instalado (`npm install`)
- Vercel CLI instalado globalmente (`npm i -g vercel`)
- Estar logado no Vercel (`vercel login`)

## Passos do Deploy Completo

### 1. Bump de versão + empacotamento

// turbo
```bash
cd c:\Users\user\Desktop\eio-sistema-completo && node release.js patch
```

Isso irá:
- Incrementar a versão (ex: 4.6.8 → 4.6.9)
- Atualizar todos os arquivos (manifest.json, background.js, content.js, dashboard-v462.js, etc.)
- Verificar a sintaxe de todos os JS
- Gerar `version.json` para o download dinâmico
- Empacotar em `frontend/downloads/eio-extension-v{VERSION}.zip`

### 2. Commit e push para o GitHub

```bash
cd c:\Users\user\Desktop\eio-sistema-completo && git add -A && git commit -m "release: v$(node -p "require('./extension/manifest.json').version")" && git push
```

### 3. Deploy para produção na Vercel

```bash
cd c:\Users\user\Desktop\eio-sistema-completo && vercel --prod
```

### 4. Verificar deploy

Acesse a URL do deploy e verifique:
- Dashboard carrega corretamente
- Botão de download mostra a versão atualizada
- O download do ZIP tem o nome com versão (ex: `eio-extension-v4.6.9.zip`)

### 5. Atualizar extensão no Chrome

1. Abra `chrome://extensions/`
2. **Remova** a extensão antiga
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `extension/` do projeto

## Comandos Rápidos

| Comando | Descrição |
|---------|-----------|
| `npm run release` | Bump patch + empacotar |
| `npm run release:minor` | Bump minor + empacotar |
| `npm run release:major` | Bump major + empacotar |
| `npm run release:deploy` | Bump patch + empacotar + deploy Vercel |
| `node release.js patch` | Mesmo que `npm run release` |

## Notas

- O `version.json` é gerado automaticamente pelo release script
- O dashboard lê o `version.json` para mostrar a versão correta no botão de download
- O ZIP versionado E o genérico são gerados (o genérico é fallback)
- Sempre verifique a sintaxe antes do deploy (o script faz isso automaticamente)
