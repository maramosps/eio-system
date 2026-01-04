# 🌐 GUIA COMPLETO - DOMÍNIO E CLOUDFLARE

## 📋 VISÃO GERAL

Vamos configurar:

- ✅ Domínio personalizado (ex: eio-system.com)
- ✅ Cloudflare para segurança e CDN
- ✅ SSL/HTTPS automático
- ✅ Proteção DDoS
- ✅ Cache e otimização

---

## 🛒 PARTE 1: COMPRAR DOMÍNIO

### PASSO 1: Escolher Registrador (5 minutos)

**Opções Recomendadas**:

1. **Registro.br** (se .com.br) - <https://registro.br>
2. **Namecheap** (internacional) - <https://namecheap.com>
3. **GoDaddy** (popular) - <https://godaddy.com>

**Domínio Sugerido**: `eio-system.com` ou `eio-system.com.br`

---

### PASSO 2: Comprar Domínio (10 minutos)

#### Se usar Registro.br (.com.br)

1. **Acessar**: <https://registro.br>
2. **Buscar domínio** desejado
3. **Verificar disponibilidade**
4. **Adicionar ao carrinho**
5. **Fazer cadastro** (CPF/CNPJ necessário)
6. **Pagar** (boleto ou cartão)
7. **Aguardar confirmação** (até 24h)

#### Se usar Namecheap (.com)

1. **Acessar**: <https://namecheap.com>
2. **Buscar domínio** desejado
3. **Add to Cart**
4. **View Cart** → **Confirm Order**
5. **Criar conta**
6. **Pagar** (cartão internacional)
7. ✅ Domínio ativo imediatamente

---

## ☁️ PARTE 2: CONFIGURAR CLOUDFLARE

### PASSO 3: Criar Conta Cloudflare (3 minutos)

1. **Acessar**: <https://cloudflare.com>
2. **Clicar em "Sign Up"**
3. **Preencher**:

   ```
   Email: seu@email.com
   Password: [SENHA FORTE]
   ```

4. **Verificar email** (clicar no link recebido)
5. ✅ Conta criada!

---

### PASSO 4: Adicionar Domínio ao Cloudflare (5 minutos)

1. **Fazer login** no Cloudflare

2. **Clicar em "Add a Site"**

3. **Digitar seu domínio**:

   ```
   eio-system.com
   ```

4. **Clicar em "Add Site"**

5. **Escolher plano**:
   - Selecionar **"Free"** (suficiente para começar)
   - Clicar em "Continue"

6. **Aguardar scan** dos registros DNS (~30 segundos)

7. **Clicar em "Continue"**

8. ✅ Cloudflare mostrará os nameservers

---

### PASSO 5: Atualizar Nameservers (10 minutos)

**O Cloudflare mostrará 2 nameservers**, exemplo:

```
alex.ns.cloudflare.com
kate.ns.cloudflare.com
```

#### No Registro.br

1. **Acessar**: <https://registro.br>
2. **Fazer login**
3. **Ir em "Meus Domínios"**
4. **Clicar no domínio**
5. **Ir em "DNS" → "Alterar Servidores DNS"**
6. **Selecionar "Usar outros servidores"**
7. **Colar os 2 nameservers do Cloudflare**
8. **Salvar**
9. **Aguardar propagação** (até 24h, geralmente 2-4h)

#### No Namecheap

1. **Fazer login** no Namecheap
2. **Ir em "Domain List"**
3. **Clicar em "Manage"** no domínio
4. **Em "Nameservers"**, selecionar "Custom DNS"**
5. **Colar os 2 nameservers do Cloudflare**
6. **Salvar**
7. **Aguardar propagação** (até 24h, geralmente 2-4h)

---

### PASSO 6: Verificar Ativação (Após propagação)

1. **Voltar ao Cloudflare**
2. **Aguardar email** de confirmação
3. **Ou clicar em "Check nameservers"**
4. ✅ Quando ativar, status mudará para "Active"

---

## 🔧 PARTE 3: CONFIGURAR DNS NO CLOUDFLARE

### PASSO 7: Adicionar Registros DNS (5 minutos)

1. **No painel do Cloudflare**, ir em **"DNS"** → **"Records"**

2. **Adicionar registro para API**:

   ```
   Type: A
   Name: api
   IPv4 address: [IP DO SEU SERVIDOR]
   Proxy status: Proxied (nuvem laranja)
   TTL: Auto
   ```

   **Clicar em "Save"**

3. **Adicionar registro para Frontend**:

   ```
   Type: A
   Name: @
   IPv4 address: [IP DO SEU SERVIDOR]
   Proxy status: Proxied (nuvem laranja)
   TTL: Auto
   ```

   **Clicar em "Save"**

4. **Adicionar registro para WWW**:

   ```
   Type: CNAME
   Name: www
   Target: eio-system.com
   Proxy status: Proxied (nuvem laranja)
   TTL: Auto
   ```

   **Clicar em "Save"**

5. ✅ Registros DNS configurados!

**NOTA**: Se não tiver servidor ainda, pule para PARTE 5

---

## 🔒 PARTE 4: CONFIGURAR SSL/HTTPS

### PASSO 8: Ativar SSL (2 minutos)

1. **No Cloudflare**, ir em **"SSL/TLS"**

2. **Em "Overview"**, selecionar:

   ```
   Encryption mode: Full (strict)
   ```

3. **Ir em "Edge Certificates"**

4. **Ativar**:
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ Minimum TLS Version: 1.2

5. **Aguardar** ~15 minutos para certificado ser emitido

6. ✅ SSL configurado!

---

## 🛡️ PARTE 5: CONFIGURAR SEGURANÇA

### PASSO 9: Proteção DDoS e Firewall (3 minutos)

1. **Ir em "Security" → "Settings"**

2. **Configurar Security Level**:

   ```
   Security Level: Medium
   ```

3. **Ir em "Security" → "WAF"**

4. **Ativar**:
   - ✅ OWASP Core Ruleset
   - ✅ Cloudflare Managed Ruleset

5. **Ir em "Security" → "Bots"**

6. **Ativar**:
   - ✅ Bot Fight Mode

7. ✅ Segurança configurada!

---

## ⚡ PARTE 6: OTIMIZAÇÃO E CACHE

### PASSO 10: Configurar Cache (2 minutos)

1. **Ir em "Caching" → "Configuration"**

2. **Configurar**:

   ```
   Caching Level: Standard
   Browser Cache TTL: 4 hours
   ```

3. **Ir em "Speed" → "Optimization"**

4. **Ativar**:
   - ✅ Auto Minify (JavaScript, CSS, HTML)
   - ✅ Brotli
   - ✅ Early Hints

5. ✅ Otimização configurada!

---

## 🖥️ PARTE 7: CONFIGURAR SERVIDOR (VPS)

### PASSO 11: Contratar VPS (Opcional)

**Opções Recomendadas**:

#### A) DigitalOcean (Recomendado)

```
Plano: Basic Droplet
CPU: 1 vCPU
RAM: 1 GB
Storage: 25 GB SSD
Preço: ~$6/mês
```

#### B) AWS Lightsail

```
Plano: $5/mês
RAM: 512 MB
Storage: 20 GB SSD
```

#### C) Hostinger VPS

```
Plano: VPS 1
RAM: 1 GB
Storage: 20 GB
Preço: ~R$ 20/mês
```

---

### PASSO 12: Configurar Servidor (30 minutos)

**Após criar VPS**:

1. **Conectar via SSH**:

   ```bash
   ssh root@[IP_DO_SERVIDOR]
   ```

2. **Atualizar sistema**:

   ```bash
   apt update && apt upgrade -y
   ```

3. **Instalar Node.js**:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt install -y nodejs
   ```

4. **Instalar PM2** (gerenciador de processos):

   ```bash
   npm install -g pm2
   ```

5. **Instalar Nginx**:

   ```bash
   apt install -y nginx
   ```

6. **Configurar Firewall**:

   ```bash
   ufw allow 22
   ufw allow 80
   ufw allow 443
   ufw enable
   ```

7. ✅ Servidor configurado!

---

### PASSO 13: Deploy do Backend (20 minutos)

1. **Clonar repositório** (ou fazer upload via FTP):

   ```bash
   cd /var/www
   git clone [SEU_REPOSITORIO]
   cd eio-sistema-completo/backend
   ```

2. **Instalar dependências**:

   ```bash
   npm install
   ```

3. **Criar arquivo .env**:

   ```bash
   nano .env
   ```

   Colar configurações (incluindo Supabase)

4. **Iniciar com PM2**:

   ```bash
   pm2 start server.js --name eio-backend
   pm2 save
   pm2 startup
   ```

5. ✅ Backend rodando!

---

### PASSO 14: Configurar Nginx (10 minutos)

1. **Criar configuração**:

   ```bash
   nano /etc/nginx/sites-available/eio-system
   ```

2. **Colar configuração**:

   ```nginx
   server {
       listen 80;
       server_name api.eio-system.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }

   server {
       listen 80;
       server_name eio-system.com www.eio-system.com;

       root /var/www/eio-sistema-completo/frontend;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

3. **Ativar site**:

   ```bash
   ln -s /etc/nginx/sites-available/eio-system /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

4. ✅ Nginx configurado!

---

## ✅ CHECKLIST FINAL

- [ ] Domínio comprado
- [ ] Conta Cloudflare criada
- [ ] Domínio adicionado ao Cloudflare
- [ ] Nameservers atualizados
- [ ] DNS propagado (verificar em <https://dnschecker.org>)
- [ ] Registros DNS configurados
- [ ] SSL/HTTPS ativado
- [ ] Segurança configurada
- [ ] Cache otimizado
- [ ] VPS contratado (se aplicável)
- [ ] Servidor configurado
- [ ] Backend em produção
- [ ] Nginx configurado
- [ ] Site acessível via domínio

---

## 🧪 TESTAR CONFIGURAÇÃO

### Verificar DNS

```
https://dnschecker.org
Digite: eio-system.com
```

### Verificar SSL

```
https://www.ssllabs.com/ssltest/
Digite: eio-system.com
```

### Acessar site

```
https://eio-system.com
https://api.eio-system.com/api/health
```

---

## 🆘 PROBLEMAS COMUNS

### ❌ "DNS_PROBE_FINISHED_NXDOMAIN"

**Solução**: Aguardar propagação DNS (até 24h)

### ❌ "ERR_SSL_VERSION_OR_CIPHER_MISMATCH"

**Solução**: Aguardar emissão do certificado SSL (~15 min)

### ❌ "502 Bad Gateway"

**Solução**: Verificar se backend está rodando (`pm2 status`)

### ❌ Site não carrega

**Solução**:

1. Verificar registros DNS no Cloudflare
2. Verificar se nginx está rodando (`systemctl status nginx`)
3. Verificar logs (`pm2 logs`)

---

## 📞 SUPORTE

**Email**: <msasdigital@gmail.com>

**Próximo Passo**: Sistema em produção! 🎉

---

**MS Assessoria Digital**
**E.I.O System - Decole seu Instagram**
**Domínio e Cloudflare configurados!** ✅
