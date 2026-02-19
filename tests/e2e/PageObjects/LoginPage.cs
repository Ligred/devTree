namespace DevTree.E2E.PageObjects;

/// <summary>
/// Page object for the login/register page.
/// Supports email/password sign-in and registration only (OAuth excluded from E2E).
/// </summary>
public class LoginPage(IPage page)
{
    private readonly IPage _page = page;

    private static string BaseUrl =>
        Environment.GetEnvironmentVariable("DEVTREE_BASE_URL") ?? "http://localhost:3000";

    private string LoginUrl => BaseUrl.TrimEnd('/') + "/login";

    // ── Selectors (English UI; tests run with en-US locale) ──────────────────

    private ILocator EmailInput    => _page.GetByLabel("Email");
    private ILocator PasswordInput => _page.GetByRole(AriaRole.Textbox, new() { Name = "Password" });
    private ILocator SignInButton  => _page.GetByRole(AriaRole.Button, new() { Name = "Sign in" });
    private ILocator SignUpButton  => _page.GetByRole(AriaRole.Button, new() { Name = "Sign up" });
    private ILocator CreateAccountButton => _page.GetByRole(AriaRole.Button, new() { Name = "Create account" });
    private ILocator ErrorAlert    => _page.Locator("[role='alert']").Filter(new() { HasText = "" }).First;
    private ILocator ForgotLink    => _page.GetByRole(AriaRole.Link, new() { Name = "Forgot?" });

    // ── Navigation ─────────────────────────────────────────────────────────

    public Task GotoLoginAsync() =>
        _page.GotoAsync(LoginUrl, new() { WaitUntil = WaitUntilState.NetworkIdle });

    public Task<bool> IsOnLoginPageAsync() =>
        Task.FromResult(_page.Url.Contains("/login"));

    // ── Actions ───────────────────────────────────────────────────────────

    public async Task FillEmailAsync(string email)
    {
        await EmailInput.FillAsync(email);
    }

    public async Task FillPasswordAsync(string password)
    {
        await PasswordInput.FillAsync(password);
    }

    /// <summary>Sign in with email and password (login mode).</summary>
    public async Task SubmitLoginAsync(string email, string password)
    {
        await FillEmailAsync(email);
        await FillPasswordAsync(password);
        await SignInButton.ClickAsync();
    }

    /// <summary>Switch to register mode and submit with email + password.</summary>
    public async Task SubmitRegisterAsync(string email, string password, string? name = null)
    {
        await SwitchToRegisterAsync();
        await FillEmailAsync(email);
        await FillPasswordAsync(password);
        if (!string.IsNullOrEmpty(name))
            await _page.GetByLabel("Name (optional)").FillAsync(name);
        await CreateAccountButton.ClickAsync();
    }

    public async Task SwitchToRegisterAsync()
    {
        await SignUpButton.ClickAsync();
        await _page.WaitForTimeoutAsync(200);
    }

    /// <summary>Switch from register back to login (click "Log in" link).</summary>
    public async Task SwitchToLoginAsync()
    {
        await _page.GetByRole(AriaRole.Button, new() { Name = "Log in" }).ClickAsync();
        await _page.WaitForTimeoutAsync(200);
    }

    /// <summary>Click language toggle: "EN" or "UK" (button text on the left panel; aria-label is "Language").</summary>
    public async Task SetLanguageAsync(string enOrUk)
    {
        await _page.GetByRole(AriaRole.Button).Filter(new() { HasText = enOrUk }).ClickAsync();
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    public Task<bool> IsSignInButtonVisibleAsync() => SignInButton.IsVisibleAsync();
    public Task<bool> IsCreateAccountVisibleAsync() => CreateAccountButton.IsVisibleAsync();
    public Task<string> GetErrorTextAsync() => ErrorAlert.InnerTextAsync();
    public Task<bool> IsErrorVisibleAsync() => ErrorAlert.IsVisibleAsync();
}
