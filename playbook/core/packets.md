# Packets and lanes

A **packet** is one self-contained unit of work for one worker. A **lane** is a sequence of
packets that touch the same area. Packets in different lanes, with no dependency between
them and no overlapping owned paths, can run at the same time.

## Packet rules

1. **Self-contained.** A worker with only the packet file, the paths under `reads`, and a
   shell can do it. Contracts (types, routes, file formats, CLI flags) are copied into the
   packet verbatim, never "see design.md".
2. **Owned paths.** `owns` lists globs the packet may create or edit. Nobody else edits them
   while it runs. Shared integration files (dependency manifests, lockfiles, workspace config,
   root CI) belong to `P00`, owned by the coordinator. `borrows` lists specific paths outside
   `owns` the packet must touch narrowly (wiring a feature into an existing file), each with
   a reason; a borrowed path is never owned or borrowed by a packet running at the same time.
3. **Small.** `size: S` (under ~300 changed lines), `M` (under ~800), never `L`: split it.
   A packet must fit a 32k-token context with room to work. This is what keeps the
   playbook usable with mid-size and local models.
4. **Verifiable.** The Acceptance section names gates from `playbook.yaml` through
   `bin/gate.sh` (`gate.sh check`, `gate.sh scenarios "@R-XXX-01"`), never tool commands, so a
   change of tooling never makes a packet stale. For behaviour, that means named scenarios
   (`modules/scenarios`), not "tests pass".
5. **Traceable.** The Context section cites the requirement IDs it implements.

## Lanes by play

Plays suggest typical lanes. Examples:

| Play | Typical lanes |
| --- | --- |
| new system | Z integration, A domain libraries, B protocol, C server, D client, E packaging |
| fix a bug | one packet: reproduce as a scenario, fix, verify |
| port a language | per module: port, run the shared scenarios against both implementations |
| combine systems | per capability: adapter on each side, then the merged module |

## Template

`templates/change/packet.md`. Front matter keys: `id`, `title`, `lane`, `depends_on`,
`owns`, `borrows`, `reads`, `size`, `revision`, `status` (`todo | doing | done | blocked`),
`claimed_by`.

## Model tiers

| Tier | Typical models | May take | Needs |
| --- | --- | --- | --- |
| A | frontier models | S, M, coordinator, proposals, designs | |
| B | strong open-weight models | S, M | contracts copied into the packet |
| C | small or local models | S | explicit steps and named gates |

Write packets for tier B by default.
