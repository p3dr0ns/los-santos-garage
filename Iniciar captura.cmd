@echo off
setlocal
cd /d "%~dp0"
set "garageCompiler=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%garageCompiler%" set "garageCompiler=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%garageCompiler%" (
  echo Nao foi encontrado o compilador do .NET Framework do Windows.
  pause
  exit /b 1
)
"%garageCompiler%" /nologo /target:winexe /out:"capture\MinhaGaragemCapture.exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll "capture\CaptureAssistant.cs"
if errorlevel 1 (
  echo Nao foi possivel preparar o assistente. Feche uma instancia anterior e tente novamente.
  pause
  exit /b 1
)
start "" "capture\MinhaGaragemCapture.exe"
