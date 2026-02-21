namespace DevTree.E2E.PageObjects;

/// <summary>
/// Page object for the main content / block editor area.
/// </summary>
public class EditorPage(IPage page)
{
    private readonly IPage _page = page;

    private static readonly Dictionary<string, string> BlockLabelToType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Text"] = "text",
        ["Code"] = "code",
        ["Table"] = "table",
        ["Link"] = "link",
        ["Checklist"] = "agenda",
        ["Image"] = "image",
        ["Diagram"] = "diagram",
        ["Video"] = "video",
        ["Whiteboard"] = "whiteboard",
    };

    // ── Selectors ──────────────────────────────────────────────────────────

    private ILocator AddBlockBtn =>
        _page.Locator("button[aria-label='Add block'], button[aria-label='Додати блок']").First;

    private ILocator BlockPickerPopover =>
        _page.Locator("[data-radix-popper-content-wrapper]").Last;

    // ── Block picker ───────────────────────────────────────────────────────

    /// <summary>Opens the block-picker, selects a block type, and activates edit mode.</summary>
    public async Task AddBlockAsync(string blockLabel)
    {
        await AddBlockBtn.ClickAsync();
        await BlockPickerPopover.WaitForAsync();
        if (!BlockLabelToType.TryGetValue(blockLabel, out var blockType))
        {
            throw new ArgumentException($"Unsupported block label: {blockLabel}", nameof(blockLabel));
        }

        await BlockPickerPopover.GetByTestId($"block-picker-option-{blockType}").ClickAsync();
        await _page.WaitForTimeoutAsync(200);
        // New blocks start in view mode — activate edit mode so tests can interact with content.
        await EnterEditModeForLastBlockAsync();
    }

    /// <summary>
    /// Hovers the last block and clicks its "Edit block" button to enter edit mode.
    /// </summary>
    public async Task EnterEditModeForLastBlockAsync()
    {
        var wrappers = _page.Locator(".group\\/block");
        var count = await wrappers.CountAsync();
        if (count == 0) return;
        var lastBlock = wrappers.Nth(count - 1);
        await lastBlock.HoverAsync();
        await _page.Locator("button[aria-label='Edit block'], button[aria-label='Редагувати блок']").Last.ClickAsync();
        await _page.WaitForTimeoutAsync(150);
    }

    /// <summary>
    /// Exits edit mode for the last block by pressing Escape.
    /// </summary>
    public async Task ExitEditModeAsync()
    {
        await _page.Keyboard.PressAsync("Escape");
        await _page.WaitForTimeoutAsync(150);
    }

    // ── Text block ─────────────────────────────────────────────────────────

    /// <summary>Types text into the most recently added text block.</summary>
    public async Task TypeInLastTextBlockAsync(string text)
    {
        var editor = _page.Locator(".ProseMirror").Last;
        await editor.ClickAsync();
        await editor.PressSequentiallyAsync(text);
    }

    // ── Code block ─────────────────────────────────────────────────────────

    /// <summary>Returns the Monaco editor container for the last code block.</summary>
    public ILocator LastCodeEditor =>
        _page.Locator(".monaco-editor").Last;

    /// <summary>Changes the language of the last code block.</summary>
    public async Task SetCodeLanguageAsync(string language)
    {
        // Click the language dropdown button (shows current language, has font-mono class)
        var langBtn = _page.Locator("button[class*='font-mono']").Last;
        await langBtn.ClickAsync();

        // Wait for dropdown to appear - look for any popover content
        await _page.WaitForTimeoutAsync(300);

        // Try to find the language button in the dropdown
        // First, try in the last popover (most recently opened)
        var allPopovers = _page.Locator("[data-radix-popper-content-wrapper]");
        var count = await allPopovers.CountAsync();
        
        if (count > 0)
        {
            var dropdown = allPopovers.Nth(count - 1);
            await dropdown.GetByRole(AriaRole.Button, new() { Name = language, Exact = true }).ClickAsync();
        }
        else
        {
            // Fallback: search the entire page
            await _page.GetByRole(AriaRole.Button, new() { Name = language, Exact = true }).Last.ClickAsync();
        }
    }

    // ── Table block ────────────────────────────────────────────────────────

    /// <summary>Fills a specific table cell (0-based row and column).</summary>
    public async Task FillTableCellAsync(int row, int col, string value)
    {
        // Table body inputs: row 0 = first body row
        var rows = _page.Locator("table tbody tr");
        var cells = rows.Nth(row).Locator("input");
        await cells.Nth(col).FillAsync(value);
    }

    /// <summary>Fills a header cell at the given column index.</summary>
    public async Task FillTableHeaderAsync(int col, string value)
    {
        var headers = _page.Locator("table thead input");
        await headers.Nth(col).FillAsync(value);
    }

    /// <summary>Clicks the "Add row" button of the last table block.</summary>
    public Task AddTableRowAsync() =>
        _page.GetByRole(AriaRole.Button, new() { Name = "Add row" }).Last.ClickAsync();

    /// <summary>Clicks the "+" column button in the last table.</summary>
    public Task AddTableColumnAsync() =>
        _page.Locator("table thead th button[aria-label='Add column']").Last.ClickAsync();

    // ── Agenda block ───────────────────────────────────────────────────────

    /// <summary>Clicks the "Add item" button in the last agenda block.</summary>
    public Task AddAgendaItemAsync() =>
        _page.GetByRole(AriaRole.Button, new() { Name = "Add item" }).Last.ClickAsync();

    /// <summary>Types text into the last agenda text input.</summary>
    public async Task TypeAgendaItemAsync(string text)
    {
        var inputs = _page.Locator("input[placeholder='To-do item…']");
        var count  = await inputs.CountAsync();
        await inputs.Nth(count - 1).FillAsync(text);
    }

    /// <summary>Toggles the checkbox at the given index (0-based).</summary>
    public async Task ToggleAgendaItemAsync(int index)
    {
        var checkboxes = _page.Locator("input[type='checkbox']");
        await checkboxes.Nth(index).ClickAsync();
    }

    // ── Image block ────────────────────────────────────────────────────────

    /// <summary>Sets the URL and applies the image block form.</summary>
    public async Task SetImageUrlAsync(string url)
    {
        var urlInput = _page.GetByPlaceholder("https://example.com/image.png");
        await urlInput.FillAsync(url);
        await _page.GetByRole(AriaRole.Button, new() { Name = "Apply" }).Last.ClickAsync();
    }

    // ── Video block ────────────────────────────────────────────────────────

    /// <summary>Sets the URL and applies the video block form.</summary>
    public async Task SetVideoUrlAsync(string url)
    {
        var urlInput = _page.GetByPlaceholder("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
        await urlInput.FillAsync(url);
        await _page.GetByRole(AriaRole.Button, new() { Name = "Apply" }).Last.ClickAsync();
        await _page.WaitForTimeoutAsync(250);
    }

    // ── Block controls ─────────────────────────────────────────────────────

    /// <summary>Deletes a block by index (0-based).</summary>
    public async Task DeleteBlockAsync(int index)
    {
        var wrappers = _page.Locator(".group\\/block");
        await wrappers.Nth(index).HoverAsync();
        await _page.Locator("button[aria-label='Delete block'], button[aria-label='Видалити блок']").Nth(index).ClickAsync();
    }

    // ── Queries ────────────────────────────────────────────────────────────

    /// <summary>Returns the number of blocks currently rendered.</summary>
    public Task<int> BlockCountAsync() =>
        _page.Locator(".group\\/block").CountAsync();
}
