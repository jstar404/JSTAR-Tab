const defaultSettings = {
  theme: "light",
  userName: "",
  anonymousMode: false,
  searchEngine: "Google",
  updateAlerts: true,
  motionPreference: "default",
  show_greeting: true,
  show_search: true,
  show_shortcuts: true,
  show_addShortcut: true,
  greetingColorMode: "default",
  customGreetingColor: "#FFFFFF",
  fontFamily: "Inter",
  fontSize: "16",
  lightModeColors: {
    "--primary": "#f5f5f5",
    "--primary-hover": "#e0e0e0",
    "--background": "#ffffff",
    "--surface": "#fafafa",
    "--border": "#eaeaea",
    "--text": "#1a1a1a",
    "--text-secondary": "#666666",
    "--shadow": "hsla(0, 0.00%, 0.00%, 0.08)",
    "--modal-backdrop": "rgba(0, 0, 0, 0.5)",
    "--scrollbar-thumb": "#e0e0e0",
    "--scrollbar-track": "#f5f5f5",
    "--modal-background": "#ffffff",
    "--toggle-bg": "#e0e0e0",
    "--toggle-bg-active": "var(--text)",
    "--toggle-knob": "var(--background)",
  },
  darkModeColors: {
    "--primary": "#1a1a1a",
    "--primary-hover": "#2a2a2a",
    "--background": "#000000",
    "--surface": "#111111",
    "--border": "#333333",
    "--text": "#ffffff",
    "--text-secondary": "#999999",
    "--shadow": "rgba(0, 0, 0, 0.3)",
    "--modal-backdrop": "rgba(0, 0, 0, 0.75)",
    "--scrollbar-thumb": "#333333",
    "--scrollbar-track": "#1a1a1a",
    "--modal-background": "#1a1a1a",
    "--toggle-bg": "#333333",
    "--toggle-bg-active": "var(--text)",
    "--toggle-knob": "var(--background)",
  },
  keybinds: {
    settings: { keys: "Shift+S" },
    anonymous: { keys: "Shift+X" },
    theme: { keys: "Shift+T" },
    url: { keys: "Shift+Q", url: "" },
  },
};

const anonymousNames = {
  adjectives: [
    "Hidden",
    "Secret",
    "Mystery",
    "Shadow",
    "Unknown",
    "Silent",
    "Stealth",
    "Phantom",
    "Ghost",
    "Anon",
  ],
  nouns: [
    " User",
    " Visitor",
    " Guest",
    " Agent",
    " Entity",
    " Person",
    " Browser",
    " Explorer",
    " Wanderer",
    " Navigator",
  ],

  generate: function () {
    const adjective =
      this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
    const noun = this.nouns[Math.floor(Math.random() * this.nouns.length)];
    return `${adjective}${noun}`;
  },
};

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  if (hour < 22) return "Good Evening";
  return "Good Night";
};

const updateAlerts = Storage.get("updateAlerts") !== false;

document
  .getElementById("toggle-update-alerts")
  .addEventListener("change", function () {
    Storage.set("updateAlerts", this.checked);

    notifications.show(
      this.checked ? "Update alerts enabled!" : "Update alerts disabled!",
      "success",
    );
  });

const updateIconStyle = () => {
  const themeIcon = document.querySelector("#toggle-theme svg use");
  if (themeIcon) {
    const theme = document.body.getAttribute("data-theme");
    themeIcon.setAttribute(
      "href",
      theme === "dark" ? "icons.svg#moon" : "icons.svg#sun",
    );
  }
};

const savedMotionPreference = Storage.get("motionPreference") || "default";
document.getElementById("motion-preference-select").value =
  savedMotionPreference;
updateMotionPreference(savedMotionPreference);

document
  .getElementById("motion-preference-select")
  .addEventListener("change", (event) => {
    const selectedPreference = event.target.value;
    Storage.set("motionPreference", selectedPreference);
    updateMotionPreference(selectedPreference);
    notifications.show(
      `Motion preference updated to ${selectedPreference}!`,
      "success",
    );
  });

function updateMotionPreference(preference) {
  document.body.classList.remove(
    "subtle-motion",
    "reduced-motion",
    "minimal-motion",
    "no-motion",
  );

  switch (preference) {
    case "subtle":
      document.body.classList.add("subtle-motion");
      break;
    case "reduced":
      document.body.classList.add("reduced-motion");
      break;
    case "minimal":
      document.body.classList.add("minimal-motion");
      break;
    case "disabled":
      document.body.classList.add("no-motion");
      break;
  }
}

const settings = {
  GREETING_MAX_LENGTH: 60,

  toggleTheme: () => {
    const currentTheme = document.body.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    const motionPreference = Storage.get("motionPreference") || "default";
    if (motionPreference !== "default") {
      document.body.classList.add("instant-theme-change");
    }

    document.body.setAttribute("data-theme", newTheme);
    Storage.set("theme", newTheme);

    const themeIcon = document.querySelector("#toggle-theme svg use");
    let iconRef = newTheme === "dark" ? "icons.svg#sun" : "icons.svg#moon";
    themeIcon.setAttribute("href", iconRef);

    if (motionPreference !== "default") {
      setTimeout(() => {
        document.body.classList.remove("instant-theme-change");
      }, 50);
    }
    settings.updateColors();
    updateGreetingTextColor();
  },

  toggleAnonymousMode: () => {
    const isAnonymous = Storage.get("anonymousMode") || false;
    Storage.set("anonymousMode", !isAnonymous);

    if (!isAnonymous) {
      const randomName = anonymousNames.generate();
      Storage.set("anonymousName", randomName);
      notifications.show("Anonymous mode enabled!", "info");
    } else {
      Storage.remove("anonymousName");
      notifications.show("Anonymous mode disabled!", "info");
    }

    shortcuts.render();
    updateGreeting();
  },

  updateSearchEngine: (engine) => {
    Storage.set("searchEngine", engine);
    notifications.show("Search engine updated successfully!", "success");
  },

  updateVisibility: () => {
    const elements = {
      greeting: {
        id: "greeting",
        toggle: "toggle-greeting",
        functions: ["updateGreeting"],
        name: "Greeting",
      },
      search: {
        id: "search-container",
        toggle: "toggle-search",
        functions: ["search.init", "search.perform"],
        name: "Search bar",
      },
      shortcuts: {
        id: "shortcuts-grid",
        toggle: "toggle-shortcuts",
        functions: ["shortcuts.init", "shortcuts.render"],
        name: "Shortcuts",
      },
      addShortcut: {
        id: "add-shortcut",
        toggle: "toggle-add-shortcut",
        functions: [],
        name: "Add shortcut button",
      },
    };

    Object.entries(elements).forEach(([key, element]) => {
      const isVisible = Storage.get(`show_${key}`);
      if (isVisible === null) Storage.set(`show_${key}`, true);

      const toggle = document.getElementById(element.toggle);
      const elementNode = document.getElementById(element.id);

      if (toggle && elementNode) {
        toggle.checked = isVisible !== false;

        if (isVisible === false) {
          elementNode.style.visibility = "hidden";
          elementNode.style.opacity = "0";
          elementNode.style.position = "absolute";
          elementNode.style.pointerEvents = "none";
        } else {
          elementNode.style.visibility = "visible";
          elementNode.style.opacity = "1";
          elementNode.style.position = "relative";
          elementNode.style.pointerEvents = "auto";
        }

        if (!toggle.hasAttribute("data-visibility-initialized")) {
          toggle.setAttribute("data-visibility-initialized", "true");

          toggle.addEventListener("change", (e) => {
            const isChecked = e.target.checked;
            Storage.set(`show_${key}`, isChecked);

            if (isChecked) {
              elementNode.style.visibility = "visible";
              elementNode.style.opacity = "1";
              elementNode.style.position = "relative";
              elementNode.style.pointerEvents = "auto";
            } else {
              elementNode.style.visibility = "hidden";
              elementNode.style.opacity = "0";
              elementNode.style.position = "absolute";
              elementNode.style.pointerEvents = "none";
            }

            if (key === "shortcuts") {
              const addShortcutBtn = document.getElementById("add-shortcut");
              const addShortcutVisible =
                Storage.get("show_addShortcut") !== false;

              if (addShortcutBtn && !isChecked && !addShortcutVisible) {
                addShortcutBtn.style.visibility = "hidden";
                addShortcutBtn.style.opacity = "0";
                addShortcutBtn.style.position = "absolute";
                addShortcutBtn.style.pointerEvents = "none";
              } else if (addShortcutBtn && addShortcutVisible) {
                addShortcutBtn.style.visibility = "visible";
                addShortcutBtn.style.opacity = "1";
                addShortcutBtn.style.position = "relative";
                addShortcutBtn.style.pointerEvents = "auto";
              }
            }

            notifications.show(
              `${element.name} ${isChecked ? "shown" : "hidden"}!`,
              isChecked ? "success" : "info",
            );
            if (typeof window.updateGreetingTextColor === "function") {
              setTimeout(() => {
                window.updateGreetingTextColor();
              }, 50);
            }
          });
        }
      }
    });
  },

  init: () => {
    const settingsButton = document.getElementById("settings-button");
    const settingsPage = document.getElementById("settings-page");
    const backToHome = document.getElementById("back-to-home");

    settingsButton.addEventListener("click", (e) => {
      e.stopPropagation();
      settings.updateSettingsUI();
      settingsPage.classList.remove("hidden");
      setTimeout(() => {
        settingsPage.classList.add("active");
        resetScrollPosition();
      }, 10);
    });

    backToHome.addEventListener("click", () => {
      settingsPage.classList.remove("active");
      setTimeout(() => {
        settingsPage.classList.add("hidden");
      }, 300);
    });

    const navItems = document.querySelectorAll(".settings-nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const section = item.getAttribute("data-section");

        navItems.forEach((navItem) => navItem.classList.remove("active"));
        item.classList.add("active");

        document.querySelectorAll(".settings-section").forEach((section) => {
          section.classList.remove("active");
        });
        document.getElementById(section).classList.add("active");

        resetScrollPosition();
      });
    });

    const themeToggle = document.getElementById("toggle-theme");
    themeToggle.addEventListener("click", settings.toggleTheme);

    const anonymousToggle = document.getElementById("toggle-anonymous");
    anonymousToggle.addEventListener("change", settings.toggleAnonymousMode);

    const searchEngineSelect = document.getElementById("search-engine-select");
    searchEngineSelect.addEventListener("change", (e) => {
      settings.updateSearchEngine(e.target.value);
    });

    const nameInput = document.getElementById("settings-name");
    nameInput.addEventListener("change", (e) => {
      const newName = e.target.value.trim();
      if (newName) {
        Storage.set("userName", newName);
        updateGreeting();
        notifications.show("Name updated successfully!", "success");
      }
    });

    const fontFamilySelect = document.getElementById("font-family-select");
    const fontSizeSlider = document.getElementById("font-size-slider");
    const fontSizeNumber = document.getElementById("font-size-number");
    const resetFontSize = document.getElementById("reset-font-size");
    const resetLightColors = document.getElementById("reset-light-colors");
    const resetDarkColors = document.getElementById("reset-dark-colors");

    fontFamilySelect.value =
      Storage.get("fontFamily") || defaultSettings.fontFamily;
    const currentFontSize = Storage.get("fontSize") || defaultSettings.fontSize;
    fontSizeSlider.value = currentFontSize;
    fontSizeNumber.value = currentFontSize;

    fontFamilySelect.addEventListener("change", (e) => {
      Storage.set("fontFamily", e.target.value);
      settings.updateTypography();
      notifications.show("Font updated successfully!", "success");
    });

    const updateFontSize = (value) => {
      if (value >= 8 && value <= 36) {
        fontSizeSlider.value = value;
        fontSizeNumber.value = value;
        Storage.set("fontSize", value);
        settings.updateTypography();
      }
    };

    fontSizeSlider.addEventListener("input", (e) =>
      updateFontSize(e.target.value),
    );
    fontSizeNumber.addEventListener("change", (e) =>
      updateFontSize(e.target.value),
    );

    resetFontSize.addEventListener("click", () => {
      shortcuts.showConfirmDialog(
        "Reset Typography",
        "Are you sure you want to reset font settings to default?",
        settings.resetTypography,
      );
    });

    resetLightColors.addEventListener("click", () => {
      shortcuts.showConfirmDialog(
        "Reset Light Colors",
        "Are you sure you want to reset light mode colors to default?",
        () => settings.resetColors("light"),
      );
    });

    resetDarkColors.addEventListener("click", () => {
      shortcuts.showConfirmDialog(
        "Reset Dark Colors",
        "Are you sure you want to reset dark mode colors to default?",
        () => settings.resetColors("dark"),
      );
    });

    settings.initColorSettings();

    settings.updateTypography();
    settings.updateColors();

    const savedTheme = Storage.get("theme");
    if (!savedTheme) {
      const prefersDarkMode = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      savedTheme = prefersDarkMode ? "dark" : "light";
      Storage.set("theme", savedTheme);
    }

    document.body.setAttribute("data-theme", savedTheme);
    settings.updateColors();

    const themeIcon = document.querySelector("#toggle-theme svg use");
    let iconRef = savedTheme === "dark" ? "icons.svg#sun" : "icons.svg#moon";
    themeIcon.setAttribute("href", iconRef);

    settings.initDataManagement();
    settings.updateVisibility();

    const customGreetingInput = document.getElementById("custom-greeting");
    customGreetingInput.maxLength = settings.GREETING_MAX_LENGTH;

    customGreetingInput.addEventListener("input", (e) => {
      const value = e.target.value;
      if (value.length > settings.GREETING_MAX_LENGTH) {
        e.target.value = value.substring(0, settings.GREETING_MAX_LENGTH);
        notifications.show(
          `Custom greeting must be less than ${settings.GREETING_MAX_LENGTH} characters`,
          "error",
        );
      }
    });

    customGreetingInput.addEventListener("change", (e) => {
      const value = e.target.value.trim();

      if (value.length > settings.GREETING_MAX_LENGTH) {
        e.target.value = value.substring(0, settings.GREETING_MAX_LENGTH);
        notifications.show(
          `Custom greeting must be less than ${settings.GREETING_MAX_LENGTH} characters`,
          "error",
        );
        return;
      }

      if (value === "") {
        Storage.remove("customGreeting");
        notifications.show("Using default greeting format", "info");
      } else {
        const testFormat = settings.formatGreeting(value);
        if (testFormat) {
          Storage.set("customGreeting", value);
          notifications.show("Custom greeting updated!", "success");
        }
      }
      updateGreeting();
    });

    const greetingColorSelect = document.getElementById(
      "greeting-color-select",
    );
    const customGreetingColorInput = document.getElementById(
      "custom-greeting-color",
    );

    greetingColorSelect.addEventListener("change", (e) => {
      const selectedMode = e.target.value;
      Storage.set("greetingColorMode", selectedMode);
      settings.updateGreetingColorUI();
      updateGreetingTextColor();
    });

    customGreetingColorInput.addEventListener("change", (e) => {
      Storage.set("customGreetingColor", e.target.value);
      updateGreetingTextColor();
    });

    settings.updateGreetingColorUI();

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && settingsPage.classList.contains("active")) {
        backToHome.click();
      }
    });
  },

  updateGreetingColorUI: () => {
    const greetingColorSelect = document.getElementById(
      "greeting-color-select",
    );
    const customGreetingColorSetting = document.getElementById(
      "custom-greeting-color-setting",
    );

    if (!greetingColorSelect || !customGreetingColorSetting) return;

    const greetingColorMode =
      Storage.get("greetingColorMode") || defaultSettings.greetingColorMode;
    greetingColorSelect.value = greetingColorMode;

    if (greetingColorMode === "custom") {
      customGreetingColorSetting.classList.remove("hidden");
    } else {
      customGreetingColorSetting.classList.add("hidden");
    }
  },

  updateSettingsUI: () => {
    const userName = Storage.get("userName") || "";
    const isAnonymous = Storage.get("anonymousMode") || false;
    const currentEngine = Storage.get("searchEngine") || "google";
    const masterPassword = Storage.get("masterPassword") || "";

    document.getElementById("settings-name").value = userName;
    document.getElementById("toggle-anonymous").checked = isAnonymous;
    document.getElementById("search-engine-select").value = currentEngine;
    document.getElementById("toggle-update-alerts").checked =
      Storage.get("updateAlerts") !== false;
    document.getElementById("master-password").value = masterPassword;

    ["greeting", "search", "shortcuts", "addShortcut"].forEach((element) => {
      const isVisible = Storage.get(`show_${element}`);
      const toggle = document.getElementById(`toggle-${element}`);
      if (toggle) {
        toggle.checked = isVisible !== false;
      }
    });

    const customGreeting = Storage.get("customGreeting") || "";
    document.getElementById("custom-greeting").value = customGreeting;

    const customGreetingColor =
      Storage.get("customGreetingColor") || defaultSettings.customGreetingColor;

    document.getElementById("custom-greeting-color").value =
      customGreetingColor;

    settings.updateGreetingColorUI();

    const fontFamily = Storage.get("fontFamily") || defaultSettings.fontFamily;
    const fontSize = Storage.get("fontSize") || defaultSettings.fontSize;

    document.getElementById("font-family-select").value = fontFamily;
    document.getElementById("font-size-slider").value = fontSize;
    document.getElementById("font-size-number").value = fontSize;
    document.getElementById("motion-preference-select").value =
      Storage.get("motionPreference") || "default";
  },

  formatGreeting: (format) => {
    try {
      if (!format) return null;

      const validTokens = [
        "{name}",
        "{greeting}",
        "{time}",
        "{date}",
        "{day}",
        "{month}",
        "{year}",
      ];
      const tokens = format.match(/{[^}]+}/g) || [];

      if (!tokens.every((token) => validTokens.includes(token))) {
        notifications.show(
          "Invalid greeting format: Unknown token used",
          "error",
        );
        return null;
      }

      const now = new Date();
      const hour = now.getHours();
      let timeGreeting = "good night";
      if (hour >= 5 && hour < 12) timeGreeting = "good morning";
      else if (hour >= 12 && hour < 17) timeGreeting = "good afternoon";
      else if (hour >= 17 && hour < 20) timeGreeting = "good evening";

      const userName = Storage.get("anonymousMode")
        ? Storage.get("anonymousName") || anonymousNames.generate()
        : Storage.get("userName") || "Friend";

      const formats = {
        name: userName,
        greeting: format.startsWith("{greeting}")
          ? timeGreeting.charAt(0).toUpperCase() + timeGreeting.slice(1)
          : timeGreeting,
        time: now.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
        date: now.getDate().toString(),
        day: now.toLocaleDateString([], { weekday: "long" }),
        month: now.toLocaleDateString([], { month: "long" }),
        year: now.getFullYear(),
      };

      let formattedGreeting = format;
      Object.entries(formats).forEach(([key, value]) => {
        formattedGreeting = formattedGreeting.replace(
          new RegExp(`{${key}}`, "g"),
          value,
        );
      });

      if (/{[^}]+}/.test(formattedGreeting)) {
        throw new Error("Invalid format used");
      }

      return formattedGreeting;
    } catch (e) {
      notifications.show("Invalid greeting format. Using default.", "error");
      return null;
    }
  },

  exportData: () => {
    try {
      const includePersonalization = document.getElementById(
        "export-personalization",
      ).checked;
      const includeAppearance =
        document.getElementById("export-appearance").checked;
      const includePrivacy = document.getElementById("export-privacy").checked;
      const includeSearch = document.getElementById("export-search").checked;
      const includeShortcuts =
        document.getElementById("export-shortcuts").checked;
      const includeBackgrounds =
        document.getElementById("export-backgrounds").checked;

      console.log("Export settings selected:", {
        personalization: includePersonalization,
        appearance: includeAppearance,
        privacy: includePrivacy,
        search: includeSearch,
        shortcuts: includeShortcuts,
        backgrounds: includeBackgrounds,
      });

      const data = {
        settings: {},
        shortcuts: includeShortcuts ? Storage.get("shortcuts") || [] : [],
        keybinds: includeShortcuts
          ? typeof Storage.get("keybinds") === "string"
            ? JSON.parse(Storage.get("keybinds") || "{}")
            : Storage.get("keybinds") || {}
          : {},
      };

      if (includePersonalization) {
        data.settings.userName = Storage.get("userName") || "";
        data.settings.customGreeting = Storage.get("customGreeting") || "";
        data.settings.updateAlerts = Storage.get("updateAlerts") !== false;
        data.settings.show_greeting = Storage.get("show_greeting") !== false;
        data.settings.greetingColorMode =
          Storage.get("greetingColorMode") || defaultSettings.greetingColorMode;
        data.settings.customGreetingColor =
          Storage.get("customGreetingColor") ||
          defaultSettings.customGreetingColor;
      }

      if (includeAppearance) {
        data.settings.theme = Storage.get("theme") || defaultSettings.theme;
        data.settings.motionPreference =
          Storage.get("motionPreference") || "default";
        data.settings.fontFamily =
          Storage.get("fontFamily") || defaultSettings.fontFamily;
        data.settings.fontSize =
          Storage.get("fontSize") || defaultSettings.fontSize;
        data.settings.show_search = Storage.get("show_search") !== false;
        data.settings.show_shortcuts = Storage.get("show_shortcuts") !== false;
        data.settings.show_addShortcut =
          Storage.get("show_addShortcut") !== false;
        data.settings.gridLayout = Storage.get("gridLayout")
          ? typeof Storage.get("gridLayout") === "string"
            ? JSON.parse(Storage.get("gridLayout"))
            : Storage.get("gridLayout")
          : {
              type: "default",
              columns: 6,
              gap: 16,
              size: 80,
              resizable: false,
            };
        data.settings.lightModeColors =
          typeof Storage.get("lightModeColors") === "string"
            ? JSON.parse(Storage.get("lightModeColors"))
            : defaultSettings.lightModeColors;
        data.settings.darkModeColors =
          typeof Storage.get("darkModeColors") === "string"
            ? JSON.parse(Storage.get("darkModeColors"))
            : defaultSettings.darkModeColors;
      }

      if (includePrivacy) {
        let masterPassword = Storage.get("masterPassword") || "";
        if (masterPassword) {
          try {
            atob(masterPassword);
            if (btoa(atob(masterPassword)) !== masterPassword) {
              masterPassword = btoa(masterPassword);
            }
          } catch (e) {
            masterPassword = btoa(masterPassword);
          }
        }

        data.settings.anonymousMode = Storage.get("anonymousMode") || false;
        data.settings.anonymousName = Storage.get("anonymousName") || "";
        data.settings.passwordProtectionEnabled =
          Storage.get("passwordProtectionEnabled") || false;
        data.settings.hideLockIcon = Storage.get("hideLockIcon") || false;
        data.settings.masterPassword = masterPassword;
      }

      if (includeSearch) {
        data.settings.searchEngine = Storage.get("searchEngine") || "Google";
      }

      if (includeBackgrounds) {
        data.settings.backgrounds =
          typeof Storage.get("backgrounds") === "string"
            ? JSON.parse(Storage.get("backgrounds") || "[]")
            : [];
        data.settings.customBackground =
          Storage.get("customBackground") || null;

        if (
          data.settings.backgrounds &&
          Array.isArray(data.settings.backgrounds)
        ) {
          data.settings.backgrounds = data.settings.backgrounds.filter((bg) => {
            return (
              typeof bg === "string" &&
              (bg.startsWith("data:image/") ||
                bg.startsWith("images/backgrounds/"))
            );
          });

          data.settings.backgrounds = data.settings.backgrounds.map((bg) => {
            if (bg.startsWith("images/backgrounds/")) {
              return bg;
            }
            return bg;
          });
        }

        if (data.settings.customBackground) {
          const predefinedImages = [
            "images/backgrounds/cherry.png",
            "images/backgrounds/mommies.png",
            "images/backgrounds/peachs-castle.png",
            "images/backgrounds/windows-xp.jpg",
          ];

          if (
            !predefinedImages.includes(data.settings.customBackground) &&
            !data.settings.backgrounds.includes(data.settings.customBackground)
          ) {
            data.settings.customBackground = null;
          }
        }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jstar-tab-backup.json";
      a.click();
      URL.revokeObjectURL(url);

      notifications.show("Data exported successfully!", "success");
    } catch (error) {
      notifications.show(`Failed to export data: ${error.message}`, "error");
      console.error("Export error:", error);
    }
  },

  importData: async (file) => {
    return new Promise(async (resolve, reject) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (
          !data.settings ||
          typeof data.settings !== "object" ||
          !Array.isArray(data.shortcuts) ||
          !data.keybinds ||
          typeof data.keybinds !== "object"
        ) {
          throw new Error("Invalid data structure");
        }

        const encodedMasterPassword = data.settings.masterPassword;
        delete data.settings.masterPassword;

        const customBackgrounds = data.settings.backgrounds || [];
        delete data.settings.backgrounds;

        const customBackground = data.settings.customBackground;
        delete data.settings.customBackground;

        if (data.settings.backgrounds) {
          if (!Array.isArray(data.settings.backgrounds)) {
            throw new Error("Invalid backgrounds format");
          }

          const validBackgrounds = data.settings.backgrounds.filter((bg) => {
            return (
              typeof bg === "string" &&
              (bg.startsWith("data:image/") ||
                bg.startsWith("images/backgrounds/"))
            );
          });

          if (validBackgrounds.length !== data.settings.backgrounds.length) {
            throw new Error("Invalid background images detected");
          }

          if (
            data.settings.customBackground &&
            !validBackgrounds.includes(data.settings.customBackground)
          ) {
            delete data.settings.customBackground;
          }
        }

        if (data.settings.gridLayout) {
          if (typeof data.settings.gridLayout !== "object") {
            data.settings.gridLayout = {
              type: "default",
              columns: 6,
              gap: 16,
              size: 80,
              resizable: false,
            };
          } else {
            const defaultLayout = {
              type: "default",
              columns: 6,
              gap: 16,
              size: 80,
              resizable: false,
            };

            if (
              !data.settings.gridLayout.type ||
              !["default", "compact", "comfortable", "list", "custom"].includes(
                data.settings.gridLayout.type,
              )
            ) {
              data.settings.gridLayout.type = defaultLayout.type;
            }

            const columns = parseInt(data.settings.gridLayout.columns);
            if (isNaN(columns) || columns < 1 || columns > 12) {
              data.settings.gridLayout.columns = defaultLayout.columns;
            }

            const gap = parseInt(data.settings.gridLayout.gap);
            if (isNaN(gap) || gap < 0 || gap > 50) {
              data.settings.gridLayout.gap = defaultLayout.gap;
            }

            const size = parseInt(data.settings.gridLayout.size);
            if (isNaN(size) || size < 40 || size > 200) {
              data.settings.gridLayout.size = defaultLayout.size;
            }

            if (typeof data.settings.gridLayout.resizable !== "boolean") {
              data.settings.gridLayout.resizable = defaultLayout.resizable;
            }
          }
        }

        const validateThemeColors = (colorObj, defaultColors) => {
          if (!colorObj || typeof colorObj !== "object") {
            return defaultColors;
          }

          const validatedColors = { ...defaultColors };

          Object.keys(defaultColors).forEach((key) => {
            if (colorObj[key] && typeof colorObj[key] === "string") {
              validatedColors[key] = colorObj[key];
            }
          });

          return validatedColors;
        };

        if (data.settings.lightModeColors) {
          data.settings.lightModeColors = validateThemeColors(
            data.settings.lightModeColors,
            defaultSettings.lightModeColors,
          );
        }

        if (data.settings.darkModeColors) {
          data.settings.darkModeColors = validateThemeColors(
            data.settings.darkModeColors,
            defaultSettings.darkModeColors,
          );
        }

        Object.entries(data.settings).forEach(([key, value]) => {
          if (key === "gridLayout") {
            Storage.set(key, JSON.stringify(value));
          } else if (key === "lightModeColors" || key === "darkModeColors") {
            Storage.set(key, JSON.stringify(value));
          } else {
            Storage.set(key, value);
          }
        });

        if (data.settings.passwordProtectionEnabled) {
          if (typeof shortcuts.createShortcutProtectionManager === "function") {
            shortcuts.createShortcutProtectionManager();
          }
        }

        if (data.settings.hideLockIcon) {
          document.body.classList.add("hide-lock-icons");
        } else {
          document.body.classList.remove("hide-lock-icons");
        }

        Storage.set("shortcuts", data.shortcuts);

        const validatedKeybinds = {};
        Object.entries(data.keybinds).forEach(([action, binding]) => {
          if (
            binding &&
            typeof binding === "object" &&
            typeof binding.keys === "string" &&
            (!binding.url || typeof binding.url === "string")
          ) {
            validatedKeybinds[action] = binding;
          }
        });
        Storage.set("keybinds", validatedKeybinds);

        settings.updateSettingsUI();
        settings.updateVisibility();
        shortcuts.render();

        if (typeof GridLayout !== "undefined") {
          let gridSettings;

          if (data.settings.gridLayout) {
            gridSettings =
              typeof data.settings.gridLayout === "string"
                ? JSON.parse(data.settings.gridLayout)
                : data.settings.gridLayout;
            Storage.set(
              "gridLayout",
              typeof gridSettings === "object"
                ? JSON.stringify(gridSettings)
                : gridSettings,
            );
            setTimeout(() => {
              if (GridLayout.updateUI) {
                GridLayout.updateUI(gridSettings);
              }

              if (GridLayout.applyLayout) {
                GridLayout.applyLayout(gridSettings);
              }

              if (GridLayout.toggleCustomSettings) {
                GridLayout.toggleCustomSettings(gridSettings.type === "custom");
              }

              const layoutTypeSelect =
                document.getElementById("grid-layout-type");
              if (layoutTypeSelect) {
                layoutTypeSelect.value = gridSettings.type;

                const customSelectDiv =
                  layoutTypeSelect.closest(".custom-select");
                if (customSelectDiv) {
                  const selectSelected =
                    customSelectDiv.querySelector(".select-selected");
                  if (selectSelected && layoutTypeSelect.selectedIndex >= 0) {
                    const selectedOption =
                      layoutTypeSelect.options[layoutTypeSelect.selectedIndex];
                    selectSelected.innerHTML = `<span>${selectedOption.innerHTML}</span>`;
                  }
                }
              }
            }, 100);
          }
        }

        document.body.setAttribute(
          "data-theme",
          data.settings.theme || "light",
        );
        settings.updateColors();

        if (data.settings.lightModeColors || data.settings.darkModeColors) {
          settings.initColorSettings();
        }

        updateIconStyle();

        if (data.settings.fontFamily) {
          document.documentElement.style.setProperty(
            "--font-family",
            data.settings.fontFamily,
          );
        }

        if (data.settings.fontSize) {
          document.documentElement.style.setProperty(
            "--font-size",
            data.settings.fontSize + "px",
          );
        }

        if (data.settings.greetingColorMode !== undefined) {
          Storage.set("greetingColorMode", data.settings.greetingColorMode);
        }
        if (data.settings.customGreetingColor) {
          Storage.set("customGreetingColor", data.settings.customGreetingColor);
        }

        if (Array.isArray(customBackgrounds) && customBackgrounds.length > 0) {
          const validBackgrounds = customBackgrounds.filter((bg) => {
            return (
              typeof bg === "string" &&
              (bg.startsWith("data:image/") ||
                bg.startsWith("images/backgrounds/"))
            );
          });

          Storage.set("backgrounds", JSON.stringify(validBackgrounds));

          const backgroundPreviewGrid = document.getElementById(
            "background-preview-grid",
          );
          if (backgroundPreviewGrid) {
            document
              .querySelectorAll(".background-preview.custom")
              .forEach((el) => el.remove());

            if (typeof window.loadBackgrounds === "function") {
              window.loadBackgrounds();
            }
          }
        }

        const predefinedImages = [
          "images/backgrounds/cherry.png",
          "images/backgrounds/mommies.png",
          "images/backgrounds/peachs-castle.png",
          "images/backgrounds/windows-xp.jpg",
        ];

        if (customBackground) {
          if (predefinedImages.includes(customBackground)) {
            document.body.style.backgroundImage = `url(${customBackground})`;
            Storage.set("customBackground", customBackground);
          } else {
            if (
              typeof customBackground === "string" &&
              (customBackground.startsWith("data:image/") ||
                customBackground.startsWith("images/backgrounds/"))
            ) {
              document.body.style.backgroundImage = `url(${customBackground})`;
              Storage.set("customBackground", customBackground);
            } else {
              document.body.style.backgroundImage = "";
              Storage.remove("customBackground");
            }
          }
        } else {
          document.body.style.backgroundImage = "";
          Storage.remove("customBackground");
        }

        if (encodedMasterPassword) {
          let decodedPassword;
          try {
            decodedPassword = atob(encodedMasterPassword);
            Storage.set("masterPassword", decodedPassword);
          } catch (e) {
            console.error("Standard Base64 decoding failed:", e);
            try {
              decodedPassword = atob(decodeURIComponent(encodedMasterPassword));

              Storage.set("masterPassword", decodedPassword);
            } catch (e2) {
              console.error("URI + Base64 decoding failed:", e2);
              try {
                Storage.set("masterPassword", "");
              } catch (e3) {
                console.error("Setting raw password failed:", e3);
                Storage.remove("masterPassword");
                notifications.show(
                  "Could not decode master password, password protection was reset",
                  "warning",
                );
              }
            }
          }

          const masterPasswordInput =
            document.getElementById("master-password");
          if (masterPasswordInput) {
            masterPasswordInput.value = Storage.get("masterPassword") || "";
          }
        }

        notifications.show("Data imported successfully!", "success");
        setTimeout(() => {
          notifications.show(
            'For optimal results, please <a href="#" class="refresh-action-trigger" style="color: #2196F3; text-decoration: underline; font-weight: 600;">refresh</a> the page.',
            "warning",
            10000,
          );
        }, 1500);

        resolve();
      } catch (error) {
        notifications.show(
          "Failed to import data: Invalid file format!",
          "error",
        );
        console.error("Import error:", error);
        reject(error);
      }
    });
  },

  resetData: () => {
    shortcuts.showConfirmDialog(
      "Reset All Data",
      "Are you sure you want to reset all data? This action cannot be undone.",
      () => {
        try {
          Storage.remove("customGreeting");
          Storage.clear();

          Storage.set("keybinds", defaultSettings.keybinds);

          closeModal(document.getElementById("settings-modal"));
          notifications.show("All data has been reset!", "success");
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          notifications.show("Failed to reset data!", "error");
          console.error("Reset error:", error);
        }
      },
    );
  },

  updateTypography: () => {
    const fontFamily = Storage.get("fontFamily") || defaultSettings.fontFamily;
    const fontSize = Storage.get("fontSize") || defaultSettings.fontSize;

    document.documentElement.style.setProperty("--font-family", fontFamily);
    document.documentElement.style.setProperty(
      "--font-size-base",
      `${fontSize}px`,
    );
  },

  updateColors: () => {
    const theme = document.body.getAttribute("data-theme");
    let colors;

    if (theme === "dark") {
      const darkColors = Storage.get("darkModeColors");
      colors =
        typeof darkColors === "string"
          ? JSON.parse(darkColors)
          : darkColors || defaultSettings.darkModeColors;
    } else {
      const lightColors = Storage.get("lightModeColors");
      colors =
        typeof lightColors === "string"
          ? JSON.parse(lightColors)
          : lightColors || defaultSettings.lightModeColors;
    }

    Object.entries(colors).forEach(([variable, value]) => {
      document.body.style.setProperty(variable, value);
    });
  },

  resetTypography: () => {
    Storage.set("fontFamily", defaultSettings.fontFamily);
    Storage.set("fontSize", defaultSettings.fontSize);
    settings.updateTypography();
    settings.updateSettingsUI();
    notifications.show("Typography reset to default!", "success");
  },

  resetColors: async (theme) => {
    const key = theme === "dark" ? "darkModeColors" : "lightModeColors";
    await Storage.remove(key);

    const targetDefaults =
      theme === "dark"
        ? defaultSettings.darkModeColors
        : defaultSettings.lightModeColors;
    Object.keys(targetDefaults).forEach((variable) => {
      document.body.style.removeProperty(variable);
    });

    if (theme === "light") {
      settings.lightModeColors = { ...defaultSettings.lightModeColors };
    } else {
      settings.darkModeColors = { ...defaultSettings.darkModeColors };
    }

    settings.updateColors();
    settings.initColorSettings();

    notifications.show(
      `${theme.charAt(0).toUpperCase() + theme.slice(1)} colors reset to default!`,
      "success",
    );
  },

  initColorSettings: () => {
    const colorVariables = {
      "Primary Color": "--primary",
      "Primary Hover": "--primary-hover",
      Background: "--background",
      Surface: "--surface",
      Border: "--border",
      Text: "--text",
      "Secondary Text": "--text-secondary",
      Shadow: "--shadow",
      "Modal Backdrop": "--modal-backdrop",
      "Scrollbar Thumb": "--scrollbar-thumb",
      "Scrollbar Track": "--scrollbar-track",
      "Modal Background": "--modal-background",
      "Toggle Background": "--toggle-bg",
      "Toggle Active": "--toggle-bg-active",
      "Toggle Knob": "--toggle-knob",
    };

    const createColorInputs = (containerId, theme) => {
      const container = document.getElementById(containerId);
      container.innerHTML = "";

      let colors;
      if (theme === "dark") {
        const darkColors = Storage.get("darkModeColors");
        colors =
          typeof darkColors === "string"
            ? JSON.parse(darkColors)
            : darkColors || defaultSettings.darkModeColors;
      } else {
        const lightColors = Storage.get("lightModeColors");
        colors =
          typeof lightColors === "string"
            ? JSON.parse(lightColors)
            : lightColors || defaultSettings.lightModeColors;
      }

      Object.entries(colorVariables).forEach(([label, variable]) => {
        const colorValue = colors[variable];
        if (!/^#[0-9A-F]{6}$/i.test(colorValue)) {
          return;
        }

        const div = document.createElement("div");
        div.className = "color-setting";
        div.innerHTML = `
                    <div class="color-setting-label">${label}</div>
                    <input type="color" value="${colorValue}" data-variable="${variable}">
                `;

        const input = div.querySelector("input");
        input.addEventListener("change", (e) => {
          let updatedColors;
          if (theme === "dark") {
            const darkColors = Storage.get("darkModeColors");
            updatedColors =
              typeof darkColors === "string"
                ? JSON.parse(darkColors)
                : darkColors || { ...defaultSettings.darkModeColors };
          } else {
            const lightColors = Storage.get("lightModeColors");
            updatedColors =
              typeof lightColors === "string"
                ? JSON.parse(lightColors)
                : lightColors || { ...defaultSettings.lightModeColors };
          }

          updatedColors[variable] = e.target.value;
          Storage.set(
            theme === "dark" ? "darkModeColors" : "lightModeColors",
            JSON.stringify(updatedColors),
          );
          settings.updateColors();
        });

        container.appendChild(div);
      });
    };

    createColorInputs("light-mode-colors", "light");
    createColorInputs("dark-mode-colors", "dark");
  },
};

function resetScrollPosition() {
  const settingsContent = document.querySelector(".settings-content");
  if (settingsContent) {
    settingsContent.scrollTop = 0;
  }
}

settings.initDataManagement = () => {
  const importBtn = document.getElementById("import-data");
  const exportBtn = document.getElementById("export-data");
  const resetBtn = document.getElementById("reset-data");

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.id = "import-file";
  fileInput.accept = ".json";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  if (!importBtn || !exportBtn || !resetBtn) {
    console.warn("Data management buttons not found");
    return;
  }

  updateVersionInformation();

  exportBtn.replaceWith(exportBtn.cloneNode(true));
  const newExportBtn = document.getElementById("export-data");

  newExportBtn.addEventListener("click", () => {
    const exportModal = document.getElementById("export-data-modal");
    if (!exportModal) {
      console.error("Export modal not found in DOM");
      return;
    }

    const closeExportModal = document.getElementById("close-export-modal");
    const confirmExport = document.getElementById("confirm-export");
    const cancelExport = document.getElementById("cancel-export");

    if (!closeExportModal || !confirmExport || !cancelExport) {
      console.error("Export modal buttons not found");
      return;
    }

    let customBgsData = Storage.get("backgrounds");
    if (typeof customBgsData === "string") {
      try {
        customBgsData = JSON.parse(customBgsData);
      } catch (e) {
        customBgsData = [];
      }
    }

    const hasCustomBackgrounds =
      Array.isArray(customBgsData) && customBgsData.length > 0;

    const bgToggle = document.getElementById("export-backgrounds");
    const bgOptionRow = bgToggle.closest(".export-option");

    if (!hasCustomBackgrounds) {
      bgToggle.checked = false;
      bgToggle.disabled = true;
      bgOptionRow.style.opacity = "0.5";
      bgOptionRow.style.cursor = "not-allowed";
      bgOptionRow.setAttribute(
        "title",
        "No custom backgrounds found to export",
      );
    } else {
      bgToggle.checked = true;
      bgToggle.disabled = false;
      bgOptionRow.style.opacity = "1";
      bgOptionRow.style.cursor = "pointer";
      bgOptionRow.removeAttribute("title");
    }

    const newCloseBtn = closeExportModal.cloneNode(true);
    closeExportModal.parentNode.replaceChild(newCloseBtn, closeExportModal);

    const newCancelBtn = cancelExport.cloneNode(true);
    cancelExport.parentNode.replaceChild(newCancelBtn, cancelExport);

    const newConfirmBtn = confirmExport.cloneNode(true);
    confirmExport.parentNode.replaceChild(newConfirmBtn, confirmExport);

    newCloseBtn.addEventListener("click", () => {
      exportModal.classList.remove("active");
      setTimeout(() => {
        exportModal.classList.add("hidden");
      }, 300);
    });

    newCancelBtn.addEventListener("click", () => {
      exportModal.classList.remove("active");
      setTimeout(() => {
        exportModal.classList.add("hidden");
      }, 300);
    });

    newConfirmBtn.addEventListener("click", () => {
      settings.exportData();
      exportModal.classList.remove("active");
      setTimeout(() => {
        exportModal.classList.add("hidden");
      }, 300);
    });

    document.getElementById("export-personalization").checked = true;
    document.getElementById("export-appearance").checked = true;
    document.getElementById("export-privacy").checked = true;
    document.getElementById("export-search").checked = true;
    document.getElementById("export-shortcuts").checked = true;

    exportModal.classList.remove("hidden");
    setTimeout(() => {
      exportModal.classList.add("active");
    }, 10);
  });

  const newImportBtn = importBtn.cloneNode(true);
  importBtn.parentNode.replaceChild(newImportBtn, importBtn);
  const importBtnRef = newImportBtn;

  let importInProgress = false;

  importBtnRef.addEventListener("click", () => {
    if (importInProgress) return;

    fileInput.value = "";
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (importInProgress) return;
    importInProgress = true;

    importBtnRef.disabled = true;

    settings
      .importData(file)
      .then(() => {
        importBtnRef.disabled = false;
        importInProgress = false;
      })
      .catch(() => {
        importBtnRef.disabled = false;
        importInProgress = false;
      });
  });

  resetBtn.addEventListener("click", () => {
    shortcuts.showConfirmDialog(
      "Reset All Data",
      "Are you sure you want to reset all data? This action cannot be undone.",
      () => {
        try {
          Storage.remove("customGreeting");
          Storage.clear();

          Storage.set("keybinds", defaultSettings.keybinds);

          closeModal(document.getElementById("settings-modal"));
          notifications.show("All data has been reset!", "success");
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          notifications.show("Failed to reset data!", "error");
          console.error("Reset error:", error);
        }
      },
    );
  });
};

function updateLogoBasedOnTheme() {
  setTimeout(() => {
    const logoImg = document.getElementById("logoImage");
    const theme = document.body.getAttribute("data-theme");
    if (logoImg) {
      if (theme === "dark") {
        logoImg.src = "images/icon48.png";
      } else {
        logoImg.src = "images/icon48-black.png";
      }
    }
  }, 500);
}

document.addEventListener("DOMContentLoaded", updateLogoBasedOnTheme);
const observer = new MutationObserver((mutations) => {
  const logoImg = document.getElementById("logoImage");
  const theme = document.body.getAttribute("data-theme");
  if (logoImg) {
    if (theme === "dark") {
      logoImg.src = "images/icon48.png";
    } else {
      logoImg.src = "images/icon48-black.png";
    }
  }
});
observer.observe(document.body, {
  attributes: true,
  attributeFilter: ["data-theme"],
});

function initCustomSelects() {
  const customSelects = document.querySelectorAll(".custom-select");

  customSelects.forEach((select) => {
    initializeDropdown(select);
  });

  function closeAllSelects(element) {
    const selectItems = document.getElementsByClassName("select-items");
    const selectSelected = document.getElementsByClassName("select-selected");

    for (let i = 0; i < selectSelected.length; i++) {
      if (element !== selectSelected[i]) {
        selectSelected[i].classList.remove("select-arrow-active");
      }
    }

    for (let i = 0; i < selectItems.length; i++) {
      if (element !== selectItems[i].previousSibling) {
        selectItems[i].classList.add("select-hide");
      }
    }
  }

  document.addEventListener("click", closeAllSelects);
}

function initializeDropdown(select) {
  const nativeSelect = select.querySelector("select");
  if (!nativeSelect) return;

  const existingSelected = select.querySelector(".select-selected");
  const existingItems = select.querySelector(".select-items");
  if (existingSelected) existingSelected.remove();
  if (existingItems) existingItems.remove();

  const selectedDiv = document.createElement("div");
  selectedDiv.className = "select-selected";

  if (nativeSelect.id === "search-engine-select") {
    nativeSelect.value = Storage.get("searchEngine") || "google";
  } else if (nativeSelect.id === "font-family-select") {
    nativeSelect.value = Storage.get("fontFamily") || "Inter";
    selectedDiv.style.fontFamily = nativeSelect.value;
  } else if (nativeSelect.id === "grid-layout-type") {
    const savedGridType = Storage.get("gridLayoutType");
    if (savedGridType) {
      nativeSelect.value = savedGridType;
    }
  } else if (nativeSelect.id === "greeting-color-select") {
    nativeSelect.value = Storage.get("greetingColorMode") || "default";
  }

  const initialOption = nativeSelect.options[nativeSelect.selectedIndex];
  selectedDiv.innerHTML = `
        <span class="${initialOption?.className || ""}">
            ${initialOption.innerHTML}
        </span>
    `;

  const itemsDiv = document.createElement("div");
  itemsDiv.className = "select-items select-hide";

  for (let i = 0; i < nativeSelect.options.length; i++) {
    const optionDiv = document.createElement("div");
    const option = nativeSelect.options[i];

    optionDiv.innerHTML = option.innerHTML;
    optionDiv.className = option.className || "";
    optionDiv.setAttribute("data-value", option.value);

    if (nativeSelect.id === "font-family-select") {
      optionDiv.style.fontFamily = option.value;
    }

    if (option.value === nativeSelect.value) {
      optionDiv.classList.add("same-as-selected");
    }

    optionDiv.addEventListener("click", function () {
      nativeSelect.selectedIndex = i;
      nativeSelect.dispatchEvent(new Event("change"));

      selectedDiv.innerHTML = `
                <span class="${this.className.replace("same-as-selected", "").trim()}">
                    ${this.innerHTML}
                </span>
            `;

      if (nativeSelect.id === "font-family-select") {
        selectedDiv.style.fontFamily = nativeSelect.options[i].value;
      }

      if (nativeSelect.id === "grid-layout-type") {
        Storage.set("gridLayoutType", nativeSelect.value);
      }

      const sameAsSelected = itemsDiv.querySelector(".same-as-selected");
      if (sameAsSelected) {
        sameAsSelected.classList.remove("same-as-selected");
      }
      this.classList.add("same-as-selected");

      itemsDiv.classList.add("select-hide");
      selectedDiv.classList.remove("select-arrow-active");
    });

    itemsDiv.appendChild(optionDiv);
  }

  selectedDiv.addEventListener("click", function (e) {
    e.stopPropagation();
    const selectItems = document.getElementsByClassName("select-items");
    const selectSelected = document.getElementsByClassName("select-selected");

    for (let i = 0; i < selectSelected.length; i++) {
      if (this !== selectSelected[i]) {
        selectSelected[i].classList.remove("select-arrow-active");
      }
    }

    for (let i = 0; i < selectItems.length; i++) {
      if (this !== selectItems[i].previousSibling) {
        selectItems[i].classList.add("select-hide");
      }
    }

    this.nextSibling.classList.toggle("select-hide");
    this.classList.toggle("select-arrow-active");
  });

  select.appendChild(selectedDiv);
  select.appendChild(itemsDiv);
}

document.addEventListener("DOMContentLoaded", function () {
  initCustomSelects();
  settings.init();
  const greetingColorDropdown = document
    .querySelector("#greeting-color-select")
    .closest(".custom-select");
  if (greetingColorDropdown) {
    initializeDropdown(greetingColorDropdown);
  }
  document.addEventListener("DOMContentLoaded", () => {
    if (!document.body.hasAttribute("data-theme")) {
      const savedTheme = Storage.get("theme") || "light";
      document.body.setAttribute("data-theme", savedTheme);
    }
    settings.updateColors();
    settings.updateTypography();
    settings.updateIconStyle();
  });
});

function updateVersionInformation() {
  const updateInfoContent = document.getElementById("update-info-content");
  const changelogLink = document.querySelector(
    'a[href*="jstartab.vercel.app/changelog"]',
  );
  if (!updateInfoContent) return;

  if (changelogLink) {
    const manifestVersion = chrome.runtime.getManifest().version;
    const baseUrl = "https://jstartab.vercel.app/changelog";
    changelogLink.href = manifestVersion
      ? `${baseUrl}/${manifestVersion}`
      : baseUrl;
  }

  const manifestVersion = chrome.runtime.getManifest().version;
  let isLatest = false;
  let latestVersion = "";

  const compareVersions = (version1, version2) => {
    const v1 = version1.split(".").map(Number);
    const v2 = version2.split(".").map(Number);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const diff = (v1[i] || 0) - (v2[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  const checkAndUpdateInfo = async () => {
    try {
      const response = await fetch("https://tinyurl.com/jstartab", {
        cache: "no-store",
      });
      let rawData = await response.text();
      let latestData;

      try {
        latestData = JSON.parse(rawData);
      } catch (e) {
        const matches = rawData.match(/\{[^\}]*\}/g);
        if (matches && matches.length > 0) {
          latestData = matches
            .map((item) => {
              try {
                return JSON.parse(item);
              } catch (err) {
                return null;
              }
            })
            .filter((item) => item !== null);
        } else {
          throw new Error("Invalid JSON format");
        }
      }

      if (Array.isArray(latestData)) {
        latestData.sort((a, b) => compareVersions(b.version, a.version));
        const stableEntry = latestData.find(
          (entry) => entry.development === false,
        );

        if (stableEntry) {
          latestVersion = stableEntry.version;
          const comparison = compareVersions(latestVersion, manifestVersion);
          isLatest = comparison <= 0;
          displayVersionInfo(isLatest, latestVersion, manifestVersion);
        }
      } else if (latestData && latestData.version) {
        latestVersion = latestData.version;
        const comparison = compareVersions(latestVersion, manifestVersion);
        isLatest = comparison <= 0;
        displayVersionInfo(isLatest, latestVersion, manifestVersion);
      }
    } catch (error) {
      displayVersionInfo(null, "unknown", manifestVersion);
    }
  };

  checkAndUpdateInfo();
}

function displayVersionInfo(isLatest, latestVersion, currentVersion) {
  const updateInfoContent = document.getElementById("update-info-content");
  if (!updateInfoContent) return;

  let html = "";

  if (isLatest === true) {
    html = `
            <div>
                <p><span class="label latest"><i class="fas fa-check-circle"></i> Latest</span> You are currently running the latest version (v${currentVersion}).</p>
                <p>If you're planning to reinstall or move to a different device:</p>
                <ul>
                    <li>Click the <strong>Export Data</strong> button above to save your settings</li>
                    <li>Choose which data categories you want to include in your backup</li>
                    <li>After reinstalling, import your settings file during the onboarding process or from this settings page</li>
                </ul>
            </div>
        `;
  } else if (isLatest === false) {
    html = `
            <div>
                <p><span class="label outdated"><i class="fas fa-exclamation-circle"></i> Update Available</span> A newer version (v${latestVersion}) is available! You're currently on v${currentVersion}.</p>
                <p>To update while keeping your settings:</p>
                <ul>
                    <li>Click the <strong>Export Data</strong> button above to save your current settings</li>
                    <li>Download the latest version from <a href="https://github.com/jstar404/JSTAR-Tab/releases/latest" target="_blank">GitHub</a></li>
                    <li>Go to your browser's extension page (e.g., chrome://extensions)</li>
                    <li>Enable "Developer mode" in the top-right corner</li>
                    <li>Remove the current JSTAR Tab extension</li>
                    <li>Drag and drop the downloaded .zip file onto the extensions page</li>
                    <li>During the first-time setup, select "Import Settings" and choose your exported file</li>
                </ul>
            </div>
        `;
  } else {
    html = `
            <div>
                <p>You're currently on version ${currentVersion}.</p>
                <p>To check for updates or transfer your settings to a new device:</p>
                <ul>
                    <li>Click the <strong>Export Data</strong> button above to save your settings</li>
                    <li>Check for the latest version on <a href="https://github.com/jstar404/JSTAR-Tab/releases/latest" target="_blank">GitHub</a></li>
                    <li>When installing on a new device or upgrading, import your settings file during the onboarding process</li>
                </ul>
            </div>
        `;
  }

  updateInfoContent.innerHTML = html;
}
