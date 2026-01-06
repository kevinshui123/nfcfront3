@echo off
REM Run admin frontend in mock mode
cd /d "%~dp0"
set VITE_MOCK=true
echo Installing dependencies...
"%ProgramFiles%\\nodejs\\npm.cmd" install
echo Starting dev server...
"%ProgramFiles%\\nodejs\\npm.cmd" run dev


