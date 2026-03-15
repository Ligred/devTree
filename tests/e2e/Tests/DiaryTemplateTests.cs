namespace DevTree.E2E.Tests;

/// <summary>
/// E2E tests for the diary template application flow and the "leaving page"
/// unsaved-changes confirmation guard.
///
/// <list type="bullet">
///   <item>
///     Applying a template to a clean (non-dirty) entry applies the content
///     immediately and does NOT show any confirmation dialog.
///   </item>
///   <item>
///     Applying a template when the entry has unsaved changes shows the
///     contextually-correct overwrite confirmation dialog (NOT the
///     "Save &amp; leave / Leave without saving" navigation guard).
///   </item>
///   <item>
///     Cancelling the overwrite confirmation leaves the original content in
///     place and the entry remains dirty.
///   </item>
///   <item>
///     Confirming the overwrite confirmation replaces the entry content with
///     the template and the entry remains dirty (ready to save).
///   </item>
///   <item>
///     Navigating to a different diary date when the current entry has unsaved
///     changes shows the UnsavedChangesDialog (the navigation guard) with the
///     correct "Save &amp; leave / Leave without saving / Stay on page" options.
///   </item>
/// </list>
/// </summary>
[TestFixture]
[Category("DiaryTemplate")]
public class DiaryTemplateTests : E2ETestBase
{
    private DiaryPage _diary = null!;

    // Template reused across tests — created once per fixture in SetUp.
    private const string TemplateName  = "E2E Test Template";
    private const string TemplateTitle = "My day";
    private const string TemplatePrompts = "What went well?\nWhat to improve?";

    [SetUp]
    public async Task SetUpDiaryAsync()
    {
        _diary = new DiaryPage(Page);
        await _diary.GotoAsync();

        // Ensure there is a journal and a today entry so the editor is usable.
        await _diary.EnsureTodayEntryAsync();

        // Create the shared template via the manager dialog.
        // If it already exists (re-run), the creation will produce a duplicate-name
        // error and we ignore it — the template is still usable.
        await _diary.OpenTemplateManagerAsync();
        try
        {
            await _diary.CreateTemplateInDialogAsync(TemplateName, TemplateTitle, TemplatePrompts);
        }
        catch
        {
            // Template already exists — that's fine.
        }
        await _diary.CloseTemplateManagerAsync();
    }

    // ── Template application on a clean entry ───────────────────────────────

    /// <summary>
    /// When the diary entry has no unsaved changes (isDirty = false), clicking
    /// a template in the "Apply template" dropdown should immediately load the
    /// template content into the editor — no confirmation dialog must appear.
    /// </summary>
    [Test]
    public async Task ApplyTemplate_OnCleanEntry_LoadsContentWithoutDialog()
    {
        // Verify the entry is clean before applying.
        await Expect(Page.GetByText("Unsaved changes")).ToBeHiddenAsync(new() { Timeout = 3_000 });

        // Apply the template — no confirmation should be needed.
        await _diary.ApplyTemplateAsync(TemplateName);

        // The header should now report "Unsaved changes" (template applied → isDirty=true).
        await Expect(Page.GetByText("Unsaved changes")).ToBeVisibleAsync(new() { Timeout = 5_000 });

        // Critically: no alertdialog must have appeared (neither the overwrite confirmation
        // nor the "leaving page" UnsavedChangesDialog).
        await Expect(Page.GetByRole(AriaRole.Alertdialog)).ToBeHiddenAsync(new() { Timeout = 1_000 });

        // The template heading text should be visible in the editor area.
        var heading = Page.Locator(".page-editor-content").GetByText(TemplateTitle);
        await Expect(heading).ToBeVisibleAsync(new() { Timeout = 5_000 });
    }

    // ── Template application on a dirty entry — confirm ────────────────────

    /// <summary>
    /// When the diary entry has unsaved changes (isDirty = true), clicking a
    /// template shows the "Replace current content?" overwrite confirmation.
    /// Confirming the dialog replaces the content with the template.
    /// </summary>
    [Test]
    public async Task ApplyTemplate_WithUnsavedChanges_ConfirmReplacesContent()
    {
        // Make the entry dirty by typing text.
        await _diary.TypeInEditorAsync("Some content I might lose");
        await _diary.WaitForDirtyStateAsync();

        // Attempt to apply a template — overwrite confirmation must appear.
        await _diary.ApplyTemplateAsync(TemplateName);

        // The alertdialog should be visible. It must NOT contain "Save & leave"
        // (that belongs to the navigation guard, not the template overwrite dialog).
        var dialog = Page.GetByRole(AriaRole.Alertdialog);
        await Expect(dialog).ToBeVisibleAsync(new() { Timeout = 5_000 });
        await Expect(dialog.GetByTestId("unsaved-save-and-leave")).ToBeHiddenAsync(new() { Timeout = 1_000 });

        // Confirm the overwrite.
        await _diary.ConfirmOverwriteAsync();

        // Dialog must close and the template heading must appear in the editor.
        await Expect(dialog).ToBeHiddenAsync(new() { Timeout = 5_000 });
        var heading = Page.Locator(".page-editor-content").GetByText(TemplateTitle);
        await Expect(heading).ToBeVisibleAsync(new() { Timeout = 5_000 });

        // Entry must still be dirty (template applied but not yet saved).
        await Expect(Page.GetByText("Unsaved changes")).ToBeVisibleAsync(new() { Timeout = 3_000 });
    }

    // ── Template application on a dirty entry — cancel ─────────────────────

    /// <summary>
    /// When the overwrite confirmation dialog is cancelled, the editor content
    /// must remain unchanged and the entry stays dirty.
    /// </summary>
    [Test]
    public async Task ApplyTemplate_WithUnsavedChanges_CancelKeepsOriginalContent()
    {
        const string OriginalText = "Content I want to keep";

        // Type unique text and wait for dirty state.
        await _diary.TypeInEditorAsync(OriginalText);
        await _diary.WaitForDirtyStateAsync();

        // Attempt to apply a template — overwrite confirmation appears.
        await _diary.ApplyTemplateAsync(TemplateName);

        var dialog = Page.GetByRole(AriaRole.Alertdialog);
        await Expect(dialog).ToBeVisibleAsync(new() { Timeout = 5_000 });

        // Cancel — we want to keep the original content.
        await _diary.CancelOverwriteAsync();

        // Dialog must close.
        await Expect(dialog).ToBeHiddenAsync(new() { Timeout = 5_000 });

        // The original text must still be in the editor.
        var originalContent = Page.Locator(".page-editor-content").GetByText(OriginalText);
        await Expect(originalContent).ToBeVisibleAsync(new() { Timeout = 3_000 });

        // Template heading must NOT have appeared.
        var templateHeading = Page.Locator(".page-editor-content").GetByText(TemplateTitle);
        await Expect(templateHeading).ToBeHiddenAsync(new() { Timeout = 1_000 });

        // Entry must still be dirty.
        await Expect(Page.GetByText("Unsaved changes")).ToBeVisibleAsync(new() { Timeout = 3_000 });
    }

    // ── Navigation guard for diary date switching ───────────────────────────

    /// <summary>
    /// When the currently selected diary entry has unsaved changes and the user
    /// clicks a different entry in the sidebar, the UnsavedChangesDialog must
    /// appear with "Save &amp; leave", "Leave without saving", and "Stay on page"
    /// buttons — NOT the overwrite confirmation.
    /// </summary>
    [Test]
    public async Task NavigateToDifferentDate_WithUnsavedChanges_ShowsUnsavedDialog()
    {
        // Get the journal id so we can seed a second entry via the API.
        var journalId = await _diary.GetFirstJournalIdAsync();
        Assert.That(journalId, Is.Not.Empty, "A journal must exist to run this test.");

        // Create a second entry for yesterday via the API, then reload so the
        // sidebar list shows both entries.
        var yesterday = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
        await _diary.CreateEntryViaApiAsync(journalId, yesterday);

        // Reload the diary page so the new entry appears in the sidebar.
        await _diary.GotoAsync();
        await _diary.EnsureTodayEntryAsync();

        // Make today's entry dirty by typing text.
        await _diary.TypeInEditorAsync("Unsaved text here");
        await _diary.WaitForDirtyStateAsync();

        // Click the second sidebar entry (yesterday — index 1, entries are newest-first).
        await _diary.SelectEntryByIndexAsync(1);

        // The UnsavedChangesDialog must appear.
        await Expect(Page.GetByTestId("unsaved-cancel")).ToBeVisibleAsync(new() { Timeout = 5_000 });
        await Expect(Page.GetByTestId("unsaved-save-and-leave")).ToBeVisibleAsync(new() { Timeout = 2_000 });
        await Expect(Page.GetByTestId("unsaved-leave-without-saving")).ToBeVisibleAsync(new() { Timeout = 2_000 });

        // Clean up: stay on page and let the test tear down normally.
        await _diary.StayOnPageAsync();

        await Expect(Page.GetByRole(AriaRole.Alertdialog)).ToBeHiddenAsync(new() { Timeout = 3_000 });
    }

    /// <summary>
    /// Choosing "Leave without saving" in the UnsavedChangesDialog discards changes
    /// and navigates to the target diary entry.
    /// </summary>
    [Test]
    public async Task NavigateToDifferentDate_LeaveWithoutSaving_DiscardsAndNavigates()
    {
        var journalId = await _diary.GetFirstJournalIdAsync();
        Assert.That(journalId, Is.Not.Empty, "A journal must exist to run this test.");

        var yesterday = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
        await _diary.CreateEntryViaApiAsync(journalId, yesterday);

        await _diary.GotoAsync();
        await _diary.EnsureTodayEntryAsync();

        await _diary.TypeInEditorAsync("I will lose this");
        await _diary.WaitForDirtyStateAsync();

        // Navigate to the second entry.
        await _diary.SelectEntryByIndexAsync(1);
        await Expect(Page.GetByTestId("unsaved-cancel")).ToBeVisibleAsync(new() { Timeout = 5_000 });

        await _diary.LeaveWithoutSavingAsync();

        // Dialog must close and the "Unsaved changes" label must disappear
        // (we navigated to a clean entry).
        await Expect(Page.GetByRole(AriaRole.Alertdialog)).ToBeHiddenAsync(new() { Timeout = 5_000 });
        await Expect(Page.GetByText("Unsaved changes")).ToBeHiddenAsync(new() { Timeout = 5_000 });
    }
}
