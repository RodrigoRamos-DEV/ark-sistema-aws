@echo off
echo 🔄 Fazendo backup do banco ARK...

REM Substitua pela sua DATABASE_URL do Render
set DATABASE_URL=sua_database_url_do_render_aqui

REM Criar nome do backup com data
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "datestamp=%YYYY%-%MM%-%DD%_%HH%-%Min%-%Sec%"

set BACKUP_FILE=backup_ark_%datestamp%.sql

echo 📁 Salvando em: %BACKUP_FILE%

REM Fazer o backup
pg_dump %DATABASE_URL% > %BACKUP_FILE%

if %ERRORLEVEL% EQU 0 (
    echo ✅ Backup criado com sucesso: %BACKUP_FILE%
    echo 📊 Tamanho do arquivo:
    dir %BACKUP_FILE% | find "%BACKUP_FILE%"
) else (
    echo ❌ Erro ao criar backup
)

pause