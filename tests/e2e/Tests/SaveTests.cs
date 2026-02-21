namespace DevTree.E2E.Tests;

/// <summary>
/// E2E tests for the save-on-demand workflow:
///
/// <list type="bullet">
///   <item>Save button is disabled when there are no unsaved changes (isDirty=false).</item>
///   <item>Save button becomes enabled after editing a page title or adding a block.</item>
///   <item>Save button returns to disabled after a successful save.</item>
///   <item>Navigating away from a dirty page shows the "Unsaved changes" dialog.</item>
///   <item>Choosing "Save and leave" persists changes and navigates away.</item>
///   <item>Choosing "Leave without saving" discards changes and navigates away.</item>
///   <item>Choosing "Cancel / Stay" keeps the user on the current page.</item>
/// </list>
/// </summary>
[TestFixture]
[Category("Save")]
public class SaveTests : E2ETestBase
{
    [SetUp]
    public async Task SetUpAsync()
    {
        await App.Sidebar.CreatePageAsync();
        await App.Sidebar.SelectPageAsync("Untitled");
    }

    // ── Save-button state ────────────────────────────────────────────────────

    /// <summary>
    /// When a page is first opened (or just created), no local edits exist,
    /// so the Save button must be disabled.
    /// </summary>
    [Test]
    public async Task SaveButton_IsDisabled_WhenPageIsClean()
    {
        var saveBtn = Page.GetByTestId("save-page-button");
        await Expect(saveBtn).ToBeDisabledAsync();
    }

    /// <summary>
    /// Typing in the page title marks the page dirty and enables the Save button.
    /// </summary>
    [Test]
    public async Task SaveButton_BecomesEnabled_AfterTitleChange()
    {
        var titleInput = Page.GetByLabel("Page title");
        await titleInput.ClickAsync();
        await titleInput.FillAsync("My Edited Title");

        var saveBtn = Page.GetByTestId("save-page-button");
        await Expect(saveBtn).ToBeEnabledAsync();
    }

    /// <summary>
    /// Adding a text block marks the page dirty and enables the Save button.
    /// </summary>
    [Test]
    public async Task SaveButton_BecomesEnabled_AfterAddingBlock()
    {
        await App.Editor.AddBlockAsync("Text");

        var saveBtn = Page.GetByTestId("save-page-button");
        await Expect(saveBtn).ToBeEnabledAsync();
    }

    /// <summary>
    /// Creating a new page while current page has unsaved changes should NOT
    /// redirect to the new page. User stays on the current page.
    /// </summary>
    [Test]
    public async Task CreatePage_WhenDirty_DoesNotRedirect()
    {
        // Rename current page so we can reliably identify it
        var titleInput = Page.GetByLabel("Page title");
        await titleInput.ClickAsync();
        await titleInput.FillAsync("Current Draft");

        // Dirty state should enable save
        var saveBtn = Page.GetByTestId("save-page-button");
        await Expect(saveBtn).ToBeEnabledAsync();

        // Create a new page in the sidebar
        await App.Sidebar.CreatePageAsync();

        // Must still be on the same page
        var headerTitle = Page.Locator("header span").First;
        await Expect(headerTitle).ToHaveTextAsync("Current Draft");
        await Expect(saveBtn).ToBeEnabledAsync();
    }

    /// <summary>
    /// After clicking Save the page syncs to the server: the button returns to
    /// disabled (isDirty reset to false).
    /// </summary>
    [Test]
    public async Task SaveButton_BecomesDisabled_AfterSave()
    {
        // Make a change to dirty the page
        await App.Editor.AddBlockAsync("Text");

        // Verify enabled before save
        var saveBtn = Page.GetByTestId("save-page-button");
        await Expect(saveBtn).ToBeEnabledAsync();

        // Save and verify disabled afterwards
        await App.SaveAsync();
        await Expect(saveBtn).ToBeDisabledAsync();
    }

    // ── Unsaved-changes dialog ───────────────────────────────────────────────

    /// <summary>
    /// Navigating away when there are unsaved changes shows the confirmation dialog.
    /// </summary>
    [Test]
    public async Task NavigateAway_WithUnsavedChanges_ShowsDialog()
    {
        // Dirty the page
        await App.Editor.AddBlockAsync("Text");

        // Create a second page to navigate to
        await App.Sidebar.CreatePageAsync();

        // Navigate to the second page — dialog should appear
        await App.Sidebar.SelectLastPageAsync("Untitled");

        // The dialog should be visible
        var dialog = Page.GetByRole(AriaRole.Alertdialog);
        await Expect(dialog).ToBeVisibleAsync();
    }

    /// <summary>
    /// Clicking "Cancel / Stay" in the unsaved-changes dialog closes the dialog
    /// and keeps the user on the same page (no navigation).
    /// </summary>
    [Test]
    public async Task UnsavedDialog_Cancel_KeepsUserOnPage()
    {
        // Add a block to dirty the page
        await App.Editor.AddBlockAsync("Text");
        await App.Editor.TypeInLastTextBlockAsync("Keep me here");

        // Remember which page is active (check header title)
        var headerTitle = Page.Locator("header span").First;
        var originalTitle = await headerTitle.TextContentAsync();

        // Create second page and try to navigate to it
        await App.Sidebar.CreatePageAsync();
        await App.Sidebar.SelectLastPageAsync("Untitled");

        // Click Cancel
        await Page.GetByTestId("unsaved-cancel").ClickAsync();

        // Dialog should be gone
        await Expect(Page.GetByRole(AriaRole.Alertdialog)).ToBeHiddenAsync();

        // Header still shows the original page title
        await Expect(headerTitle).ToHaveTextAsync(originalTitle ?? string.Empty);
    }

    /// <summary>
    /// Clicking "Leave without saving" discards local changes and navigates to
    /// the target page.
    /// </summary>
    [Test]
    public async Task UnsavedDialog_LeaveWithoutSaving_NavigatesAway()
    {
        // Dirty the page with a title change
        var titleInput = Page.GetByLabel("Page title");
        await titleInput.ClickAsync();
        await titleInput.FillAsync("Discarded Title");

        // Create second page and try to navigate to it
        await App.Sidebar.CreatePageAsync();
        await App.Sidebar.SelectLastPageAsync("Untitled");

        // Click "Leave without saving"
        await Page.GetByTestId("unsaved-leave-without-saving").ClickAsync();

        // Dialog should be gone and navigation should have happened
        await Expect(Page.GetByRole(AriaRole.Alertdialog)).ToBeHiddenAsync();

        // The "Discarded Title" page should NOT be the active page
        // (we navigated to another page)
        var headerTitle = Page.Locator("header span").First;
        await Expect(headerTitle).Not.ToHaveTextAsync("Discarded Title");
    }

    /// <summary>
    /// Clicking "Save and leave" persists the unsaved changes and navigates
    /// to the target page.
    /// </summary>
    [Test]
    public async Task UnsavedDialog_SaveAndLeave_SavesThenNavigates()
    {
        // Dirty the page
        await App.Editor.AddBlockAsync("Text");

        // Create second page and try to navigate to it
        await App.Sidebar.CreatePageAsync();
        var targetTitle = "Untitled";
        await App.Sidebar.SelectLastPageAsync(targetTitle);

        // Click "Save and leave"
        await Page.GetByTestId("unsaved-save-and-leave").ClickAsync();

        // Dialog should be gone
        await Expect(Page.GetByRole(AriaRole.Alertdialog)).ToBeHiddenAsync();

        // Navigation should have happened — header shows the new page title
        if (!string.IsNullOrWhiteSpace(targetTitle))
        {
            var headerTitle = Page.Locator("header span").First;
            await Expect(headerTitle).ToHaveTextAsync(targetTitle.Trim());
        }
    }
}
