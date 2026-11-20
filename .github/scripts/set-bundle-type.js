// Marks a Tauri exe as the one shipped inside the NSIS installer.
//
// `tauri bundle` normally writes the bundle type into the exe while packaging,
// so the updater knows which kind of install it is running from. That edit
// would break an Authenticode signature, so release.yml writes it here before
// SignPath signs the exe and then packages with --no-binary-patching.
//
// Usage: node set-bundle-type.js <input.exe> <output.exe>

const fs = require("fs");

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node set-bundle-type.js <input.exe> <output.exe>");
  process.exit(2);
}

const unknown = Buffer.from("__TAURI_BUNDLE_TYPE_VAR_UNK");
const nsis = Buffer.from("__TAURI_BUNDLE_TYPE_VAR_NSS");

const data = fs.readFileSync(input);
const at = data.indexOf(unknown);
if (at < 0 || data.indexOf(unknown, at + 1) >= 0) {
  console.error(`Expected the bundle type marker exactly once in ${input}`);
  process.exit(1);
}

nsis.copy(data, at);
fs.writeFileSync(output, data);
console.log(`Wrote ${output} with bundle type NSIS`);
