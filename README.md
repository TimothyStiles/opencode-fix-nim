# opencode-fix-nim

This is a quick hack to get tool usage working with models hosted by Nvidia in opencode which more or less fixes this [issue](https://github.com/anomalyco/opencode/issues/6290) though there may be a few rendering bugs. 

NIM provides a lot of really great opensource models for free that you can use with opencode but for some reason Nvidia doesn't use the standard api responses everyone else uses so tool usage was unreliable as of writing. 

This plugin essentially installs a super tiny local proxy in your opencode plugins directory and the intercepts responses from NVIDIA NIM tool calls that are missing the required 'ID; field and injects unique IDs for each tool call. For this to work it also modifies your opencode.json config and leaves instructions on how to revert.

Hopefully this plugin will be moot after this [PR from @T1mn](https://github.com/anomalyco/opencode/pull/12585) is merged but until then I hope this helps.

## Install

```bash
npm install -g opencode-fix-nim
```

This modifies your `~/.config/opencode/opencode.json` to route NVIDIA requests through the proxy. A backup is created automatically.

## Usage

```bash
opencode
```

The proxy runs on `localhost:9876` and patches tool responses automatically.

## Uninstall

npm v7+ does not run lifecycle scripts on uninstall, so you must clean up the config manually before removing the package:

```bash
node $(npm root -g)/opencode-nim-fix/scripts/uninstall.js
npm uninstall -g opencode-nim-fix
```

The uninstall script removes the proxy `baseURL` from your nvidia provider config and removes `opencode-nim-fix` from the plugin array. Nothing else is touched.

## License

MIT
