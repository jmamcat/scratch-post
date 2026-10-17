# @quire/vault

Document identity and file format, shared by every node: the vault path rules, YAML
front matter splitting and editing, and template expansion.

- Public API: `normalizePath`, `titleOf`, `InvalidPathError`, `splitFrontmatter`,
  `setProperty`, `expandTemplate`, `formatDate`, `insertTemplate`.
- Depends on: `yaml`. Pure: no I/O.
- Specs: `R-VLT-02`, `R-VLT-07`, `R-VLT-13`, `R-RND-07`.
