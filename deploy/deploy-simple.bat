@echo off
REM ============================================================
REM  DocMind - Simple Tomcat Deployment (No Java Compilation)
REM  Usage: deploy-simple.bat [TOMCAT_HOME]
REM  API calls go directly to backend (CORS enabled on FastAPI)
REM ============================================================

setlocal enabledelayedexpansion

set TOMCAT_HOME=%1
if "%TOMCAT_HOME%"=="" (
    set TOMCAT_HOME=C:\apache-tomcat-9.0.85
)

set PROJECT_DIR=%~dp0..
set FRONTEND_DIR=%PROJECT_DIR%\frontend
set DEPLOY_DIR=%PROJECT_DIR%\deploy\tomcat

echo ============================================
echo  DocMind - Simple Tomcat Deployment
echo ============================================
echo.

REM Step 1: Build frontend
echo [1/2] Building frontend...
cd /d "%FRONTEND_DIR%"
call npx vite build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend build failed!
    exit /b 1
)
echo       Frontend built to dist/
echo.

REM Step 2: Deploy to Tomcat
echo [2/2] Deploying to Tomcat...
echo       TOMCAT_HOME: %TOMCAT_HOME%

set DEPLOY_TARGET=%TOMCAT_HOME%\webapps\ROOT

REM Clean existing deployment
if exist "%DEPLOY_TARGET%\assets" rmdir /S /Q "%DEPLOY_TARGET%\assets"

REM Copy frontend build
echo       Copying frontend files...
xcopy /E /Y /Q "%FRONTEND_DIR%\dist\*" "%DEPLOY_TARGET%\" >nul

REM Copy simple web.xml (SPA routing only, no Java proxy)
if not exist "%DEPLOY_TARGET%\WEB-INF" mkdir "%DEPLOY_TARGET%\WEB-INF"
copy /Y "%DEPLOY_DIR%\WEB-INF\web-simple.xml" "%DEPLOY_TARGET%\WEB-INF\web.xml" >nul

echo.
echo ============================================
echo  Deployment Complete!
echo ============================================
echo.
echo  Frontend deployed to: %DEPLOY_TARGET%
echo.
echo  SPA routing: 404 pages -> index.html (React Router handles routes)
echo.
echo  IMPORTANT: API calls go directly to http://localhost:8000/api
echo  Make sure CORS is enabled on FastAPI (it is by default).
echo.
echo  Start Tomcat:
echo    %TOMCAT_HOME%\bin\startup.bat
echo.
echo  Access DocMind:
echo    http://localhost:8080/
echo.
echo  Start FastAPI backend (in another terminal):
echo    cd "%PROJECT_DIR%\backend" ^& python main.py
echo.
