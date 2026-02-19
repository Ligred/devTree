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

        // If app redirected to login, sign in with E2E credentials so tests run against the main app
        if (Page.Url.Contains("/login"))
        {
            var email = Environment.GetEnvironmentVariable("DEVTREE_E2E_EMAIL");
            var password = Environment.GetEnvironmentVariable("DEVTREE_E2E_PASSWORD");
            if (!string.IsNullOrEmpty(email) && !string.IsNullOrEmpty(password))
            {
                var loginPage = new LoginPage(Page);
                await loginPage.SubmitLoginAsync(email, password);
                await Page.WaitForURLAsync(u => !u.Contains("/login"), new() { Timeout = 10_000 });
            }
        }

        // The Next.js dev-mode overlay (nextjs-portal) can intercept pointer events
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
