using Microsoft.Playwright.NUnit;

namespace DevTree.E2E.Setup;

/// <summary>
/// Base class for all E2E tests. Configures Playwright with sensible defaults
/// and provides a ready-to-use <see cref="AppPage"/> for each test.
/// </summary>
[TestFixture]
[Parallelizable(ParallelScope.Self)]
public abstract class E2ETestBase : PageTest
{
    /// <summary>The base URL of the running DevTree app.</summary>
    protected static string BaseUrl =>
        Environment.GetEnvironmentVariable("DEVTREE_BASE_URL") ?? "http://localhost:3000";

    protected AppPage App { get; private set; } = null!;

    [SetUp]
    public async Task SetUpPageAsync()
    {
        App = new AppPage(Page);
        await App.GotoAsync();
        // The Next.js dev-mode overlay (nextjs-portal) can intercept pointer events
        // and cause clicks to time out. Disable it via JS before each test runs.
        await Page.EvaluateAsync(@"
            document.querySelectorAll('nextjs-portal').forEach(el => {
                el.style.pointerEvents = 'none';
                el.style.display = 'none';
            });
        ");
    }

    // ── Playwright browser options ──────────────────────────────────────────

    public override BrowserNewContextOptions ContextOptions() =>
        new()
        {
            ViewportSize = new ViewportSize { Width = 1440, Height = 900 },
            Locale      = "en-US",
            TimezoneId  = "UTC",
        };
}
