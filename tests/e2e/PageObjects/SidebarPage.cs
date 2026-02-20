namespace DevTree.E2E.PageObjects;

/// <summary>
/// Page object for the left sidebar / file-explorer panel.
/// </summary>
public class SidebarPage(IPage page)
{
    private readonly IPage _page = page;

    // ── Selectors ──────────────────────────────────────────────────────────

    private ILocator NewPageBtn   => _page.Locator("aside button:has-text('Page'), aside button:has-text('Сторінка')").First;
    private ILocator NewFolderBtn => _page.Locator("aside button:has-text('Folder'), aside button:has-text('Папка')").First;
    private ILocator HideBtn      => _page.Locator("button[aria-label='Hide sidebar'], button[aria-label='Сховати бічну панель']").First;
    private ILocator ShowBtn      => _page.Locator("button[aria-label='Show sidebar'], button[aria-label='Показати бічну панель']").First;

    // ── Actions ────────────────────────────────────────────────────────────

    /// <summary>Creates a new page and returns its title locator.</summary>
    public async Task<ILocator> CreatePageAsync(string title = "")
    {
        // Wait for the sidebar to be ready before trying to find the button
        // Use a longer timeout in case the app is taking time to load
        var sidebar = _page.Locator("aside");
        try
        {
            await sidebar.WaitForAsync(new() { Timeout = 15_000 });
        }
        catch
        {
            // If sidebar doesn't appear, wait a bit and hope it loads
            await _page.WaitForTimeoutAsync(2000);
        }

        // Try to click the button with retries
        var newPageBtn = NewPageBtn;
        for (int i = 0; i < 3; i++)
        {
            try
            {
                await newPageBtn.ClickAsync(new() { Timeout = 5_000 });
                break;
            }
            catch when (i < 2)
            {
                await _page.WaitForTimeoutAsync(500);
            }
        }

        // Wait for the new item to appear in the tree
        await _page.WaitForTimeoutAsync(300);

        // NOTE: Pages cannot be renamed inline in the sidebar like folders can.
        // Page titles must be changed via the PageTitle editor component.
        // If a specific title is desired, the test should update it in the editor
        // after creating the page.
        var pageText = string.IsNullOrEmpty(title) ? "Untitled" : title;
        var locator = _page.GetByText(pageText).First;
        await locator.WaitForAsync(new() { Timeout = 5_000 });
        return locator;
    }

    /// <summary>Creates a new folder and optionally renames it.</summary>
    public async Task<ILocator> CreateFolderAsync(string name = "")
    {
        await NewFolderBtn.ClickAsync();
        await _page.WaitForTimeoutAsync(300);

        if (!string.IsNullOrEmpty(name))
        {
            await RenameLastItemAsync(name);
            // After rename, explicitly wait for the renamed text to appear
            var locator = _page.GetByText(name).First;
            await locator.WaitForAsync(new() { Timeout = 15_000 });
            return locator;
        }
        else
        {
            // If no name provided, wait for "New folder" text to appear
            var locator = _page.GetByText("New folder").First;
            await locator.WaitForAsync();
            return locator;
        }
    }

    /// <summary>Double-clicks the last tree item to enter rename mode and types a name.</summary>
    public async Task RenameLastItemAsync(string newName)
    {
        // The last row in the accordion (newly created) gets an inline rename input on double-click
        var items = _page.Locator("[data-radix-accordion-item]");
        var count = await items.CountAsync();
        if (count == 0) return;

        var lastItem = items.Nth(count - 1);
        
        // Scroll into view before interacting
        await lastItem.ScrollIntoViewIfNeededAsync();
        await lastItem.DblClickAsync();

        // Wait for the input to appear after double-click
        var input = _page.GetByRole(AriaRole.Textbox).Last;
        await input.WaitForAsync();

        // Clear any existing text and type the new name
        await input.ClearAsync();
        await input.TypeAsync(newName);
        
        // Wait for text to be entered
        await _page.WaitForTimeoutAsync(150);
        
        // Press Enter to commit the rename
        await input.PressAsync("Enter");

        // Wait for the input to disappear and the tree to update
        await _page.WaitForTimeoutAsync(500);
    }

    /// <summary>Clicks a tree item by its visible text.</summary>
    public async Task SelectPageAsync(string title)
    {
        var sidebar = _page.Locator("aside");
        await sidebar.WaitForAsync(new() { Timeout = 15_000 });

        var locator = sidebar.GetByText(title, new() { Exact = true }).First;
        await locator.WaitForAsync(new() { Timeout = 15_000 });
        await locator.ClickAsync();
        // After clicking, wait a bit for the page to load
        await _page.WaitForTimeoutAsync(500);
    }

    /// <summary>Collapses the sidebar.</summary>
    public Task HideAsync() => HideBtn.ClickAsync();

    /// <summary>Expands the sidebar from the collapsed strip.</summary>
    public Task ShowAsync() => ShowBtn.ClickAsync();

    /// <summary>Returns true when the sidebar panel is visible.</summary>
    public async Task<bool> IsVisibleAsync() =>
        await _page.Locator("aside").IsVisibleAsync();

    /// <summary>Waits for the sidebar to be visible.</summary>
    public async Task WaitForVisibleAsync()
    {
        await _page.Locator("aside").WaitForAsync(new() { Timeout = 10_000 });
        await _page.Locator("aside").IsVisibleAsync();
    }
}
