# gorfed.net

Static portfolio for [gorfed.net](https://gorfed.net/), built from HTML, CSS, and JavaScript in the project root. Generated output lives in `dist/` (ignored by git) and is what you deploy to hosting.

## Repository

- **GitHub:** https://github.com/gorfednet/gorfed.net.git  
- Clone: `git clone https://github.com/gorfednet/gorfed.net.git`  
- SSH: `git clone git@github.com:gorfednet/gorfed.net.git`

## Prerequisites

- **Node.js** (for `npm` and the pretext bundle build)
- **Python 3** (build scripts and `make test`)
- **make**
- **rsync** (build and SMB deploy)

## First-time setup

```bash
cd gorfed.net
npm install
cp .deploy-env.example .deploy-env
# Edit .deploy-env: set SMB_MOUNT (mounted path) or SMB_URL for deploy
```

Secrets and deploy targets stay in `.deploy-env`, which is gitignored. Do not commit it.

## Build and quality checks

```bash
make build   # clean, bundle pretext, rsync to dist/, run build scripts
make test    # requires a successful build; runs structure and content checks
```

Edit files in the project root (not under `dist/`). After changes, run `make build` so `dist/` matches. To refresh the root from a mistaken `dist/` edit: `rsync -av dist/ ./` (use only when you mean to mirror `dist/` back).

## Deploy (SMB)

With `.deploy-env` or the environment providing `SMB_MOUNT` or `SMB_URL`:

```bash
make deploy
```

This runs `make build` then `deploy-to-smb.sh`. If rsync reports exit code 23, the site may still have synced; check logs for SMB “Resource busy” / `.smbdelete*` cleanup issues on the server share.

## Pushing this project to GitHub

If this folder is not yet a git repository:

```bash
cd gorfed.net
git init
git branch -M main
git remote add origin https://github.com/gorfednet/gorfed.net.git
# or: git remote add origin git@github.com:gorfednet/gorfed.net.git
git add -A
git status   # confirm .deploy-env and node_modules/ are not listed
git commit -m "Initial import of gorfed.net static site"
git push -u origin main
```

If the repo already exists on GitHub with content, you may need `git pull origin main --allow-unrelated-histories` before the first push, or use an empty repo on GitHub for a clean first push.

## Layout

- **`*.html`, `css/`, `js/`, `img/`, etc.** — source of truth  
- **`build/`** — Python and tooling for inject, cache-bust, route tests  
- **`dist/`** — build output; do not edit by hand  
- **`ref/`** — shared header/footer fragments synced by build (see `REFERENCE.md`)

Markdown files are excluded from the deploy rsync; they are for contributors only.
