export type QueueCandidate = {
  score: number;
  postedAt: Date | null;
};

export function rankQueueCandidates(candidates: QueueCandidate[]) {
  return [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDate = a.postedAt?.getTime() ?? 0;
    const bDate = b.postedAt?.getTime() ?? 0;
    return bDate - aDate;
  });
}
