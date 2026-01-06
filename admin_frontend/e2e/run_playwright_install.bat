@echo off
set "NODE_HOME=C:\Program Files\nodejs"
set "PATH=%NODE_HOME%;%PATH%"
cd /d "%~dp0"
echo Running Playwright install in %CD%
"%NODE_HOME%\npx.cmd" playwright install --with-deps
exit /b %ERRORLEVEL%


