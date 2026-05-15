const FORBIDDEN_KEYS = [
  "Tab",
  "CapsLock",
  "Meta",
  "ContextMenu",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Insert",
  "Delete",
  "ScrollLock",
  "Pause",
  "NumLock",
  "/",
];

const keybinds = {
  bindings: {},

  init() {
    this.bindings = Storage.get("keybinds") || {};

    this.setupDefaultKeybinds();

    const urlInput = document.getElementById("keybind-url");
    const urlComboInput = document.getElementById("keybind-url-combo");

    if (this.bindings.url) {
      urlInput.value = this.bindings.url.url || "";
      urlComboInput.value = this.bindings.url.keys || "";
    }

    let lastSavedUrl = urlInput.value;

    function isValidUrl(string) {
      try {
        const urlString = string.match(/^https?:\/\//)
          ? string
          : `https://${string}`;
        new URL(urlString);
        return true;
      } catch (_) {
        return false;
      }
    }

    urlInput.addEventListener("input", () => {
      if (!this.bindings.url) {
        this.bindings.url = { url: "", keys: "" };
      }
      this.bindings.url.url = urlInput.value;
      Storage.set("keybinds", this.bindings);
    });

    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        urlInput.blur();
      }
    });

    urlInput.addEventListener("blur", () => {
      const currentUrl = urlInput.value.trim();

      if (currentUrl === lastSavedUrl) {
        return;
      }

      if (currentUrl) {
        if (isValidUrl(currentUrl)) {
          lastSavedUrl = currentUrl;
          notifications.show("URL saved.", "success");
        } else {
          notifications.show("Please enter a valid URL.", "error");
          urlInput.value = lastSavedUrl;
          this.bindings.url.url = lastSavedUrl;
          Storage.set("keybinds", this.bindings);
        }
      }
    });

    const keybindInputs = document.querySelectorAll('[id^="keybind-"]');
    keybindInputs.forEach((input) => {
      if (input.id === "keybind-url") {
        const urlBinding = this.bindings["url"];
        if (urlBinding && urlBinding.url) {
          input.value = urlBinding.url;
        }

        input.addEventListener("input", () => {
          if (this.bindings["url"]) {
            this.bindings["url"].url = input.value;
            Storage.set("keybinds", this.bindings);
          }
        });
        return;
      }

      const action = input.id
        .replace("keybind-url-combo", "url")
        .replace("keybind-", "");
      if (this.bindings[action]) {
        input.value = this.bindings[action].keys;
      }

      let currentKeys = new Set();
      let isProcessingKeybind = false;

      input.addEventListener("keydown", (e) => {
        e.preventDefault();

        if (e.key === "Escape") {
          input.blur();
          return;
        }

        if (e.ctrlKey) {
          notifications.show("CTRL key combinations are not allowed.", "error");
          isProcessingKeybind = true;
          return;
        }

        if (FORBIDDEN_KEYS.includes(e.key)) {
          notifications.show("This key cannot be used as a keybind.", "error");
          isProcessingKeybind = true;
          return;
        }

        isProcessingKeybind = false;

        if (e.key !== "Alt" && e.key !== "Shift") {
          currentKeys.add(e.key);
        }
        if (e.altKey) currentKeys.add("Alt");
        if (e.shiftKey) currentKeys.add("Shift");

        input.value = Array.from(currentKeys).join("+");
      });

      input.addEventListener("keyup", (e) => {
        if (isProcessingKeybind) {
          currentKeys.clear();
          return;
        }

        if (e.key === "Alt" || e.key === "Shift") {
          if (currentKeys.size === 1) {
            notifications.show("Add another key with Alt or Shift.", "error");
          }
          currentKeys.clear();
          input.value = this.bindings[action]?.keys || "";
          return;
        }

        const combo = Array.from(currentKeys).join("+");

        if (!combo) return;

        const duplicate = Object.entries(this.bindings).find(
          ([key, value]) => value.keys === combo && key !== action,
        );

        if (duplicate) {
          notifications.show("This keybind is already in use.", "error");
          currentKeys.clear();
          input.value = this.bindings[action]?.keys || "";
          return;
        }

        this.bindings[action] = {
          keys: combo,
          url:
            action === "url"
              ? document.getElementById("keybind-url").value
              : null,
        };
        Storage.set("keybinds", this.bindings);
        notifications.show("Keybind saved.", "success");
      });

      input.addEventListener("blur", () => {
        currentKeys.clear();
        input.value = this.bindings[action]?.keys || "";
      });
    });

    document.querySelectorAll(".clear-keybind").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.for;
        const input =
          document.getElementById(`keybind-${action}-combo`) ||
          document.getElementById(`keybind-${action}`);

        input.value = "";
        if (action === "url") {
          document.getElementById("keybind-url").value = "";
        }

        delete this.bindings[action];
        Storage.set("keybinds", this.bindings);
        notifications.show("Keybind removed.", "success");
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || !Storage.get("onboardingComplete"))
        return;

      const keys = [];
      if (e.altKey) keys.push("Alt");
      if (e.shiftKey) keys.push("Shift");
      if (e.key !== "Alt" && e.key !== "Shift") keys.push(e.key);

      const combo = keys.join("+");

      Object.entries(this.bindings).forEach(([action, binding]) => {
        if (binding.keys === combo) {
          e.preventDefault();
          this.executeAction(action, binding);
        }
      });
    });
  },

  setupDefaultKeybinds() {
    const defaultBindings = {
      settings: { keys: "Shift+S" },
      anonymous: { keys: "Shift+X" },
      theme: { keys: "Shift+T" },
      url: { keys: "Shift+Q", url: "" },
    };

    Object.entries(defaultBindings).forEach(([action, binding]) => {
      if (!this.bindings[action]) {
        this.bindings[action] = binding;
      }
    });

    Storage.set("keybinds", this.bindings);
  },

  executeAction(action, binding) {
    if (Storage.get("showWhatsNew") === true) return;

    if (!Storage.get("onboardingComplete")) return;

    const settingsPage = document.getElementById("settings-page");
    const passwordDialog = document.getElementById("password-dialog");

    if (passwordDialog && !passwordDialog.classList.contains("hidden")) {
      const cancelBtn = document.getElementById("cancel-password");
      if (cancelBtn) {
        cancelBtn.click();
      } else {
        passwordDialog.classList.remove("active");
        setTimeout(() => {
          passwordDialog.classList.add("hidden");
        }, 300);
      }
    }

    if (action === "settings" && settingsPage.classList.contains("active")) {
      settingsPage.classList.remove("active");
      setTimeout(() => {
        settingsPage.classList.add("hidden");
      }, 300);
    }

    const activeModal = document.querySelector(".modal.active");

    switch (action) {
      case "settings":
        if (settingsPage.classList.contains("hidden")) {
          settings.updateSettingsUI();
          settingsPage.classList.remove("hidden");
          setTimeout(() => {
            settingsPage.classList.add("active");
          }, 10);
        } else {
          settings.updateSettingsUI();
        }
        break;
      case "add-shortcut":
        const currentShortcuts = Storage.get("shortcuts") || [];
        if (currentShortcuts.length >= shortcuts.MAX_SHORTCUTS) {
          return;
        }

        const shortcutModal = document.getElementById("add-shortcut-modal");
        if (shortcutModal === activeModal) {
          closeModal(shortcutModal);
        } else {
          openModal(shortcutModal);
        }
        break;
      case "anonymous":
        const isAnonymous = Storage.get("anonymousMode") || false;
        Storage.set("anonymousMode", !isAnonymous);

        if (!isAnonymous) {
          const randomName = anonymousNames.generate();
          Storage.set("anonymousName", randomName);
        } else {
          Storage.remove("anonymousName");
        }

        shortcuts.render();
        updateGreeting();
        break;
      case "theme":
        settings.toggleTheme();
        break;
      case "url":
        if (binding.url) {
          const url = binding.url;
          const fullUrl =
            url.startsWith("http://") || url.startsWith("https://")
              ? url
              : `https://${url}`;

          window.location.href = fullUrl;
        }
        break;
    }
  },
};
