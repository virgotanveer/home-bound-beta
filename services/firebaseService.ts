// Cloud sync service using JSONBin.io - reliable JSON storage API
const API_BASE = 'https://api.jsonbin.io/v3';
const APP_TOKEN = 'hb_v2_vault';
// You'll need to create a free account at https://jsonbin.io/ and get your API key
// Then replace 'your-jsonbin-api-key-here' with your actual API key
const JSONBIN_API_KEY: string | undefined = (import.meta as any)?.env?.VITE_JSONBIN_API_KEY; // Set on Vercel as VITE_JSONBIN_API_KEY

// Store bin IDs for existing vaults
const vaultBinIds = new Map<string, string>(); 

/**
 * Generates a deterministic alphanumeric key for the vault.
 * Simplified to avoid slashes or special characters that confuse proxies.
 */
const getVaultKey = (email: string, partnerEmail?: string): string => {
  const e1 = email.toLowerCase().trim();
  let baseString = e1;
  if (partnerEmail) {
    const e2 = partnerEmail.toLowerCase().trim();
    baseString = [e1, e2].sort().join('_');
  }
  
  // Simple deterministic alphanumeric hash
  let hash = 0;
  for (let i = 0; i < baseString.length; i++) {
    const char = baseString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; 
  }
  
  const alphanumericHash = Math.abs(hash).toString(36);
  const mode = partnerEmail ? 's' : 'p';
  
  // hbv2_p_hash or hbv2_s_hash
  return `${APP_TOKEN}_${mode}_${alphanumericHash}`;
};

/**
 * Enhanced error diagnostic for fetch failures
 */
const formatFetchError = (e: any, context: string): string => {
  const isNetworkError = e instanceof TypeError || e.name === 'TypeError' || (e.message && e.message.toLowerCase().includes('fetch'));
  if (isNetworkError) {
    return `${context}: Browser blocked the request (CORS) or the network is unreachable. Check your internet connection or if the API is restricted.`;
  }
  return `${context}: ${e.message || 'Unknown network error'}`;
};

export const syncToCloud = async (state: any, retryCount = 0): Promise<void> => {
  if (!state.settings.email || !navigator.onLine || !JSONBIN_API_KEY) return;
  
  const key = getVaultKey(state.settings.email, state.settings.partnerEmail);
  
  // Ensure we have valid, non-empty data for JSONBin.io
  const syncData = {
    tasks: state.tasks || [],
    settings: state.settings || {},
    todayList: state.todayList || [],
    lastResetTimestamp: state.lastResetTimestamp || Date.now(),
    lastUpdated: Date.now(),
    app: 'Homebound',
    version: '2.0'
  };
  
  const payload = JSON.stringify(syncData);
  
  try {
    // Check if we already have a bin ID for this vault
    let binId = vaultBinIds.get(key);
    
    if (binId) {
      // Update existing bin
      const updateUrl = `${API_BASE}/b/${binId}`;
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY
        },
        body: payload
      });
      
      if (updateResponse.ok) {
        console.debug(`[Homebound Sync] Successfully updated JSONBin: ${binId}`);
        return;
      }
      
      // Log detailed error information for debugging
      const errorText = await updateResponse.text().catch(() => 'No response body');
      console.error(`[Homebound Sync Debug] Update failed: ${updateResponse.status} ${updateResponse.statusText}, Response: ${errorText}`);
      
      // If update fails (bin might have been deleted), clear the bin ID and retry
      if (updateResponse.status === 404) {
        vaultBinIds.delete(key);
        binId = undefined;
      } else {
        throw new Error(`HTTP ${updateResponse.status}: ${updateResponse.statusText || 'Update Failed'}`);
      }
    }
    
    // Create new bin (either no bin ID or previous update failed)
    if (!binId) {
      const createUrl = `${API_BASE}/b`;
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
          'X-Bin-Name': `Homebound Vault - ${state.settings.email}`.substring(0, 128),
          'X-Bin-Private': 'true'
        },
        body: payload
      });
      
      if (!createResponse.ok) {
        const createErrorText = await createResponse.text().catch(() => 'No response body');
        console.error(`[Homebound Sync Debug] Create failed: ${createResponse.status} ${createResponse.statusText}, Response: ${createErrorText}`);
        throw new Error(`HTTP ${createResponse.status}: Create Failed`);
      }
      
      // Extract bin ID from response
      const responseData = await createResponse.json();
      console.debug('[Homebound Sync Debug] Create response:', responseData);
      binId = responseData.metadata?.id;
      
      if (binId) {
        vaultBinIds.set(key, binId);
        console.debug(`[Homebound Sync] Successfully created JSONBin: ${binId}`);
      } else {
        throw new Error('Failed to extract bin ID from create response');
      }
    }
    
  } catch (e: any) {
    const descriptiveError = formatFetchError(e, "Cloud Sync Failed");
    console.error(`[Homebound Sync Error] ${descriptiveError}`);
    
    if (retryCount < 1 && navigator.onLine) {
      console.info("[Homebound Sync] Retrying sync in 2s...");
      await new Promise(r => setTimeout(r, 2000));
      return syncToCloud(state, retryCount + 1);
    }
    throw new Error(descriptiveError);
  }
};

export const fetchFromCloud = async (email: string, partnerEmail?: string) => {
  if (!email || !navigator.onLine || !JSONBIN_API_KEY) return null;
  
  const key = getVaultKey(email, partnerEmail);
  
  try {
    // First check if we have a stored bin ID
    let binId = vaultBinIds.get(key);
    
    if (!binId) {
      // If no bin ID, we need to search for existing bins (this is a limitation of JSONBin.io)
      // For now, return null and let syncToCloud handle creating a new bin
      console.debug(`[Homebound Sync] No stored bin ID for: ${key}`);
      return null;
    }
    
    const url = `${API_BASE}/b/${binId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Master-Key': JSONBIN_API_KEY
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.debug(`[Homebound Sync] No cloud data found for bin: ${binId}`);
        vaultBinIds.delete(key); // Remove invalid bin ID
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText || 'Fetch Failed'}`);
    }
    
    const data = await response.json();
    return data.record || null;
    
  } catch (e: any) {
    const descriptiveError = formatFetchError(e, "Cloud Fetch Failed");
    console.warn(`[Homebound Sync Warning] ${descriptiveError}`);
    return null;
  }
};

export const subscribeToCloudChanges = (email: string, partnerEmail: string | undefined, onUpdate: (data: any) => void) => {
  if (!email) return () => {};
  const interval = setInterval(async () => {
    if (navigator.onLine) {
      const cloudData = await fetchFromCloud(email, partnerEmail);
      if (cloudData) onUpdate(cloudData);
    }
  }, 45000); 
  return () => clearInterval(interval);
};

export const subscribeToSignals = (myEmail: string, onSignal: (from: string) => void) => {
  // Signal functionality not supported with JSONBin.io
  // Partner connection signals would require a different implementation
  console.warn('Signal functionality disabled - requires different service for real-time signals');
  return () => {};
};

export const clearSignal = async (myEmail: string) => {
  // Signal functionality not supported with JSONBin.io
  console.warn('Signal clearing disabled');
};

export const sendConnectionSignal = async (myEmail: string, partnerEmail: string) => {
  // Signal functionality not supported with JSONBin.io
  console.warn('Connection signals disabled - requires different service for real-time signals');
  try {
    const partnerKey = getVaultKey(partnerEmail);
    const signalKey = `sig_${partnerKey}`;
    const payload = JSON.stringify({ from: myEmail.toLowerCase().trim(), at: Date.now() });
    await fetch(`${API_BASE}/${signalKey}`, { 
      method: 'POST', 
      body: payload 
    });
  } catch (e) {}
};

export const generateSyncCode = (state: any): string => {
  try {
    const payload = { t: state.tasks, s: state.settings, l: state.todayList };
    return btoa(JSON.stringify(payload));
  } catch (e) { return ""; }
};

export const parseSyncCode = (code: string): any | null => {
  try {
    return JSON.parse(atob(code));
  } catch (e) { return null; }
};
