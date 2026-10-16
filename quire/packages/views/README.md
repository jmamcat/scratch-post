# @quire/views

Pure grouping of notes into views: domains, tags, timeline buckets, board columns and the
link graph. Used by the web sidebar views and the graph.

- Public API: `groupByDomain`, `domainOf`, `tagTree`, `groupByTime`, `groupByProperty`, `linkGraph`, `neighbourhood`.
- Depends on: `@quire/vault`, `@quire/render`. Pure.
- Specs: `R-VIEW-*`, `R-NAV-08`, `R-NAV-09`.
