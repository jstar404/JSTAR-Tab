const Storage = {
  get: (key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  },

  getAll: () => {
    try {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = JSON.parse(localStorage.getItem(key));
      }
      return items;
    } catch (e) {
      return {};
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      return false;
    }
  },
};
