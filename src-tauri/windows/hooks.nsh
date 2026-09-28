; Extra installer steps for Windows, run by Tauri's NSIS installer.
;
; Tauri registers the JSONinja.json file type, but Windows only lets the user
; pick a default app, and only lists apps that register "capabilities". This
; adds that registration so JSONinja appears in Settings > Default apps, and
; File > System Integration can open its page there.
;
; SHCTX is HKCU for this per-user install.

!macro NSIS_HOOK_POSTINSTALL
  ; Tauri writes the open command without quotes around the exe path, which
  ; breaks when the install folder has a space in it (for example C:\Users\Jo Smith)
  WriteRegStr SHCTX "Software\Classes\JSONinja.json\shell\open\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
  WriteRegStr SHCTX "Software\Classes\JSONinja.json\shell\open" "FriendlyAppName" "JSONinja"
  WriteRegStr SHCTX "Software\Classes\.json\OpenWithProgids" "JSONinja.json" ""

  WriteRegStr SHCTX "Software\JSONinja\Capabilities" "ApplicationName" "JSONinja"
  WriteRegStr SHCTX "Software\JSONinja\Capabilities" "ApplicationDescription" "A small, fast JSON viewer"
  WriteRegStr SHCTX "Software\JSONinja\Capabilities\FileAssociations" ".json" "JSONinja.json"
  WriteRegStr SHCTX "Software\RegisteredApplications" "JSONinja" "Software\JSONinja\Capabilities"

  ; 2.0 and 2.1 registered under the generic name "JSON File". Updating runs
  ; their uninstaller, which removes it, but a reinstall of the same version
  ; doesn't, so remove it here too when it points at this install
  ReadRegStr $R9 SHCTX "Software\Classes\JSON File\shell\open\command" ""
  ${If} $R9 == '$INSTDIR\${MAINBINARYNAME}.exe "%1"'
    DeleteRegKey SHCTX "Software\Classes\JSON File"
  ${EndIf}

  !insertmacro UPDATEFILEASSOC
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; An update reinstalls straight after this, so leave the registration alone
  ; rather than briefly removing the app the user chose as their default
  ${If} $UpdateMode <> 1
    DeleteRegValue SHCTX "Software\RegisteredApplications" "JSONinja"
    DeleteRegKey SHCTX "Software\JSONinja"
    DeleteRegValue SHCTX "Software\Classes\.json\OpenWithProgids" "JSONinja.json"
    !insertmacro UPDATEFILEASSOC
  ${EndIf}
!macroend
