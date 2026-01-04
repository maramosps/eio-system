# 🐳 Guia de Instalação do Docker no Windows

## Por que Docker não está instalado?

O Docker não vem instalado por padrão no Windows. Você precisa instalá-lo manualmente.

---

## ✅ Como Instalar Docker no Windows

### Passo 1: Baixar Docker Desktop

Acesse: https://www.docker.com/products/docker-desktop/

Ou baixe diretamente:
```
https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
```

### Passo 2: Requisitos do Sistema

**Windows 10/11:**
- Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 ou superior)
- OU Windows 11 64-bit
- Recurso WSL 2 habilitado

**Hardware:**
- 64-bit processor com suporte a virtualização
- 4GB de RAM (mínimo)
- Suporte a Hyper-V

### Passo 3: Instalar

1. Execute o instalador
2. Siga o assistente de instalação
3. Deixe todas as opções padrão marcadas
4. Reinicie o computador quando solicitado

### Passo 4: Configurar WSL 2

Abra o PowerShell como Administrador:

```powershell
# Habilitar WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Habilitar Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Reiniciar o computador
Restart-Computer

# Após reiniciar, baixar e instalar o kernel do WSL 2
# https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi

# Definir WSL 2 como padrão
wsl --set-default-version 2
```

### Passo 5: Verificar Instalação

Abra o PowerShell e execute:

```powershell
docker --version
docker-compose --version
```

Deve mostrar algo como:
```
Docker version 24.0.7, build afdd53b
Docker Compose version v2.23.3-desktop.2
```

---

## 🚀 Iniciar E.I.O com Docker

Após instalar o Docker, volte para o projeto e execute:

```powershell
cd C:\Users\user\.gemini\antigravity\scratch\eio-sistema-completo

# Iniciar tudo
docker-compose up -d --build

# Aguardar ~2 minutos para tudo iniciar

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f backend
```

Acesse:
- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:3000
- **Health**: http://localhost:3000/health

---

## 🔧 Alternativa: Rodar SEM Docker

Se não quiser instalar Docker, pode rodar localmente:

### Backend:

```powershell
# Instalar PostgreSQL
# https://www.postgresql.org/download/windows/

# Instalar Redis 
# https://github.com/microsoftarchive/redis/releases

# Instalar Node.js 18+
# https://nodejs.org/

# Configurar backend
cd backend
npm install
cp .env.example .env

# Editar .env com suas configurações

# Inciar
npm run dev
```

### Frontend:

```powershell
cd frontend
# Abrir login.html em um navegador
# OU usar Live Server do VS Code
```

---

## ❓ Troubleshooting

### Erro: "WSL 2 installation is incomplete"

Execute:
```powershell
wsl --install
```

### Erro: "Hardware assisted virtualization and data execution protection must be enabled"

Habilite a virtualização na BIOS:
1. Reinicie o PC
2. Entre na BIOS (geralmente F2, Del ou F12)
3. Procure por "Virtualization Technology" ou "Intel VT-x" / "AMD-V"
4. Habilite e salve

### Docker Desktop não inicia

1. Certifique-se que WSL 2 está instalado
2. Tente executar como Administrador
3. Verifique se Hyper-V está habilitado

---

## 📚 Mais Informações

- Documentação oficial: https://docs.docker.com/desktop/install/windows-install/
- Guia WSL 2: https://learn.microsoft.com/pt-br/windows/wsl/install

---

**Após instalar o Docker, o comando `docker-compose up` vai funcionar!** 🎉
