---
description: Deploy da extensão E.I.O - Atualiza versão em todos os arquivos, recompila ZIP e faz deploy
---

# Deploy da Extensão E.I.O

Este workflow atualiza a versão da extensão em todos os arquivos necessários, recompila o ZIP e faz deploy para produção.

## Arquivos que precisam ser atualizados com a nova versão

1. `extension/manifest.json` - linha 4 (version)
2. `api/index.js` - linha ~427 (version)
3. `frontend/dashboard.js` - linha ~468 (extensionVersion.textContent)
4. `frontend/dashboard.html` - linha ~557 (id="extensionVersion")

## Passos

// turbo-all

1. Atualizar versão no `extension/manifest.json`
2. Atualizar versão no `api/index.js`
3. Atualizar versão no `frontend/dashboard.js`
4. Atualizar versão no `frontend/dashboard.html`
5. Recompilar o ZIP:

```powershell
Remove-Item "eio-extension-new.zip" -Force -ErrorAction SilentlyContinue; Compress-Archive -Path "extension\*" -DestinationPath "eio-extension-new.zip" -Force; Copy-Item "eio-extension-new.zip" -Destination "frontend\downloads\eio-extension.zip" -Force; Copy-Item "eio-extension-new.zip" -Destination "public\downloads\eio-extension.zip" -Force; Remove-Item "eio-extension-new.zip" -Force
```

1. Deploy para produção:

```powershell
vercel --prod --yes
```

## Notas

- Sempre usar versão semântica (ex: 2.7.1)
- Aguardar confirmação do deploy antes de liberar para o usuário
