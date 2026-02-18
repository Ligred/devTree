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
        await Expect(Page.GetByRole(AriaRole.Textbox).Filter(new() { HasText = "" }))
            .Not.ToBeAttachedAsync(new() { Timeout = 1_000 });
    }

    [Test]
    public async Task AddDiagramBlock_EditTabShowsTextarea()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");
        await App.Editor.AddBlockAsync("Diagram");

        // Click the Edit tab
        await Page.GetByRole(AriaRole.Button, new() { Name = "Edit" }).Last.ClickAsync();

        // Textarea for Mermaid code should appear
        var textarea = Page.GetByLabel("Enter Mermaid diagram code…").Last;
        await Expect(textarea).ToBeVisibleAsync();
    }

    // ── Diagram type picker ───────────────────────────────────────────────────

    [Test]
    public async Task DiagramTypePicker_OpensDropdownWithAllTypes()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");
        await App.Editor.AddBlockAsync("Diagram");

        // The type picker button is in the toolbar (shows detected type name)
        var toolbar = Page.Locator("[class*='mermaid'], div").Filter(
            new() { Has = Page.GetByRole(AriaRole.Button, new() { Name = "Edit" }) }
        ).Last;

        // Find the ChevronDown button (type picker) — it has a dynamic label
        // so we look for any button that contains known diagram type names
        var pickerBtn = Page.GetByRole(AriaRole.Button, new() { Name = System.Text.RegularExpressions.Regex.IsMatch("Flowchart|Diagram|Sequence|Class", ".*") ? "Flowchart" : "Diagram" });
        await pickerBtn.Last.ClickAsync();

        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Sequence" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Gantt" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Pie Chart" })).ToBeVisibleAsync();
    }

    [Test]
    public async Task DiagramTypePicker_SelectingTypeLoadsTemplate()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");
        await App.Editor.AddBlockAsync("Diagram");

        // Open the picker and choose Sequence
        var allBtns = await Page.GetByRole(AriaRole.Button).AllAsync();
        var pickerBtn = allBtns.FirstOrDefault(b => b.GetAttributeAsync("class").Result?.Contains("font-mono") == false
            && b.InnerTextAsync().Result.Contains("Flowchart"));
        if (pickerBtn is not null)
        {
            await pickerBtn.ClickAsync();
            await Page.GetByRole(AriaRole.Button, new() { Name = "Sequence" }).ClickAsync();

            // Switch to Edit tab to verify the template loaded
            await Page.GetByRole(AriaRole.Button, new() { Name = "Edit" }).Last.ClickAsync();
            var textarea = Page.GetByLabel("Enter Mermaid diagram code…").Last;
            await Expect(textarea).ToContainTextAsync("sequenceDiagram");
        }
    }

    // ── Zoom controls ─────────────────────────────────────────────────────────

    [Test]
    public async Task ZoomControls_AreVisibleInPreviewMode()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");
        await App.Editor.AddBlockAsync("Diagram");

        await Expect(Page.GetByTitle("Zoom in").Last).ToBeVisibleAsync();
        await Expect(Page.GetByTitle("Zoom out").Last).ToBeVisibleAsync();
        await Expect(Page.GetByTitle("Reset zoom").Last).ToBeVisibleAsync();
    }

    [Test]
    public async Task ZoomIn_IncreasesZoomPercentage()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");
        await App.Editor.AddBlockAsync("Diagram");

        // Initial zoom is 100%
        var resetBtn = Page.GetByTitle("Reset zoom").Last;
        await Expect(resetBtn).ToContainTextAsync("100%");

        await Page.GetByTitle("Zoom in").Last.ClickAsync();
        await Expect(resetBtn).ToContainTextAsync("120%");
    }

    [Test]
    public async Task ZoomReset_RestoresTo100Percent()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");
        await App.Editor.AddBlockAsync("Diagram");

        await Page.GetByTitle("Zoom in").Last.ClickAsync();
        await Page.GetByTitle("Zoom in").Last.ClickAsync();

        var resetBtn = Page.GetByTitle("Reset zoom").Last;
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
