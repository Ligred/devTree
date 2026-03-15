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

        // Scope to em-emoji-picker to avoid matching other "Search" inputs on the page
        var pickerSearch = Page.Locator("em-emoji-picker").GetByPlaceholder("Search");
        await Expect(pickerSearch).ToBeVisibleAsync(new() { Timeout = 5_000 });
    }

    [Test]
    public async Task EmojiToolbarButton_InsertsEmojiOnSelect()
    {
        await App.Editor.ClickToolbarButtonAsync("Emoji");

        // Scope to em-emoji-picker to avoid matching other "Search" inputs on the page
        var pickerSearch = Page.Locator("em-emoji-picker").GetByPlaceholder("Search");
        await Expect(pickerSearch).ToBeVisibleAsync(new() { Timeout = 5_000 });
        await pickerSearch.FillAsync("thumbs");

        // Scope the emoji button lookup to the picker root to avoid matching unrelated buttons
        var pickerRoot = Page.Locator("em-emoji-picker");
        var emojiBtn = pickerRoot.Locator("button[data-emoji-id], button[aria-label*='thumbs']").First;
        await emojiBtn.ClickAsync(new() { Timeout = 5_000 });

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

        var suggestionPopup = Page.Locator(".tiptap-emoji-list");
        await suggestionPopup.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 5_000 });

        var firstItem = suggestionPopup.Locator("button").First;
        await firstItem.ClickAsync();
        // Wait for the suggestion popup to disappear as the commit signal
        await suggestionPopup.WaitForAsync(new() { State = WaitForSelectorState.Detached, Timeout = 3_000 });

        // The ":" trigger text is replaced by the emoji character
        var proseMirror = Page.Locator(".ProseMirror").Last;
        await Expect(proseMirror).Not.ToContainTextAsync(":fire");
        await Expect(proseMirror).ToContainTextAsync("🔥", new() { Timeout = 5_000 });
    }
}
