## Getting started

### Prerequisites

- Node

```
curl https://get.volta.sh | bash
volta install node
```

### Install dependencies

```
npm install
```

#### Optional dependencies

```
npm i -g firebase-tools
```

---

### Start the development server

```
npm start
```

### Build for production

```
npm run build
```

### Build for production and start preview server

```
npm run preview
```

## Tooling

**Code formatting**

- oxfmt (`npm run format`, `npm run format:fix`)

**Linting**

- oxlint, with eslint-plugin-solid and eslint-plugin-perfectionist as JS plugins (`npm run lint`, `npm run lint:fix`)
- Warnings fail CI.
- The JS plugins need eslint 10 as a peer dependency. npm installs it. Do not use `--legacy-peer-deps`, because then npm drops eslint and the plugins cannot load.

**Type checking**

- TypeScript 7 (`npm run typecheck`)

`npm run check` runs format, lint and typecheck.

**Editor**

- VS Code: install the recommended extensions (oxc, TypeScript 7, EditorConfig).

**Git blame**

- To make local `git blame` skip the format commit, run this one time. GitHub does this by itself.

```
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

**Testing**

- Vitest

**CSS tooling**

- PostCSS + Autoprefixer
- Sass

**JS framework**

- SolidJS

**Build tooling**

- Vite

**Hosting**

- Firebase

**CI/CD**

- GitHub Actions
