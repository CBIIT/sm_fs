<<<<<<< Updated upstream
# Copilot Instructions — Funding Selections (sm_fs)

Angular 18 enterprise app for managing NIH/NCI grant funding requests and plans.  
Backend is a set of Swagger-generated API clients published under the `@cbiit` npm scope.

---

## Commands

```bash
# Dev server
npm start                  # local proxy (default)
npm run start-local        # explicit local API proxy
npm run start-dev          # dev API proxy
npm run start-test         # test API proxy
npm run start-stage        # stage API proxy

# Build
npm run build              # standard build
npm run build-prod         # production + creates dist/fs.zip
npm run build-non-prod     # non-prod build + creates dist/fs.zip

# Test (Karma/Jasmine)
npm test                   # run full suite

# Lint (ESLint)
npm run lint
```

**Run a single test**: use `fdescribe` / `fit` in the spec file (Jasmine focused suite/spec), then run `npm test`. Restore to `describe`/`it` before committing.

---

## Architecture

The app has two main multi-step workflows, both using hash-based routing (`useHash: true`):

- **Funding Request** (`/request/...`): 4 steps — grant selection (PD-only), grant info, documents, workflow/approval
- **Funding Plan** (`/plan/...`): 6 steps — plan info, grant table, CANs, program costs, documents, workflow/approval

Each workflow uses a parent shell component (`FundingRequestComponent` / `FundingPlanComponent`) containing a `<router-outlet>`. Step components are child routes. The parent uses `onActivate(componentRef)` to get a reference to the currently active child.

**State management** is done entirely via injectable singleton model services — no NgRx or Redux. The two main models are `RequestModel` and `PlanModel` (both `providedIn: 'root'`). They hold backend DTOs, Maps for complex relationships, validation logic, and alert arrays. Call `model.reset()` when starting a new workflow to clear stale state.

**App initialization** uses `APP_INITIALIZER` with a sequential promise chain:
`AppUserSessionService` → `AppPropertiesService` → `AppLookupsService` → `GwbLinksService`.
All four must resolve before the app renders. A failure in `AppUserSessionService` (e.g., session timeout) redirects to the session-restore flow rather than crashing.

**Loading existing records**: navigate to `request/retrieve/:frqId` or `plan/retrieve/:fprId`. The retrieve component loads the DTO, populates the model, then redirects to the appropriate step.

---

## Key Conventions

### Model Services as State
Models are injected as `public` in components so templates can access them directly (e.g., `public model: RequestModel`). Business logic and validation live in the model, not the component. Components are thin.

```typescript
// Model owns business logic
canSave(): boolean { ... }
getValidationErrors(): FundingRequestErrorCodes[] { ... }
reset(): void { ... }

// Complex state uses Maps
grantBudgetMap: Map<number, FundingRequestCanDto[]> = new Map();
```

### API Clients
All backend calls go through Swagger-generated services from `@cbiit` packages:
- `@cbiit/i2efsws-lib` — FS-specific (funding requests, plans, CANs)
- `@cbiit/i2ecommonws-lib` — common services
- `@cbiit/i2erefws-lib` — reference/lookup data
- `@cbiit/i2ecui-lib` — shared UI components and session/heartbeat services

Never write raw `HttpClient` calls for business data — use the generated controller services.

### Logging
Inject `NGXLogger` everywhere. Never use `console.log`.

```typescript
constructor(private logger: NGXLogger) {}

this.logger.debug('ngOnInit:', { param });
this.logger.error('Save failed', error, { context });
```

### Forms & Validation
Use **template-driven forms** (`NgForm`, `ngModel`). Custom validators are **directive-based** (`NG_VALIDATORS` + `multi: true`). Validation errors are stored as enums (`FundingRequestErrorCodes`). Display errors via `model.pendingAlerts` + `<app-alert-billboard>`.

### Subscriptions
Unsubscribe manually in `ngOnDestroy` — always guard with a null/closed check:
```typescript
ngOnDestroy(): void {
  if (this.sub && !this.sub.closed) this.sub.unsubscribe();
}
```

### CanDeactivate Guards
Steps with unsaved-change protection (request step2; plan steps 1, 3, 6) implement `canDeactivate()` on the component, consumed by a dedicated guard class (e.g., `CanDeactivatePlanStep1`).

### DataTables Re-render
Always destroy the DataTables instance before pushing new data:
```typescript
this.dtElement.dtInstance.then((dt: DataTables.Api) => {
  dt.destroy();
  this.dtTrigger.next();
});
```

### Component Selector Prefix
All component selectors use the `app-` prefix (e.g., `app-funding-source`). Directives use `app` camelCase (e.g., `appCustomValidator`).

### Import Order
```typescript
// 1. Angular core
import { Component, OnInit } from '@angular/core';
// 2. Third-party libraries
import { NGXLogger } from 'ngx-logger';
// 3. @cbiit libraries
import { FundingRequestDto } from '@cbiit/i2efsws-lib';
// 4. Application imports
import { RequestModel } from '../model/request/request-model';
```

### Where New Components Live
FS-specific components belong in this repo. Genuinely shared components belong in `sm_i2e_common_ui`. When unsure, put it here first.

### NavigationModel — Search Result Prev/Next
`NavigationModel` (singleton) stores the ordered ID list from search results so detail views can navigate between records. Populate it after a search, then call `getNextId(currentId)` / `getPrevId(currentId)` inside step components.

### PlanModel — Dirty-Check Snapshot
`PlanModel` supports a document-snapshot pattern for unsaved-change detection:
```typescript
this.planModel.takeDocumentSnapshot();          // capture current state
if (this.planModel.documentSnapshotChanged()) { // dirty check in canDeactivate
  // prompt user
}
```

### PlanModel — CAN Selection Map
`PlanModel.selectedApplIdCans` is a `Map<string, CanCcxDto>`. Keys use the compound format `"${fseId}-${applId}"`. Use `planModel.saveSelectedCAN(fseId, applId, can)` and `planModel.getSelectedCan(fseId, applId)` rather than accessing the Map directly.
=======
## sm_i2e_wiki (optional)

This project is part of the I2E portfolio documented in the **sm_i2e_wiki**.

> ⚠️ The sm_i2e_wiki is **environment-specific** and may not exist on your machine.
> If none of the paths below resolve on your machine, skip this section — all instructions
> above are self-contained and work without the wiki.

**Known wiki locations** (the agent uses the first path that exists on this machine):
- `C:\Users\kanozad\dev\workspaces\sm_i2e_wiki`

> To add your local path: run `wiki-connect` in this project after setting `wiki_root` in
> `~/.copilot/wiki-config.yaml`.

**If the wiki is present, follow this protocol at the start of every session:**

| Step | Action |
|------|--------|
| 1 | Read `sm_fs\docs\agent-config.md` — authoritative architecture, commands, conventions, pitfalls |
| 2 | Skim `sm_fs\docs\lessons.md` — past mistakes to avoid repeating |
| 3 | Skim `sm_fs\docs\threads.md` — open questions and deferred work from prior sessions |
| 4 | For changes touching shared libraries (`i2ecws-domain`, `i2ecommon_security`, `i2ecommon_core`), `i2ecommonws`, or `@cbiit/i2ecui-lib`, read `service-workspace\docs\dependency-map.md` to assess blast radius |

**Publishing back to the wiki at the end of a session:**

| Skill | When to invoke |
|-------|----------------|
| `session-summary` | End of any significant work session |
| `capture-lessons` | After a fix, correction, or non-obvious discovery |
| `capture-threads` | To record deferred questions or follow-up items |
>>>>>>> Stashed changes
