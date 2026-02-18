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

```bash
HEADED=true dotnet test --settings .runsettings
```

## Project structure

```
tests/e2e/
├── DevTree.E2E.csproj          # .NET project file
├── GlobalUsings.cs             # global using directives
├── .runsettings                # Playwright + test run configuration
├── Setup/
│   └── PlaywrightSetup.cs      # base class for all tests
├── PageObjects/
│   ├── AppPage.cs              # top-level page object
│   ├── SidebarPage.cs          # file-explorer sidebar
│   ├── EditorPage.cs           # block editor
│   └── SettingsPage.cs         # settings dialog
└── Tests/
    ├── SidebarTests.cs         # sidebar & navigation tests
    ├── EditorTests.cs          # block editor tests
    └── SettingsTests.cs        # theme & language tests
```

## Test categories

| Category | What it covers |
|----------|----------------|
| `Sidebar` | Page/folder creation, navigation, hide/show sidebar |
| `Editor` | Add/edit/delete blocks (Text, Code, Table, Checklist, Image) |
| `Settings` | Open/close dialog, theme switching, language switching |

## Notes

- Tests run against the **sample data** pre-loaded in `samplePages.ts` (no real DB needed for dev).
- The app does **not** enforce authentication on the main route in the current implementation, so no login step is required.
- For CI, set the `DEVTREE_BASE_URL` environment variable to point at your staging deployment.
