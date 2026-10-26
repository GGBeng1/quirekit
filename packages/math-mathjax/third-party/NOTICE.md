# MathJax and New Computer Modern

This adapter uses unmodified npm dependencies `@mathjax/src@4.1.3` and
`@mathjax/mathjax-newcm-font@4.1.3`. Their package metadata declares Apache-2.0.
The complete MathJax license is retained in `MathJax-LICENSE.txt`.

Sources:

- https://github.com/mathjax/MathJax-src/tree/4.1.3
- https://www.npmjs.com/package/@mathjax/src/v/4.1.3
- https://www.npmjs.com/package/@mathjax/mathjax-newcm-font/v/4.1.3
- https://docs.mathjax.org/en/v4.1/output/fonts.html

The NewCM dependency's 105 bundled WOFF2 name tables retain these original
notices (the adapter imports SVG glyph tables and does not ship WOFF2 assets):

> (C) 2019-2021 Antonis Tsolomitis.
> This work is released under the GUST Font License -- see
> http://tug.org/fonts/licenses/GUST-FONT-LICENSE.txt for details.

21 of those font files additionally retain:

> Copyright (c) 2024 MathJax, Inc. (www.mathjax.org)
> Original copyright:

`GUST-FONT-LICENSE.txt` and its referenced `LPPL-1.3c.txt` are preserved verbatim
from https://tug.org/fonts/licenses/GUST-FONT-LICENSE.txt and
https://www.latex-project.org/lppl/lppl-1-3c.txt.
The upstream font family and its author-maintained distributions are described
at https://ctan.org/pkg/newcomputermodern. The npm font-data definition identifies
its original input font filenames under `def/mathjax-newcm.ts`; this adapter
does not alter the dependency's fonts, glyph paths, or font tables.

QuireKit's original adapter code is covered by the package's `LICENSE.md`.
That grant does not replace upstream licenses or imply upstream endorsement.
