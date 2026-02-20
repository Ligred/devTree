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
    private static readonly string FallbackE2EEmail = $"e2e.{Guid.NewGuid():N}@devtree.local";
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

                var effectiveEmail = string.IsNullOrWhiteSpace(email) ? FallbackE2EEmail : email;
                var effectivePassword = string.IsNullOrWhiteSpace(password) ? FallbackE2EPassword : password;

                await EnsureAuthenticatedAsync(effectiveEmail, effectivePassword);
            }
            catch (Exception ex)
            {
                // Auth failed, but don't block the test - continue anyway
                System.Diagnostics.Debug.WriteLine($"Auth setup failed: {ex.Message}");
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

    private async Task EnsureAuthenticatedAsync(string email, string password)
    {
        var loginPage = new LoginPage(Page);

        try
        {
            // First try regular login (works for pre-seeded/provided credentials).
            // Use a short timeout since we might not actually be on the login form
            var signInBtn = Page.GetByRole(AriaRole.Button, new() { Name = "Sign in" });
            await signInBtn.WaitForAsync(new() { Timeout = 5_000 });
            
            await loginPage.SubmitLoginAsync(email, password);
            if (await WaitUntilLoggedInAsync(timeoutMs: 10_000))
                return;
        }
        catch (PlaywrightException)
        {
            // Button not found or other playwright error - continue to registration
        }

        try
        {
            // Login failed: create account and then login with the same credentials.
            await loginPage.SubmitRegisterAsync(email, password, "E2E User");
            await loginPage.SubmitLoginAsync(email, password);

            await Page.WaitForURLAsync(
                url => !url.Contains("/login"),
                new() { Timeout = 10_000 }
            );
        }
        catch (PlaywrightException)
        {
            // If registration/login also fails, just continue anyways.
            // The test might be running against an already-logged-in session.
        }
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
