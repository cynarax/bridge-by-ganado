#!/usr/bin/env node
// A host-supplied, visible user setting is required. No permission bypass.
if(process.env.BRIDGE_BUNDLE_LOCAL_ACCESS!=='true'){
 process.stderr.write('Ganado Bridge is disabled. Enable owner-level local file/terminal access in the extension configuration only after reading the security notice.\n');
 process.exitCode=1;
}else{
 process.argv=[process.execPath,new URL('./bridge.mjs',import.meta.url).pathname,'serve','--allow-local-access'];
 await import('./bridge.mjs');
}
