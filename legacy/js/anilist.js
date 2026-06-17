initVendor('anilist');

const SCORE_LABELS = ['Average Score', 'Mean Score'];

function tagScoreValues() {
    document.querySelectorAll('.data-set').forEach(set => {
        const type = set.querySelector('.type');
        const value = set.querySelector('.value');
        if (type && value && SCORE_LABELS.includes(type.textContent.trim())) {
            value.classList.add('score-value');
        }
    });
}

tagScoreValues();

const observer = new MutationObserver(tagScoreValues);
observer.observe(document.body, { childList: true, subtree: true });
