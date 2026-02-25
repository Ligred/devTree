namespace DevTree.E2E.PageObjects;

using System.Text.RegularExpressions;

/// <summary>
/// Page object for the main content / block editor area.
/// </summary>
public class EditorPage(IPage page)
{
    private readonly IPage _page = page;

    // ── Block-type mapping: old label → slash-command title ──────────────────────
    private static readonly Dictionary<string, string> BlockLabelToSlashTitle = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Text"] = "Paragraph",
        ["Code"] = "Code Block",
        ["Table"] = "Table",
        ["Link"] = "Link Card",
        ["Checklist"] = "Checklist",
        ["Image"] = "Image",
        ["Video"] = "Video",
        ["Diagram"] = "Canvas",
        ["Whiteboard"] = "Canvas",
        ["Canvas"] = "Canvas",
    };

    // ── Selectors ─────────────────────────────────────────────────────

    private ILocator TiptapEditor => _page.Locator(".page-editor-content").First;

    // ── Block picker via slash command ──────────────────────────────────────

    /// <summary>
    /// Inserts a block via the Tiptap slash-command menu.
    /// Assumes the page is already in edit mode.
    /// </summary>
    public async Task AddBlockAsync(string blockLabel)
    {
        if (!BlockLabelToSlashTitle.TryGetValue(blockLabel, out var slashTitle))
            throw new ArgumentException($"Unsupported block label: {blockLabel}", nameof(blockLabel));

        // Click at the end of the editor and press Enter to get a fresh line
        var editor = TiptapEditor;
        await editor.ClickAsync();
        await _page.Keyboard.PressAsync("End");
        await _page.Keyboard.PressAsync("Enter");

        // Type "/" to trigger slash menu, then type first word of title to filter
        await _page.Keyboard.TypeAsync("/");
        await _page.WaitForTimeoutAsync(200);
        await _page.Keyboard.TypeAsync(slashTitle.Split(' ')[0]);
        await _page.WaitForTimeoutAsync(300);

        // Click the first matching slash-menu button
        var slashItem = _page
            .Locator("[role='button']:has-text('" + slashTitle + "'), button:has-text('" + slashTitle + "')")
            .Last;
        await slashItem.ClickAsync(new() { Timeout = 5_000 });
        await _page.WaitForTimeoutAsync(250);
    }

    /// <summary>
    /// No-op in the unified Tiptap editor (edit mode is page-wide, not per-block).
    /// Kept for API compatibility with existing tests.
    /// </summary>
    public Task EnterEditModeForLastBlockAsync() => Task.CompletedTask;

    /// <summary>Exits page-level edit mode by pressing Escape (or Cancel).</summary>
    public async Task ExitEditModeAsync()
    {
        await _page.Keyboard.PressAsync("Escape");
        await _page.WaitForTimeoutAsync(150);
    }


    // ── Text block ─────────────────────────────────────────────────────────

    /// <summary>Types text into the Tiptap editor (at current cursor position).</summary>
    public async Task TypeInLastTextBlockAsync(string text)
    {
        var editor = _page.Locator(".page-editor-content").Last;
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
        var urlInput = _page.GetByPlaceholder("https://example.com/image.png").Last;
        await urlInput.FillAsync(url);

        var container = urlInput.Locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
        var applyButton = container.GetByRole(
            AriaRole.Button,
            new() { NameRegex = new Regex("^(Apply|Застосувати)$", RegexOptions.IgnoreCase) }
        );
        await applyButton.ClickAsync();
    }

    // ── Video block ────────────────────────────────────────────────────────

    /// <summary>Sets the URL and applies the video block form.</summary>
    public async Task SetVideoUrlAsync(string url)
    {
        var urlInput = _page.GetByPlaceholder("https://www.youtube.com/watch?v=dQw4w9WgXcQ").Last;
        await urlInput.FillAsync(url);

        var container = urlInput.Locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
        var applyButton = container.GetByRole(
            AriaRole.Button,
            new() { NameRegex = new Regex("^(Apply|Застосувати)$", RegexOptions.IgnoreCase) }
        );
        await applyButton.ClickAsync();
        await _page.WaitForTimeoutAsync(250);
    }

    // ── Block controls ─────────────────────────────────────────────────────

    /// <summary>Deletes a block — no-op in the unified Tiptap editor (kept for API compatibility).</summary>
    public Task DeleteBlockAsync(int index) => Task.CompletedTask;

    // ── Queries ──────────────────────────────────────────────────────

    /// <summary>
    /// Returns the number of top-level block elements currently rendered by the Tiptap editor.
    /// Counts paragraph, heading, blockquote, hr, ul, ol, and custom node-view wrappers.
    /// </summary>
    public Task<int> BlockCountAsync() =>
        _page.Locator(".page-editor-content > *").CountAsync();
}
