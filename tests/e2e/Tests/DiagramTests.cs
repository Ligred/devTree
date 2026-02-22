namespace DevTree.E2E.Tests;

/// <summary>
/// E2E tests for the Diagram block — powered by Excalidraw (replaced the old
/// Mermaid text-editor in the "diagram imp" commit).
///
/// What we verify:
///   - The Excalidraw canvas element renders on a page that has a diagram block.
///   - Adding a new diagram block enters edit mode and shows the Excalidraw toolbar.
///   - The fullscreen toggle button is visible in edit mode.
///   - Exiting edit mode switches to view mode (no toolbar).
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

    // ── Canvas renders ────────────────────────────────────────────────────────

    [Test]
    public async Task DiagramBlock_RendersExcalidrawCanvas()
    {
        // TypeScript Tips has a pre-loaded diagram block.
        // Excalidraw renders a <canvas> element inside its .excalidraw container.
        var canvas = Page.Locator(".excalidraw canvas").First;
        await Expect(canvas).ToBeVisibleAsync(new() { Timeout = 15_000 });
    }

    // ── Add a new diagram block ───────────────────────────────────────────────

    [Test]
    public async Task AddDiagramBlock_RendersExcalidrawCanvasInEditMode()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");
        await App.Editor.AddBlockAsync("Diagram");

        // After adding (new blocks auto-start in edit mode), the Excalidraw
        // canvas must be visible within reasonable time (dynamic import + render).
        var canvas = Page.Locator(".excalidraw canvas").Last;
        await Expect(canvas).ToBeVisibleAsync(new() { Timeout = 15_000 });
    }

    [Test]
    public async Task AddDiagramBlock_EditModeShowsExcalidrawToolbar()
    {
        var pageLocator = await App.Sidebar.CreatePageAsync().ConfigureAwait(false);
        var pageTitle = (await pageLocator.InnerTextAsync().ConfigureAwait(false)).Trim();
        await App.Sidebar.SelectPageAsync(pageTitle).ConfigureAwait(false);
        await App.Editor.AddBlockAsync("Diagram").ConfigureAwait(false);

        // In edit mode (viewModeEnabled=false) the Excalidraw App-toolbar is visible.
        var toolbar = Page.Locator(".excalidraw .App-toolbar").Last;
        await Expect(toolbar).ToBeVisibleAsync(new() { Timeout = 15_000 });
    }

    // ── Fullscreen toggle ─────────────────────────────────────────────────────

    [Test]
    public async Task ViewMode_FullscreenButtonIsVisible()
    {
        // TypeScript Tips page has a pre-loaded diagram block in view mode.
        // The overlay button (absolute-positioned) should be visible without editing.
        var fullscreenBtn = Page.Locator("button[title*='ullscreen']").First;
        await Expect(fullscreenBtn).ToBeVisibleAsync(new() { Timeout = 15_000 });
    }

    [Test]
    public async Task EditMode_FullscreenButtonIsVisible()
    {
        var pageLocator = await App.Sidebar.CreatePageAsync().ConfigureAwait(false);
        var pageTitle = (await pageLocator.InnerTextAsync().ConfigureAwait(false)).Trim();
        await App.Sidebar.SelectPageAsync(pageTitle).ConfigureAwait(false);
        await App.Editor.AddBlockAsync("Diagram").ConfigureAwait(false);

        // In edit mode the fullscreen toggle lives inside Excalidraw's toolbar
        // (via renderTopRightUI). Title attribute contains "ullscreen".
        var fullscreenBtn = Page.Locator("button[title*='ullscreen']").Last;
        await Expect(fullscreenBtn).ToBeVisibleAsync(new() { Timeout = 15_000 });
    }

    [Test]
    public async Task FullscreenButton_TogglesFullscreenOverlay()
    {
        var pageLocator = await App.Sidebar.CreatePageAsync().ConfigureAwait(false);
        var pageTitle = (await pageLocator.InnerTextAsync().ConfigureAwait(false)).Trim();
        await App.Sidebar.SelectPageAsync(pageTitle).ConfigureAwait(false);
        await App.Editor.AddBlockAsync("Diagram").ConfigureAwait(false);

        // Enter fullscreen
        var fullscreenBtn = Page.Locator("button[title*='ullscreen']").Last;
        await Expect(fullscreenBtn).ToBeVisibleAsync(new() { Timeout = 15_000 });
        await fullscreenBtn.ClickAsync();

        // The canvas should now cover the full viewport (dialog overlay rendered)
        var dialog = Page.Locator("dialog[open]");
        await Expect(dialog).ToBeVisibleAsync(new() { Timeout = 5_000 });

        // Exit fullscreen via the minimize button
        var minimizeBtn = Page.Locator("button[title*='xit']").Last;
        await minimizeBtn.ClickAsync();
        await Expect(dialog).Not.ToBeVisibleAsync(new() { Timeout = 5_000 });
    }

    // ── View mode ─────────────────────────────────────────────────────────────

    [Test]
    public async Task ExitingEditMode_HidesExcalidrawToolbar()
    {
        var pageLocator = await App.Sidebar.CreatePageAsync().ConfigureAwait(false);
        var pageTitle = (await pageLocator.InnerTextAsync().ConfigureAwait(false)).Trim();
        await App.Sidebar.SelectPageAsync(pageTitle).ConfigureAwait(false);
        await App.Editor.AddBlockAsync("Diagram").ConfigureAwait(false);

        // Wait for canvas to appear in edit mode
        var canvas = Page.Locator(".excalidraw canvas").Last;
        await Expect(canvas).ToBeVisibleAsync(new() { Timeout = 15_000 });

        // Exit edit mode by clicking the "Done editing" button in the BlockWrapper.
        // (Escape is intercepted by Excalidraw internally, so we use the aria-label button.)
        var doneBtn = Page.Locator(
            "button[aria-label='Done editing'], button[aria-label='Завершити редагування']"
        ).Last;
        await doneBtn.ClickAsync();
        await Page.WaitForTimeoutAsync(200);

        // In view mode (viewModeEnabled=true) the Excalidraw toolbar is hidden.
        var toolbar = Page.Locator(".excalidraw .App-toolbar").Last;
        await Expect(toolbar).Not.ToBeVisibleAsync(new() { Timeout = 5_000 });
    }
}

