namespace DevTree.E2E.Tests;

/// <summary>
/// E2E tests for the sidebar / file-explorer panel:
/// page creation, folder creation, navigation, hide/show, rename.
/// </summary>
[TestFixture]
[Category("Sidebar")]
public class SidebarTests : E2ETestBase
{
    // ── App loads ───────────────────────────────────────────────────────────

    [Test]
    public async Task App_LoadsSuccessfully_ShowsSidebar()
    {
        Assert.That(await App.Sidebar.IsVisibleAsync(), Is.True,
            "Sidebar should be visible on initial load.");
    }

    [Test]
    public async Task App_LoadsSuccessfully_ShowsSamplePages()
    {
        // The sample data includes "React Hooks"
        var heading = Page.GetByText("React Hooks").First;
        await Expect(heading).ToBeVisibleAsync();
    }

    [Test]
    public async Task App_Title_IsLearningTree()
    {
        // The sidebar header shows the rebranded app name
        await Expect(Page.Locator("h1").First).ToContainTextAsync("Learning Tree");
    }

    // ── Search ────────────────────────────────────────────────────────────────

    [Test]
    public async Task SearchBox_FiltersPagesByTitle()
    {
        var searchInput = Page.GetByPlaceholder("Search pages…");
        await searchInput.FillAsync("TypeScript");

        await Expect(Page.GetByText("TypeScript Tips").First).ToBeVisibleAsync();
    }

    [Test]
    public async Task SearchBox_ClearButton_RestoresFullTree()
    {
        var searchInput = Page.GetByPlaceholder("Search pages…");
        await searchInput.FillAsync("React");

        var clearBtn = Page.GetByRole(AriaRole.Button, new() { Name = "Clear search" });
        await Expect(clearBtn).ToBeVisibleAsync();
        await clearBtn.ClickAsync();

        await Expect(searchInput).ToBeEmptyAsync();
    }

    // ── Page creation ────────────────────────────────────────────────────────

    [Test]
    public async Task CreatePage_AppearsInSidebar()
    {
        await App.Sidebar.CreatePageAsync("My Test Page");

        var item = Page.GetByText("My Test Page").First;
        await Expect(item).ToBeVisibleAsync();
    }

    [Test]
    public async Task CreateMultiplePages_AllAppearInSidebar()
    {
        await App.Sidebar.CreatePageAsync("Alpha");
        await App.Sidebar.CreatePageAsync("Beta");

        await Expect(Page.GetByText("Alpha").First).ToBeVisibleAsync();
        await Expect(Page.GetByText("Beta").First).ToBeVisibleAsync();
    }

    // ── Folder creation ──────────────────────────────────────────────────────

    [Test]
    public async Task CreateFolder_AppearsInSidebar()
    {
        await App.Sidebar.CreateFolderAsync("JS Concepts");

        var item = Page.GetByText("JS Concepts").First;
        await Expect(item).ToBeVisibleAsync();
    }

    // ── Navigation ───────────────────────────────────────────────────────────

    [Test]
    public async Task SelectPage_DisplaysPageTitleInHeader()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");

        var header = Page.Locator("header span").First;
        await Expect(header).ToContainTextAsync("React Hooks");
    }

    [Test]
    public async Task SelectPage_DisplaysBlocksInEditor()
    {
        await App.Sidebar.SelectPageAsync("React Hooks");

        // The React Hooks sample page has blocks
        var blockCount = await App.Editor.BlockCountAsync();
        Assert.That(blockCount, Is.GreaterThan(0),
            "React Hooks page should have at least one block.");
    }

    // ── Hide / Show sidebar ──────────────────────────────────────────────────

    [Test]
    public async Task HideSidebar_SidebarDisappears()
    {
        await App.Sidebar.HideAsync();

        Assert.That(await App.Sidebar.IsVisibleAsync(), Is.False,
            "Sidebar should be hidden after clicking Hide.");
    }

    [Test]
    public async Task HideAndShowSidebar_SidebarReappears()
    {
        await App.Sidebar.HideAsync();
        await App.Sidebar.ShowAsync();

        Assert.That(await App.Sidebar.IsVisibleAsync(), Is.True,
            "Sidebar should be visible again after clicking Show.");
    }
}
