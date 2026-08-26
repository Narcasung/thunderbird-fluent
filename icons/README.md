# Icons

216 SVGs vendored from [microsoft/fluentui-system-icons][repo] (MIT). Filled
variants, 16px where upstream has one, 20px otherwise.

Nothing here is fetched at runtime, and nothing is fetched at build time
either. `tools/vendor-icons.py` downloads and rewrites them once, on demand;
the results are committed and are the source of truth from then on. That script
also holds the mapping — `MAP` for the 216 replaced, `KEEP_STOCK` for the 12
that keep Thunderbird's art and why — and regenerates `MAPPING.md` from it.

## The one edit made to each file

Upstream ships every path with a hardcoded `fill="#212121"`. That ignores the
theme and renders near-black on dark chrome. Each one is rewritten to
`fill="context-fill"`, which is what Thunderbird's own icons carry and what
lets Gecko paint them with the surrounding colour.

Two things that follow from `context-fill` being the only keyword these files
claim, both of which cost CSS elsewhere:

- Where a rule exports `stroke` but not `fill`, the keyword has nothing to
  resolve against and Gecko falls back to the initial value of `fill`, which is
  **black**. Part 4 of `chrome/fluent-icons.css` turns `fill` on at those 62
  sites.
- `fill-opacity` never reaches these paths, because a context property only
  crosses into an SVG that names it. Thunderbird uses it to keep some markers
  quiet; those come out at full strength instead.

An earlier round tested `context-stroke` and a dual-path form to avoid the
first of those. Both were measured and both were worse: an **unresolved
`context-stroke` paints black too**, so the trade was black in a different set
of places. There is no SVG-side fix; the header of `chrome/fluent-icons.css`
records the measurements.

## How they reach Thunderbird

Not as `data:` URIs — Gecko refuses context-paint to those and the glyphs come
out solid black. The add-on copies this folder into `<profile>/chrome/icons/`
and registers `resource://thunderbird-fluent/` against it, which is a
privileged URL and does resolve `context-fill`. See THE ICON SET in
`extension/api.js`.

`extension/icon.svg` is **not** part of this set. It is the add-on's own icon in
the Add-ons Manager, it never reaches the profile, and it uses a literal fill
because nothing there provides a paint context.

## Mapping

`<token>.svg` is the file that overrides Thunderbird's `--icon-<token>`.
[`MAPPING.md`](MAPPING.md) is the generated table of every token — what each
one became, or why it stayed.

[repo]: https://github.com/microsoft/fluentui-system-icons
