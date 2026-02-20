namespace DevTree.E2E.Tests;

/// <summary>
/// E2E tests for the Diagram block:
/// adding, switching type, zoom controls, and live preview.
/// </summary>
[TestFixture]
[Category("Diagram")]
public class DiagramTests : E2ETestBase
{
    [SetUp]
    public async Task NavigateToPageAsync()
    {
        await App.Sidebar.SelectPageAsync("TypeScript Tips");
    }

    // ── Existing diagram block ────────────────────────────────────────────────

    [Test]
    public async Task DiagramBlock_RendersOnTypescriptTipsPage()
    {
        // TypeScript Tips has a pre-loaded class diagram block.
        // The block renders an SVG in the preview pane.
        var diagram = Page.Locator("[class*='mermaid-']").First;
        await Expect(Page.Locator("svg").First).ToBeVisibleAsync(new() { Timeout = 10_000 });
    }

    // ── Add a new diagram block ───────────────────────────────────────────────

    [Test]
    public async Task AddDiagramBlock_ShowsPreviewByDefault()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");
        await App.Editor.AddBlockAsync("Diagram");

        // Preview tab should be active by default — no textarea visible
        await Expect(Page.GetByTestId("diagram-editor-textarea").Last)
            .Not.ToBeVisibleAsync(new() { Timeout = 3_000 });
    }

    [Test]
    public async Task AddDiagramBlock_EditTabShowsTextarea()
    {
        await App.Sidebar.CreatePageAsync();
        await App.Sidebar.SelectPageAsync("Untitled");
        await App.Editor.AddBlockAsync("Diagram");

        // Click the Edit tab
        await Page.GetByTestId("diagram-tab-edit").Last.ClickAsync();

        // Textarea for Mermaid code should appear
        var textarea = Page.GetByTestId("diagram-editor-textarea").Last;
        await Expect(textarea).ToBeVisibleAsync();
    }

    // ── Diagram type picker ───────────────────────────────────────────────────

    [Test]
    public async Task DiagramTypePicker_OpensDropdownWithAllTypes()
    {
        await App.Sidebar.CreatePageAsync();
        await App.Sidebar.SelectPageAsync("Untitled");
        await App.Editor.AddBlockAsync("Diagram");

        await Page.GetByTestId("diagram-type-picker").Last.ClickAsync();

        await Expect(Page.GetByTestId("diagram-type-option-sequence").Last).ToBeVisibleAsync();
        await Expect(Page.GetByTestId("diagram-type-option-gantt").Last).ToBeVisibleAsync();
        await Expect(Page.GetByTestId("diagram-type-option-pie").Last).ToBeVisibleAsync();
    }

    [Test]
    public async Task DiagramTypePicker_SelectingTypeLoadsTemplate()
    {
        await App.Sidebar.CreatePageAsync();
        await App.Sidebar.SelectPageAsync("Untitled");
        await App.Editor.AddBlockAsync("Diagram");

        await Page.GetByTestId("diagram-type-picker").Last.ClickAsync();
        await Page.GetByTestId("diagram-type-option-sequence").Last.ClickAsync();

        await Page.GetByTestId("diagram-tab-edit").Last.ClickAsync();
        var textarea = Page.GetByTestId("diagram-editor-textarea").Last;
        await Expect(textarea).ToContainTextAsync("sequenceDiagram");
    }

    // ── Zoom controls ─────────────────────────────────────────────────────────

    [Test]
    public async Task ZoomControls_AreVisibleInPreviewMode()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");
        await App.Editor.AddBlockAsync("Diagram");

        await Expect(Page.GetByTestId("diagram-zoom-in").Last).ToBeVisibleAsync();
        await Expect(Page.GetByTestId("diagram-zoom-out").Last).ToBeVisibleAsync();
        await Expect(Page.GetByTestId("diagram-zoom-reset").Last).ToBeVisibleAsync();
    }

    [Test]
    public async Task ZoomIn_IncreasesZoomPercentage()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");
        await App.Editor.AddBlockAsync("Diagram");

        // Initial zoom is 100%
        var resetBtn = Page.GetByTestId("diagram-zoom-reset").Last;
        await Expect(resetBtn).ToContainTextAsync("100%");

        await Page.GetByTestId("diagram-zoom-in").Last.ClickAsync();
        await Expect(resetBtn).ToContainTextAsync("120%");
    }

    [Test]
    public async Task ZoomReset_RestoresTo100Percent()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");
        await App.Editor.AddBlockAsync("Diagram");

        await Page.GetByTestId("diagram-zoom-in").Last.ClickAsync();
        await Page.GetByTestId("diagram-zoom-in").Last.ClickAsync();

        var resetBtn = Page.GetByTestId("diagram-zoom-reset").Last;
        await Expect(resetBtn).ToContainTextAsync("140%");

        await resetBtn.ClickAsync();
        await Expect(resetBtn).ToContainTextAsync("100%");
    }

    // ── App title ────────────────────────────────────────────────────────────

    [Test]
    public async Task AppTitle_IsLearningTree()
    {
        // The sidebar header shows the app name
        var title = Page.Locator("h1");
        await Expect(title).ToContainTextAsync("Learning Tree");
    }
}
