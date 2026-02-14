const toDateInput = (value: Date) => value.toISOString().slice(0, 10);

const startOfSchoolTerm = (reference: Date) => {
    const year = reference.getUTCMonth() >= 7 ? reference.getUTCFullYear() : reference.getUTCFullYear() - 1;
    return new Date(Date.UTC(year, 7, 15, 0, 0, 0, 0)); // Aug 15
};

export type ReportDatePreset = 'today' | 'last_7_days' | 'last_30_days' | 'school_term';

export const resolveReportDatePreset = (preset: ReportDatePreset, now = new Date()) => {
    const end = new Date(now);
    const start = new Date(now);

    if (preset === 'today') {
        return {
            startDate: toDateInput(start),
            endDate: toDateInput(end)
        };
    }

    if (preset === 'last_7_days') {
        start.setUTCDate(start.getUTCDate() - 6);
        return {
            startDate: toDateInput(start),
            endDate: toDateInput(end)
        };
    }

    if (preset === 'last_30_days') {
        start.setUTCDate(start.getUTCDate() - 29);
        return {
            startDate: toDateInput(start),
            endDate: toDateInput(end)
        };
    }

    const schoolStart = startOfSchoolTerm(now);
    return {
        startDate: toDateInput(schoolStart),
        endDate: toDateInput(end)
    };
};
