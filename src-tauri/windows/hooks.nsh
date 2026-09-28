; Extra installer steps for Windows, run by Tauri's NSIS installer.
;
; Tauri registers JSONinja's file types (JSON, JSON Lines, JSONC, JSON5), but
; Windows only lets the user pick a default app, and only lists apps that
; register "capabilities". This adds that registration so JSONinja appears in
; Settings > Default apps, and File > System Integration can open its page there.
;
; SHCTX is HKCU for this per-user install. Keep the list in sync with
; fileAssociations in tauri.conf.json and ASSOCIATIONS in src/registry.rs.

!macro JSONINJA_REGISTER EXT PROGID
  ; Tauri writes the open command without quotes around the exe path, which
  ; breaks when the install folder has a space in it (for example C:\Users\Jo Smith)
  WriteRegStr SHCTX "Software\Classes\${PROGID}\shell\open\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
  WriteRegStr SHCTX "Software\Classes\${PROGID}\shell\open" "FriendlyAppName" "JSONinja"
  WriteRegStr SHCTX "Software\Classes\.${EXT}\OpenWithProgids" "${PROGID}" ""
  WriteRegStr SHCTX "Software\JSONinja\Capabilities\FileAssociations" ".${EXT}" "${PROGID}"
!macroend

!macro JSONINJA_UNREGISTER EXT PROGID
  DeleteRegValue SHCTX "Software\Classes\.${EXT}\OpenWithProgids" "${PROGID}"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  !insertmacro JSONINJA_REGISTER "json" "JSONinja.json"
  !insertmacro JSONINJA_REGISTER "jsonl" "JSONinja.jsonl"
  !insertmacro JSONINJA_REGISTER "ndjson" "JSONinja.jsonl"
  !insertmacro JSONINJA_REGISTER "jsonc" "JSONinja.jsonc"
  !insertmacro JSONINJA_REGISTER "json5" "JSONinja.json5"

  WriteRegStr SHCTX "Software\JSONinja\Capabilities" "ApplicationName" "JSONinja"
  WriteRegStr SHCTX "Software\JSONinja\Capabilities" "ApplicationDescription" "A small, fast viewer for JSON, JSON Lines, JSONC and JSON5"
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
    !insertmacro JSONINJA_UNREGISTER "json" "JSONinja.json"
    !insertmacro JSONINJA_UNREGISTER "jsonl" "JSONinja.jsonl"
    !insertmacro JSONINJA_UNREGISTER "ndjson" "JSONinja.jsonl"
    !insertmacro JSONINJA_UNREGISTER "jsonc" "JSONinja.jsonc"
    !insertmacro JSONINJA_UNREGISTER "json5" "JSONinja.json5"
    !insertmacro UPDATEFILEASSOC
  ${EndIf}
!macroend
