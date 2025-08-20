@echo off
echo ========================================
echo 🧪 TESTE AUTOMATIZADO - SISTEMA BOOTSTRAP
echo ========================================
echo.

echo 📋 Verificando pré-requisitos...
echo.

echo Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado!
    pause
    exit /b 1
)

echo Verificando npm...
npm --version
if %errorlevel% neq 0 (
    echo ❌ npm não encontrado!
    pause
    exit /b 1
)

echo.
echo ✅ Pré-requisitos OK!
echo.

echo 🚀 Iniciando testes do sistema...
echo.

echo 1. Testando Backend...
cd backend
echo Instalando dependências do backend...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependências do backend!
    pause
    exit /b 1
)

echo Iniciando servidor backend...
start "Backend Server" cmd /k "npm start"
timeout /t 5

echo.
echo 2. Testando Frontend...
cd ..\frontend
echo Instalando dependências do frontend...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependências do frontend!
    pause
    exit /b 1
)

echo Iniciando servidor frontend...
start "Frontend Server" cmd /k "npm run dev"
timeout /t 5

echo.
echo 🌐 Testando conectividade...
echo.

echo Testando Backend (porta 5000)...
curl -s http://localhost:5000/api/health > nul
if %errorlevel% equ 0 (
    echo ✅ Backend respondendo na porta 5000
) else (
    echo ⚠️ Backend pode não estar respondendo ainda
)

echo.
echo Testando Frontend (porta 5173)...
curl -s http://localhost:5173 > nul
if %errorlevel% equ 0 (
    echo ✅ Frontend respondendo na porta 5173
) else (
    echo ⚠️ Frontend pode não estar respondendo ainda
)

echo.
echo ========================================
echo 🎉 SISTEMA INICIADO COM SUCESSO!
echo ========================================
echo.
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:5000
echo.
echo 📋 Próximos passos:
echo 1. Abra http://localhost:5173 no navegador
echo 2. Siga o guia TESTE-SISTEMA-BOOTSTRAP.md
echo 3. Teste todas as funcionalidades
echo.
echo Pressione qualquer tecla para abrir o navegador...
pause > nul

start http://localhost:5173

echo.
echo ✅ Teste iniciado! Siga o guia de testes.
pause