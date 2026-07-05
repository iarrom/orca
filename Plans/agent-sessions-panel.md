# Панель агент-сессий: табы агентов в чат-колонке + список агентов в сайдбаре

Сейчас каждая сессия агента (Claude Code, Cursor, Codex, …) — это терминальный таб в общем таб-баре, вперемешку с браузером, редактором и обычными терминалами. При нескольких сессиях на одну ветку это неудобно. План: агент-сессии переезжают из центрального таб-бара в форк-колонку `AgentChatColumn` (где уже рендерится native-чат) — колонка получает собственную полосу сессий-табов активного worktree; для агентов без native-чата (Cursor и др.) в колонке показывается их живой терминал через CSS-anchor-позиционирование. В левом сайдбаре под каждым worktree (веткой) — сворачиваемый список запущенных агентов (на базе существующего `WorktreeCardAgents`), клик по строке активирует worktree и выбирает сессию в панели. Модель данных не меняется: агенты остаются `TerminalTab`-ами (PTY, персистенс, статусы — как есть), меняется только презентация. Все новые файлы — в новой директории `src/renderer/src/components/agent-panel/`, правки upstream-файлов — точечные вставки под `// [FORK]` (стратегия `fork/README.md`).

## Контекст: что есть сейчас

- **Агент = терминальный таб.** `TerminalTab.launchAgent: TuiAgent` (`src/shared/types.ts:811,847`), юнифицированный `Tab` с `contentType: 'terminal'` (`src/shared/types.ts:774`). Запуск — единая воронка `launchAgentInNewTab()` (`src/renderer/src/lib/launch-agent-in-new-tab.ts:95`): `createTab(..., { launchAgent })` → `queueTabStartupCommand` → активация. Живой статус — `agentStatusByPaneKey` (`src/renderer/src/store/slices/agent-status.ts`), paneKey = `` `${tabId}:${leafId}` `` (`src/shared/stable-pane-id.ts:22`).
- **Native-чат** — GUI поверх PTY + JSONL-транскрипта; поддерживает только `claude` / `openclaude` / `codex` (`NATIVE_CHAT_SUPPORTED_AGENTS`, `src/renderer/src/components/native-chat/native-chat-availability.ts:10-14`). Cursor и остальные — только TUI в терминале.
- **Форк-колонка** `AgentChatColumn` (`src/renderer/src/components/native-chat/AgentChatColumn.tsx`) уже стоит между сайдбаром и таб-зоной (`App.tsx:1438,2247`), но показывает ровно одну сессию — выведенную из активного таба (`useActiveAgentTarget`). Её стор — `agent-chat-column-state.ts` (width + expanded, localStorage).
- **Рендер терминалов** — `TerminalPaneOverlayLayer` (`src/renderer/src/components/terminal-pane/TerminalPaneOverlayLayer.tsx`): панель каждого терминального таба живёт всегда, позиционируется поверх тела своей таб-группы через CSS anchor (`tabGroupBodyAnchorName(groupId)`, строки 81, 180-215), невидимые — `display:none`. Есть fallback на измеренный rect для Chrome без anchor-positioning (строки 95-141).
- **Таб-бар** получает списки из `useTabGroupWorkspaceModel` (`src/renderer/src/components/tab-group/useTabGroupWorkspaceModel.ts:53`): `terminalTabs`, `tabBarOrder`, `activeTab`, `commands` (activate/close). Именно здесь решается, какие чипы видны.
- **Сайдбар уже умеет агентов под worktree**: `WorktreeCardAgents` (`src/renderer/src/components/sidebar/WorktreeCardAgents.tsx`) рендерится внутри `WorktreeCard.tsx:1742` при card-свойстве `inline-agents` (входит в дефолт: `src/shared/worktree-card-properties.ts:12-23`). Данные — `useWorktreeAgentRows(worktreeId, active)` → `DashboardAgentRow[]` (paneKey, tab, agentType, state, lineage; `src/renderer/src/components/dashboard/useDashboardData.ts:17`). Клик: `activateAndRevealWorktree` + `activateTabAndFocusPane` (`WorktreeCardAgents.tsx:178-223`). Топ-уровневого сворачивания списка нет — только collapse lineage-родителей.

## Целевое поведение

1. Колонка агент-чата = «панель сессий»: сверху горизонтальная полоса табов-сессий активного worktree (иконка агента + заголовок + статус-точка + крестик), кнопка «+» для запуска нового агента.
2. Выбор сессии в полосе переключает содержимое панели: native-чат для поддерживаемых агентов, живой терминал — для остальных (и как ручной режим «показать терминал» для поддерживаемых).
3. Агент-табы исчезают из центрального таб-бара (браузер/редактор/обычные терминалы остаются). Запуск агента из любого места не перехватывает центр — сессия появляется и выбирается в панели.
4. В сайдбаре под worktree — сворачиваемый заголовок «Агенты · N» + список сессий; клик активирует worktree и выбирает сессию в панели.

## Архитектурные решения

- **D1. Модель табов не трогаем.** Агент-сессии остаются `TerminalTab`+`Tab` (PTY-жизненный цикл, гидрация, sleeping-sessions, статусы работают как есть). Скрытие из таб-бара — фильтр на уровне представления. Минимальная площадь конфликта с upstream (`tabs.ts`/`terminals.ts` — красная зона по `fork/README.md`).
- **D2. Признак «панельного» таба** — чистый предикат `isAgentPanelManagedTab(tab: TerminalTab)` = `Boolean(tab.launchAgent) && AGENT_PANEL_ENABLED` в новом форк-модуле. Константа `AGENT_PANEL_ENABLED = true` — дешёвый рубильник на случай проблемного мерджа.
- **D3. Источник строк полосы — переиспользуем `useWorktreeAgentRows`** (тот же, что в сайдбаре): retained-сессии, стабильная сортировка, lineage уже решены.
- **D4. Состояние панели — отдельный форк-стор** (как `agent-chat-column-state.ts`, ноль конфликтов): `selectedPaneKeyByWorktree`, `sessionViewByPaneKey: 'chat' | 'terminal'`, `sidebarAgentsCollapsedByWorktreeId`. Персист в localStorage (`fork.agentPanel.*`), в workspace-session-схему не лезем.
- **D5. Терминал в панели — через существующий anchor-механизм.** Телу панели даём собственный anchor-name; в `TerminalPaneOverlayLayer` — один `[FORK]`-шов: выбранный в панели managed-таб позиционируется на панельный якорь, остальные managed — всегда скрыты. `viewMode` таба у managed-сессий остаётся `'terminal'`, чтобы не сработал собственный чат-портал `TerminalPane` (переключатель chat/terminal живёт в форк-сторе, не в `tab.viewMode`).
- **D6. Единый шов в воронке запуска.** Все сценарии (`+` в таб-баре, work-items, fix-checks, empty-state панели) проходят через `launchAgentInNewTab` — правка в одном месте: не отдавать группе активность, выбрать сессию в панели.
- **UI по STYLEGUIDE.md**: токены `accent`/`muted-foreground` (панель — не сайдбар), активный чип `bg-accent` + `data-current`, иконки lucide `size-3.5`, tooltips через `TooltipTrigger asChild`, без карточек-в-карточках. Строки UI — как в существующем форк-коде (`AgentChatColumn`), по-русски; следить за линтом локализации.

## Этап 1 — форк-стор и чистая модель панели

Новая директория `src/renderer/src/components/agent-panel/` (upstream её никогда не создаст).

1. `agent-panel-state.ts` — zustand-стор:
   - `selectedPaneKeyByWorktree: Record<string, string | null>`, `selectSession(worktreeId, paneKey)`, `clearSession(worktreeId, paneKey)` (при закрытии);
   - `sessionViewByPaneKey: Record<string, 'chat' | 'terminal'>` + `setSessionView`; дефолт вычисляется, а не хранится: chat, если агент поддержан native-чатом, иначе terminal;
   - `sidebarAgentsCollapsedByWorktreeId: Record<string, boolean>` + toggle;
   - персист selected/collapsed в localStorage по образцу `agent-chat-column-state.ts` (`width`/`expanded` оставить там, где есть).
2. `agent-panel-managed-tab.ts` — `AGENT_PANEL_ENABLED`, `isAgentPanelManagedTab(tab)`, `canRenderNativeChatAgent(agent)` (реэкспорт/обёртка над `NATIVE_CHAT_SUPPORTED_AGENTS` — проверить, что список экспортируется из `native-chat-availability.ts`, при нужде добавить экспорт под `[FORK]`).
3. `agent-panel-session-model.ts` — чистые функции (DOM-free, тестируемые):
   - `resolveAgentPanelTarget(rows: DashboardAgentRow[], selectedPaneKey, activeTabId)` → строка-цель: явный выбор (если ещё жив) → сессия активного таба → самая свежая (`startedAt`); перенести сюда и покрыть тестом резолв pty из `useActiveAgentTarget` (`AgentChatColumn.tsx:40-84`: leaf-pty → первый живой pty таба, кейс «только что запущен, статуса ещё нет» с paneKey `` `${tabId}:` ``).

## Этап 2 — полоса сессий в колонке

4. `AgentSessionTabStrip.tsx` (в `agent-panel/`):
   - данные: `useWorktreeAgentRows(worktreeId, true)` (импорт из `sidebar/`);
   - чип: `AgentIcon` (16), заголовок `tab.customLabel ?? generatedLabel ?? title` (truncate + tooltip), статус-точка по `row.state` (переиспользовать маппинг статусов из sidebar/dashboard-рядов), крестик по hover; активный — `bg-accent` + `data-current="true"`; полоса `overflow-x-auto`, высота вписывается в существующий header-ряд колонки (h-7);
   - «+»: `DropdownMenu` с `orderTabLaunchAgents(defaultTuiAgent, detectedIds)` + `getAgentCatalog()` — та же выборка, что в `AgentChatLaunchChoices` (`AgentChatColumn.tsx:116-156`);
   - закрытие: выяснить и вызвать тот же сторовый путь, что `commands.closeItem` для `contentType: 'terminal'` в `useTabGroupWorkspaceModel.ts:239` (teardown PTY + захват sleeping-session обязаны отработать); если логика заперта внутри хука — извлечь в переиспользуемую функцию минимальным `[FORK]`-швом; после закрытия — `clearSession` и перевыбор соседней строки.
5. Переработать `AgentChatColumn.tsx` (форк-файл, правим свободно):
   - заменить `useActiveAgentTarget` на `useWorktreeAgentRows` + `resolveAgentPanelTarget` + selection из стора;
   - header: полоса сессий слева, для native-чат-агентов — переключатель chat/terminal (`sessionViewByPaneKey`), справа существующая кнопка expand;
   - body: `view === 'chat'` и агент поддержан → `NativeChatView` (как сейчас); иначе — пустой контейнер-«экран» под терминал (этап 3); empty-state `AgentChatLaunchChoices` оставить, убрав из него `setTabViewMode(...)` в пользу нового поведения воронки (этап 4).

## Этап 3 — терминал в панели (Cursor и др.)

6. `agent-panel-body-anchor.ts` — константа anchor-name (например `--fork-agent-panel-body`) по образцу `src/renderer/src/components/tab-group/tab-group-body-anchor.ts`; тело панели в терминальном режиме выставляет `anchor-name` инлайн-стилем.
7. `[FORK]`-шов в `TerminalPaneOverlayLayer.tsx` (район строк 329-374, где считаются `assignment`/`isVisible`): для managed-таба, выбранного в панели активного worktree и находящегося в режиме `'terminal'` → `anchorName = AGENT_PANEL_BODY_ANCHOR`, `isVisible = isWorktreeActive`; для прочих managed — `isVisible = false` (никогда не показываются в группах). Немодифицированный путь для обычных табов не трогается.
8. Проверить fallback-ветку без CSS anchor-positioning (строки 95-141: поиск/измерение элемента-якоря) — она должна находить тело панели; при необходимости повторить паттерн `tab-group-body-anchor` (как якорь публикуется в DOM).
9. Убедиться, что чат-портал самого `TerminalPane` (гейт `viewMode === 'chat'`) не активируется для managed-табов: панельные сессии держат `tab.viewMode === 'terminal'`; ресайз xterm при переякоривании корректен (fit-логика уже завязана на геометрию якоря).

## Этап 4 — убрать агент-табы из центрального таб-бара

10. `[FORK]`-швы в `useTabGroupWorkspaceModel.ts`:
    - при формировании `terminalTabs` отфильтровать `isAgentPanelManagedTab` (чипы и `tabBarOrder` очищаются автоматически через `reconcileTabOrder`);
    - guard для `activeTab`: если `group.activeTabId` указывает на managed-таб (гидрация старой сессии, гонки) — для тела группы брать последний видимый из `recentTabIds`, иначе пустое состояние группы;
    - MRU/циклирование (ctrl+tab и пр.) — пропускать managed-табы; провести аудит шорткатов активации табов (`App.tsx` global shortcuts, `tab-strip-overflow-navigation.ts`).
11. `[FORK]`-шов в `launchAgentInNewTab.ts` (после `createTab`/`queueTabStartupCommand`, `:271-276`): вернуть группе прежний `activeTabId` (агент не перехватывает центр), вызвать `selectSession(worktreeId, `${tabId}:`)`; путь `createWebRuntimeSessionTerminal` (tabId === null) — пропустить. Аудит остальных создателей сессий: `resume-sleeping-agent-session.ts`, `launch-agent-background-session.ts`, `launch-ai-vault-session.ts` — убедиться, что они либо идут через ту же воронку, либо получают тот же шов.
12. Краевые случаи: закрытие последнего видимого таба группы при живых скрытых агентах (группа не должна схлопывать worktree-вью); `closeOthers`/`closeToRight` оперируют видимым списком и не должны трогать managed-табы; `ensureWorktreeHasInitialTerminal` (в `worktree-activation.ts`) считает агентский таб терминалом — решить: worktree только с агентами получает пустую группу с create-entry (приемлемо) или спавним обычный терминал.

## Этап 5 — сайдбар: сворачиваемый список агентов под веткой

13. Новый форк-компонент `SidebarWorktreeAgentsSection.tsx` (в `agent-panel/` или `sidebar/` с уникальным именем): заголовок-строка «Агенты · N» (11px, `text-muted-foreground`) + `ChevronDown size-3.5` с `-rotate-90` при collapse; состояние — `sidebarAgentsCollapsedByWorktreeId` (дефолт: развёрнуто); перед toggle — событие подавления скролла виртуализатора (`SUPPRESS_WORKTREE_LIST_SCROLL_ADJUSTMENT_EVENT`, как в `WorktreeCardAgents.tsx:243-256`); счётчик N — из того же `useWorktreeAgentRows`; в свёрнутом виде `WorktreeCardAgents` не монтируется. Индентация — через `worktree-list-indentation.ts`, без карточек-в-карточках.
14. `[FORK]`-шов в `WorktreeCard.tsx:1742-1748`: `<WorktreeCardAgents/>` оборачивается в `SidebarWorktreeAgentsSection` (одна точечная вставка).
15. `[FORK]`-шов в `WorktreeCardAgents.tsx` `handleActivateAgentTab` (`:178-223`): для managed-строк — `activateAndRevealWorktree(worktreeId)` + `selectSession(worktreeId, row.paneKey)` вместо `activateTabAndFocusPane` (скрытый таб нельзя делать активным в группе); для строк без `launchAgent` (агент, распознанный в обычном терминале по заголовку) — прежнее поведение. Компакт-режим (`CompactAgentRow`) идёт через тот же обработчик.
16. Проверить видимость списка в конфигурации пользователя: `showInlineAgentList = cardProps.includes('inline-agents') && (newCardStyle || !compactCards)` (`WorktreeCard.tsx:1067`) — `inline-agents` в дефолте Default-режима; для Compact-режима решить, включать ли принудительно в форке.

## Этап 6 — тесты и верификация

17. Юнит-тесты (vitest, колокация, паттерны `store-test-helpers`):
    - `agent-panel-session-model.test.ts` — резолв цели (явный выбор / жив-не жив / активный таб / свежейшая), резолв pty;
    - `agent-panel-state.test.ts` — изоляция по worktree, персист/восстановление, clearSession;
    - фильтрация + guard активного таба в `useTabGroupWorkspaceModel` (через извлечённые чистые хелперы);
    - запуск: после `launchAgentInNewTab` активный таб группы не изменился, selection установлен;
    - расширить `WorktreeCardAgents.activation.test.tsx` на новый роутинг клика.
18. `pnpm typecheck && pnpm lint && pnpm test`; при новых UI-строках — `pnpm sync:localization-catalog`.
19. Ручной прогон (`pnpm dev`): (а) 2+ сессии Claude на одном worktree — переключение в полосе, отправка сообщений в каждую; (б) Cursor-сессия — терминал в панели, ввод работает, ресайз колонки; (в) центр-таб-бар без агент-чипов, браузер/редактор/терминал не задеты; (г) клик по агенту в сайдбаре из другого worktree — активация + выбор; (д) свернуть/развернуть список в сайдбаре без прыжков виртуализатора; (е) рестарт приложения — гидрация без «мертвого» активного таба; (ж) SSH-worktree — строки и отправка работают.

## Риски

- **`TerminalPaneOverlayLayer` fallback-геометрия** (Chrome без anchor-positioning) — проверить обе ветки; это единственный технически рискованный шов.
- **Upstream-чурн**: `native-chat/*`, `tabs.ts`, `useTabGroupWorkspaceModel.ts` — активные зоны; вся логика — в `agent-panel/`, швы — по 1-5 строк под `[FORK] … [/FORK]`.
- **Оркестрация/фоновые агенты** (droid-группы, background sessions) тоже имеют `launchAgent` → уйдут в панель; lineage-строки `useWorktreeAgentRows` это уже отображают, но UX оркестрации нужно проверить руками.
- **Retained/уснувшие сессии** в полосе: строки `rowSource: 'retained'` без живого PTY — чип должен предлагать resume (`resume-sleeping-agent-session.ts`) или быть визуально приглушён; уточнить на этапе 2.

## To-do

- [x] Создать `src/renderer/src/components/agent-panel/agent-panel-state.ts` — форк-стор: selection по worktree, view по paneKey, collapse сайдбара, localStorage-персист
- [x] Создать `agent-panel-managed-tab.ts` — `AGENT_PANEL_ENABLED`, `isAgentPanelManagedTab`, `defaultAgentPanelSessionView` (`isNativeChatSupportedAgent` уже экспортировался)
- [x] Создать `agent-panel-session-model.ts` — резолв целевой сессии и pty (чистые функции) + тесты
- [x] Создать `AgentSessionTabStrip.tsx` — чипы сессий из `useWorktreeAgentRows`, активный чип, «+»-меню запуска, закрытие сессии через `closeTerminalTab` (тот же путь, что у таб-бара)
- [x] Переработать `AgentChatColumn.tsx`: selection-aware резолв цели, полоса в header, переключатель chat/terminal, body под оба режима
- [x] ~~anchor-name~~ → заменено порталом: тело панели регистрируется как DOM-цель (`setPanelTerminalBodyElement`), по образцу activity-terminal-portal — anchor-подход отброшен, т.к. оверлеи живут в overflow-hidden контейнерах центра и клипались бы
- [x] `[FORK]`-шов в `TerminalPaneOverlayLayer.tsx`: managed-табы скрыты из групп, выбранный в панели таб портируется в тело панели (портал работает и без CSS anchor positioning — fallback-ветка не нужна)
- [x] Убедиться, что чат-портал `TerminalPane` не срабатывает для панельных сессий (normalize-эффект в колонке сбрасывает `viewMode` в `'terminal'`)
- [x] `[FORK]`-швы в `useTabGroupWorkspaceModel.ts`: фильтр managed-табов из `terminalTabs`, guard+конвергенция `activeTab` (эффект перекидывает store на видимый таб), исключение managed из closeOthers/closeToRight/closeGroup (перенос в соседнюю группу); MRU/навигация — фильтр в `group-tab-order.ts`
- [x] `[FORK]`-шов в `launchAgentInNewTab.ts`: `createTab({activate:false})` + `selectSession`; resume-путь получил тот же шов; background-путь уже был `activate:false`; vault-путь не ставит `launchAgent` → остаётся видимым табом (осознанно)
- [x] Краевые случаи: гидрация с managed `activeTabId` — конвергирующий эффект; закрытие последнего видимого таба — `renderableTabCount` считает скрытых агентов, worktree не схлопывается; `ensureWorktreeHasInitialTerminal` — agent-only worktree не спавнит лишний терминал (решение: приемлемо, сессии видны в панели)
- [x] Создать `SidebarWorktreeAgentsSection.tsx` (заголовок «Агенты · N» + chevron + collapse с подавлением скролла виртуализатора) и вставить швом в `WorktreeCard.tsx`; при 0 агентов список монтируется как в upstream (без заголовка)
- [x] `[FORK]`-шов в `WorktreeCardAgents.tsx`: клик по managed-строке → активация worktree + `selectSession` (без `activateTabAndFocusPane`); compact-режим идёт через тот же обработчик
- [x] Compact-режим карточек: оставлен как в upstream (inline-agents скрыт в Compact без newCardStyle — «тихий» пресет осознанный; включается через Show properties)
- [x] Написать/расширить юнит-тесты: `agent-panel-session-model.test.ts` (13), `agent-panel-state.test.ts` (5), `useTabGroupWorkspaceModel.agent-panel.test.ts` (6), `[FORK]`-кейс в `WorktreeCardAgents.activation.test.tsx`, обновлены ассерты `launch-agent-in-new-tab.test.ts` (`activate:false`)
- [x] Прогнать `pnpm typecheck && pnpm lint && pnpm test` — typecheck ✓, lint ✓ (0 errors), тесты: 23 848 passed; 27 падений в 7 файлах воспроизводятся на чистом HEAD либо вызваны другими незакоммиченными правками рабочего дерева (right-sidebar drag-regions, electron-builder config) — проверено на baseline-worktree. Новых i18n-строк через `translate()` нет → sync каталога не нужен
- [ ] Ручной смоук по сценариям (мульти-сессии Claude, Cursor-терминал в панели, сайдбар-навигация, рестарт, SSH-worktree) — оставлен пользователю: запуск `pnpm dev` (Raycast «Орка») поверх работающего инстанса из агентской сессии рискован
