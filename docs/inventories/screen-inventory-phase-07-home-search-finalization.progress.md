# phase-07-home-search-finalization — Screen Inventory Progress

**Status:** completed
**Screens:** 2/2 completed

## Reconciled screen list

| # | Screen name                                  | URL (fileKey:nodeId)             | Status    |
|---|----------------------------------------------|----------------------------------|-----------|
| 1 | Página inicial (Home, `/`)                   | upxCB4CzKKTSOT9NpdAZ0u:143:948   | completed |
| 2 | Resultados de busca (`/search?q=`)           | upxCB4CzKKTSOT9NpdAZ0u:143:948   | completed |

## Screens removed as out-of-scope

_(none)_

## Decisions log

- ✓ [DECISION: Home usa o frame "Home (Catalog Show)" 143:948?] — resolved: sim
- ✓ [DECISION: tela de resultados de busca sem frame no Figma] — resolved: variante da Home (mesmo frame 143:948 como referência visual), rota própria `/search?q=`
- ✓ [DECISION: header de visitante anônimo sem frame] — resolved: derivar variante anônima do TopNav (botão "Sign in" no lugar do avatar/Create), registrado como drift consciente
- ✓ [DECISION: ProgressCircular abaixo do grid na Home] — resolved: links de página (TD-03 Option A); o ProgressCircular é só estado de loading
- ✓ [DECISION: selo de canal verificado] — resolved: omitir (domínio sem o conceito)
- ✓ [DECISION: botão de busca por voz] — resolved: manter desabilitado
- ✓ [DECISION: chips da TabMenu] — resolved: "All" + categorias de `GET /categories`
- ✓ [DECISION: SideNavSubscriptionList sem capability da fase 07] — resolved: sem verbo (herdado da fase 06)
- Token drift detection: não executada nesta sessão (advisory; `get_variable_defs` não foi consultado)
- Aplicado na consolidação: PaginationLinks classificado como Server-connected (depende de total/páginas do servidor); "Navegar entre páginas" movido de VideoCard para PaginationLinks
