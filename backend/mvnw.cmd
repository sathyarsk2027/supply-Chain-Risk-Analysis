@echo off
setlocal

:: Ensure standard Windows System32 and PowerShell directories are in the PATH
set "PATH=C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0;C:\Windows;%PATH%"

set "PROPERTIES_FILE=%~dp0.mvn\wrapper\maven-wrapper.properties"

if not exist "%PROPERTIES_FILE%" (
    echo Error: %PROPERTIES_FILE% not found.
    exit /b 1
)

for /f "tokens=2 delims==" %%i in ('findstr "distributionUrl" "%PROPERTIES_FILE%"') do (
    set "DIST_URL=%%i"
)

:: Trim spaces/quotes from URL
set "DIST_URL=%DIST_URL: =%"
set "DIST_URL=%DIST_URL:"=%"

:: Extract filename and directory name from URL
for %%a in ("%DIST_URL%") do set "ZIP_NAME=%%~nxa"
for %%a in ("%DIST_URL%") do set "DIR_NAME=%%~na"

set "WRAPPER_DIR=%USERPROFILE%\.m2\wrapper\dists\%DIR_NAME%"
set "ZIP_PATH=%WRAPPER_DIR%\%ZIP_NAME%"

if not exist "%WRAPPER_DIR%" mkdir "%WRAPPER_DIR%"

:: Find if mvn.cmd already exists
set "MVN_BIN="
for /d %%d in ("%WRAPPER_DIR%\*") do (
    if exist "%%d\bin\mvn.cmd" (
        set "MVN_BIN=%%d\bin\mvn.cmd"
    )
)

if not defined MVN_BIN (
    if not exist "%ZIP_PATH%" (
        echo Downloading Maven from %DIST_URL%...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%DIST_URL%', '%ZIP_PATH%')"
        if errorlevel 1 (
            echo Failed to download Maven.
            exit /b 1
        )
    )
    echo Extracting Maven to %WRAPPER_DIR%...
    powershell -Command "Expand-Archive -Path '%ZIP_PATH%' -DestinationPath '%WRAPPER_DIR%'"
    if errorlevel 1 (
        echo Failed to extract Maven.
        exit /b 1
    )
    del "%ZIP_PATH%"
    
    for /d %%d in ("%WRAPPER_DIR%\*") do (
        if exist "%%d\bin\mvn.cmd" (
            set "MVN_BIN=%%d\bin\mvn.cmd"
        )
    )
)

if not defined MVN_BIN (
    echo Error: Could not find mvn.cmd in extracted directory.
    exit /b 1
)

call "%MVN_BIN%" %*
