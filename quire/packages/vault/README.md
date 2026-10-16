# @quire/vault

Document identity and file format, shared by every node: the vault path rules and YAML
front matter splitting.

- Public API: `normalizePath`, `titleOf`, `InvalidPathError`, `splitFrontmatter`.
- Depends on: `yaml`. Pure: no I/O.
- Specs: `R-VLT-02`, `R-RND-07`.
