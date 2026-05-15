const CacheUpdater = {
  update: async () => {
    const shortcutsData = await Storage.get("shortcuts");
    const shortcuts = shortcutsData || [];
    const faviconUrls = shortcuts.map(
      (shortcut) =>
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(shortcut.url).hostname)}&sz=64`,
    );

    if (navigator.serviceWorker?.controller && faviconUrls.length > 0) {
      navigator.serviceWorker.controller.postMessage({
        action: "updateFavicons",
        urls: faviconUrls,
      });
    }
  },
};

const cacheHandler = {
  SHORTCUT_CACHE_DURATION: 7 * 24 * 60 * 60 * 1000,

  async init() {
    await this.cleanExpiredCache();
  },

  async cleanExpiredCache() {
    const cache = await this.getAllCache();
    const now = Date.now();

    for (const [key, value] of Object.entries(cache)) {
      if (key.startsWith("shortcut_") && value.expiry && value.expiry < now) {
        await this.removeFromCache(key);
      }
    }
  },

  async addToCache(key, value, isSearchEngine = false) {
    const cacheItem = {
      value,
      timestamp: Date.now(),
      expiry: isSearchEngine ? null : Date.now() + this.SHORTCUT_CACHE_DURATION,
    };

    await Storage.set(key, JSON.stringify(cacheItem));
  },

  async getFromCache(key) {
    const item = await Storage.get(key);
    if (!item) return null;

    try {
      const cacheItem = JSON.parse(item);

      if (cacheItem.expiry && cacheItem.expiry < Date.now()) {
        await this.removeFromCache(key);
        return null;
      }

      return cacheItem.value;
    } catch (error) {
      console.error("Cache read error:", error);
      return null;
    }
  },

  async removeFromCache(key) {
    await Storage.remove(key);
  },

  async getAllCache() {
    const allItems = await Storage.getAll();
    const cache = {};
    for (const [key, value] of Object.entries(allItems)) {
      if (key.startsWith("shortcut_") || key.startsWith("search_engine_")) {
        try {
          cache[key] = typeof value === "string" ? JSON.parse(value) : value;
        } catch (error) {
          console.error("Cache read error:", error);
        }
      }
    }
    return cache;
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  await cacheHandler.init();
});
