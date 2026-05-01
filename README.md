# webserp for pi-mono

## requirements
- `pip install webserp`
- or `uv tool install webserp`

## installation

copy webserp.ts into ~/.pi/agent/extensions/webserp.ts file.
And you'll be able to search the web. Finally.

Or from this checkout:

```sh
make install
```

## tools

- `webserp_search`: searches DuckDuckGo, Brave, and Presearch through `webserp`.

Search results are marked as unverified. The agent is instructed to verify relevant
links with the best available active web-fetch tool before relying on snippets or
sharing links. Install/enable a fetch extension such as `pi-smart-fetch` if your
agent setup does not already provide one.
