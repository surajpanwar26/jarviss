
import { v4 as uuidv4 } from 'uuid'; // Accessing via standard import, assuming environment supports it or fallback

// --- MONGODB SCHEMA DEFINITIONS (For Backend Implementation) ---
/*
  // User Schema
  const UserSchema = new Schema({
    userId: String,
    lastActive: Date,
    preferences: Object
  });

  // Activity Log Schema
  const LogSchema = new Schema({
    userId: String,
    timestamp: Date,
    actionType: String, // 'QUICK_SEARCH', 'DEEP_RESEARCH', 'DOC_ANALYSIS'
    query: String,
    documentName: String,
    documentFormat: String,
    metadata: Object
  });
*/

// --- FRONTEND SERVICE ---

const USER_ID_KEY = 'jarvis_user_id';

const getUserId = () => {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
};

export interface ActivityLog {
  actionType: 'QUICK_SEARCH' | 'DEEP_RESEARCH' | 'DOC_ANALYSIS' | 'NAVIGATE';
  query?: string;
  documentName?: string;
  documentFormat?: string;
  timestamp: Date;
}

export const logActivity = async (activity: Omit<ActivityLog, 'timestamp'>) => {
  const payload = {
    userId: getUserId(),
    timestamp: new Date(),
    ...activity
  };

  // 1. FOR PREVIEW / DEMO: Save to LocalStorage
  const existingLogs = JSON.parse(localStorage.getItem('jarvis_activity_logs') || '[]');
  existingLogs.push(payload);
  localStorage.setItem('jarvis_activity_logs', JSON.stringify(existingLogs));
  
  console.log('[MongoDB Mock] Logged Activity:', payload);

  // 2. FOR PRODUCTION: Uncomment below to send to your backend API (which connects to Atlas)
  /*
  try {
    await fetch(process.env.API_URL + '/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Failed to log to MongoDB', error);
  }
  */
};

export const getUserHistory = () => {
  return JSON.parse(localStorage.getItem('jarvis_activity_logs') || '[]');
};
