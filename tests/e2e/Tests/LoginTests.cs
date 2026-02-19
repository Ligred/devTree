namespace DevTree.E2E.Tests;

/// <summary>
/// E2E tests for the login/register page (email/password only; OAuth omitted).
/// </summary>
[TestFixture]
[Category("Login")]
public class LoginTests : E2ETestBase
{
    private LoginPage Login => new(Page);

    [SetUp]
    public async Task EnsureOnLoginPageAsync()
    {
        // Base SetUp already ran (GotoAsync → redirect to /login when not authenticated)
        if (!await Login.IsOnLoginPageAsync())
            await Login.GotoLoginAsync();
    }

    // ── Page load ───────────────────────────────────────────────────────────

    [Test]
    public async Task LoginPage_Loads_ShowsSignInForm()
    {
        Assert.That(await Login.IsSignInButtonVisibleAsync(), Is.True);
        await Expect(Page.GetByLabel("Email")).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Textbox, new() { Name = "Password" })).ToBeVisibleAsync();
    }

    [Test]
    public async Task LoginPage_ShowsForgotPasswordLink()
    {
        var link = Page.GetByRole(AriaRole.Link, new() { Name = "Forgot?" });
        await Expect(link).ToBeVisibleAsync();
        await Expect(link).ToHaveAttributeAsync("href", "/forgot-password");
    }

    [Test]
    public async Task LoginPage_ShowsSignUpSwitch()
    {
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Sign up" })).ToBeVisibleAsync();
    }

    // ── Switch to register ──────────────────────────────────────────────────

    [Test]
    public async Task LoginPage_SwitchToRegister_ShowsCreateAccountForm()
    {
        await Login.SwitchToRegisterAsync();
        Assert.That(await Login.IsCreateAccountVisibleAsync(), Is.True);
        await Expect(Page.GetByPlaceholder("Create a strong password")).ToBeVisibleAsync();
    }

    [Test]
    public async Task LoginPage_SwitchToRegisterAndBack_ShowsSignInAgain()
    {
        await Login.SwitchToRegisterAsync();
        await Login.SwitchToLoginAsync();
        Assert.That(await Login.IsSignInButtonVisibleAsync(), Is.True);
    }

    // ── Invalid credentials ─────────────────────────────────────────────────

    [Test]
    public async Task LoginPage_InvalidCredentials_ShowsError()
    {
        await Login.SubmitLoginAsync("wrong@example.com", "wrongpassword");

        await Expect(Page.GetByRole(AriaRole.Alert).Filter(new() { HasText = "Invalid" })).ToBeVisibleAsync(new() { Timeout = 5_000 });
    }

    // ── Language toggle ─────────────────────────────────────────────────────

    [Test]
    public async Task LoginPage_SwitchToUkrainian_UpdatesUI()
    {
        await Login.SetLanguageAsync("UK");
        await Page.WaitForTimeoutAsync(500);
        // After switching to UK, the Sign in button should show Ukrainian label
        var signInBtn = Page.GetByRole(AriaRole.Button, new() { Name = "Увійти" });
        await Expect(signInBtn).ToBeVisibleAsync(new() { Timeout = 3_000 });
    }

    [Test]
    public async Task LoginPage_LanguageToggle_EN_And_UK_Visible()
    {
        await Expect(Page.GetByRole(AriaRole.Button).Filter(new() { HasText = "EN" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button).Filter(new() { HasText = "UK" })).ToBeVisibleAsync();
    }

    // ── Valid login (requires DEVTREE_E2E_EMAIL and DEVTREE_E2E_PASSWORD) ───

    [Test]
    [Explicit("Requires DEVTREE_E2E_EMAIL and DEVTREE_E2E_PASSWORD; run manually or in CI with env set.")]
    public async Task LoginPage_ValidCredentials_RedirectsToApp()
    {
        var email = Environment.GetEnvironmentVariable("DEVTREE_E2E_EMAIL");
        var password = Environment.GetEnvironmentVariable("DEVTREE_E2E_PASSWORD");
        Assume.That(email, Is.Not.Null.And.Not.Empty, "DEVTREE_E2E_EMAIL must be set");
        Assume.That(password, Is.Not.Null.And.Not.Empty, "DEVTREE_E2E_PASSWORD must be set");

        await Login.SubmitLoginAsync(email!, password!);

        await Expect(Page).ToHaveURLAsync(new System.Text.RegularExpressions.Regex("^(?!.*/login)"), new() { Timeout = 10_000 });
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "User menu" })).ToBeVisibleAsync(new() { Timeout = 5_000 });
    }
}
