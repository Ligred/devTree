namespace DevTree.E2E.Tests;

/// <summary>
/// E2E tests for emoji insertion via toolbar picker and inline ":" trigger.
/// </summary>
[TestFixture]
[Category("Editor")]
public class EmojiTests : E2ETestBase
{
    [SetUp]
    public async Task NavigateToPageAsync()
    {
        await App.Sidebar.CreatePageAsync();
        await App.EnterPageEditModeAsync();
    }

    [Test]
    public async Task EmojiToolbarButton_IsVisible()
    {
        await Expect(Page.Locator("button[title='Emoji']").First).ToBeVisibleAsync();
    }

    [Test]
    public async Task EmojiToolbarButton_OpensPicker()
    {
        await App.Editor.ClickToolbarButtonAsync("Emoji");
        await Page.WaitForTimeoutAsync(400);

        // emoji-mart renders a search input inside its shadow DOM — use that as the presence signal
        var pickerSearch = Page.GetByPlaceholder("Search").Last;
        await Expect(pickerSearch).ToBeVisibleAsync(new() { Timeout = 5_000 });
    }

    [Test]
    public async Task EmojiToolbarButton_InsertsEmojiOnSelect()
    {
        await App.Editor.ClickToolbarButtonAsync("Emoji");
        await Page.WaitForTimeoutAsync(400);

        // Search for a specific emoji to get a deterministic result
        var pickerSearch = Page.GetByPlaceholder("Search").Last;
        await pickerSearch.FillAsync("thumbs");
        await Page.WaitForTimeoutAsync(500);

        // Click the first emoji button in the picker results
        var emojiBtn = Page.Locator("em-emoji-picker button[data-emoji-id], button[aria-label*='thumbs']").First;
        await emojiBtn.ClickAsync(new() { Timeout = 5_000 });
        await Page.WaitForTimeoutAsync(300);

        // Verify the emoji appears in the editor
        var proseMirror = Page.Locator(".ProseMirror").Last;
        await Expect(proseMirror).ToContainTextAsync("👍", new() { Timeout = 5_000 });
    }

    [Test]
    public async Task InlineTrigger_ColonShowsEmojiSuggestions()
    {
        var editor = Page.Locator(".page-editor-content").Last;
        await editor.ClickAsync();
        await editor.PressSequentiallyAsync(":thumbs");
        await Page.WaitForTimeoutAsync(600);

        // Suggestion dropdown should appear
        var suggestionPopup = Page.Locator(".tiptap-emoji-list");
        await Expect(suggestionPopup).ToBeVisibleAsync(new() { Timeout = 5_000 });
    }

    [Test]
    public async Task InlineTrigger_SelectingEmojiInsertsIt()
    {
        var editor = Page.Locator(".page-editor-content").Last;
        await editor.ClickAsync();
        await editor.PressSequentiallyAsync(":fire");
        await Page.WaitForTimeoutAsync(600);

        var suggestionPopup = Page.Locator(".tiptap-emoji-list");
        await suggestionPopup.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 5_000 });

        var firstItem = suggestionPopup.Locator("button").First;
        await firstItem.ClickAsync();
        await Page.WaitForTimeoutAsync(200);

        // The ":" trigger text is replaced by the emoji character
        var proseMirror = Page.Locator(".ProseMirror").Last;
        await Expect(proseMirror).Not.ToContainTextAsync(":fire");
        await Expect(proseMirror).ToContainTextAsync("🔥", new() { Timeout = 5_000 });
    }
}
