@echo off
REM Wrapper Windows : appelle le launcher Python cross-platform.
cd /d "%~dp0"
python start.py %*
pause
