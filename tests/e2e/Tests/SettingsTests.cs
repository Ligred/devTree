namespace DevTree.E2E.Tests;

/// <summary>
/// E2E tests for the Settings dialog: theme switching and language switching.
/// </summary>
[TestFixture]
[Category("Settings")]
public class SettingsTests : E2ETestBase
{
    // ── Open / close ─────────────────────────────────────────────────────────

    [Test]
    public async Task OpenSettings_DialogAppears()
    {
        await App.OpenSettingsAsync();

        Assert.That(await App.Settings.IsVisibleAsync(), Is.True);
    }

    [Test]
    public async Task CloseSettings_ViaXButton_DialogDisappears()
    {
        await App.OpenSettingsAsync();
        await App.Settings.CloseAsync();
        await App.Settings.WaitForCloseAsync();

        Assert.That(await App.Settings.IsVisibleAsync(), Is.False);
    }

    [Test]
    public async Task CloseSettings_ViaEscapeKey_DialogDisappears()
    {
        await App.OpenSettingsAsync();
        await Page.Keyboard.PressAsync("Escape");
        await App.Settings.WaitForCloseAsync();

        Assert.That(await App.Settings.IsVisibleAsync(), Is.False);
    }

    // ── Theme ─────────────────────────────────────────────────────────────────

    [Test]
    public async Task SwitchToDarkTheme_AppliesDarkClass()
    {
        await App.OpenSettingsAsync();
        await App.Settings.SetThemeAsync("Dark");

        var html = Page.Locator("html");
        await Expect(html).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("dark"));
    }

    [Test]
    public async Task SwitchToLightTheme_RemovesDarkClass()
    {
        // First switch to dark
        await App.OpenSettingsAsync();
        await App.Settings.SetThemeAsync("Dark");
        await App.Settings.CloseAsync();

        // Then switch back to light
        await App.OpenSettingsAsync();
        await App.Settings.SetThemeAsync("Light");

        var html = Page.Locator("html");
        await Expect(html).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("dark"));
    }

    [Test]
    [TestCase("Light")]
    [TestCase("Dark")]
    [TestCase("System")]
    public async Task ThemeButtons_AllPresent(string themeName)
    {
        await App.OpenSettingsAsync();

        var btn = Page.GetByRole(AriaRole.Button, new() { Name = themeName });
        await Expect(btn).ToBeVisibleAsync();
    }

    // ── Language ──────────────────────────────────────────────────────────────

    [Test]
    public async Task SwitchToUkrainian_TranslatesUI()
    {
        await App.OpenSettingsAsync();
        await App.Settings.SetLanguageAsync("Ukrainian");
        await App.Settings.CloseAsync();

        // The "Save" button label should change to Ukrainian
        var saveBtn = Page.GetByRole(AriaRole.Button, new() { Name = "Зберегти" });
        await Expect(saveBtn).ToBeVisibleAsync();
    }

    [Test]
    public async Task SwitchBackToEnglish_RestoresEnglishUI()
    {
        // Switch to Ukrainian first
        await App.OpenSettingsAsync();
        await App.Settings.SetLanguageAsync("Ukrainian");
        await App.Settings.CloseAsync();

        // Then switch back to English
        await App.OpenSettingsAsync();
        await App.Settings.SetLanguageAsync("Англійська"); // "English" in Ukrainian
        await App.Settings.CloseAsync();

        var saveBtn = Page.GetByRole(AriaRole.Button, new() { Name = "Save" });
        await Expect(saveBtn).ToBeVisibleAsync();
    }

    [Test]
    [TestCase("English")]
    [TestCase("Ukrainian")]
    public async Task LanguageButtons_AllPresent(string language)
    {
        await App.OpenSettingsAsync();

        var btn = Page.GetByRole(AriaRole.Button, new() { Name = language });
        await Expect(btn).ToBeVisibleAsync();
    }
}
