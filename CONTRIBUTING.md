# BLOCKSHIELD — Team Contribution & Collaboration Guidelines

Welcome to the **BLOCKSHIELD** project. To ensure smooth collaboration between multiple developers, technical leads, and AI coding agents while minimizing Git merge conflicts, all contributors must strictly adhere to the standards outlined in this document.

---

## 1. Branching Strategy & Workflow

We follow a structured **Feature Branch Workflow** centered around `main` (production-ready) and development branches.

```text
main (Protected)
  └── dev (Integration Branch)
        ├── feature/admin-dashboard-filters
        ├── feature/manager-batch-approval
        ├── feature/auditor-export-csv
        ├── bugfix/transfer-status-sync
        └── refactor/css-modularization
```

### Core Rules:
1. **Never commit directly to `main`**: All code enters `main` via reviewed Pull Requests (PRs).
2. **Branch Naming Conventions**:
   - `feature/<feature-name>`: For new capabilities or modularization tasks.
   - `bugfix/<issue-name>`: For addressing defects or regression fixes.
   - `refactor/<module-name>`: For code modularization without behavior changes.
   - `docs/<subject>`: For documentation additions or updates.
3. **Keep Branches Focused and Short-Lived**: Do not combine unrelated tasks into a single branch.

---

## 2. AI-Assisted Development Rules (Mandatory for AI Agents)

Every AI coding assistant, subagent, or autonomous tool working inside this repository **MUST** adhere to these 19 rules:

1. **Inspect Git Status Before Modifying Files**: Always run `git status` and verify working tree cleanliness before making any changes.
2. **Identify the Current Branch**: Run `git branch --show-current` to confirm you are on the intended branch.
3. **Read Relevant Architecture Documentation**: Review [ARCHITECTURE.md](file:///home/varun/Projects/BLOCKSHIELD/ARCHITECTURE.md) and module boundaries before initiating work.
4. **Understand the Feature Boundary**: Confine your changes strictly to the domain of the feature you were requested to work on.
5. **Modify Only Files Necessary for the Assigned Task**: Do not touch unrelated files or adjacent features.
6. **Avoid Unrelated Refactoring**: Do not clean up, rename, or reorder code in files outside your immediate assignment.
7. **Avoid Formatting Unrelated Files**: Never run global formatters (e.g. Prettier) across the entire codebase. Only format your own newly added lines.
8. **Avoid Rewriting Large Files Unnecessarily**: Perform targeted, surgical edits rather than replacing entire 1,000+ line files.
9. **Report All Modified Files**: Clearly list every file modified in your progress report.
10. **Explain Why Each Modified File Was Changed**: Provide concise technical rationale for every change.
11. **Run Appropriate Tests & Build Verification**: Verify that `npm run build` succeeds and active services remain healthy before declaring completion.
12. **Show a Summary of Changes Before Suggesting Commits**: Provide a concise breakdown of modifications.
13. **Never Modify Another Developer's Feature Without Explicit Instruction**: Respect feature boundaries (e.g. do not alter `features/admin/` when working on `features/user/`).
14. **Never Commit Directly to Main**: Ensure working branches are feature branches.
15. **Never Push Directly to Main**: Pushes to `main` require human review and approvals.
16. **Never Use `git reset --hard`**: Destructive resets can obliterate teammates' unstaged or committed work.
17. **Never Force-Push (`git push --force` or `--force-with-lease`)**: Never rewrite published Git history.
18. **Never Delete Branches**: Do not prune or delete local/remote branches unless explicitly asked by human developers.
19. **Never Modify Git History**: Rebase, squash, or cherry-pick operations must only be executed under human developer direction.

---

## 3. Pull Request & Code Review Process

1. **Self-Review**:
   - Run `git diff` to verify only intended files and lines were touched.
   - Run `cd frontend && npm run build` to confirm zero compilation errors.
   - Run API health checks and verify blockchain ledger connectivity.
2. **PR Description**:
   - Provide a clear summary of what was added, modified, or extracted.
   - Explicitly note any touchpoints with [Collaboration Hotspots](file:///home/varun/Projects/BLOCKSHIELD/ARCHITECTURE.md#6-collaboration-hotspots-phase-12).
   - Include screenshots or terminal logs demonstrating that existing behavior is preserved.
3. **Review Requirements**:
   - At least 1 peer approval is required before merging into `dev` or `main`.
   - CI build checks must pass without warnings.

---

## 4. Commit Message Conventions

We follow the **Conventional Commits** specification:

```text
<type>(<scope>): <short description>

[optional body explaining rationale]
```

### Allowed Types:
- `feat`: A new user-facing feature or dashboard capability.
- `fix`: A bug fix in smart contracts, backend controllers, or frontend views.
- `refactor`: Code reorganization or modularization that does not alter external behavior.
- `docs`: Documentation updates or additions.
- `style`: Visual styling adjustments that do not impact business logic.
- `test`: Adding or updating test suites.
- `chore`: Maintenance tasks, dependency bumps, or script improvements.

### Examples:
```bash
feat(user): add transfer request modal with DID validation
fix(backend): prevent null pointer on unassigned asset custodian
refactor(frontend): extract shared listParsers utility
docs(arch): add sequence diagram for custodian transfer flow
```

---

## 5. Conflict Prevention & Shared-File Rules

To avoid merge conflicts in a multi-developer environment:

1. **Respect Hotspots**: Before modifying any shared file listed in [ARCHITECTURE.md](file:///home/varun/Projects/BLOCKSHIELD/ARCHITECTURE.md#6-collaboration-hotspots-phase-12), notify the team in the communication channel.
2. **Prefer Modular Extension Over Editing Shared Files**:
   - Instead of adding 50 CSS classes to `index.css`, create `features/<feature>/styles.css` and import it locally.
   - Instead of adding custom helpers to `App.jsx`, place them in `utils/` or within the relevant feature hook.
3. **Frequent Pulls**: Rebase or merge from upstream `dev` frequently to detect conflicts early.

---

## 6. Testing & Quality Verification Checklist

Before opening a PR or completing a development cycle, verify:

- [ ] `cd frontend && npm run build` compiles with zero errors.
- [ ] Backend server runs without uncaught exceptions (`node src/server.js`).
- [ ] Hyperledger Fabric peer containers are healthy (`docker ps`).
- [ ] The 4 primary role dashboards load correctly:
  - Admin (`http://localhost:5174` or via persona switch)
  - Manager (`http://localhost:5175`)
  - Auditor (`http://localhost:5176`)
  - User (`http://localhost:5173`)
- [ ] Audit logs and custody history records continue to update when assets are allocated or transferred.
