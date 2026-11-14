# Avisos de terceiros

O código da skill não embute bibliotecas de terceiros em runtime: o motor de slides, o parser de expressões e os gráficos
são código próprio (MIT). Itens de terceiros relacionados:

| Item | Uso | Licença |
|---|---|---|
| **Lucide** (<https://lucide.dev>) | A geometria de parte dos ícones em `skills/presenter-slides/assets/icons.svg` segue o estilo e, em vários casos, os traçados do conjunto Lucide | ISC |
| **Google Fonts** — Inter, Space Grotesk, Source Sans 3, Playfair Display, Poppins, Nunito, Sora, IBM Plex Sans, JetBrains Mono | Carregadas **em tempo de execução** do CDN do Google (opcional; `--no-fonts` desativa). Não são redistribuídas neste repositório | SIL Open Font License 1.1 |
| **KaTeX** (<https://katex.org>) | Opcional (`"katex": true`), carregado do cdnjs em tempo de execução | MIT |
| **Playwright** | Apenas desenvolvimento/QA (`devDependencies`) | Apache-2.0 |

## Lucide — licença ISC
```
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted,
provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR
CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## Referência de design
As paletas e a teoria de cores (monocromática, análoga, complementar, tríade, regra 60-30-10) foram organizadas a partir de
conceitos gerais de design de sites, como os apresentados no guia de esquemas de cores da Hostinger
(<https://www.hostinger.com/tutorials/website-color-schemes>). Nenhum conteúdo desse site foi copiado; todas as paletas deste
repositório são originais e validadas por script quanto ao contraste WCAG.
