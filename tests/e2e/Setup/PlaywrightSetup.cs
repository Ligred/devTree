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
    private const string FallbackE2EPassword = "E2E!Passw0rd123";

    /// <summary>The base URL of the running DevTree app.</summary>
    protected static string BaseUrl =>
        Environment.GetEnvironmentVariable("DEVTREE_BASE_URL") ?? "http://localhost:3000";

    protected AppPage App { get; private set; } = null!;

    [SetUp]
    public async Task SetUpPageAsync()
    {
        App = new AppPage(Page);
        await App.GotoAsync();

        // Auth bootstrap only runs for non-Login test categories.
        // Login tests run against the unauthenticated page and handle their own login flow.
        var currentTest = TestContext.CurrentContext.Test;
        var categories = currentTest.Properties.ContainsKey("Category") 
            ? currentTest.Properties["Category"] as System.Collections.IList 
            : null;
        var isLoginTest = categories != null && categories.Count > 0 && categories[0]?.ToString() == "Login";

        if (isLoginTest)
            return; // Skip auth bootstrap for login tests

        // If app redirected to login, try to sign in before continuing with non-login suites.
        // If we're already logged in or auth fails, continue anyway.
        if (Page.Url.Contains("/login"))
        {
            try
            {
                var email = Environment.GetEnvironmentVariable("DEVTREE_E2E_EMAIL");
                var password = Environment.GetEnvironmentVariable("DEVTREE_E2E_PASSWORD");
                var hasProvidedCredentials = !string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password);

                var effectiveEmail = hasProvidedCredentials
                    ? email!
                    : $"e2e.{Guid.NewGuid():N}@devtree.local";
                var effectivePassword = hasProvidedCredentials
                    ? password!
                    : FallbackE2EPassword;

                await EnsureAuthenticatedAsync(effectiveEmail, effectivePassword, hasProvidedCredentials);
            }
            catch (Exception ex)
            {
                throw new AssertionException($"Auth setup failed: {ex.Message}");
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

    private async Task EnsureAuthenticatedAsync(string email, string password, bool hasProvidedCredentials)
    {
        var loginPage = new LoginPage(Page);

        if (!Page.Url.Contains("/login"))
            return;

        // Try login first only when caller provided existing credentials.
        if (hasProvidedCredentials)
        {
            try
            {
                await loginPage.SubmitLoginAsync(email, password);
                if (await WaitUntilLoggedInAsync(timeoutMs: 8_000))
                    return;
            }
            catch (PlaywrightException)
            {
                // Continue to register flow
            }
        }

        // Register a user and then sign in. Retry once with a new email if needed.
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var registerEmail = hasProvidedCredentials && attempt == 0
                ? email
                : $"e2e.{Guid.NewGuid():N}@devtree.local";

            try
            {
                await loginPage.SubmitRegisterAsync(registerEmail, password, "E2E User");
                await loginPage.SubmitLoginAsync(registerEmail, password);
                if (await WaitUntilLoggedInAsync(timeoutMs: 12_000))
                    return;
            }
            catch (PlaywrightException)
            {
                // Try the next attempt.
            }
        }

        throw new PlaywrightException("Unable to authenticate in E2E setup.");
    }

    private async Task<bool> WaitUntilLoggedInAsync(float timeoutMs)
    {
        try
        {
            await Page.WaitForURLAsync(
                url => !url.Contains("/login"),
                new() { Timeout = timeoutMs }
            );
            return true;
        }
        catch (TimeoutException)
        {
            return false;
        }
        catch (PlaywrightException)
        {
            return false;
        }
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
