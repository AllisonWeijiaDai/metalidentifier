
const STORAGE_KEY = 'metallens_daily_quota_v1';
export const DAILY_LIMIT = 10;

interface QuotaState {
  date: string;
  count: number;
}

const getToday = () => new Date().toISOString().split('T')[0];

export const getQuotaStatus = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, remaining: DAILY_LIMIT };
    
    const data: QuotaState = JSON.parse(raw);
    
    // If stored date is not today, it's a new day, so reset count implicitly
    if (data.date !== getToday()) {
       return { count: 0, remaining: DAILY_LIMIT };
    }
    
    return { count: data.count, remaining: Math.max(0, DAILY_LIMIT - data.count) };
  } catch (e) {
    console.error("Quota read error", e);
    return { count: 0, remaining: DAILY_LIMIT };
  }
};

export const checkQuotaAvailable = (): boolean => {
  const { remaining } = getQuotaStatus();
  return remaining > 0;
};

export const incrementQuota = () => {
  const { count } = getQuotaStatus();
  const newState: QuotaState = {
    date: getToday(),
    count: count + 1
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  return newState.count;
};
