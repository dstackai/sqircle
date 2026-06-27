# Documentation Index

This repo is primarily about the reusable Squircle React component in `src/squircle`. The root HTML files are React-backed examples that mount `src/pages` entrypoints; legacy static snapshots are kept only in the ignored `legacy-static/` archive.

## Start Here

| Need | Read |
| --- | --- |
| Use the main React renderer | [React Component Guide](./react/README.md) |
| Use or maintain the constructor editor | [Editor Guide](./react/editor.md) |
| Change geometry, gradients, labels, wireframes, or colors | [Design Documentation](./design/README.md) |
| Maintain the local React examples | [React Example Pages](./examples/README.md) |
| Compare against old static snapshots | [Legacy Static Snapshots](./static/README.md) |
| Check work before handoff | [Verification Checklist](./verification.md) |

## Agent Routing

- Building a renderer integration or reusable scene artifact: use `src/squircle` and [react/README.md](./react/README.md).
- Building or changing the constructor/editor: read [react/editor.md](./react/editor.md).
- Adjusting the squircle's look: read [design/geometry.md](./design/geometry.md), [design/rendering.md](./design/rendering.md), and [design/colors.md](./design/colors.md).
- Updating `index.html`, `demo.html`, `constructor.html`, or `react.html`: keep the HTML shell thin, edit the matching React entrypoint in `src/pages`, then verify against [examples/README.md](./examples/README.md).
- Adding palettes or annotations: update both the React constants and the design docs so future agents do not invent one-off colors.

## Important Boundaries

- React component docs describe the main renderer TypeScript API and reusable scene configuration.
- Editor docs describe the optional constructor UI and code-export workflow.
- Design docs describe visual truth: math, gradients, label paths, wireframe paint, and state constructors.
- Example docs describe the current React page contracts.
- Static docs describe ignored legacy snapshots only; they are not the source of truth.
- Verification docs describe what must still be true after edits.
