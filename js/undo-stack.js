// ========================================
// UNDO STACK
// ========================================
// A shared, capped LIFO undo stack used by every destructive action in the
// app (clear bank, bulk delete, change category, delete all questions, clear
// inputs...). Replaces the old pattern of one single snapshot variable plus a
// 5-second timeout per feature, which silently discarded an undo the moment
// a second destructive action ran before the timeout fired.

const UNDO_STACK_MAX = 5;
let undoStack = [];

// label is shown nowhere yet (reserved for a future "undo history" UI);
// restore is a zero-arg function that puts state back and shows its own toast.
function pushUndo(label, restore) {
    undoStack.push({ label, restore });
    if (undoStack.length > UNDO_STACK_MAX) undoStack.shift();
}

function performUndo() {
    const entry = undoStack.pop();
    if (!entry) {
        showToast('⚠️ Nothing to undo.', 'warning');
        return;
    }
    entry.restore();
}

function hasUndo() {
    return undoStack.length > 0;
}
