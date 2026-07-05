# Linear-parity Tasks page: in-page sidebar, grouped list, configurable saved views

Rebuild the Tasks page so it matches Linear's issue UI 1:1 (per the reference screenshot of the user's Linear workspace): a left in-page navigation sidebar (Inbox, My Issues, Workspace → Projects/Views, Favorites, Your teams), a grouped issue list with Linear's exact row/group-header anatomy, a Filter bar + Display popover for configuring the view, and the ability to **save the configured view** as a named view that appears in the sidebar. The Linear source gets full parity (it already has the richest data + an existing grouped-list branch); GitHub/GitLab/Jira keep working inside the new shell with status-mapped grouping and restyled rows. This is a fork customization: new code goes into new files under `src/renderer/src/components/tasks/`, edits to the heavily-churned upstream `TaskPage.tsx` stay as concentrated as possible, and the work ships as `[FORK]`-sentinel commits.

## Current state (from research)

- **`TaskPage.tsx` is a 12,601-line single component** (`src/renderer/src/components/TaskPage.tsx`, default export at `:3014`, JSX return at `:7818`). Layout is a **single centered column — no in-page sidebar**: top chrome (close button + provider icon toggles at `:7862` with `data-contextual-tour-target="tasks-source-filters"` + scope controls), per-source search/preset toolbars (`:8144–8895`), then a list/detail region branching on `taskSource`, then create-issue dialogs. Detail views: Linear/Jira render an in-column workspace (`LinearIssueWorkspace` at `:10004`) replacing the list; GitHub/GitLab open modal dialogs.
- **The Linear branch already implements most of the mechanics, but not the look**: grouped rows via `groupLinearIssues` (`:815`) with section headers, `linearViewMode: 'list' | 'board'` (`:4290`), `linearGroupBy: 'none'|'status'|'assignee'|'priority'|'team'`, `linearOrderBy: 'priority'|'updated'|'identifier'`, `linearDisplayProperties` toggles (catalog in `task-page-localized-options.tsx:35–37`), a board with dnd, and **remote Linear custom views** (list/detail/issues via store actions, opened through `openLinearCustomViewContext` `:4425`, rendered by `linear-project-view-surfaces.tsx`). Scope selection (workspace + teams) via `LinearScopeSelector` (`linear-scope-selector.tsx`).
- **Data model**: no normalized cross-provider Task type — renderer branches per provider. `LinearIssue` (`src/shared/types.ts:1568`) is the richest: `state {name,type,color}`, `team`, `project?`, `labels/labelIds`, `assignee{displayName,avatarUrl}`, `priority 0–4`, `estimate`, `dueDate`, `updatedAt`. **Missing from the list mapper: `cycle` and `createdAt`** — both are already fetched on the agent path (`src/main/linear/issue-context-raw.ts:104–119`), so adding them to `LINEAR_ISSUE_NODE_FIELDS` (`src/main/linear/issues.ts:132`) + `mapLinearIssue` (`src/main/linear/mappers.ts:35`) is cheap.
- **Linear RPC surface is nearly complete** (`src/main/runtime/rpc/methods/linear.ts`, IPC `src/main/ipc/linear.ts`, preload `src/preload/index.ts:1399`): issues (list filters `assigned|created|all|completed|open`, search, CRUD), projects, custom views (issue+project models, contents), `teamStates` (→ `LinearWorkflowState {id,name,type,color,position}`), `teamLabels`, `teamMembers`, multi-workspace fan-out. **Not supported: notifications/inbox, favorites, cycles-as-list.** Linear's API does not usefully expose a custom view's filter predicate — remote views are read-only issue/project lists.
- **Renderer data layer**: zustand slices with TTL'd caches — `store/slices/linear.ts` (`linearListCache`, `linearCustomViewCache`, … , `CACHE_TTL = 60s`), `github.ts`, `jira.ts`; on-landing/forced refresh, no polling, no virtualization (plain `.map()` + `PaginationBar`). `@tanstack/react-virtual` and `@dnd-kit` are already dependencies.
- **Persistence**: two IPC-backed blobs — `GlobalSettings` via `settings:set` (already holds `defaultTaskSource`, `defaultTaskViewPreset`, `defaultLinearTeamSelection`, `visibleTaskProviders`) and **`PersistedUIState` via `ui:set`** (`src/shared/types.ts:3155`) which already stores per-page UI state like `groupBy`/`sortBy`/`collapsedGroups` — the established home for saved views and sidebar state. No localStorage for durable prefs. TaskPage restore-on-mount is gated by `persistedUIReady` + `taskResumeState` (`:4475–4520`).
- **Inbox precedent**: the only provider-notification stream today is **GitLab Todos** (`gitlabView: 'issues'|'mrs'|'todos'`, `GitLabTodo` in `src/shared/gitlab-types.ts:249`) — the model to imitate for a Linear Inbox; a Linear inbox needs a new `linear.notifications` endpoint (`@linear/sdk` supports the `notifications` connection).
- **Siblings/patterns to reuse**: `github-project/` (ProjectGroupHeader, ProjectRow, ProjectViewList, column-widths, ColumnResizeHandle — an existing grouped/columned table), `LinearPriorityIcon` (`linear-priority-icon.tsx`), `linear-state-pill-style.ts`, `Sidebar.tsx` + `sidebar/` for nav-sidebar conventions.
- **Styleguide constraints** (`docs/STYLEGUIDE.md`): `sidebar` token family for the new sidebar; list rows idle transparent / hover `bg-accent`; 13px dense rows, 11px uppercase section headers; lucide icons only (state/label colors coming from Linear API data are data, not new tokens); shadcn primitives (`DropdownMenu`, `Popover`, `Command`); `translate('auto.…', 'fallback')` i18n pattern with catalogs in `src/renderer/src/i18n/locales/*.json` (`pnpm bootstrap:locale-catalog`).
- **Tests touching this surface**: `tests/e2e/tasks-page.spec.ts` asserts the `tasks-source-filters` buttons and "Close tasks"; `task-page-list-chrome-visibility.ts` gates chrome when a detail/project/view context is open.
- **Fork reality** (memory): upstream churns fast and actively edits TaskPage; keep new code in new files, TaskPage diffs concentrated, `[FORK]` commit sentinels, no upstream-file rewrites that guarantee merge hell.

## Target UI anatomy (from the reference screenshot)

1. **Left in-page sidebar** (~244px, `bg-sidebar`, hairline right border, collapsible):
   - Top: compact workspace/source switcher (avatar + name + chevron) — hosts Orca's provider switch (GitHub/GitLab/Linear/Jira) + Linear workspace selection; search and "new issue" icon buttons on the right.
   - `Inbox` (with unread dot), `My Issues`.
   - `Workspace` section: `Projects`, `Views`.
   - `Favorites` section: starred views/projects/teams (local).
   - `Your teams` section: per Linear team — team header (icon + name, collapsible) with `Issues`, `Projects`, `Views` children.
   - Non-Linear providers map to the same skeleton: GitHub → repos + presets (My PRs, Review requests…); Jira → sites + projects; GitLab → projects + Todos (as the Inbox analog).
2. **Main column**: view header (view icon + name + favorite star + `…` menu), toolbar row (`N issues` count left; filter icon + display-options icon right), optional filter-chip row with **Save/Update view** affordance.
3. **Grouped list**: full-width group header bands — state icon, name, count, `+` (new issue with that state) on the right; collapsible. Rows (~40px): priority icon → identifier (muted, fixed width) → state icon → title (truncates) → spacer → label chips (dot + name) → project/cycle chip → due date → estimate → assignee avatar → updated date. Hover reveals a leading checkbox; right-click opens a context menu (open, open in Linear, copy ID/URL, status/assignee/priority quick-set).
4. **Display popover** (sliders icon): list/board toggle, Grouping select (status/assignee/project/priority/team/cycle/none), Ordering select, "Show sub-issues" toggle, "Show empty groups" toggle, Displayed-properties chip toggles.
5. **Right view-details panel** (toggleable): view name + star + description, Visibility/Owner rows, facet tabs (Assignees/Labels/Projects/Teams) with per-value counts — computed client-side from the loaded issue list.

## Design decisions

- **Scope**: 1:1 visual parity is delivered for the page shell + the Linear source. Other providers render inside the same shell with the same row/group styling driven by a small status-category mapping (`open→Todo`-style), but their deeper view configuration keeps the existing preset/filter semantics. Rationale: the reference is a Linear workspace; `LinearIssue` is the only shape with team/project/priority/estimate; GitHub/Jira rows simply omit missing columns.
- **New code lives in `src/renderer/src/components/tasks/`** (concrete names, per AGENTS.md — no `utils`/`helpers`): `TasksNavSidebar.tsx`, `TasksSidebarTeamSection.tsx`, `TasksSourceSwitcher.tsx`, `TaskViewHeader.tsx`, `TaskFilterBar.tsx`, `TaskDisplayPopover.tsx`, `TaskGroupHeader.tsx`, `LinearIssueRow.tsx`, `TasksInboxPane.tsx`, `TaskViewDetailsPanel.tsx`, plus pure logic modules `task-saved-views.ts`, `task-status-grouping.ts`, `tasks-nav-state.ts` (each with unit tests). `TaskPage.tsx` keeps its state wiring; its JSX regions are replaced by these components. **Do not add `max-lines` disables anywhere new** — the existing TaskPage disable stays untouched.
- **Navigation state** is one discriminated union owned by TaskPage and persisted through the existing `taskResumeState`/source-context resume path:
  `TasksNavSelection = { kind: 'inbox' } | { kind: 'my-issues' } | { kind: 'all-issues', teamId? } | { kind: 'project', projectId } | { kind: 'remote-view', viewId, model } | { kind: 'saved-view', savedViewId } | { kind: 'projects-index' } | { kind: 'views-index' }` — the existing `openLinearCustomViewContext` / project-context plumbing is reused for `remote-view`/`project`.
- **Saved views are Orca-local** (Linear's API doesn't let us round-trip view predicates). New shared type in `src/shared/types.ts`:
  `TaskSavedView = { id, name, provider: TaskProvider, scope: { workspaceId?, teamIds?, repoIds?, siteId? }, config: { search, filters: TaskViewFilters, groupBy, orderBy, viewMode, displayProperties, showSubIssues?, showEmptyGroups? }, favorite: boolean, createdAt, updatedAt }` persisted as `PersistedUIState.taskSavedViews: TaskSavedView[]` via `ui:set` (the `workspaceStatuses`/`collapsedGroups` pattern). Sidebar `Views` lists saved views (editable) alongside remote Linear custom views (read-only, badge-distinguished). Favorites section = `favorite: true` saved views + starred projects/teams kept in `PersistedUIState.taskSidebarState`.
- **Filters** get a real model instead of only free-text: `TaskViewFilters = { stateTypes?, stateIds?, assigneeIds?, labelIds?, priorities?, projectIds?, teamIds?, dueDate? }` applied client-side to the already-fetched list (consistent with today's client-side search/grouping; server-side narrowing stays an optimization for later). Filter editing uses `Command`-in-`Popover` pickers fed by `teamStates`/`teamLabels`/`teamMembers`/`listProjects`.
- **Grouping extensions**: add `'project'` and `'cycle'` to `LinearGroupBy`, `'created'` and `'dueDate'` to `LinearOrderBy`; status groups order by workflow-state canonical order (triage → backlog → unstarted → started → completed → canceled, then `position`) using `teamStates` when a single team is scoped, falling back to `state.type` ordering across teams. Group collapse state persists in `PersistedUIState.taskSidebarState.collapsedTaskGroups`.
- **Inbox = Linear notifications** (explicitly requested): new main module `src/main/linear/notifications.ts` using `@linear/sdk` (`notifications()` connection → issue notifications with `type`, `actor`, `issue {identifier,title,teamKey}`, `readAt`, `snoozedUntilAt`, `createdAt`; mutations `notificationUpdate` for read/unread + mark-all-read), exposed as `linear.notifications`, `linear.notificationMarkRead`, `linear.notificationMarkAllRead` through the standard chain (runtime method → `LINEAR_METHODS` → IPC channel → preload → `store/slices/linear.ts` cache). Unread count drives the sidebar dot. GitLab keeps Todos as its inbox; GitHub/Jira show no inbox item (deferred).
- **Mapper extension (main, additive)**: add `cycle {id,name,number}` and `createdAt` to `LINEAR_ISSUE_NODE_FIELDS` + `mapLinearIssue` + `LinearIssue` — enables the cycle chip, cycle grouping, and created-date ordering. Additive and upstream-friendly.
- **No virtualization in v1** — lists are already paginated/limited and flat-mapped today; `@tanstack/react-virtual` is noted as the follow-up if long custom views feel slow.
- **Board mode** keeps working (state already exists) but is only lightly restyled; 1:1 board parity is out of scope for this plan.
- **Cross-platform/SSH**: everything rides existing runtime RPC (works on remote hosts); keyboard affordances use the platform check; sidebar/list are pure renderer.
- **e2e stability**: the provider switcher keeps the `data-task-source` attribute and the `data-contextual-tour-target="tasks-source-filters"` marker moves with it into the sidebar switcher; `tests/e2e/tasks-page.spec.ts` is updated alongside.

## Implementation outline

### 1. Shared types + persistence plumbing
- `src/shared/types.ts`: add `TaskSavedView`, `TaskViewFilters`, `TasksNavSelection` (if shared), `LinearNotification`; extend `LinearIssue` with `cycle?`/`createdAt?`; add `PersistedUIState.taskSavedViews` and `PersistedUIState.taskSidebarState` (`{ collapsed, width?, favorites: …, collapsedSections, collapsedTaskGroups }`).
- Round-trip through `ui:set`/`ui:get` (mirror `collapsedGroups` handling in `store/slices/ui.ts` + `persisted-ui-equality.ts`).

### 2. Main-process Linear additions
- Extend `LINEAR_ISSUE_NODE_FIELDS` (`src/main/linear/issues.ts:132`) + `mapLinearIssue` (`src/main/linear/mappers.ts`) with `cycle`/`createdAt`; update mapper tests.
- New `src/main/linear/notifications.ts`: `listNotifications`, `markNotificationRead`, `markAllNotificationsRead` (multi-workspace aware like `listIssues`); wire runtime methods in `orca-runtime.ts`, add to `LINEAR_METHODS` (`src/main/runtime/rpc/methods/linear.ts`), IPC handlers (`src/main/ipc/linear.ts`), preload surface (`src/preload/index.ts`); unit tests following `teams.test.ts` style.
- `store/slices/linear.ts`: `linearNotificationCache` + fetch/markRead actions + unread-count selector.

### 3. Pure view-model modules (`components/tasks/`, test-first)
- `task-saved-views.ts`: create/update/rename/delete/favorite; capture-current-config; apply-view-to-state; id generation; migration-safe normalization of persisted entries.
- `task-status-grouping.ts`: cross-provider status-category mapping (GitHub `open/draft/merged/closed`, Jira `statusCategory`, GitLab states → Linear-like group descriptors `{key,label,icon,color,order}`), plus Linear workflow-state group ordering (canonical type order + `position`).
- `tasks-nav-state.ts`: `TasksNavSelection` reducers/serialization for resume.
- Filter application: extend the existing `compareLinearIssues`/`groupLinearIssues` region — extracted out of `TaskPage.tsx` into `components/tasks/linear-issue-list-model.ts` — with `TaskViewFilters` predicate, new group-bys (`project`, `cycle`) and order-bys (`created`, `dueDate`).

### 4. Shell: two-pane layout + sidebar
- Restructure the TaskPage root (`:7818`) into `sidebar | main` flex panes; mount `TasksNavSidebar` (own scroll, `scrollbar-sleek`, `sidebar` tokens, collapsible with persisted state).
- `TasksSourceSwitcher.tsx` at the sidebar top (provider + Linear workspace via existing `LinearScopeSelector` internals; keeps `data-task-source` buttons semantics for e2e/tour).
- Sidebar body: Inbox (+unread dot), My Issues, Workspace (Projects, Views index items), Favorites, Your teams (from `listLinearTeams`; children Issues/Projects/Views per team). Provider-adaptive content for GitHub/GitLab/Jira (repos/presets, projects/Todos, sites/projects respectively — reusing `TaskProjectSourceCombobox` data sources).
- Selecting nodes drives `TasksNavSelection`; `remote-view`/`project` reuse `openLinearCustomViewContext`/project-context; selection resumes via `taskResumeState`.
- Move the Close-tasks affordance into the main-column header (keep the `Close tasks` accessible name).

### 5. Grouped list restyle (Linear source)
- `TaskGroupHeader.tsx` (band: state icon w/ API color, name, count, trailing `+` that opens the existing New-Linear-issue dialog pre-set to the group's state) and `LinearIssueRow.tsx` (anatomy per the target section; `LinearPriorityIcon`, state dot/ring, label chips with API colors, cycle/project chips, due-date, estimate, avatar, updated date; hover checkbox for multi-select; context menu via `ContextMenu`).
- Replace the Linear list branch rendering (`:10230–11400` region) with these components; keep `LinearIssueWorkspace` open-on-click behavior and multi-select → existing bulk actions if present (else checkbox is selection-only v1).
- Collapsible groups (persisted), "Showing N issues" count, empty-group handling per Display toggle.

### 6. View header, Filter bar, Display popover
- `TaskViewHeader.tsx`: icon + view name (nav-selection-derived or saved-view name), favorite star, `…` menu (rename/duplicate/delete for saved views; open-in-Linear for remote views).
- `TaskFilterBar.tsx`: `Filter +` button → `Command` pickers; active filters render as chips (`Status is In Review ×`); trailing `Save view` (new) / `Update view` + `Reset` when a saved view has unsaved changes.
- `TaskDisplayPopover.tsx`: replaces the current inline view-controls toolbar (`:10268–10374`) — view-mode toggle, Grouping, Ordering, Show-empty-groups, Show-sub-issues, Displayed-properties chips.

### 7. Inbox pane
- `TasksInboxPane.tsx`: notification rows (actor avatar, type icon, issue identifier + title, relative time, unread emphasis), click → open issue via `openLinearDetailPage` + mark-read; header `Mark all as read`. GitLab Todos view relocates under the same Inbox nav node when GitLab is the source.

### 8. View details right panel
- `TaskViewDetailsPanel.tsx` (toggleable, matches screenshot): name/star/description, Visibility (`Local`/`Shared` for remote views), Owner, facet tabs (Assignees/Labels/Projects/Teams) with counts computed from the loaded list.

### 9. Other providers in the new shell
- GitHub/Jira/GitLab list branches: swap flat rows for `TaskGroupHeader` + a provider-generic row using `task-status-grouping.ts` (grouping default: status category), keeping all existing cells/actions (`GHStatusCell`, `PRReviewCell`, …) as the row's trailing content where applicable.

### 10. i18n, tests, verification
- All new strings via `translate('auto.components.tasks.…', 'Fallback')`; run `pnpm bootstrap:locale-catalog` to seed `en/es/ja/ko/zh`.
- Unit tests: `task-saved-views`, `task-status-grouping`, `tasks-nav-state`, `linear-issue-list-model` (filters/group/order), notifications mapper.
- Update `tests/e2e/tasks-page.spec.ts` for the relocated source switcher + sidebar presence; keep `Close tasks` assertion green.
- Manual verify against the reference screenshot in light+dark, then `pnpm typecheck`, lint, `pnpm vitest run` (scoped), e2e tasks spec.

## Risks / watch-outs

- **Upstream merge pressure**: TaskPage.tsx is actively developed upstream; keep TaskPage edits to (a) the root layout swap, (b) the Linear-branch render swap, (c) nav-state wiring — everything else in new files. Expect and accept conflicts in those three regions; `[FORK]` sentinel commits.
- **Multi-workspace Linear** ("all" selection) means team lists/states span workspaces — group ordering must fall back to `state.type` when states aren't uniform; sidebar teams need workspace badges when >1 workspace is connected.
- **Notifications API shape** varies by notification type (issue/project/document); v1 filters to issue notifications and ignores others defensively.
- **`taskPageListChromeHidden`** (`task-page-list-chrome-visibility.ts`) currently hides the top chrome when a detail/view context opens — in the new shell the sidebar must stay visible while the main column shows detail; re-scope that gate to the main column only.
- **Existing `LinearCustomViewTable`/project surfaces** (`linear-project-view-surfaces.tsx`) must keep rendering inside the new main column without visual seams — restyle pass, not a rewrite.
- **Don't regress the contextual tours**: `data-contextual-tour-target` markers (`tasks-source-filters`, `tasks-search-presets`) must survive relocation or the tour definitions be updated in the same change.
- State/label colors come from Linear API data — inline `style` color usage is data-driven and allowed; everything else must use `main.css` tokens (STYLEGUIDE).

## To-do

- [x] Add shared types (`TaskSavedView`, `TaskViewFilters`, `LinearNotification`, `LinearIssue.cycle/createdAt`) and `PersistedUIState.taskSavedViews` + `taskSidebarState` with `ui:set` round-trip + equality handling.
- [x] Extend the main-process Linear issue mapper with `cycle`/`createdAt` (`LINEAR_ISSUE_NODE_FIELDS`, `mapLinearIssue`) and update mapper tests.
- [x] Add `src/main/linear/notifications.ts` (list / mark-read / mark-all-read) and wire runtime → `LINEAR_METHODS` → IPC → preload → `store/slices/linear.ts` cache with unread-count selector, with unit tests.
- [x] Build pure modules with tests: `task-saved-views.ts`, `task-status-grouping.ts`, `tasks-nav-state.ts`, and extract/extend `linear-issue-list-model.ts` (filters + `project`/`cycle` group-bys + `created`/`dueDate` order-bys).
- [x] Restructure the TaskPage root into the two-pane shell and implement `TasksNavSidebar` + `TasksSourceSwitcher` (sections: Inbox, My Issues, Workspace, Favorites, Your teams; provider-adaptive; collapsible; persisted; tour/e2e markers preserved). _Note: the source switcher band is part of `TasksNavSidebar` rather than a separate `TasksSourceSwitcher.tsx`; row primitives live in `TasksSidebarRow.tsx`._
- [x] Wire `TasksNavSelection` navigation (inbox / my-issues / all-issues / project / remote-view / saved-view / indexes) with resume via `taskResumeState`, reusing existing project/custom-view context plumbing.
- [x] Implement `TaskGroupHeader.tsx` + `LinearIssueRow.tsx` and swap the Linear list branch to them (collapsible persisted groups, group `+` new-issue, exact Linear row anatomy). _Note: hover multi-select checkboxes and a row context menu are deferred — rows keep the existing open/start/open-external actions._
- [x] Implement `TaskViewHeader.tsx`, `TaskFilterBar.tsx` (filter chips + Save/Update view), and `TaskDisplayPopover.tsx` (replacing the inline Linear view-controls toolbar).
- [x] Implement saved-views CRUD end-to-end: capture current config, list in sidebar Views (alongside read-only remote Linear views), apply on select, favorite → Favorites section.
- [x] Implement `TasksInboxPane.tsx` on the new notifications API (unread dot in sidebar, mark-read on open, mark-all-read). _Note: GitLab Todos keep their existing view-mode toggle; relocating them under an Inbox nav node is deferred with the rest of the non-Linear sidebar trees._
- [x] Implement `TaskViewDetailsPanel.tsx` (toggleable right panel: description, visibility, owner, facet counts).
- [x] Restyle GitHub/Jira/GitLab list branches into the shared group-header/row visual system via `task-status-grouping.ts`, keeping existing cells and actions (status-category group bands via `ProviderStatusGroupHeader`; row internals unchanged).
- [x] Add i18n keys for all new strings and seed locale catalogs (`pnpm sync:localization-catalog` + `repair` parity; translated ko/ja/es/zh values can be regenerated later via `pnpm bootstrap:locale-catalog`, which needs the translation service).
- [x] Update `tests/e2e/tasks-page.spec.ts` (sidebar + relocated source switcher) and re-scope `task-page-list-chrome-visibility` gating to the main column. _Note: the e2e spec needed no changes — the `tasks-source-filters` marker and `data-task-source` buttons moved into the sidebar intact, and the spec passes as-is. The chrome-visibility gate needed no re-scope: the sidebar mounts outside the gated container._
- [x] Verify: `pnpm typecheck`, full `pnpm lint`, scoped `pnpm vitest run` (all green; 10 pre-existing WorktreeCard/SidebarNav/right-sidebar test files fail identically on clean HEAD), and the tasks e2e spec passes against the built app. Visual 1:1 pass against the reference screenshot in light+dark with a connected Linear account remains for live review; commit as `[FORK]` batch.
