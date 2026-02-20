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

    // ── Selectors (locale-agnostic) ───────────────────────────────────────────

    private ILocator EmailInput    => _page.GetByTestId("auth-email");
    private ILocator PasswordInput => _page.GetByTestId("auth-password");
    private ILocator SubmitButton  => _page.GetByTestId("auth-submit");
    private ILocator RegisterSwitchButton => _page.GetByTestId("auth-switch-register");
    private ILocator LoginSwitchButton => _page.GetByTestId("auth-switch-login");
    private ILocator ErrorAlert    => _page.Locator("[role='alert']").Filter(new() { HasText = "" }).First;
    private ILocator ForgotLink    => _page.GetByTestId("login-forgot-link");

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
        await SubmitButton.WaitForAsync(new() { Timeout = 10_000 });
        await SubmitButton.ClickAsync();
    }

    /// <summary>Switch to register mode and submit with email + password.</summary>
    public async Task SubmitRegisterAsync(string email, string password, string? name = null)
    {
        await SwitchToRegisterAsync();
        await FillEmailAsync(email);
        await FillPasswordAsync(password);
        if (!string.IsNullOrEmpty(name))
            await _page.GetByTestId("auth-name").FillAsync(name);
        await SubmitButton.WaitForAsync(new() { Timeout = 5_000 });
        await SubmitButton.ClickAsync();
    }

    public async Task SwitchToRegisterAsync()
    {
        await RegisterSwitchButton.ClickAsync();
        await _page.WaitForTimeoutAsync(200);
    }

    /// <summary>Switch from register back to login (click "Log in" link).</summary>
    public async Task SwitchToLoginAsync()
    {
        await LoginSwitchButton.ClickAsync();
        await _page.WaitForTimeoutAsync(200);
    }

    /// <summary>Click language toggle: "EN" or "UA" (button text on the left panel; aria-label is "Language").</summary>
    public async Task SetLanguageAsync(string enOrUa)
    {
        await _page.GetByRole(AriaRole.Button).Filter(new() { HasText = enOrUa }).ClickAsync();
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    public Task<bool> IsSignInButtonVisibleAsync() => SubmitButton.IsVisibleAsync();
    public Task<bool> IsCreateAccountVisibleAsync() => SubmitButton.IsVisibleAsync();
    public Task<string> GetErrorTextAsync() => ErrorAlert.InnerTextAsync();
    public Task<bool> IsErrorVisibleAsync() => ErrorAlert.IsVisibleAsync();
}
