# panel-max-height-scroll

## Intent and acceptance

limita la altura del panel a ~5-6 PRs con scroll vertical

Acceptance: la lista de PRs no supera la altura máxima de 5-6 elementos y permite scroll vertical cuando hay más PRs

## Plan

1. Envolver la lista reactiva de pull requests (`For each={state().prs}`) dentro de `<scrollbox maxHeight={11}>` en `src/panel.tsx`, preservando el título `Pull requests` fijo arriba.
2. Configurar `vitest.config.ts` con el transformador de OpenTUI Solid (`transformSolidSource` con `resolveNodeSolidRuntimeImport`) para soportar pruebas de renderizado de componentes TSX con `@opentui/solid`.
3. Crear `test/panel.test.tsx` con TDD estricto para asegurar que los PRs se montan dentro de un `ScrollBoxRenderable` con `maxHeight: 11` y que el encabezado permanece exterior.

## Decisions

- **Opción A (11 filas)**: Cada PR ocupa 2 líneas en terminal. Fijar una altura máxima de 11 filas permite ver 5 PRs completos y la cabecera del 6º, señalizando visualmente al usuario que la lista continúa y es desplazable.
- **Scrollbox acotado a la lista de PRs**: El encabezado `Pull requests` permanece fijo en la raíz del panel, de modo que la identificación de la sección nunca se oculta al hacer scroll.
- **Comportamiento adaptativo**: Al tratarse de una altura máxima (`maxHeight`), la lista con menos de 5 PRs se encoge naturalmente a su contenido sin forzar espacios vacíos innecesarios.

## Evidence

<!-- ospec:evidence:start -->
- ev-1: tdd-red-green for tdd-red-green (2026-10-18T00:34:22.029Z)
- ev-2: check-run for checks-pass (2026-10-18T00:35:37.170Z)
- ev-3: adr-impact-declaration for adr-impact-declaration (2026-10-18T00:35:37.170Z)
- ev-4: check-run for checks-pass (2026-10-18T00:36:03.910Z)
- ev-5: living-doc-current for living-doc (2026-10-18T00:36:10.667Z)
<!-- ospec:evidence:end -->
