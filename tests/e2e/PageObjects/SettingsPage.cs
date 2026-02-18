namespace DevTree.E2E.PageObjects;

/// <summary>
/// Page object for the Settings dialog.
/// </summary>
public class SettingsPage(IPage page)
{
    private readonly IPage _page = page;

    private ILocator Dialog      => _page.GetByRole(AriaRole.Dialog);
    private ILocator CloseBtn    => Dialog.GetByRole(AriaRole.Button, new() { Name = "Close" });

    // ── Waits ──────────────────────────────────────────────────────────────

    public Task WaitForAsync() =>
        Dialog.WaitForAsync(new() { Timeout = 5_000 });

    public Task WaitForCloseAsync() =>
        Dialog.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 5_000 });

    // ── Actions ────────────────────────────────────────────────────────────

    public Task CloseAsync() => CloseBtn.ClickAsync();

    /// <summary>Clicks the theme option button (Light | Dark | System).</summary>
    public async Task SetThemeAsync(string theme)
    {
        await Dialog.GetByRole(AriaRole.Button, new() { Name = theme }).ClickAsync();
    }

    /// <summary>Clicks the language option button (English | Ukrainian).</summary>
    public async Task SetLanguageAsync(string language)
    {
        await Dialog.GetByRole(AriaRole.Button, new() { Name = language }).ClickAsync();
    }

    // ── Queries ────────────────────────────────────────────────────────────

    public Task<bool> IsVisibleAsync() => Dialog.IsVisibleAsync();

    public Task<bool> IsThemeActiveAsync(string theme) =>
        Dialog.GetByRole(AriaRole.Button, new() { Name = theme })
              .Locator("xpath=self::*[contains(@class,'bg-indigo')]")
              .IsVisibleAsync();
}
