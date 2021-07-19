:: Compile all peg files into js, and copy all js to destination.

@echo off
setlocal enableextensions enabledelayedexpansion
set me=%~n0
set parent=%~dp0

rem Does not work correctly:
rem set interactive=0
rem echo %CMDCMDLINE% | findstr /L %COMSPEC% >nul 2>&1
rem if %ERRORLEVEL% == 0 set interactive=1
rem echo.DEBUG interactive:%interactive%

rem Does not work correctly:
rem set interactive1=1
rem echo %CMDCMDLINE% | find /I "/c" >nul 2>&1
rem if %ERRORLEVEL% == 0 set interactive1=0
rem echo.DEBUG interactive1:%interactive1%

for /f "usebackq tokens=*" %%a in (`where pegjs.cmd`) do set peg_cmd=%%a
if not exist  %peg_cmd% (
  exit /B 1
)
rem As of pegjs v0.10.0, can't get npm pegjs to build same source module format as online version (also v0.10.0)
rem However, the result is fully equivalent functionally.
rem --format amd -> define([], function(){});, commonjs(default), globals -> (function(root) {})(this), umd -> define()/module.exports=factory()
set peg_opts=--optimize size

set logfile=makepeg.log
set tmpfile=.\pegjs.tmp
set installpath=..\src\assets

set peg_path=src\pag
set peg_files=%peg_path%\*.peg
set other_files=*.js *.ts

rem echo.DEBUG peg_files:"%peg_files%" files:"%files%" >>%logfile%
set clean=0
set build=1
set doinstall=1
:params

rem ## unquote: %~1%
set a=%~1%

if "%a%"=="" goto endparams
if "%a%"=="--output" (set "installpath=%~2%" & shift & shift & goto params)
if "%a%"=="clean"    (shift & set clean=1 & set build=0 & set doinstall=0 & goto params)
if "%a%"=="build"    (shift & set clean=0 & set build=1 & set doinstall=0 & goto params)
if "%a%"=="rebuild"  (shift & set clean=1 & set build=1 & set doinstall=0 & goto params)
if "%a%"=="install"  (shift & set clean=0 & set build=0 & set doinstall=1 & goto params)
if "%a%"=="all"      (shift & set clean=0 & set build=1 & set doinstall=1 & goto params)

goto usage
:endparams

echo Output dir: %installpath%
echo Output dir: %installpath% >>%logfile%

set compile_cnt=0
set compile_errors=0
set compile_ok=0
set copy_ok=0
set copy_errors=0
echo. >%logfile%

if /i %clean%==0 goto skip_clean
  echo Cleaning output files...
  echo Cleaning output files... >>%logfile%
  for %%f in (%peg_files%) do (
    if exist "%%~dpnf.js" (
      del "%%~dpnf.js"
      echo Deleted %%~dpnf.js >>%logfile%
    )
  )
:skip_clean

if /i %build%==0 goto skip_build
  echo.Compiling PEG files...
  echo.Compiling PEG files... >>%logfile%

  echo.DEBUG:peg_cmd=%peg_cmd% >>%logfile%
  echo.DEBUG:peg_opts=%peg_opts% >>%logfile%
  echo.DEBUG:peg_files=%peg_files% >>%logfile%
  echo.DEBUG:files=%files% >>%logfile%

  for %%f in (%peg_files%) do (
    rem %%~nf expands to base filename (strips extension)

    echo. >>%logfile%
    echo.-------------------------------------------------------------------------------- >>%logfile%
    echo.Compiling %%f
    echo.%%f >>%logfile%
    call :compile_peg %%f
    set /A compile_cnt=!compile_cnt! + 1
    if exist "%%~dpnf.js" (
      echo Compile ok: %%~dpnf.js >>%logfile%
      set /A compile_ok=!compile_ok! + 1
    ) else (
      echo Compile Failed: Missing %%~dpnf.js >>%logfile%
      set /A compile_errors=!compile_errors! + 1
    )
    echo.-------------------------------------------------------------------------------- >>%logfile%
  )

  echo.Compiled !compile_ok! files, !compile_errors! errors.
  echo. >>%logfile%
  echo.Compiled !compile_ok! files, !compile_errors! errors. >>%logfile%
:skip_build

if /i %doinstall%==0 goto skip_install
  echo.Copying compiled JS and common files to "%installpath%"...
  echo. >>%logfile%
  echo.Copying compiled JS and common files to "%installpath%"... >>%logfile%
  for %%f in (%peg_files%) do (
    del "%installpath%\%%~nf.js" >nul 2>&1
    if exist "%%~dpnf.js" (
      copy /V "%%~dpnf.js" %installpath%\ >nul 2>&1
      if exist "%installpath%\%%~nf.js" (
        echo Copied %%~dpnf.js >>%logfile%
        set /A copy_ok=!copy_ok! + 1
      ) else (
        echo Error copying %%~dpnf.js to "%installpath%" >>%logfile%
        set /A copy_errors=!copy_errors! + 1
      )
    )
  )
  for %%f in (%other_files%) do (
    del "%installpath%\%%~nxf" >nul 2>&1
    if exist "%%~dpnxf" (
      copy /V "%%~dpnxf" %installpath%\ >nul 2>&1
      if exist "%installpath%\%%~nxf" (
        echo Copied %%~dpnxf >>%logfile%
        set /A copy_ok=!copy_ok! + 1
      ) else (
        echo Error copying %%~dpnxf to "%installpath%" >>%logfile%
        set /A copy_errors=!copy_errors! + 1
      )
    )
  )
  echo.Copied !copy_ok! files, !copy_errors! errors.
  echo. >>%logfile%
  echo.Copied !copy_ok! files, !copy_errors! errors. >>%logfile%
:skip_install

set /A errors=%copy_errors% + %compile_errors%
rem type %logfile%
echo.Done, %errors% errors (see %logfile%).
echo. >>%logfile%
echo.Done, %errors% errors. >>%logfile%
endlocal
exit /B %errors%

:compile_peg
  set f=%1
  if exist "%~dpn1.js" (
    del "%~dpn1.js"
  )
  set errorlevel=
  call %peg_cmd% %peg_opts% %f% >%tmpfile% 2>&1
  set /A errors=0+!errorlevel!
  if /i %errors% gtr 0 (
    del "%~dpn1.js"
    echo.
    echo Error in %f%:
    type %tmpfile%
    echo.
  )
  type %tmpfile% >>%logfile%
  del %tmpfile%
goto :eof

:usage
  echo Script usage is:
  echo     %me% [command]
  echo where [command] is: clean ^| build (default) ^| rebuild ^| install
  echo:
  echo For example:
  echo     %me%
  echo     %me% clean
  echo     %me% build
  echo     %me% install
goto :eof

rem TODO: (later) set result file timestamp same as source file. skip files in build that have matching timestamps (a.k.a. "quick build")