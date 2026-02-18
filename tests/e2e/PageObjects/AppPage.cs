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

    /// <summary>Clicks the Save button in the header.</summary>
    public async Task SaveAsync()
    {
        var saveBtn = _page.GetByRole(AriaRole.Button, new() { Name = "Save page" });
        await saveBtn.ClickAsync();
        // Wait for "Saved" feedback
        await _page.GetByRole(AriaRole.Button, new() { Name = "Save page", Disabled = true })
                   .WaitForAsync(new() { Timeout = 3_000 });
    }

    /// <summary>Opens the Settings dialog via the user-menu avatar button.</summary>
    public async Task OpenSettingsAsync()
    {
        await _page.GetByRole(AriaRole.Button, new() { Name = "User menu" }).ClickAsync();
        await _page.GetByRole(AriaRole.Menuitem, new() { Name = "Settings" }).ClickAsync();
        await Settings.WaitForAsync();
    }
}
