namespace DevTree.E2E.PageObjects;

/// <summary>
/// Page object for the left sidebar / file-explorer panel.
/// </summary>
public class SidebarPage(IPage page)
{
    private readonly IPage _page = page;

    // ── Selectors ──────────────────────────────────────────────────────────

    private ILocator NewPageBtn   => _page.GetByRole(AriaRole.Button, new() { Name = "Page" }).First;
    private ILocator NewFolderBtn => _page.GetByRole(AriaRole.Button, new() { Name = "Folder" }).First;
    private ILocator HideBtn      => _page.GetByRole(AriaRole.Button, new() { Name = "Hide sidebar" });
    private ILocator ShowBtn      => _page.GetByRole(AriaRole.Button, new() { Name = "Show sidebar" });

    // ── Actions ────────────────────────────────────────────────────────────

    /// <summary>Creates a new page and returns its title locator.</summary>
    public async Task<ILocator> CreatePageAsync(string title = "")
    {
        await NewPageBtn.ClickAsync();
        // Wait for the new item to appear in the tree
        await _page.WaitForTimeoutAsync(300);

        if (!string.IsNullOrEmpty(title))
            await RenameLastItemAsync(title);

        return _page.GetByText(string.IsNullOrEmpty(title) ? "New page" : title);
    }

    /// <summary>Creates a new folder and optionally renames it.</summary>
    public async Task<ILocator> CreateFolderAsync(string name = "")
    {
        await NewFolderBtn.ClickAsync();
        await _page.WaitForTimeoutAsync(300);

        if (!string.IsNullOrEmpty(name))
            await RenameLastItemAsync(name);

        return _page.GetByText(string.IsNullOrEmpty(name) ? "New folder" : name);
    }

    /// <summary>Double-clicks the last tree item to enter rename mode and types a name.</summary>
    public async Task RenameLastItemAsync(string newName)
    {
        // The last row in the accordion (newly created) gets an inline rename input on double-click
        var items = _page.Locator("[data-radix-accordion-item]");
        var count = await items.CountAsync();
        if (count == 0) return;

        await items.Nth(count - 1).DblClickAsync();
        var input = _page.GetByRole(AriaRole.Textbox).Last;
        await input.FillAsync(newName);
        await input.PressAsync("Enter");
    }

    /// <summary>Clicks a tree item by its visible text.</summary>
    public Task SelectPageAsync(string title) =>
        _page.GetByText(title).First.ClickAsync();

    /// <summary>Collapses the sidebar.</summary>
    public Task HideAsync() => HideBtn.ClickAsync();

    /// <summary>Expands the sidebar from the collapsed strip.</summary>
    public Task ShowAsync() => ShowBtn.ClickAsync();

    /// <summary>Returns true when the sidebar panel is visible.</summary>
    public async Task<bool> IsVisibleAsync() =>
        await _page.Locator("aside").IsVisibleAsync();
}
