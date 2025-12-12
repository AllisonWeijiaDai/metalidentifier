import { HistoryItem, AnalysisResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'metallens_history_v1';

export const getHistory = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read history", e);
    return [];
  }
};

export const saveToHistory = (result: AnalysisResult): HistoryItem => {
  const history = getHistory();
  
  // Prevent duplicate saves of the exact same result in short succession if needed, 
  // but for now, we just push new items.
  
  const newItem: HistoryItem = {
    ...result,
    id: uuidv4(),
    timestamp: Date.now(),
  };

  const newHistory = [newItem, ...history];
  // Limit to last 50 items to save space
  if (newHistory.length > 50) newHistory.pop();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  return newItem;
};

export const deleteHistoryItem = (id: string): HistoryItem[] => {
  const history = getHistory();
  const newHistory = history.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  return newHistory;
};

export const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};