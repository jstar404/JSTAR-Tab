window.browserAPI = typeof browser !== "undefined" ? browser : chrome;

window.addEventListener("unhandledrejection", (event) => {
  console.warn("Recovered from unhandled promise:", event.reason);
  event.preventDefault();
});

window.onerror = function (message, source, lineno, colno, error) {
  console.warn("Recovered from global error:", message);
  return true;
};

window.onerror = function (message, source, lineno, colno, error) {
  if (
    typeof message === "string" &&
    message.includes("Errsdsdsor Assignment to constant variable") &&
    source.includes("settings.js")
  ) {
    return true;
  }
  return false;
};

const isDeveloperMode = () => localStorage.getItem("developerMode") === "true";

window.onerror = function (message, source, lineno, colno, error) {
  if (!isDeveloperMode()) {
    return true;
  }
  return false;
};

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args) {
  if (isDeveloperMode()) {
    originalConsoleLog.apply(console, args);
  }
};

console.error = function (...args) {
  if (isDeveloperMode()) {
    originalConsoleError.apply(console, args);
  }
};

async function updateGreeting() {
  const greetingElement = document.getElementById("greeting");
  if (!greetingElement) return;

  const customFormat = Storage.get("customGreeting");
  if (customFormat) {
    const formattedGreeting = await settings.formatGreeting(customFormat);
    if (formattedGreeting) {
      greeting.textContent = formattedGreeting;
      greeting.style.opacity = "0";
      setTimeout(() => {
        greeting.style.opacity = "1";
      }, 100);
      return;
    }
  }

  const hour = new Date().getHours();
  const isAnonymous = Storage.get("anonymousMode") || false;
  const userName = isAnonymous
    ? Storage.get("anonymousName") || anonymousNames.generate()
    : Storage.get("userName") || "Friend";

  let timeGreeting = "Hello";
  if (hour >= 5 && hour < 12) timeGreeting = "Good Morning";
  else if (hour >= 12 && hour < 17) timeGreeting = "Good Afternoon";
  else if (hour >= 17 && hour < 20) timeGreeting = "Good Evening";
  else timeGreeting = "Good Night";

  greeting.textContent = `${timeGreeting}, ${userName}!`;
  greeting.style.opacity = "0";
  setTimeout(() => {
    greeting.style.opacity = "1";
  }, 100);
}

function initModalHandlers() {
  const modals = document.querySelectorAll(".modal");

  modals.forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (modal.id === "whats-new-modal") return;
      if (e.target === modal && !modal.classList.contains("onboarding-modal")) {
        closeModal(modal);
      }
    });

    const modalContent = modal.querySelector(".modal-content");
    if (modalContent) {
      modalContent.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }

    document.querySelectorAll(".modal .close-button").forEach((button) => {
      button.addEventListener("click", () => {
        const modal = button.closest(".modal");
        if (modal) {
          closeModal(modal);
        }
      });
    });
  });
}

function openModal(modal) {
  if (!modal) return;

  const contextMenu = document.querySelector(".context-menu");
  if (contextMenu) {
    contextMenu.classList.add("hidden");
  }

  modal.classList.remove("hidden");
  requestAnimationFrame(() => {
    modal.classList.add("active");
  });
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("active");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300);
}

function updateFaviconBasedOnTheme() {
  const isDarkMode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const favicon = document.querySelector("link[rel='icon']");
  if (favicon) {
    favicon.href = isDarkMode
      ? "images/favicon.png"
      : "images/favicon-black.png";
  }
}

function initWhatsNew() {
  const modal = document.getElementById("whats-new-modal");
  if (!modal) return;

  const shouldShow = Storage.get("showWhatsNew");
  const manifestVersion = browserAPI.runtime.getManifest().version;

  const versionTitle = document.getElementById("whats-new-version-title");
  const changelogBtn = document.getElementById("whats-new-changelog-btn");

  if (versionTitle) versionTitle.textContent = `v${manifestVersion}`;
  if (changelogBtn) {
    changelogBtn.href = `https://jstartab.vercel.app/changelog/${manifestVersion}`;
  }

  if (shouldShow === true) {
    modal.classList.remove("hidden");
    requestAnimationFrame(() => {
      modal.classList.add("active");
      document.body.classList.add("whats-new-active");
    });

    const closeBtn = document.getElementById("close-whats-new");
    closeBtn.onclick = () => {
      Storage.set("showWhatsNew", false);
      modal.classList.remove("active");
      document.body.classList.remove("whats-new-active");
      setTimeout(() => modal.classList.add("hidden"), 300);
    };

    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape" && !modal.classList.contains("hidden")) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      },
      true,
    );
  } else {
    modal.classList.add("hidden");
    modal.classList.remove("active");
    document.body.classList.remove("whats-new-active");
  }
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("refresh-action-trigger")) {
    e.preventDefault();
    window.location.reload();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (
      typeof settings !== "undefined" &&
      typeof settings.updateVisibility === "function"
    ) {
      settings.updateVisibility();
    } else {
      console.warn("Settings not defined, using fallback visibility logic");
      ["greeting", "search", "shortcuts", "addShortcut"].forEach((element) => {
        const isVisible = Storage.get(`show_${element}`);
        if (isVisible === false) {
          const elementNode = document.getElementById(
            element === "search"
              ? "search-container"
              : element === "addShortcut"
                ? "add-shortcut"
                : element,
          );

          if (elementNode) {
            elementNode.style.visibility = "hidden";
            elementNode.style.opacity = "0";
            elementNode.style.position = "absolute";
            elementNode.style.pointerEvents = "none";
          }
        }
      });
    }
  }, 0);

  if (!Storage.get("onboardingComplete")) {
    onboarding.start();
  } else {
    document.getElementById("main-content").classList.remove("hidden");
  }

  setTimeout(() => {
    try {
      search.init();
      shortcuts.init();
      settings.init();
      initModalHandlers();

      updateGreeting();
      updateGreetingTextColor();
      setInterval(updateGreeting, 60000);
    } catch (e) {
      console.error("Error initializing components:", e);
    }
  }, 10);

  const settingsButton = document.getElementById("settings-button");
  const settingsModal = document.getElementById("settings-modal");

  settingsButton.addEventListener("click", () => {
    openModal(settingsModal);
  });

  keybinds.init();
  updateFaviconBasedOnTheme();
  initWhatsNew();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const activeModal = document.querySelector(".modal.active");
    if (activeModal && !activeModal.matches("#settings-modal")) {
      const primaryButton = activeModal.querySelector(".btn-primary");
      if (primaryButton) {
        primaryButton.click();
      }
    }
  }
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", updateFaviconBasedOnTheme);
