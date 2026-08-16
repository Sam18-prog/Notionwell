@echo off
echo Starting Notionwell Development Server...
cd /d "%~dp0"
start http://localhost:3000
npm run dev
