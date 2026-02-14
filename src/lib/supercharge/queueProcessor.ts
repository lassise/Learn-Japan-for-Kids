export interface QueueProcessingResult<T> {
    succeeded: T[];
    failed: T[];
}

export const processQueueItems = async <T>(
    items: T[],
    syncItem: (item: T) => Promise<void>,
    onError?: (item: T, error: unknown) => void
): Promise<QueueProcessingResult<T>> => {
    const succeeded: T[] = [];
    const failed: T[] = [];

    for (const item of items) {
        try {
            await syncItem(item);
            succeeded.push(item);
        } catch (error) {
            failed.push(item);
            onError?.(item, error);
        }
    }

    return { succeeded, failed };
};
