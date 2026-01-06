@echo off
REM Ensure node bin is available for postinstall scripts (esbuild)
set "NODE_HOME=C:\Program Files\nodejs"
set "PATH=%NODE_HOME%;%PATH%"
cd /d "%~dp0"
echo Running npm install in %CD%
"%NODE_HOME%\npm.cmd" install --no-audit --no-fund
exit /b %ERRORLEVEL%


