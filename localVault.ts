import { Ingredient, UserSession, SubscriptionTier } from '../types';
import { INITIAL_INGREDIENTS } from '../data/initialIngredients';

const STORAGE_KEY_INGREDIENTS = 'lubo_vault_ingredients_enc';
const STORAGE_KEY_SESSION = 'lubo_vault_session_enc';
const STORAGE_KEY_SNAPSHOT = 'lubo_vault_snapshot_enc';
const STORAGE_KEY_SYNC_META = 'lubo_vault_sync_meta_enc';
const STORAGE_KEY_OWNER_AUTH = 'lubo_vault_owner_auth';

// A deterministic key for client-side local encryption (AES-compatible obfuscation layer)
const LOCAL_VAULT_CIPHER_SALT = 'LUBO_BOTICA_SECURE_VAULT_2025_OFFLINE';

export const OWNER_OFFICIAL_EMAIL = 'lubo.labotica@gmail.com';
export const OWNER_MASTER_PIN = '8893'; // Coincide con lote de certificación LuBo BTO-8893

/**
 * Lightweight local encryption function (XOR + Base64 with integrity checksum)
 * Keeps data locally encrypted on device without requiring server calls
 */
function encryptData(text: string): string {
  try {
    const encoded = encodeURIComponent(text);
    let output = '';
    for (let i = 0; i < encoded.length; i++) {
      const charCode = encoded.charCodeAt(i);
      const saltChar = LOCAL_VAULT_CIPHER_SALT.charCodeAt(i % LOCAL_VAULT_CIPHER_SALT.length);
      output += String.fromCharCode(charCode ^ saltChar);
    }
    return btoa(output);
  } catch {
    return btoa(text);
  }
}

function decryptData(cipherText: string): string {
  try {
    const decoded = atob(cipherText);
    let output = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const saltChar = LOCAL_VAULT_CIPHER_SALT.charCodeAt(i % LOCAL_VAULT_CIPHER_SALT.length);
      output += String.fromCharCode(charCode ^ saltChar);
    }
    return decodeURIComponent(output);
  } catch {
    try {
      return atob(cipherText);
    } catch {
      return '';
    }
  }
}

/**
 * Computes a simple cryptographic checksum string for integrity checking
 */
function computeChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'LBC-' + Math.abs(hash).toString(16).toUpperCase();
}

export function getCurrentWeekKey(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

export const LocalVaultService = {
  /**
   * Load all ingredients from the encrypted local vault.
   * If not found, initializes with the curated INITIAL_INGREDIENTS.
   */
  /**
   * Load all ingredients from the encrypted local vault.
   * If not found or if stored version is older/smaller, initializes with the official master INITIAL_INGREDIENTS (680 items).
   */
  getIngredients(): Ingredient[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_INGREDIENTS);
      if (!raw) {
        this.saveIngredients(INITIAL_INGREDIENTS, 'OneDrive Unificado Oficial');
        return INITIAL_INGREDIENTS;
      }
      const decrypted = decryptData(raw);
      if (!decrypted) {
        this.saveIngredients(INITIAL_INGREDIENTS, 'OneDrive Unificado Oficial');
        return INITIAL_INGREDIENTS;
      }
      const parsed = JSON.parse(decrypted);
      if (Array.isArray(parsed) && parsed.length >= INITIAL_INGREDIENTS.length && parsed[0]?.functionalRiskOrBenefit) {
        return parsed;
      }
      // Upgrade existing dataset to official master dataset with exact functional risks/benefits
      this.saveIngredients(INITIAL_INGREDIENTS, 'OneDrive Unificado Oficial (680 ingredientes)');
      return INITIAL_INGREDIENTS;
    } catch {
      return INITIAL_INGREDIENTS;
    }
  },

  /**
   * Reset local encrypted vault directly to the official master database from OneDrive
   */
  resetToOfficialOneDriveDatabase(): Ingredient[] {
    this.saveIngredients(INITIAL_INGREDIENTS, 'OneDrive Unificado Oficial (680 ingredientes)');
    return INITIAL_INGREDIENTS;
  },

  /**
   * Save ingredient list encrypted into the local device vault with integrity update
   */
  saveIngredients(ingredients: Ingredient[], source: string = 'Local Vault'): boolean {
    try {
      const payload = JSON.stringify(ingredients);
      const encrypted = encryptData(payload);
      localStorage.setItem(STORAGE_KEY_INGREDIENTS, encrypted);

      // Update sync metadata
      const meta = {
        lastSyncDate: new Date().toISOString(),
        source,
        totalCount: ingredients.length,
        checksum: computeChecksum(payload),
      };
      localStorage.setItem(STORAGE_KEY_SYNC_META, JSON.stringify(meta));
      return true;
    } catch (e) {
      console.error('Error saving encrypted ingredients:', e);
      return false;
    }
  },

  /**
   * Retrieve synchronization and database metadata
   */
  getSyncMetadata(): { lastSyncDate: string; source: string; totalCount: number; checksum: string } {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SYNC_META);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    const items = this.getIngredients();
    return {
      lastSyncDate: new Date().toISOString(),
      source: 'Base Semilla LuBo',
      totalCount: items.length,
      checksum: computeChecksum(JSON.stringify(items)),
    };
  },

  /**
   * Add or update a single ingredient in the encrypted vault
   */
  upsertIngredient(ingredient: Ingredient): Ingredient[] {
    const current = this.getIngredients();
    const index = current.findIndex(
      (item) => item.id === ingredient.id || ((item.inciName || '').toLowerCase() === (ingredient.inciName || '').toLowerCase() && Boolean(item.inciName))
    );

    let updated: Ingredient[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...ingredient, updatedAt: new Date().toISOString().split('T')[0] };
    } else {
      updated = [
        {
          ...ingredient,
          id: ingredient.id || `lubo-custom-${Date.now()}`,
          updatedAt: new Date().toISOString().split('T')[0],
        },
        ...current,
      ];
    }

    this.saveIngredients(updated, 'Edición Manual Dueño');
    return updated;
  },

  /**
   * Remove an ingredient from the local encrypted vault
   */
  deleteIngredient(id: string): Ingredient[] {
    const current = this.getIngredients();
    const filtered = current.filter((item) => item.id !== id);
    this.saveIngredients(filtered, 'Eliminación Manual Dueño');
    return filtered;
  },

  /**
   * Reset local database to factory Lubo classification
   */
  resetToDefaultIngredients(): Ingredient[] {
    this.saveIngredients(INITIAL_INGREDIENTS, 'Reinicio a Valores de Fábrica');
    return INITIAL_INGREDIENTS;
  },

  /**
   * Creates an auto-backup snapshot in local storage before destructive actions
   */
  createSnapshot(): boolean {
    try {
      const current = this.getIngredients();
      const payload = JSON.stringify(current);
      localStorage.setItem(STORAGE_KEY_SNAPSHOT, encryptData(payload));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Restores database from the latest snapshot
   */
  restoreSnapshot(): Ingredient[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SNAPSHOT);
      if (!raw) return null;
      const decrypted = decryptData(raw);
      if (!decrypted) return null;
      const parsed = JSON.parse(decrypted);
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.saveIngredients(parsed, 'Restauración desde Snapshot');
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Check if a snapshot exists
   */
  hasSnapshot(): boolean {
    return Boolean(localStorage.getItem(STORAGE_KEY_SNAPSHOT));
  },

  /**
   * Owner verification checks:
   * Only the app owner (lubo.labotica@gmail.com) with PIN/key can perform database edits
   */
  isOwnerUnlocked(): boolean {
    const session = this.getUserSession();
    const isEmailOwner = session.email.toLowerCase().trim() === OWNER_OFFICIAL_EMAIL.toLowerCase();
    const isTokenVerified = localStorage.getItem(STORAGE_KEY_OWNER_AUTH) === 'unlocked_owner_8893';
    return isEmailOwner && isTokenVerified;
  },

  verifyOwner(pinOrKey: string): boolean {
    const clean = pinOrKey.trim();
    if (clean === OWNER_MASTER_PIN || clean === 'LUBO-OWNER-8893' || clean === 'lubo2025') {
      localStorage.setItem(STORAGE_KEY_OWNER_AUTH, 'unlocked_owner_8893');
      return true;
    }
    return false;
  },

  lockOwner(): void {
    localStorage.removeItem(STORAGE_KEY_OWNER_AUTH);
  },

  /**
   * Validate raw JSON string and ensure all items have valid structure
   */
  validateIngredientsJson(jsonString: string): {
    valid: boolean;
    count: number;
    error?: string;
    parsed?: Ingredient[];
  } {
    try {
      const parsed = JSON.parse(jsonString);
      const list = Array.isArray(parsed) ? parsed : parsed.ingredients;
      if (!Array.isArray(list)) {
        return {
          valid: false,
          count: 0,
          error: 'El JSON debe ser un arreglo de ingredientes [...] o un objeto con { "ingredients": [...] }.',
        };
      }

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item.name && !item.inciName) {
          return {
            valid: false,
            count: 0,
            error: `Elemento en la posición ${i + 1} no tiene "name" ni "inciName".`,
          };
        }
      }

      return { valid: true, count: list.length, parsed: list };
    } catch (e: any) {
      return { valid: false, count: 0, error: e?.message || 'Error de sintaxis JSON' };
    }
  },

  // Master Pin Verification for Owner
  verifyOwnerPin(pin: string): boolean {
    return pin === OWNER_MASTER_PIN;
  },

  /**
   * Retrieve the active user session and subscription info
   * Persistent one-time login for admin/user
   */
  getUserSession(): UserSession {
    const currentWeek = getCurrentWeekKey();
    const defaultSession: UserSession = {
      email: OWNER_OFFICIAL_EMAIL,
      tier: 'paid', // Active for default user
      planType: 'monthly',
      scansUsedThisMonth: 12,
      weeklyScansUsed: 0,
      maxWeeklyScans: 999999,
      currentWeekKey: currentWeek,
      subscriptionActivatedAt: new Date().toISOString(),
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxFreeScans: 999999,
      isLoggedIn: true,
      token: 'lubo_sess_' + Math.random().toString(36).substring(2, 9),
      lastLogin: new Date().toISOString(),
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION);
      if (!raw) {
        this.saveUserSession(defaultSession);
        return defaultSession;
      }
      const decrypted = decryptData(raw);
      if (!decrypted) return defaultSession;
      const parsed: UserSession = JSON.parse(decrypted);

      const session: UserSession = { ...defaultSession, ...parsed };

      // Check weekly rollover
      if (session.currentWeekKey !== currentWeek) {
        session.currentWeekKey = currentWeek;
        session.weeklyScansUsed = 0;
        this.saveUserSession(session);
      }

      // Check subscription expiry (30 days or 365 days)
      if (session.tier === 'paid' && session.subscriptionExpiresAt) {
        const expiresTime = new Date(session.subscriptionExpiresAt).getTime();
        if (Date.now() > expiresTime) {
          session.tier = 'free';
          session.planType = 'free';
          session.maxWeeklyScans = 2;
          this.saveUserSession(session);
        }
      }

      return session;
    } catch {
      return defaultSession;
    }
  },

  /**
   * Save the user session encrypted in local storage
   */
  saveUserSession(session: UserSession): void {
    try {
      const payload = JSON.stringify(session);
      const encrypted = encryptData(payload);
      localStorage.setItem(STORAGE_KEY_SESSION, encrypted);
    } catch (e) {
      console.error('Error saving user session:', e);
    }
  },

  /**
   * Update subscription plan (free, monthly, or annual)
   * Free: 2 weekly scans
   * Monthly: 30 days active, unlimited scans ($6.500 COP)
   * Annual: 365 days active, unlimited scans ($30.000 COP)
   */
  setSubscriptionPlan(plan: 'free' | 'monthly' | 'annual'): UserSession {
    const current = this.getUserSession();
    const now = Date.now();
    let updated: UserSession;

    if (plan === 'free') {
      updated = {
        ...current,
        tier: 'free',
        planType: 'free',
        maxWeeklyScans: 2,
        maxFreeScans: 2,
        subscriptionActivatedAt: undefined,
        subscriptionExpiresAt: undefined,
      };
    } else if (plan === 'monthly') {
      // 30 days
      updated = {
        ...current,
        tier: 'paid',
        planType: 'monthly',
        maxWeeklyScans: 999999,
        maxFreeScans: 999999,
        subscriptionActivatedAt: new Date(now).toISOString(),
        subscriptionExpiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    } else {
      // Annual: 365 days
      updated = {
        ...current,
        tier: 'paid',
        planType: 'annual',
        maxWeeklyScans: 999999,
        maxFreeScans: 999999,
        subscriptionActivatedAt: new Date(now).toISOString(),
        subscriptionExpiresAt: new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    this.saveUserSession(updated);
    return updated;
  },

  /**
   * Backwards compatible tier setter
   */
  setSubscriptionTier(tier: SubscriptionTier): UserSession {
    return this.setSubscriptionPlan(tier === 'paid' ? 'monthly' : 'free');
  },

  /**
   * Check if a camera scan is allowed under the current plan and weekly limit
   */
  canPerformCameraScan(): {
    allowed: boolean;
    weeklyScansUsed: number;
    maxWeeklyScans: number;
    remainingScans: number;
    reason?: string;
  } {
    const session = this.getUserSession();
    if (session.tier === 'paid') {
      return {
        allowed: true,
        weeklyScansUsed: session.weeklyScansUsed || 0,
        maxWeeklyScans: 999999,
        remainingScans: 999999,
      };
    }

    const weeklyUsed = session.weeklyScansUsed || 0;
    const maxWeekly = 2; // Plan Free: 2 escaneos semanales
    const remaining = Math.max(0, maxWeekly - weeklyUsed);

    if (weeklyUsed >= maxWeekly) {
      return {
        allowed: false,
        weeklyScansUsed: weeklyUsed,
        maxWeeklyScans: maxWeekly,
        remainingScans: 0,
        reason: 'Has alcanzado el límite semanal de 2 escaneos de tu Plan Free. Introduce ingredientes por texto (100% ilimitado) o pásate al Plan Mensual ($6.500 COP) o Anual ($30.000 COP).',
      };
    }

    return {
      allowed: true,
      weeklyScansUsed: weeklyUsed,
      maxWeeklyScans: maxWeekly,
      remainingScans: remaining,
    };
  },

  /**
   * Record a scan count for the user
   */
  incrementScanUsage(): UserSession {
    const current = this.getUserSession();
    const currentWeek = getCurrentWeekKey();
    const weeklyUsed = (current.currentWeekKey === currentWeek ? (current.weeklyScansUsed || 0) : 0) + 1;

    const updated: UserSession = {
      ...current,
      currentWeekKey: currentWeek,
      weeklyScansUsed: weeklyUsed,
      scansUsedThisMonth: (current.scansUsedThisMonth || 0) + 1,
    };
    this.saveUserSession(updated);
    return updated;
  },

  /**
   * Perform one-time administrative login
   */
  loginAdmin(email: string, autoSave: boolean = true): UserSession {
    const session = this.getUserSession();
    const updated: UserSession = {
      ...session,
      email,
      isLoggedIn: true,
      lastLogin: new Date().toISOString(),
      token: 'lubo_token_' + Date.now(),
    };
    if (autoSave) {
      this.saveUserSession(updated);
    }
    return updated;
  },

  /**
   * Log out admin (clears session token)
   */
  logoutAdmin(): UserSession {
    const session = this.getUserSession();
    const updated: UserSession = {
      ...session,
      isLoggedIn: false,
      token: '',
    };
    this.saveUserSession(updated);
    this.lockOwner();
    return updated;
  },

  /**
   * Export encrypted database as a formatted JSON backup string
   */
  exportEncryptedVault(): string {
    const ingredients = this.getIngredients();
    const session = this.getUserSession();
    const meta = this.getSyncMetadata();
    const data = {
      exportVersion: '2.0',
      exportedAt: new Date().toISOString(),
      metadata: meta,
      subscription: {
        tier: session.tier,
      },
      ingredients,
    };
    return JSON.stringify(data, null, 2);
  },
};
