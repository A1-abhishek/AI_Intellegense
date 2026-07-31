@echo off
REM ============================================================
REM  DocMind - Tomcat Deployment Script
REM  Usage: deploy.bat [TOMCAT_HOME]
REM  Example: deploy.bat C:\apache-tomcat-9.0.85
REM ============================================================

setlocal enabledelayedexpansion

set TOMCAT_HOME=%1
if "%TOMCAT_HOME%"=="" (
    set TOMCAT_HOME=C:\apache-tomcat-9.0.85
)

set PROJECT_DIR=%~dp0..
set FRONTEND_DIR=%PROJECT_DIR%\frontend
set DEPLOY_DIR=%PROJECT_DIR%\deploy\tomcat
set JAVA_SRC=%DEPLOY_DIR%\java
set JAVA_OUT=%DEPLOY_DIR%\build
set JAR_NAME=docmind-proxy.jar

echo ============================================
echo  DocMind Tomcat Deployment
echo ============================================
echo.

REM Step 1: Build frontend
echo [1/4] Building frontend...
cd /d "%FRONTEND_DIR%"
call npx vite build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend build failed!
    exit /b 1
)
echo       Frontend built to dist/
echo.

REM Step 2: Compile Java proxy classes
echo [2/4] Compiling Java proxy classes...

if not exist "%JAVA_OUT%\classes" mkdir "%JAVA_OUT%\classes"

REM Find servlet-api.jar in Tomcat
set SERVLET_JAR=
for %%f in ("%TOMCAT_HOME%\lib\servlet-api.jar" "%TOMCAT_HOME%\lib\javax.servlet-api*.jar" "%TOMCAT_HOME%\lib\servlet*.jar") do (
    if exist "%%f" set SERVLET_JAR=%%f
)

if "%SERVLET_JAR%"=="" (
    echo WARNING: servlet-api.jar not found in %TOMCAT_HOME%\lib
    echo          Trying to compile without explicit classpath...
    javac -d "%JAVA_OUT%\classes" "%JAVA_SRC%\com\docmind\SPAFilter.java" "%JAVA_SRC%\com\docmind\APIProxyServlet.java"
) else (
    echo       Using: %SERVLET_JAR%
    javac -cp "%SERVLET_JAR%" -d "%JAVA_OUT%\classes" "%JAVA_SRC%\com\docmind\SPAFilter.java" "%JAVA_SRC%\com\docmind\APIProxyServlet.java"
)

if %ERRORLEVEL% neq 0 (
    echo ERROR: Java compilation failed!
    echo        Make sure JDK is installed and in PATH.
    exit /b 1
)
echo       Java classes compiled.
echo.

REM Step 3: Package JAR
echo [3/4] Packaging proxy JAR...
cd /d "%JAVA_OUT%\classes"
jar cf "%JAVA_OUT%\%JAR_NAME%" com/
echo       Created: %JAVA_OUT%\%JAR_NAME%
echo.

REM Step 4: Deploy to Tomcat
echo [4/4] Deploying to Tomcat...
echo       TOMCAT_HOME: %TOMCAT_HOME%

set DEPLOY_TARGET=%TOMCAT_HOME%\webapps\ROOT

REM Backup existing web.xml if present
if exist "%DEPLOY_TARGET%\WEB-INF\web.xml" (
    echo       Backing up existing web.xml...
    copy /Y "%DEPLOY_TARGET%\WEB-INF\web.xml" "%DEPLOY_TARGET%\WEB-INF\web.xml.bak" >nul
)

REM Copy frontend build
echo       Copying frontend files...
xcopy /E /Y /Q "%FRONTEND_DIR%\dist\*" "%DEPLOY_TARGET%\" >nul

REM Copy WEB-INF
if not exist "%DEPLOY_TARGET%\WEB-INF" mkdir "%DEPLOY_TARGET%\WEB-INF"
copy /Y "%DEPLOY_DIR%\WEB-INF\web.xml" "%DEPLOY_TARGET%\WEB-INF\web.xml" >nul

REM Copy proxy JAR
copy /Y "%JAVA_OUT%\%JAR_NAME%" "%DEPLOY_TARGET%\WEB-INF\lib\%JAR_NAME%" >nul 2>&1
if not exist "%DEPLOY_TARGET%\WEB-INF\lib" mkdir "%DEPLOY_TARGET%\WEB-INF\lib"
copy /Y "%JAVA_OUT%\%JAR_NAME%" "%DEPLOY_TARGET%\WEB-INF\lib\%JAR_NAME%" >nul

REM Copy context.xml
if not exist "%DEPLOY_TARGET%\META-INF" mkdir "%DEPLOY_TARGET%\META-INF"
copy /Y "%DEPLOY_DIR%\META-INF\context.xml" "%DEPLOY_TARGET%\META-INF\context.xml" >nul

echo.
echo ============================================
echo  Deployment Complete!
echo ============================================
echo.
echo  Frontend deployed to: %DEPLOY_TARGET%
echo  Proxy JAR deployed to: %DEPLOY_TARGET%\WEB-INF\lib\%JAR_NAME%
echo.
echo  API proxy: /api/* -> http://127.0.0.1:8000/api/*
echo  SPA routing: All non-file paths -> index.html
echo.
echo  Start Tomcat:
echo    %TOMCAT_HOME%\bin\startup.bat
echo.
echo  Access DocMind:
echo    http://localhost:8080/
echo.
echo  Make sure FastAPI backend is running:
echo    cd backend ^& python main.py
echo.
