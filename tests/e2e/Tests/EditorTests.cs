namespace DevTree.E2E.Tests;

/// <summary>
/// E2E tests for the block editor:
/// adding, editing, and deleting blocks of every type.
/// </summary>
[TestFixture]
[Category("Editor")]
public class EditorTests : E2ETestBase
{
    [SetUp]
    public async Task NavigateToPageAsync()
    {
        // Start from a known page
        await App.Sidebar.SelectPageAsync("React Hooks");
    }

    // ── Block count baseline ─────────────────────────────────────────────────

    [Test]
    public async Task ReactHooksPage_HasBlocks()
    {
        var count = await App.Editor.BlockCountAsync();
        Assert.That(count, Is.GreaterThan(0));
    }

    // ── Add blocks ───────────────────────────────────────────────────────────

    [Test]
    public async Task AddTextBlock_AppearsInEditor()
    {
        var beforeCount = await App.Editor.BlockCountAsync();

        await App.Editor.AddBlockAsync("Text");

        var afterCount = await App.Editor.BlockCountAsync();
        Assert.That(afterCount, Is.EqualTo(beforeCount + 1));
    }

    [Test]
    public async Task AddTextBlock_CanTypeContent()
    {
        await App.Editor.AddBlockAsync("Text");
        await App.Editor.TypeInLastTextBlockAsync("Hello from E2E test");

        var proseMirror = Page.Locator(".ProseMirror").Last;
        await Expect(proseMirror).ToContainTextAsync("Hello from E2E test");
    }

    [Test]
    public async Task AddCodeBlock_RendersMonacoEditor()
    {
        await App.Editor.AddBlockAsync("Code");

        await Expect(App.Editor.LastCodeEditor).ToBeVisibleAsync();
    }

    [Test]
    public async Task AddCodeBlock_CanChangeLanguage()
    {
        await App.Editor.AddBlockAsync("Code");
        await App.Editor.SetCodeLanguageAsync("typescript");

        // Language button should now show "typescript"
        var langBtn = Page.Locator("button[class*='font-mono']").Last;
        await Expect(langBtn).ToContainTextAsync("typescript");
    }

    [Test]
    public async Task AddTableBlock_ShowsDefaultColumns()
    {
        await App.Editor.AddBlockAsync("Table");

        // Default table has "Column 1" and "Column 2" headers
        await Expect(Page.GetByDisplayValue("Column 1")).ToBeVisibleAsync();
        await Expect(Page.GetByDisplayValue("Column 2")).ToBeVisibleAsync();
    }

    [Test]
    public async Task AddTableBlock_CanFillCells()
    {
        await App.Editor.AddBlockAsync("Table");
        await App.Editor.FillTableHeaderAsync(0, "Name");
        await App.Editor.FillTableCellAsync(0, 0, "Alice");

        await Expect(Page.GetByDisplayValue("Alice")).ToBeVisibleAsync();
    }

    [Test]
    public async Task AddTableBlock_CanAddRow()
    {
        await App.Editor.AddBlockAsync("Table");
        var initialRows = await Page.Locator("table tbody tr").CountAsync();

        await App.Editor.AddTableRowAsync();

        var afterRows = await Page.Locator("table tbody tr").CountAsync();
        Assert.That(afterRows, Is.EqualTo(initialRows + 1));
    }

    [Test]
    public async Task AddTableBlock_CanAddColumn()
    {
        await App.Editor.AddBlockAsync("Table");
        var initialCols = await Page.Locator("table thead th").CountAsync();

        await App.Editor.AddTableColumnAsync();

        var afterCols = await Page.Locator("table thead th").CountAsync();
        // +1 for new column, the "+" button column stays
        Assert.That(afterCols, Is.EqualTo(initialCols + 1));
    }

    [Test]
    public async Task AddChecklistBlock_ShowsAddItemButton()
    {
        await App.Editor.AddBlockAsync("Checklist");

        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Add item" }).Last).ToBeVisibleAsync();
    }

    [Test]
    public async Task AddChecklistBlock_CanAddAndCheckItem()
    {
        await App.Editor.AddBlockAsync("Checklist");
        await App.Editor.TypeAgendaItemAsync("Learn Playwright");

        var itemInput = Page.GetByDisplayValue("Learn Playwright");
        await Expect(itemInput).ToBeVisibleAsync();

        // Toggle the checkbox
        var checkbox = itemInput.Locator("xpath=../preceding-sibling::input[@type='checkbox']");
        await checkbox.ClickAsync();
        await Expect(checkbox).ToBeCheckedAsync();
    }

    [Test]
    public async Task AddImageBlock_ShowsEmptyForm()
    {
        await App.Editor.AddBlockAsync("Image");

        await Expect(Page.GetByPlaceholder("https://example.com/image.png")).ToBeVisibleAsync();
    }

    [Test]
    public async Task AddImageBlock_CanSetUrl()
    {
        const string imgUrl =
            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Typescript_logo_2020.svg/512px-Typescript_logo_2020.svg.png";

        await App.Editor.AddBlockAsync("Image");
        await App.Editor.SetImageUrlAsync(imgUrl);

        // After saving, the image element should appear
        var img = Page.Locator("img[src*='Typescript']");
        await Expect(img).ToBeVisibleAsync(new() { Timeout = 10_000 });
    }

    // ── Delete blocks ────────────────────────────────────────────────────────

    [Test]
    public async Task DeleteBlock_RemovesItFromEditor()
    {
        // Add a fresh text block so we know exactly which one to delete
        await App.Editor.AddBlockAsync("Text");
        var beforeCount = await App.Editor.BlockCountAsync();

        await App.Editor.DeleteBlockAsync(beforeCount - 1);

        var afterCount = await App.Editor.BlockCountAsync();
        Assert.That(afterCount, Is.EqualTo(beforeCount - 1));
    }

    // ── Save ─────────────────────────────────────────────────────────────────

    [Test]
    public async Task SaveButton_ShowsSavedFeedback()
    {
        var saveBtn = Page.GetByRole(AriaRole.Button, new() { Name = "Save page" });
        await Expect(saveBtn).ToBeEnabledAsync();

        await App.SaveAsync();

        // After click, button is briefly disabled
        await Expect(saveBtn).ToBeDisabledAsync();
    }
}
