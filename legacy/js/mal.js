/**
 * ===================================================================
 * JS file that is intented to be used only in MyAnimeList.
 * ===================================================================
 */

initVendor('mal');

function tagFriendScoreCells() {
    document.querySelectorAll('table.table-recently-updated tr').forEach(row => {
        const cells = row.querySelectorAll('td.borderClass.ac');
        // Score is the first ac cell in each data row
        if (cells.length >= 3) {
            cells[0].classList.add('friend-score-cell');
        }
    });
}

tagFriendScoreCells();

const malObserver = new MutationObserver(tagFriendScoreCells);
malObserver.observe(document.body, { childList: true, subtree: true });
