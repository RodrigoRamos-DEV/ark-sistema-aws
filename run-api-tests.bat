@echo off
echo ========================================
echo 🧪 EXECUTANDO TESTES DE API
echo ========================================
echo.

echo Verificando se o backend está rodando...
curl -s http://localhost:5000/api/health > nul
if %errorlevel% neq 0 (
    echo ❌ Backend não está respondendo na porta 5000
    echo 💡 Execute primeiro: test-bootstrap.bat
    pause
    exit /b 1
)

echo ✅ Backend está rodando!
echo.

echo Executando testes de API...
node test-api.js

echo.
echo Pressione qualquer tecla para continuar...
pause > nul