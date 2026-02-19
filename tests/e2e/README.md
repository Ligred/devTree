# DevTree — E2E Tests (C# · .NET 9 · Playwright · NUnit)

End-to-end tests for the DevTree application using the **Page Object Model** pattern.

## Prerequisites

| Tool | Version |
|------|---------|
| [.NET SDK](https://dotnet.microsoft.com/download) | 9.0+ |
| [PowerShell](https://github.com/PowerShell/PowerShell) | 7+ (for browser install script) |
| DevTree running locally | `http://localhost:3000` |

## Quick start

```bash
# 1. Start the database
pnpm db:dev

# 2. Start the Next.js dev server (from the repo root)
pnpm dev

# 3. Install .NET dependencies and Playwright browsers
cd tests/e2e
dotnet build        # also installs Playwright browsers via post-build target

# 4. Run all tests
dotnet test --settings .runsettings

# 5. Run a specific category
dotnet test --settings .runsettings --filter "Category=Sidebar"
dotnet test --settings .runsettings --filter "Category=Editor"
dotnet test --settings .runsettings --filter "Category=Settings"
```

## Run against a different URL

```bash
DEVTREE_BASE_URL=http://staging.example.com dotnet test --settings .runsettings
```

## Run tests with visible browser (headed mode)

Use the headed runsettings so Chromium opens a visible window (useful to see what’s wrong when tests fail):

```bash
dotnet test --settings .runsettings.headed

# Only Login tests (quick visual check)
dotnet test --settings .runsettings.headed --filter "Category=Login"
```

This uses `Headless=false` and `SlowMo=100`. Run from a normal terminal (not inside a restricted sandbox) so the browser can access its profile and display correctly.

## Project structure

```
tests/e2e/
├── DevTree.E2E.csproj          # .NET project file
├── GlobalUsings.cs             # global using directives
├── .runsettings                # Playwright + test run configuration (headless)
├── .runsettings.headed         # Same but Headless=false for visible browser
├── .config/
│   └── dotnet-tools.json       # local tools (trxlog2html for report)
├── run-e2e-with-report.ps1     # run tests + generate HTML report
├── Setup/
│   └── PlaywrightSetup.cs     # base class; logs in when redirected to /login
├── PageObjects/
│   ├── AppPage.cs              # top-level page object
│   ├── LoginPage.cs            # login/register page (email/password only; OAuth omitted)
│   ├── SidebarPage.cs          # file-explorer sidebar
│   ├── EditorPage.cs           # block editor
│   └── SettingsPage.cs        # settings dialog
└── Tests/
    ├── LoginTests.cs           # login page: form, validation, language (no OAuth)
    ├── SidebarTests.cs         # sidebar & navigation tests
    ├── EditorTests.cs          # block editor tests
    └── SettingsTests.cs        # theme & language tests
```

## Test categories

| Category | What it covers |
|----------|----------------|
| `Login` | Login page: form visibility, register switch, invalid credentials, language toggle (no OAuth) |
| `Sidebar` | Page/folder creation, navigation, hide/show sidebar |
| `Editor` | Add/edit/delete blocks (Text, Code, Table, Checklist, Image, Audio) |
| `Settings` | Open/close dialog, theme switching, language switching |

## Test report (HTML)

Generate a TRX file and an HTML report for viewing in the browser.
This uses the built-in VSTest **HTML logger** (no extra tools required).

```bash
cd tests/e2e

# Run tests and generate report (PowerShell)
./run-e2e-with-report.ps1

# With headed mode and only Login tests
./run-e2e-with-report.ps1 -Headed -Filter "Category=Login"
```

Or manually:

```bash
dotnet test --results-directory TestResults \
  --logger "trx;LogFileName=e2e-results.trx" \
  --logger "html;LogFileName=e2e-report.html"
```

Open `TestResults/e2e-report.html` in a browser. If you prefer, open `TestResults/e2e-results.trx` in Visual Studio or another TRX viewer.

## Authentication

- The app requires login. **Sidebar, Editor, and Settings** tests run after signing in with **DEVTREE_E2E_EMAIL** and **DEVTREE_E2E_PASSWORD** (set in the environment or `.runsettings`). Use an account created via `pnpm db:seed` (e.g. default admin) or register one.
- **Login** tests run against the login page only; they do not require valid credentials except for the optional `LoginPage_ValidCredentials_RedirectsToApp` test (marked `[Explicit]`).
- OAuth (Google/GitHub) is **not** covered by E2E tests.

## Notes

- For CI, set `DEVTREE_BASE_URL`, and for authenticated tests set `DEVTREE_E2E_EMAIL` and `DEVTREE_E2E_PASSWORD`.
