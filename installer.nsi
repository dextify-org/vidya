!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

!define APPNAME "VIDYA"
!define APPVERSION "1.0.0"
!define PUBLISHER "DEXTIFY"
!define WEBSITE "https://vidya.media"
!define DESCRIPTION "A media server for video lectures"

InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"
InstallDirRegKey HKCU "Software\${PUBLISHER}\${APPNAME}" "InstallDir"

Name "${APPNAME}"
OutFile "${APPNAME}-x64.exe"
BrandingText "VIDYA"

RequestExecutionLevel user

Var RemoveUserData

!define MUI_ICON "resources\app-icon.ico"
!define MUI_UNICON "resources\app-icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "resources\installer-side.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "resources\installer-side.bmp"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\VIDYA.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Start ${APPNAME}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
UninstPage custom un.DataRemovalPage un.DataRemovalPageLeave
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Function .onInit
  SetShellVarContext current
  System::Call "kernel32::GetCurrentProcess() i.s"
  System::Call "kernel32::IsWow64Process(i s, *i .r0)"
  ${If} $0 == 0
    MessageBox MB_OK|MB_ICONSTOP "This application requires a 64-bit operating system."
    Abort
  ${EndIf}
  
  SetRegView 64
FunctionEnd

; Helper function to convert backslashes to forward slashes
Function ConvertBackslashToForwardslash
  Exch $0 ; Input string
  Push $1 ; Counter
  Push $2 ; String length
  Push $3 ; Current character
  Push $4 ; Output string
  
  StrCpy $4 ""
  StrLen $2 $0
  StrCpy $1 0
  
  Loop:
    ${If} $1 >= $2
      Goto Done
    ${EndIf}
    
    StrCpy $3 $0 1 $1
    ${If} $3 == "\"
      StrCpy $4 "$4/"
    ${Else}
      StrCpy $4 "$4$3"
    ${EndIf}
    
    IntOp $1 $1 + 1
    Goto Loop
  
  Done:
  StrCpy $0 $4
  
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Exch $0
FunctionEnd

; Simplified process checking function
Function un.IsProcessRunningSimple
  Exch $0 ; Process name
  Push $1 ; Return code
  Push $2 ; Output
  Push $3 ; Temp for string operations
  
  DetailPrint "Checking for process: $0"
  
  ; Use tasklist to check for the process
  nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq $0" /NH'
  Pop $1 ; Return code
  Pop $2 ; Output
  
  DetailPrint "Tasklist return code: $1"
  DetailPrint "Tasklist output: $2"
  
  ; Check if tasklist executed successfully
  ${If} $1 == 0
    ; Check if output contains "No tasks" message
    Push $2
    Push "No tasks"
    Call un.StrStrCheck
    Pop $3
    
    ${If} $3 == ""
      ; "No tasks" not found, check if process name is in output
      Push $2
      Push "$0"
      Call un.StrStrCheck
      Pop $3
      
      ${If} $3 == ""
        StrCpy $0 "false"
        DetailPrint "Process name not in output - not running"
      ${Else}
        StrCpy $0 "true"
        DetailPrint "Process name found in output - running"
      ${EndIf}
    ${Else}
      StrCpy $0 "false"
      DetailPrint "No tasks message found - process not running"
    ${EndIf}
  ${Else}
    DetailPrint "Tasklist failed - assuming not running"
    StrCpy $0 "false"
  ${EndIf}
  
  Pop $3
  Pop $2
  Pop $1
  Exch $0
FunctionEnd

; Helper function for string searching
Function un.StrStrCheck
  Exch $R0 ; needle
  Exch 1
  Exch $R1 ; haystack
  Push $R2
  Push $R3
  Push $R4
  Push $R5
  
  StrLen $R3 $R0
  StrCpy $R4 0
  
  ; Loop through haystack
  loop:
    StrCpy $R2 $R1 $R3 $R4
    ${If} $R2 == $R0
      StrCpy $R0 $R4
      Goto done
    ${EndIf}
    StrLen $R5 $R1
    ${If} $R4 >= $R5
      StrCpy $R0 ""
      Goto done
    ${EndIf}
    IntOp $R4 $R4 + 1
    Goto loop
  
  done:
  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
  Exch $R0
FunctionEnd

; Main process checking function
Function un.CheckProcessRunning
  Exch $0 ; Process name
  Push $1 ; Result
  
  DetailPrint "=== Checking if $0 is running ==="
  
  ; Use the simplified tasklist method
  Push $0
  Call un.IsProcessRunningSimple
  Pop $1
  
  DetailPrint "Process check result for $0: $1"
  StrCpy $0 $1
  
  Pop $1
  Exch $0
FunctionEnd

Function un.CheckProcesses
  DetailPrint "=== Starting process check ==="
  
  CheckVIDYA:
    DetailPrint "Checking for VIDYA.exe..."
    Push "VIDYA.exe"
    Call un.CheckProcessRunning
    Pop $0
    
    DetailPrint "VIDYA.exe check result: $0"
    
    ${If} $0 == "true"
      DetailPrint "VIDYA.exe is running!"
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION \
        "VIDYA is currently running and must be closed before uninstalling.$\r$\n$\r$\nPlease close VIDYA completely, then click Retry.$\r$\n$\r$\nClick Cancel to abort the uninstallation." \
        IDRETRY CheckVIDYA IDCANCEL CancelUninstall
    ${Else}
      DetailPrint "VIDYA.exe is not running - OK"
    ${EndIf}
  
  DetailPrint "=== Process check completed - all clear ==="
  Return
  
  CancelUninstall:
    DetailPrint "Uninstallation cancelled by user"
    Abort
FunctionEnd

Function un.onInit
  SetShellVarContext current
  DetailPrint "Uninstaller starting..."
FunctionEnd

Section "VIDYA (required)" SEC_MAIN
  SectionIn RO
  SetOutPath "$INSTDIR"
  
  CreateDirectory "$INSTDIR\app"
  
  SetOutPath "$INSTDIR\node"
  File "node\node.exe"
  
  SetOutPath "$INSTDIR\app"
  File /r "staging\backend\*.*"

  SetOutPath "$INSTDIR\node_modules"
  File /r "staging\node_modules\*.*"
  
  SetOutPath "$INSTDIR\build"
  File /r "build\*.*"
  
  SetOutPath "$INSTDIR"
  File /r "tray\*.*"
  
  SetOutPath "$INSTDIR"
  File /r "resources\*.*"
  
  CreateDirectory "$LOCALAPPDATA\${APPNAME}\assets"
  SetOutPath "$LOCALAPPDATA\${APPNAME}\assets"
  SetOverwrite on
  File /r "assets\*.*"
  Push "$LOCALAPPDATA\${APPNAME}"
  Call ConvertBackslashToForwardslash
  Pop $1
  
  FileOpen $0 "$INSTDIR\dataPath.json" w
  FileWrite $0 '{"dataPath": "$1"}'
  FileClose $0
  
  FileOpen $0 "$INSTDIR\start-app.bat" w
  FileWrite $0 "@echo off$\r$\n"
  FileWrite $0 'cd /d "$INSTDIR\app"$\r$\n'
  FileWrite $0 'set "PATH=$INSTDIR\node;%PATH%"$\r$\n'
  FileWrite $0 '"$INSTDIR\node\node.exe" index.js$\r$\n'
  FileClose $0
  
  SetRegView 64
  
  WriteRegStr HKCU "Software\${PUBLISHER}" "" ""
  WriteRegStr HKCU "Software\${PUBLISHER}\${APPNAME}" "" ""
  WriteRegStr HKCU "Software\${PUBLISHER}\${APPNAME}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\${PUBLISHER}\${APPNAME}" "DataPath" "$LOCALAPPDATA\${APPNAME}"
  
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\VIDYA.exe" "" "$INSTDIR\app-icon.ico"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  
  CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\VIDYA.exe" "" "$INSTDIR\app-icon.ico"
  
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  SetRegView 64
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "${APPVERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "${PUBLISHER}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "URLInfoAbout" "${WEBSITE}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$INSTDIR\app-icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoRepair" 1

  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "EstimatedSize" "225000"
SectionEnd

Section /o "Start VIDYA automatically with Windows" SEC_AUTOSTART
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APPNAME}" '"$INSTDIR\VIDYA.exe"'
SectionEnd

Function un.DataRemovalPage
  nsDialogs::Create 1018
  Pop $0
  
  ${NSD_CreateLabel} 0 0 100% 40u "Do you want to remove user data and settings?$\r$\n$\r$\nThis will permanently delete all your ${APPNAME} data including:"
  Pop $1
  
  ${NSD_CreateLabel} 20u 45u 100% 20u "• Application settings and preferences"
  Pop $2
  
  ${NSD_CreateLabel} 20u 60u 100% 20u "• User data and media files"
  Pop $3
  
  ${NSD_CreateLabel} 20u 75u 100% 20u "• Cache and temporary files"
  Pop $4
  
  ${NSD_CreateCheckbox} 0 100u 100% 15u "Yes, remove all user data and settings"
  Pop $5
  
  ${NSD_CreateLabel} 0 120u 100% 40u "Note: If you uncheck this option, your data will be preserved and available if you reinstall ${APPNAME} later."
  Pop $6
  
  nsDialogs::Show
FunctionEnd

Function un.DataRemovalPageLeave
  ${NSD_GetState} $5 $RemoveUserData
FunctionEnd

Section "Uninstall"
  SetRegView 64
  
  DetailPrint "=== Final process check before uninstallation ==="
  Call un.CheckProcesses
  
  DetailPrint "Process check completed - proceeding with file removal"
  
  ; Add a small delay to ensure processes are fully closed
  Sleep 1000
  
  RMDir /r "$INSTDIR\app"
  RMDir /r "$INSTDIR\build"
  RMDir /r "$INSTDIR\node"
  RMDir /r "$INSTDIR\node_modules"
  RMDir /r "$INSTDIR\resources"
  Delete "$INSTDIR\VIDYA.exe"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\dataPath.json"
  Delete "$INSTDIR\start-app.bat"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
  
  RMDir /r "$SMPROGRAMS\${APPNAME}"
  
  Delete "$DESKTOP\${APPNAME}.lnk"
  
  ${If} $RemoveUserData == ${BST_CHECKED}
    ReadRegStr $0 HKCU "Software\${PUBLISHER}\${APPNAME}" "DataPath"
    ${If} $0 != ""
      RMDir /r "$0"
      DetailPrint "Removed user data from: $0"
    ${Else}
      RMDir /r "$LOCALAPPDATA\${APPNAME}"
      DetailPrint "Removed user data from: $LOCALAPPDATA\${APPNAME}"
    ${EndIf}
  ${Else}
    DetailPrint "User data preserved at: $LOCALAPPDATA\${APPNAME}"
  ${EndIf}
  
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APPNAME}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
  DeleteRegKey HKCU "Software\${PUBLISHER}\${APPNAME}"
  DeleteRegKey /ifempty HKCU "Software\${PUBLISHER}"
  
  DetailPrint "Uninstallation completed successfully"
SectionEnd
