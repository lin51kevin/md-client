; MarkLite Installer Script (NSIS)
; Usage: makensis installer.nsi

!include "FileFunc.nsh"
!include "WinVer.nsh"

!define APPNAME "MarkLite"
!define COMPANYNAME "MarkLite"
!define DESCRIPTION "A lightweight Markdown Editor"
!define VERSION "0.7.0"
!define EXENAME "marklite.exe"

; Default install location
InstallDir "$LOCALAPPDATA\MarkLite"

; Request admin privileges for file association registration
RequestExecutionLevel user

; Interface settings
!define MUI_ICON "..\src-tauri\icons\icon.ico"
!define MUI_UNICON "..\src-tauri\icons\icon.ico"
!define MUI_HEADERIMAGE

; Pages
Page directory
Page components
Page instfiles

UnPage confirm
UnPage instfiles

; Show install details (silent-friendly)
ShowInstDetails show
ShowUnDetails show

Section "MarkLite Core" SecCore
  SetOutPath $INSTDIR
  
  ; Extract all files from the ZIP/NSIS archive
  File /r "*.*"
  
  ; Write uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section /o "Desktop Shortcut" SecDesktop
  CreateShortCut "$DESKTOP\MarkLite.lnk" "$INSTDIR\${EXENAME}" "" "" 0
SectionEnd

Section /o "Start Menu Entry" SecStartMenu
  CreateDirectory "$SMPROGRAMS\MarkLite"
  CreateShortCut "$SMPROGRAMS\MarkLite\MarkLite.lnk" "$INSTDIR\${EXENAME}" "" "" 0
  CreateShortCut "$SMPROGRAMS\MarkLite\Uninstall.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

Section "-File Associations" SecAssoc
  ; Register .md file association
  WriteRegStr HKCR ".md" "" "MarkLite.md"
  WriteRegStr HKCR "MarkLite.md" "" "Markdown File"
  WriteRegStr HKCR "MarkLite.md\shell\open\command" "" '"$INSTDIR\${EXENAME}" "%1"'
  WriteRegStr HKCR "MarkLite.doc\DefaultIcon" "" '$INSTDIR\${EXENAME},0'
  
  ; Register .markdown file association
  WriteRegStr HKCR ".markdown" "" "MarkLite.markdown"
  WriteRegStr HKCR "MarkLite.markdown" "" "Markdown File"
  WriteRegStr HKCR "MarkLite.markdown\shell\open\command" '''"$INSTDIR\${EXENAME}" "%1"'
  WriteRegStr HKCR "MarkLite.markdown\DefaultIcon" "" '"$INSTDIR\${EXENAME}",0'

  ; Notify shell of file association changes
  ${If} ${AtLeastWinVista}
    System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
  ${EndIf}
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\MarkLite.lnk"
  
  RMDir /r "$SMPROGRAMS\MarkLite"
  
  Delete "$INSTDIR\uninstall.exe"
  Delete "$INSTDIR\${EXENAME}"
  Delete "$INSTDIR\README.html"
  RMDir /r $INSTDIR
  
  ; Remove registry entries
  DeleteRegKey HKCR "MarkLite.md"
  DeleteRegKey HKCR "MarkLite.markdown"
  DeleteRegValue HKCR ".md" ""
  DeleteRegValue HKCR ".markdown" ""
SectionEnd

LangString DESC_SecCore ${LANG_ENGLISH} "Core MarkLite files."
LangString DESC_SecDesktop ${LANG_ENGLISH} "Create a shortcut on the desktop."
LangString DESC_SecStartMenu ${LANG_ENGLISH} "Add MarkLite to the Start Menu."
LangString DESC_SecAssoc ${LANG_ENGLISH} "Register .md and .markdown file associations."

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecCore} $(DESC_SecCore)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecStartMenu} $(DESC_SecStartMenu)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecAssoc} $(DESC_SecAssoc)
!insertmacro MUI_FUNCTION_DESCRIPTION_END
