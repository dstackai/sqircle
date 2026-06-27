# Legacy Static Snapshots

The former static HTML/CSS prototypes are archived locally under `legacy-static/`. That folder is listed in `.gitignore`, so these files are not part of the maintainable source tree.

Use the snapshots only when you need to compare against the exploration-era output:

- `legacy-static/index.html`: old CSS-only hero and single-state drawer.
- `legacy-static/demo.html`: old generated preset gallery.
- `legacy-static/constructor.html`: old hand-coded constructor prototype.
- `legacy-static/static/styles.css`: stylesheet copied with the snapshots so they can still open directly.

Current source-of-truth pages are React examples:

- `index.html` mounts `src/pages/IndexPage.tsx`.
- `demo.html` mounts `src/pages/DemoPage.tsx`.
- `constructor.html` and `react.html` mount `src/pages/ConstructorPage.tsx`.

Do not add new behavior to `legacy-static/`. Migrate useful behavior into `src/squircle` or `src/pages` instead.
