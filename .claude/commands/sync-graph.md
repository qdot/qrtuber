# Sync Decision Graph (Local Export)

Export the current decision graph to `.deciduous/web/graph-data.json` (gitignored, local only).

## Steps

1. Run `deciduous sync` to export the graph
2. Show the user how many nodes/edges were exported

Do NOT export into `docs/` — that directory is the Docusaurus site source.
Use `deciduous serve` to view the graph locally.
