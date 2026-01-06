@echo off
set "NODE_HOME=C:\Program Files\nodejs"
set "PATH=%NODE_HOME%;%PATH%"
cd /d "%~dp0"
echo Running Playwright tests in %CD%
REM Use npm to run the test script which will invoke playwright
"%NODE_HOME%\npm.cmd" test --silent
exit /b %ERRORLEVEL%


