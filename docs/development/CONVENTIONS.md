# Development Conventions

## Documentation Requirements

Every code change that introduces, modifies, or clarifies domain behavior **must** be accompanied by a documentation update in the `docs/` folder.

### When to document

- New business logic or domain rules are added
- Existing behavior is corrected or clarified (e.g., fixing a misleading comment)
- A bug is discovered that reveals a misunderstanding of domain semantics
- Constants, ratios, or formulas are introduced or changed
- Workflow steps are added, removed, or reordered

### Where to document

Place documentation in the appropriate category folder under `docs/`:

| Folder | Purpose |
|---|---|
| `docs/architecture/` | System structure, component boundaries, data flow diagrams |
| `docs/design/` | UI/UX guidelines, visual system, interaction patterns |
| `docs/development/` | Implementation details, field semantics, runtime behavior, conventions |
| `docs/operations/` | Deployment, monitoring, operational procedures |

If no existing category fits, **create a new folder** with a clear, descriptive name. Do not force content into an unrelated category.

### How to document

- Update the most relevant existing file first. Only create a new file if no existing document covers the topic.
- Use precise, factual language. Avoid vague or aspirational statements.
- Include concrete examples when explaining formulas, ratios, or conversion logic.
- If a comment in code was misleading, document the correction and the correct interpretation in `docs/` as well.

### Enforcement

This convention applies to all contributors — human and AI alike. When reviewing a code change, verify that any new or corrected domain knowledge is reflected in the appropriate documentation file.
