namespace DevTree.E2E.PageObjects;

using System.Text.RegularExpressions;

/// <summary>
/// Page object for the left sidebar / file-explorer panel.
/// </summary>
public class SidebarPage(IPage page)
{
    private readonly IPage _page = page;
    private static readonly Regex UntitledPattern = new("^Untitled(?:\\s+\\d+)?$", RegexOptions.Compiled);

    // ── Selectors ──────────────────────────────────────────────────────────

    private ILocator NewPageBtn   => _page.GetByTestId("sidebar-new-page").First;
    private ILocator NewFolderBtn => _page.GetByTestId("sidebar-new-folder").First;
    private ILocator HideBtn      => _page.Locator("button[aria-label='Hide sidebar'], button[aria-label='Сховати бічну панель']").First;
    private ILocator ShowBtn      => _page.Locator("button[aria-label='Show sidebar'], button[aria-label='Показати бічну панель']").First;

    // ── Actions ────────────────────────────────────────────────────────────

    private async Task<HashSet<string>> GetUntitledTitlesAsync()
    {
        var titles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var matches = _page.Locator("aside").GetByText(UntitledPattern);
        var count = await matches.CountAsync();
        for (var index = 0; index < count; index++)
        {
            var text = (await matches.Nth(index).InnerTextAsync()).Trim();
            if (!string.IsNullOrWhiteSpace(text))
            {
                titles.Add(text);
            }
        }

        return titles;
    }

    /// <summary>Creates a new page and returns its title locator.</summary>
    public async Task<ILocator> CreatePageAsync(string title = "")
    {
        var beforeUntitledTitles = await GetUntitledTitlesAsync();

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

        // NOTE: Pages are created as "Untitled", "Untitled 2", ... in the sidebar.
        // Optional `title` is intentionally ignored to keep API compatibility.
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var afterUntitledTitles = await GetUntitledTitlesAsync();
            var newTitle = afterUntitledTitles.Except(beforeUntitledTitles).FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(newTitle))
            {
                var created = _page.Locator("aside").GetByText(newTitle, new() { Exact = true }).First;
                await created.WaitForAsync(new() { Timeout = 5_000 });
                return created;
            }

            await _page.WaitForTimeoutAsync(200);
        }

        var fallback = _page.Locator("aside").GetByText("Untitled", new() { Exact = true }).Last;
        await fallback.WaitForAsync(new() { Timeout = 5_000 });
        return fallback;
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
        await input.PressSequentiallyAsync(newName);

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

        try
        {
            await locator.WaitForAsync(new() { Timeout = 3_000 });
        }
        catch (TimeoutException)
        {
            var searchInput = _page.GetByTestId("sidebar-search-input");
            await searchInput.WaitForAsync(new() { Timeout = 5_000 });
            await searchInput.FillAsync(title);
            await locator.WaitForAsync(new() { Timeout = 10_000 });
        }

        await locator.ClickAsync();

        var clearSearchButton = _page.GetByTestId("sidebar-clear-search");
        if (await clearSearchButton.IsVisibleAsync())
        {
            await clearSearchButton.ClickAsync();
        }

        // After clicking, wait a bit for the page to load
        await _page.WaitForTimeoutAsync(500);
    }

    /// <summary>Clicks the last tree item with the given visible text.</summary>
    public async Task SelectLastPageAsync(string title)
    {
        var sidebar = _page.Locator("aside");
        await sidebar.WaitForAsync(new() { Timeout = 15_000 });

        var matches = sidebar.GetByText(title, new() { Exact = true });
        var count = await matches.CountAsync();
        if (count == 0)
        {
            var searchInput = _page.GetByTestId("sidebar-search-input");
            await searchInput.WaitForAsync(new() { Timeout = 5_000 });
            await searchInput.FillAsync(title);

            matches = sidebar.GetByText(title, new() { Exact = true });
            count = await matches.CountAsync();
            if (count == 0)
            {
                throw new InvalidOperationException($"No sidebar item found with title '{title}'.");
            }
        }

        var last = matches.Nth(count - 1);
        await last.ClickAsync();
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
