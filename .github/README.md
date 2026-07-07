<h1 align="center">
  <img src="../fork/app-icon/tobasco-bottle.png" alt="Tobasco" width="64" valign="middle" /> Tobasco
</h1>

<p align="center">
  <a href="https://github.com/iarrom/tobasco/actions/workflows/upstream-sync.yml"><img src="https://github.com/iarrom/tobasco/actions/workflows/upstream-sync.yml/badge.svg" alt="Upstream sync" /></a>
  <img src="https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-4493F8?style=flat-square" alt="Supported platforms: macOS, Windows, and Linux" />
</p>

<p align="center">
  <strong>Tobasco — наш форк <a href="https://github.com/stablyai/orca">Orca</a>, ADE для работы с флотом параллельных агентов.</strong><br/>
  Display-бренд — Tobasco; внутренние идентификаторы намеренно остаются <code>orca</code>, чтобы ежедневные upstream-мержи проходили без боли.
</p>

> Возможности базовой Orca (worktrees, терминалы, SSH, мобильный компаньон и т.д.) — в [README апстрима](../README.md). Ниже — только то, что добавлено в этом форке.

## Фичи форка

### Tasks — страница задач в стиле Linear

- Внутренний сайдбар: **Inbox** (с точкой непрочитанных), My Issues, Projects / Views, Favorites, команды; сворачивание и избранное персистятся.
- Список в анатомии Linear: группировка по статусам с band-заголовками (канонический порядок, счётчики, «+» с предустановленным статусом группы), строки issue: приоритет → идентификатор → глиф статуса → заголовок → чипы labels/project/cycle → due/estimate → аватар.
- **Saved views**: фасетные фильтры, list/board, настройки отображения; локальные сохранённые виды + read-only показ кастомных видов Linear.
- **Inbox уведомлений Linear** (multi-workspace) с optimistic mark-read / mark-all-read.
- Контекстное меню по строке issue: Status / Priority / Assignee / Due date / Labels / Estimate — с оптимистичными обновлениями и откатом при ошибке; Start workspace, Copy (ID/title/URL), Open in Linear.
- Конфигурация вида (группировка, сортировка, фильтры, display properties) переживает уход со страницы и возврат.
- Для GitHub / GitLab / Jira — группировка списков по категориям статусов.

### Панель агент-сессий

- Вкладки сессий прямо в колонке чата; agent-вкладки убраны из общего таб-бара.
- Сворачиваемый список агентов в сайдбаре — навигация по сессиям неактивных worktree.
- Chrome агент-панели выровнен с центральной колонкой (drag-strip, единый шов с тайтлбаром).

### Native chat

- Model picker и универсальное slash-меню в композере.
- Plan mode: детекция и сборка плана, ReviewPlanCard, plan-вкладки в редакторе.
- Шаги субагентов; спаривание tool-вызовов с краткими сводками действий.
- Markdown-превью с inline-ссылками на файлы.

### Встроенный браузер

- Панель закладок + меню тулбара.
- «Открыть в новой вкладке» из контекстного меню и middle-click по закладке — вкладка встаёт рядом с исходной и на том же remote-хосте.
- Design-режим: пилюля-индикатор активного annotate-режима в стиле Cursor.

### Полировка UI

- Таб-бар: правила ширины вкладок, тултипы, drop-индикатор, быстрые команды.
- Меню приложения и трей.

### Брендинг

- Display-only ребренд: `\bOrca\b → Tobasco` на этапе отображения (i18next postProcessor в renderer + обёртки в main) — каталоги локалей не тронуты, upstream-синки не смывают бренд.
- Внутренние идентификаторы (appId, `orca://`, `ORCA_*`, пути, бинарники) намеренно остаются `orca`.
- Своя иконка: `fork/scripts/generate-app-icon.mjs` генерирует все артефакты из исходников в `fork/app-icon/`.

### Fork-инфраструктура

- Каталог `fork/` + `[FORK]`-сентинелы в upstream-файлах; `fork/scripts/divergence.sh` показывает площадь расхождения.
- CI **upstream-sync**: авто-мерж `upstream/main` по расписанию с проверками и PR (или issue при конфликте).
- `pnpm fork:install` — локальная сборка и установка в /Applications (macOS); Raycast-команда для запуска dev-режима.

Отдельные фиксы качества (кандидаты в upstream) — например, устойчивость статус-бара к version-skew в rate-limit state.

## Сборка

```bash
pnpm install
pnpm dev          # dev-режим
pnpm fork:install # macOS: собрать и установить в /Applications
```

## Как устроен форк

Стратегия минимальной площади расхождения (merge-not-rebase, новый код — в новых файлах, правки upstream-файлов — под сентинелами) описана в [fork/README.md](../fork/README.md).

Корневой [`README.md`](../README.md) — апстримовский и намеренно не изменён: GitHub показывает `.github/README.md` с приоритетом, так что витрина ребрендится без единого конфликта.

## Лицензия

MIT, как и у базовой [stablyai/orca](https://github.com/stablyai/orca).
