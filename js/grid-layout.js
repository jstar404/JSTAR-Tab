const GridLayout = {
  defaults: {
    type: "default",
    columns: 6,
    gap: 16,
    size: 80,
    resizable: false,
  },

  layouts: {
    default: {
      columns: 6,
      gap: 16,
      size: 80,
    },
    compact: {
      columns: 5,
      gap: 8,
      size: 70,
    },
    comfortable: {
      columns: 3,
      gap: 24,
      size: 100,
    },
    list: {
      columns: 1,
      gap: 12,
      size: 60,
    },
    custom: {},
  },

  init: function () {
    const settings = this.getSettings();
    this.applyLayout(settings);
    this.setupEventListeners();
    this.toggleCustomSettings(settings.type === "custom");
    this.updateUI(settings);
  },

  getSettings: function () {
    const storedSettings = Storage.get("gridLayout");
    return { ...this.defaults, ...storedSettings };
  },

  saveSettings: function (settings) {
    Storage.set("gridLayout", settings);
  },

  updateUI: function (settings) {
    const layoutTypeSelect = document.getElementById("grid-layout-type");
    if (layoutTypeSelect) {
      layoutTypeSelect.value = settings.type;
      const event = new Event("change");
      layoutTypeSelect.dispatchEvent(event);

      const customSelectDiv = layoutTypeSelect.closest(".custom-select");
      if (customSelectDiv) {
        const selectSelected =
          customSelectDiv.querySelector(".select-selected");
        if (selectSelected) {
          const selectedOption =
            layoutTypeSelect.options[layoutTypeSelect.selectedIndex];
          selectSelected.textContent = selectedOption.textContent;
        }
      }
    }

    const columnsInput = document.getElementById("grid-columns");
    const gapInput = document.getElementById("grid-gap");
    const sizeInput = document.getElementById("grid-size");

    if (columnsInput) columnsInput.value = settings.columns;
    if (gapInput) gapInput.value = settings.gap;
    if (sizeInput) {
      sizeInput.value = settings.size;
      sizeInput.disabled = !settings.resizable;
      if (!settings.resizable) {
        sizeInput.setAttribute(
          "title",
          "Enable 'Resizable Items' to customize item size",
        );
        sizeInput.style.cursor = "not-allowed";
      } else {
        sizeInput.removeAttribute("title");
        sizeInput.style.cursor = "auto";
      }
    }

    const resizableToggle = document.getElementById("toggle-resizable");
    if (resizableToggle) {
      resizableToggle.checked = settings.resizable;

      const isCustomGrid = settings.type === "custom";
      this.toggleCustomSettings(isCustomGrid);
    }
  },

  applyLayout: function (settings) {
    const grid = document.getElementById("shortcuts-grid");
    if (!grid) return;

    grid.classList.remove(
      "grid-default",
      "grid-compact",
      "grid-comfortable",
      "grid-list",
      "grid-custom",
    );
    grid.classList.add(`grid-${settings.type}`);

    if (settings.type === "custom") {
      grid.style.gridTemplateColumns = `repeat(${settings.columns}, minmax(${settings.size}px, 1fr))`;
      grid.style.gap = `${settings.gap}px`;
    } else {
      const layoutConfig = this.layouts[settings.type];
      if (layoutConfig) {
        grid.style.gridTemplateColumns = `repeat(${layoutConfig.columns}, minmax(${layoutConfig.size}px, 1fr))`;
        grid.style.gap = `${layoutConfig.gap}px`;

        if (settings.type === "list") {
          grid.style.gridTemplateColumns = "1fr";
        }
      } else {
        grid.style.gridTemplateColumns = "";
        grid.style.gap = "";
      }
    }

    this.applyResizable(settings.resizable);

    if (typeof window.updateGreetingTextColor === "function") {
      window.updateGreetingTextColor();
    }
  },

  setupEventListeners: function () {
    const layoutTypeSelect = document.getElementById("grid-layout-type");
    if (layoutTypeSelect) {
      layoutTypeSelect.addEventListener("change", () => {
        const settings = this.getSettings();
        settings.type = layoutTypeSelect.value;
        this.saveSettings(settings);
        this.applyLayout(settings);
        this.toggleCustomSettings(settings.type === "custom");

        if (settings.type !== "custom" && settings.resizable) {
          settings.resizable = false;
          this.saveSettings(settings);
          this.applyLayout(settings);

          const resizableToggle = document.getElementById("toggle-resizable");
          if (resizableToggle) {
            resizableToggle.checked = false;
          }

          notifications.show(
            "Resizable items disabled (only available in Custom Grid)",
            "info",
          );
        }
      });
    }

    const columnsInput = document.getElementById("grid-columns");
    const gapInput = document.getElementById("grid-gap");
    const sizeInput = document.getElementById("grid-size");

    const validateInputValue = (input) => {
      const min = parseInt(input.getAttribute("min"), 10);
      const max = parseInt(input.getAttribute("max"), 10);
      let value = parseInt(input.value, 10);

      if (isNaN(value)) {
        value = parseInt(input.defaultValue, 10);
      }

      if (value < min) value = min;
      if (value > max) value = max;

      input.value = value;
      return value;
    };

    [columnsInput, gapInput, sizeInput].forEach((input) => {
      if (input) {
        input.addEventListener("input", () => {
          validateInputValue(input);
        });

        input.addEventListener("change", () => {
          const value = validateInputValue(input);
          const settings = this.getSettings();
          settings[input.id.split("-")[1]] = value;
          this.saveSettings(settings);
          this.applyLayout(settings);
        });
      }
    });

    const resizableToggle = document.getElementById("toggle-resizable");
    if (resizableToggle) {
      resizableToggle.addEventListener("change", () => {
        const settings = this.getSettings();
        settings.resizable = resizableToggle.checked;
        this.saveSettings(settings);
        this.applyLayout(settings);
        this.toggleItemSizeInput(settings.resizable);
      });
    }

    const resetButton = document.getElementById("reset-layout");
    if (resetButton) {
      resetButton.addEventListener("click", () => {
        shortcuts.showConfirmDialog(
          "Reset Layout",
          "Are you sure you want to reset the layout settings to default?",
          () => this.resetToDefaults(),
        );
      });
    }
  },

  toggleItemSizeInput: function (enabled) {
    const sizeInput = document.getElementById("grid-size");
    if (sizeInput) {
      sizeInput.disabled = !enabled;
      if (enabled) {
        sizeInput.removeAttribute("title");
        sizeInput.style.cursor = "auto";
      } else {
        sizeInput.setAttribute(
          "title",
          "Enable 'Resizable Items' to customize item size",
        );
        sizeInput.style.cursor = "not-allowed";
      }
    }
  },

  toggleCustomSettings: function (show) {
    const customSettings = document.getElementById("custom-grid-settings");
    const resizableToggleContainer = document
      .getElementById("toggle-resizable")
      .closest(".setting-item");

    if (customSettings) {
      if (show) {
        customSettings.classList.remove("hidden");
        resizableToggleContainer.classList.remove("hidden");
      } else {
        customSettings.classList.add("hidden");
        resizableToggleContainer.classList.add("hidden");
      }
    }
  },

  applyResizable: function (resizable) {
    const shortcuts = document.querySelectorAll(".shortcut");

    shortcuts.forEach((shortcut) => {
      const existingHandle = shortcut.querySelector(".resize-handle");
      if (existingHandle) {
        existingHandle.remove();
      }

      shortcut.classList.remove("resizable");

      if (resizable) {
        shortcut.classList.add("resizable");

        const resizeHandle = document.createElement("div");
        resizeHandle.className = "resize-handle";
        shortcut.appendChild(resizeHandle);

        this.setupResizeEvents(shortcut, resizeHandle);
      }
    });
  },

  setupResizeEvents: function (shortcut, handle) {
    let startX, startY, startWidth, startHeight;

    const startResize = (e) => {
      e.preventDefault();
      shortcut.classList.add("resizing");

      startX = e.clientX;
      startY = e.clientY;
      startWidth = shortcut.offsetWidth;
      startHeight = shortcut.offsetHeight;

      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    };

    const resize = (e) => {
      const newWidth = startWidth + (e.clientX - startX);
      const newHeight = startHeight + (e.clientY - startY);

      shortcut.style.width = `${Math.max(80, newWidth)}px`;
      shortcut.style.height = `${Math.max(80, newHeight)}px`;
    };

    const stopResize = () => {
      shortcut.classList.remove("resizing");
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
    };

    handle.addEventListener("mousedown", startResize);
  },

  resetToDefaults: function () {
    this.saveSettings(this.defaults);
    this.updateUI(this.defaults);
    this.applyLayout(this.defaults);
    this.toggleCustomSettings(false);

    const visibilitySettings = {
      showGreeting: true,
      showSearch: true,
      showShortcuts: true,
      showAddButton: true,
      showGrid: true,
    };

    Storage.set("visibility", visibilitySettings);
    Storage.set("show_greeting", true);
    Storage.set("show_search", true);
    Storage.set("show_shortcuts", true);
    Storage.set("show_addShortcut", true);

    const greetingToggle = document.getElementById("toggle-greeting");
    const searchToggle = document.getElementById("toggle-search");
    const shortcutsToggle = document.getElementById("toggle-shortcuts");
    const addButtonToggle = document.getElementById("toggle-add-shortcut");

    if (greetingToggle) greetingToggle.checked = true;
    if (searchToggle) searchToggle.checked = true;
    if (shortcutsToggle) shortcutsToggle.checked = true;
    if (addButtonToggle) addButtonToggle.checked = true;

    const greeting = document.getElementById("greeting");
    const search = document.getElementById("search-container");
    const shortcuts = document.getElementById("shortcuts-grid");
    const addButton = document.getElementById("add-shortcut");

    const showElement = (element) => {
      if (element) {
        element.style.visibility = "visible";
        element.style.opacity = "1";
        element.style.position = "relative";
        element.style.pointerEvents = "auto";
      }
    };

    showElement(greeting);
    showElement(search);
    showElement(shortcuts);
    showElement(addButton);
  },

  reset: function () {
    this.resetToDefaults();

    notifications.show("Layout settings reset to defaults.", "success");

    return this.defaults;
  },
};

document.addEventListener("DOMContentLoaded", () => {
  GridLayout.init();
});

window.addEventListener("load", () => {
  setTimeout(() => {
    if (!window.gridLayoutInitialized) {
      GridLayout.init();
    }
  }, 500);
});
