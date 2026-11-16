# Mermaker

Mermaker shows a Mermaid diagram file (`.mmd`) in your browser, and you can edit the diagram there with the mouse
and the keyboard. Mermaker writes each edit into the file as a small text change. The file stays plain Mermaid, and
it is the only copy of the diagram.

You, your text editor and an AI agent can work on the same file at the same time. When the file changes, the page
draws it again within about a second.

Mermaker edits flowcharts (`flowchart` and `graph`). It shows other types of diagram, but you cannot edit them.

![Mermaker showing a flowchart with subgraphs, in the browser](docs/screenshot.png)

## Getting started

You need:

- Node 22 or later.
- A browser with internet access. The page loads Mermaid from a CDN.

Install Mermaker from a clone of this repository:

```bash
git clone https://github.com/arcanemachine/mermaker.git
cd mermaker
npm install -g .
```

If npm refuses to install for lack of permissions, use `./run.sh` in the clone in place of `mermaker`, with the same
arguments (`./run.sh diagram.mmd`, `./run.sh skill`). It needs no install.

**Open one file:**

```bash
mermaker path/to/diagram.mmd
```

Mermaker prints the page's address. Open the address in your browser. Mermaker serves only that file.

To get the same address each time, add a port: `mermaker diagram.mmd 6378`. If a Mermaker already serves the file on
that port, Mermaker prints its address and does not start another.

**Serve a folder of diagrams** from one long-running server:

```bash
MERMAKER_ROOTS=/path/to/diagrams/ mermaker serve
```

Mermaker prints the address to open, with your file's absolute path in place of `<path>`:
`http://localhost:63762/?f=<path>` (63762 is the default port).

- If you do not set `MERMAKER_ROOTS`, Mermaker serves `/tmp/mermaid-diagrams/`. Give several folders with commas.
- If the address has no `?f=`, the page shows the scratch diagram, `/tmp/mermaid-diagrams/scratch.mmd`. Mermaker
  makes that file when it starts, if it is missing. The page can show it only if that folder is in
  `MERMAKER_ROOTS`.
- The address can also open the page on one subgraph or one node (`docs/guide.md`, Viewing).

Mermaker runs until you stop it with Ctrl+C (or end its process).

## A skill for agents

Mermaker is made to work with AI agents. An agent edits the file, and the page shows each change while you watch
and edit too.

`mermaker skill` prints an agent skill (`SKILL.md`). The skill tells an agent how to serve a diagram, give you the
page, and work on the same file with you. Save it as `mermaker/SKILL.md` in the folder your agent reads skills from:

```bash
mkdir -p <skills folder>/mermaker
mermaker skill > <skills folder>/mermaker/SKILL.md
```

The skill has the Mermaker version and a hash of its text. So an agent can see when its copy is different from the
Mermaker in use. The agent can then offer to update the copy, and keep the copy's Custom rules section.

## Using the page

- To see what you can do with a node, an edge, a subgraph or empty space, right-click it (or touch and hold it).
- To edit a node or an edge, double-click it.
- The Help button shows the main keys.
- The Code button shows the file's code next to the diagram.

`docs/guide.md` tells what each gesture, menu item and key does.

## Settings

Settings are environment variables. Mermaker reads them when it starts.

| Setting | What it does |
|---|---|
| `MERMAKER_ROOTS` | For `serve`: folders whose `.mmd` files may be served, comma-separated. Default `/tmp/mermaid-diagrams/` |
| `MERMAKER_PATH_MAP` | `server=host` path prefixes, comma-separated. The page shows a file's host path, for a server in a container |
| `MERMAKER_IDLE` | Seconds with no requests before the server exits. Unset or 0: it runs until stopped. An open page polls every second, but a browser may freeze or unload a tab left in the background, which then stops asking |
| `BROWSER` | For `mermaker <file>`: a command to open the page with, arguments allowed (`firefox --new-tab`). Unset: the address is only printed |
| `MERMAKER_MAX_EDGES` | The most edges a diagram may have. Default: Mermaid's 500 |
| `MERMAKER_SCRIPT` | A JavaScript module of your own, which the page loads. Run script (Shift+X) calls its exported functions by the names a diagram's `click` lines give (`docs/guide.md`, Scripts of your own) |
| `MERMAKER_THEME` | The page theme a browser starts with, until it picks one in the page: `light`, `dark` or `system` (the system's setting). Default: `light` |
| `MERMAKER_MAX_TEXT` | The most characters a diagram's code may have, leaving out comments and frontmatter. Default: Mermaid's 50,000. Mermaid's drawing slows as diagrams grow, so a higher limit is no promise of a quick render |
| `MERMAKER_HOSTS` | Host names the page may be opened under, besides `localhost`, `127.0.0.1` and `[::1]` (and the bound address, when it is a single one), comma-separated. Requests addressed to any other name are refused, which stops DNS rebinding |

The server listens on `127.0.0.1` unless you give it a host: `mermaker serve [port] [host]`. The default port is 63762,
and the default host is `127.0.0.1`.

## Security

Mermaker has no login. If you bind it to an address other than `127.0.0.1`, anyone who can reach the machine can read
and edit the diagrams it serves.

- Mermaker serves only `.mmd` files in `MERMAKER_ROOTS`.
- Mermaker refuses a request to a host name that it does not know (`MERMAKER_HOSTS`).
- Anyone who can reach the server can read the `MERMAKER_SCRIPT` file, and any diagram it serves can call the
  functions that file exports, once you press Shift+X on its node.

To open the page from another device, start the server on all addresses, with the name or IP address that the device
uses for this machine in `MERMAKER_HOSTS`:

```bash
MERMAKER_HOSTS=192.168.1.20 mermaker serve 63762 0.0.0.0
```

## Contributing

`AGENTS.md` has the rules for changes to Mermaker, and a map of its code. `docs/ux.md` has the rules that the page
follows, and the reasons for them.

## License

MIT
