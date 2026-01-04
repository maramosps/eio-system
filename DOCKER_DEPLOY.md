# 🐳 E.I.O - Docker Deployment Guide

## 🚀 Deploy Rápido

### 1. Preparar ambiente

```bash
# Clonar ou copiar projeto
cd eio-sistema-completo

# Criar arquivo .env com suas configurações
cp backend/.env.example .env
```

### 2. Configurar variáveis de ambiente

Edite o arquivo `.env`:

```env
# Segurança (MUDAR EM PRODUÇÃO!)
JWT_SECRET=sua-chave-jwt-super-secreta-aqui
JWT_REFRESH_SECRET=sua-chave-refresh-super-secreta-aqui
ENCRYPTION_KEY=sua-chave-criptografia-64-caracteres-hex

# Payment
STRIPE_SECRET_KEY=sk_live_...
MERCADOPAGO_ACCESS_TOKEN=APP_USR...

# URLs
FRONTEND_URL=https://seudominio.com
API_URL=https://api.seudominio.com
```

### 3. Iniciar containers

```bash
# Desenvolvimento
docker-compose up --build

# Produção (detached)
docker-compose up -d --build
```

### 4. Acessar aplicação

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 📊 Gerenciar Containers

```bash
# Ver logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Parar containers
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados!)
docker-compose down -v

# Reiniciar serviço específico
docker-compose restart backend

# Ver status
docker-compose ps
```

##🗄️ Database Management

```bash
# Acessar PostgreSQL
docker-compose exec postgres psql -U eio_user -d eio_db

# Backup do banco
docker-compose exec postgres pg_dump -U eio_user eio_db > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U eio_user eio_db < backup.sql

# Ver logs do Redis
docker-compose logs -f redis
```

## 🔧 Troubleshooting

### Backend não inicia

```bash
# Ver logs detalhados
docker-compose logs backend

# Verificar se banco está healthy
docker-compose ps
```

### Erro de conexão com banco

```bash
# Verificar se PostgreSQL está rodando
docker-compose exec postgres pg_isready

# Reiniciar PostgreSQL
docker-compose restart postgres
```

### Limpar tudo e recomeçar

```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## 🌐 Deploy em Produção

### Requisitos
- Servidor com Docker e Docker Compose
- Domínio configurado
- SSL/TLS (Let's Encrypt recomendado)

### Passos

1. **Configurar DNS**
   - `seudominio.com` → IP do servidor
   - `api.seudominio.com` → IP do servidor

2. **Instalar Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

3. **Configurar SSL (opcional mas recomendado)**
   - Usar Certbot ou CloudFlare

4. **Deploy**
   ```bash
   # Copiar projeto para servidor
   scp -r eio-sistema-completo user@servidor:/home/user/

   # SSH no servidor
   ssh user@servidor

   # Iniciar produção
   cd eio-sistema-completo
   docker-compose up -d --build
   ```

5. **Monitorar**
   ```bash
   # Ver status
   docker-compose ps

   # Ver logs
   docker-compose logs -f

   # Ver uso de recursos
   docker stats
   ```

## 📈 Escalabilidade

Para escalar horizontalmente:

```yaml
# docker-compose.yml
backend:
  deploy:
    replicas: 3
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
```

## 🔒 Segurança

- ✅ Mudar todas as senhas padrão
- ✅ Usar HTTPS em produção
- ✅ Configurar firewall
- ✅ Limitar acesso ao PostgreSQL
- ✅ Usar secrets do Docker em produção

## 💾 Backup Automatizado

Adicionar ao crontab:

```bash
0 2 * * * cd /home/user/eio-sistema-completo && docker-compose exec -T postgres pg_dump -U eio_user eio_db > /backups/eio_$(date +\%Y\%m\%d).sql
```

---

**🎉 Seu sistema E.I.O está pronto para produção com Docker!**
