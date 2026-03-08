/**
 * Storage Adapter for different platforms
 * Provides unified interface for Chrome, Zotero, and Electron storage
 */

class StorageAdapter {
  constructor(type = 'local') {
    this.type = type;
    this.storage = this.initStorage();
  }

  initStorage() {
    // Chrome Extension
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return {
        get: (key) => new Promise((resolve) => {
          chrome.storage.local.get(key, (result) => {
            resolve(result[key]);
          });
        }),
        set: (key, value) => new Promise((resolve) => {
          chrome.storage.local.set({ [key]: value }, resolve);
        }),
        remove: (key) => new Promise((resolve) => {
          chrome.storage.local.remove(key, resolve);
        }),
        clear: () => new Promise((resolve) => {
          chrome.storage.local.clear(resolve);
        })
      };
    }

    // Zotero Plugin (uses Zotero preferences)
    if (typeof Zotero !== 'undefined') {
      return {
        get: async (key) => {
          try {
            const value = Zotero.Prefs.get(`extensions.easytts.${key}`);
            return value ? JSON.parse(value) : null;
          } catch {
            return null;
          }
        },
        set: async (key, value) => {
          Zotero.Prefs.set(`extensions.easytts.${key}`, JSON.stringify(value));
        },
        remove: async (key) => {
          Zotero.Prefs.clear(`extensions.easytts.${key}`);
        },
        clear: async () => {
          // Clear all easytts preferences
          const prefs = Zotero.Prefs.getAll();
          Object.keys(prefs).forEach(key => {
            if (key.startsWith('extensions.easytts.')) {
              Zotero.Prefs.clear(key);
            }
          });
        }
      };
    }

    // Electron (will use electron-store, injected via preload)
    if (typeof window !== 'undefined' && window.electronStore) {
      return window.electronStore;
    }

    // Fallback to localStorage for testing
    return {
      get: async (key) => {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      },
      set: async (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      remove: async (key) => {
        localStorage.removeItem(key);
      },
      clear: async () => {
        localStorage.clear();
      }
    };
  }

  async get(key) {
    return await this.storage.get(key);
  }

  async set(key, value) {
    return await this.storage.set(key, value);
  }

  async remove(key) {
    return await this.storage.remove(key);
  }

  async clear() {
    return await this.storage.clear();
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageAdapter;
}
