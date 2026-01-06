@echo off
REM Append Node.js Program Files path to user PATH using setx
set "NODEPATH=C:\Program Files\nodejs"
echo Current PATH snippets:
echo %PATH% | findstr /I /C:"%NODEPATH%" >nul && (echo Node path already present && exit /B 0)
set NEWPATH=%PATH%;%NODEPATH%
setx PATH "%NEWPATH%"
echo Updated user PATH. New entries will be visible in new terminal sessions.
exit /B 0


