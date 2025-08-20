@echo off
echo Instalando AWS CLI e EB CLI...

echo.
echo 1. Baixando AWS CLI...
curl "https://awscli.amazonaws.com/AWSCLIV2.msi" -o "AWSCLIV2.msi"

echo.
echo 2. Instalando AWS CLI...
msiexec /i AWSCLIV2.msi /quiet

echo.
echo 3. Instalando EB CLI via pip...
pip install awsebcli --upgrade --user

echo.
echo 4. Verificando instalações...
aws --version
eb --version

echo.
echo Instalação concluída!
echo.
echo Próximo passo: aws configure
pause