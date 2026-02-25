namespace DevTree.E2E.PageObjects;

/// <summary>
/// Top-level page object for the DevTree application.
/// Composes the <see cref="SidebarPage"/> and <see cref="EditorPage"/> objects
/// and exposes navigation helpers.
/// </summary>
public class AppPage(IPage page)
{
    private readonly IPage _page = page;

    private static string BaseUrl =>
        Environment.GetEnvironmentVariable("DEVTREE_BASE_URL") ?? "http://localhost:3000";

    public SidebarPage  Sidebar  => new(_page);
    public EditorPage   Editor   => new(_page);
    public SettingsPage Settings => new(_page);

    // ── Navigation ─────────────────────────────────────────────────────────

    public Task GotoAsync() =>
        _page.GotoAsync(BaseUrl, new() { WaitUntil = WaitUntilState.NetworkIdle });

    // ── Header ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Clicks the "Edit" header button to enter edit mode.
    /// No-op when already in edit mode (Save button visible).
    /// </summary>
    public async Task EnterPageEditModeAsync()
    {
        var editBtn = _page.GetByRole(AriaRole.Button, new() { Name = "Edit page", Exact = true });
        if (await editBtn.IsVisibleAsync())
            await editBtn.ClickAsync();
        // Wait until the Save button appears to confirm we are in edit mode
        await _page.GetByTestId("save-page-button").WaitForAsync(new() { Timeout = 5_000 });
    }

    /// <summary>Clicks the Save button and waits until the app returns to view mode (edit mode off).</summary>
    public async Task SaveAsync()
    {
        var saveBtn = _page.GetByTestId("save-page-button");
        await saveBtn.ClickAsync();
        // After a successful save the app exits edit mode — the Edit button
        // becomes visible again as confirmation that the save completed.
        await _page
            .GetByRole(AriaRole.Button, new() { Name = "Edit page", Exact = true })
            .WaitForAsync(new() { Timeout = 10_000 });
    }

    /// <summary>Opens the Settings dialog via the user-menu avatar button.</summary>
    public async Task OpenSettingsAsync()
    {
        var userMenuTrigger = _page.Locator(
            "button[aria-label='User menu'], button[aria-label='Меню користувача']"
        ).First;
        await userMenuTrigger.ClickAsync();

        var settingsItem = _page.Locator(
            "[role='menuitem']:has-text('All settings'), [role='menuitem']:has-text('Settings'), [role='menuitem']:has-text('Всі налаштування')"
        ).First;
        await settingsItem.ClickAsync();
        await Settings.WaitForAsync();
    }
}
