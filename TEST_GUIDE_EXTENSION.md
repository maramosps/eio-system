# 🧪 GUIA DE TESTE E INSTALAÇÃO DA EXTENSÃO E.I.O

Para finalizar e iniciar as vendas, siga estes passos para validar a extensão em ambiente real.

## 1. PREPARAÇÃO DO AMBIENTE (IMPORTANTE!)

Como seu backend está hospedado na **Vercel**, você PRECISA garantir que as variáveis de ambiente do banco de dados estejam configuradas lá.

1. Acesse seu projeto na Vercel: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Vá em **Settings** > **Environment Variables**.
3. Adicione as seguintes chaves (que estão no seu `.env` local ou no Supabase):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` (Role Service Role - CUIDADO: Não use a anon key para o server)
   - `JWT_SECRET` (Use uma senha forte, ex: `eio-secret-key-2026`)

*Sem isso, o login e registro não funcionarão.*

---

## 2. INSTALANDO A EXTENSÃO NO CHROME

A extensão ainda não está na Chrome Web Store, então você deve instalá-la em modo de desenvolvedor:

1. Abra o Google Chrome.
2. Digite na barra de endereços: `chrome://extensions`
3. No canto superior direito, ative a chave **"Modo do desenvolvedor"**.
4. Clique no botão **"Carregar sem compactação"** (Load unpacked).
5. Navegue até a pasta do projeto e selecione a pasta `extension`:
   `C:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo\extension`
6. A extensão "E.I.O - Decole seu Instagram" deve aparecer na lista.

---

## 3. ROTEIRO DE TESTE (VALIDAÇÃO FINAL)

Siga este roteiro para garantir que está tudo pronto para os clientes:

### ✅ Teste 1: Instalação e Login

1. Fixe o ícone da extensão na barra do Chrome (ícone de quebra-cabeça).
2. Clique no ícone do foguete (E.I.O).
3. O popup deve abrir pedindo Login.
4. **Crie uma conta de teste** em "Criar conta" ou use uma existente.
5. Se o login for bem sucedido, você verá a tela principal da extensão.

### ✅ Teste 2: Detecção do Instagram

1. Com a extensão logada, abra uma aba nova e vá para `instagram.com`.
2. A extensão deve reconhecer que você está no Instagram.
3. Se estiver "Aguardando Instagram...", recarregue a página do Instagram.

### ✅ Teste 3: Automação Simples

1. No dashboard da extensão, vá em "Mineração" ou "Configurar Agente".
2. Configure uma ação simples (ex: Seguir Hashtag ou Perfil).
3. Inicie a automação.
4. Observe se a extensão abre as páginas e realiza ações (curtir, seguir) automaticamente.

---

## ⚠️ SOLUÇÃO DE PROBLEMAS

- **Erro "Banco de dados não configurado":** Você esqueceu de colocar as variáveis na Vercel (Passo 1).
- **Extensão não conecta:** Verifique se sua internet está ativa e se o site `https://eio-system.vercel.app` está acessível.
- **Botões não funcionam:** Clique com botão direito no ícone da extensão > Inspecionar Popup > Aba Console. Veja se há erros vermelhos.

---
**Sucesso nos testes! 🚀**
