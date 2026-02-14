let questRunPrefetched = false;
let questBoardPrefetched = false;
let practicePrefetched = false;
let categoryPrefetched = false;

export const prefetchQuestRunRoute = () => {
    if (questRunPrefetched) return;
    questRunPrefetched = true;
    void import('../../pages/QuestRun');
};

export const prefetchQuestBoardRoute = () => {
    if (questBoardPrefetched) return;
    questBoardPrefetched = true;
    void import('../../pages/QuestBoard');
};

export const prefetchPracticeRoute = () => {
    if (practicePrefetched) return;
    practicePrefetched = true;
    void import('../../pages/PracticePlayer');
};

export const prefetchCategoryRoute = () => {
    if (categoryPrefetched) return;
    categoryPrefetched = true;
    void import('../../components/Dashboard/CategoryDetail');
};
