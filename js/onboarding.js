const onboarding = {
  currentStep: 1,
  totalSteps: 5,
  settings: {},
  lastNotification: 0,
  isCompleting: false,
  notificationShown: false,
  initialized: false,

  showNotification(message, type = "info") {
    const now = Date.now();
    if (now - this.lastNotification >= 500) {
      this.lastNotification = now;
      notifications.show(message, type);
    }
  },

  isComplete: () => {
    return Storage.get("onboardingComplete") === true;
  },

  preloadFonts: async () => {
    const families = [
      "Inter",
      "Poppins",
      "Roboto",
      "Montserrat",
      "Quicksand",
      "Comic Sans MS",
    ];

    try {
      await document.fonts.load("1em Inter");
    } catch (e) {}

    families.slice(1).forEach((font) => {
      document.fonts.load(`1em ${font}`).catch(() => {});
    });
  },

  start: () => {
    if (onboarding.initialized) return;
    onboarding.initialized = true;

    const onboardingContainer = document.getElementById("onboarding-container");
    const mainContent = document.getElementById("main-content");
    const fileInput = document.getElementById("onboarding-import");
    const nextButton = document.getElementById("next-step");

    document.getElementById("notification-container").style.zIndex = "20000";

    if (!onboarding.isComplete()) {
      onboarding.preloadFonts();

      document.body.style.overflow = "hidden";
      onboardingContainer.classList.remove("hidden");

      onboarding.initProgressDots();
      onboarding.setupEventListeners();

      const theme = Storage.get("theme") || "light";
      document.body.setAttribute("data-theme", theme);

      document.querySelectorAll(".step-ob").forEach((step) => {
        step.classList.remove("active-ob");
        step
          .querySelectorAll(".option-card-ob")
          .forEach((c) => c.classList.remove("selected-ob"));
      });

      const firstStep = document.querySelector('.step-ob[data-step="1"]');
      firstStep.classList.add("active-ob");

      document.getElementById("prev-step").style.visibility = "hidden";

      nextButton.innerHTML =
        'Next <svg width="24" height="24"><use href="icons.svg#next"></use></svg>';
      nextButton.disabled = true;
      nextButton.classList.add("disabled-ob");

      mainContent.classList.add("hidden");
    } else {
      mainContent.classList.remove("hidden");
    }

    let isExploring = false;
    fileInput.addEventListener("click", (e) => {
      e.stopPropagation();
      isExploring = true;
    });

    window.addEventListener("focus", () => {
      if (isExploring) {
        isExploring = false;
        setTimeout(() => {
          if (fileInput.files.length === 0) {
            document
              .querySelectorAll(".option-card-ob")
              .forEach((c) => c.classList.remove("selected-ob"));
            nextButton.disabled = true;
            nextButton.classList.add("disabled-ob");
          }
        }, 300);
      }
    });

    fileInput.addEventListener("change", async (e) => {
      if (e.target.files.length > 0) {
        try {
          const file = e.target.files[0];
          const text = await file.text();
          const data = JSON.parse(text);

          if (
            !data.settings ||
            !data.shortcuts ||
            !Array.isArray(data.shortcuts)
          ) {
            throw new Error("Invalid data structure");
          }

          const encodedMasterPassword = data.settings.masterPassword;
          delete data.settings.masterPassword;

          const customBackgrounds = data.settings.backgrounds;
          delete data.settings.backgrounds;

          const customBackground = data.settings.customBackground;
          delete data.settings.customBackground;

          Object.entries(data.settings).forEach(([key, value]) => {
            Storage.set(key, value);
          });

          if (customBackgrounds) {
            const bgs =
              typeof customBackgrounds === "string"
                ? JSON.parse(customBackgrounds)
                : customBackgrounds;
            const validBgs = bgs.filter(
              (bg) =>
                typeof bg === "string" &&
                (bg.startsWith("data:image/") ||
                  bg.startsWith("images/backgrounds/")),
            );
            Storage.set("backgrounds", JSON.stringify(validBgs));
          }

          if (customBackground) {
            Storage.set("customBackground", customBackground);
          }

          if (encodedMasterPassword) {
            try {
              const decodedPassword = atob(encodedMasterPassword);
              Storage.set("masterPassword", decodedPassword);
            } catch (err) {
              try {
                const decodedPassword = atob(
                  decodeURIComponent(encodedMasterPassword),
                );
                Storage.set("masterPassword", decodedPassword);
              } catch (err2) {
                Storage.set("masterPassword", "");
              }
            }
          }

          Storage.set("shortcuts", data.shortcuts);
          if (data.keybinds) Storage.set("keybinds", data.keybinds);

          Storage.set("onboardingComplete", true);
          Storage.set("showWhatsNew", true);
          localStorage.setItem("showWelcomeAfterImport", "true");

          setTimeout(() => {
            window.location.reload();
          }, 100);
        } catch (error) {
          onboarding.showNotification(
            "Failed to import data: Invalid file format!",
            "error",
          );
          fileInput.value = "";
          document
            .querySelectorAll(".option-card-ob")
            .forEach((c) => c.classList.remove("selected-ob"));
        }
      }
    });
  },

  setupEventListeners: () => {
    document.addEventListener("keydown", (e) => {
      if (onboarding.isComplete()) return;
      const nextBtn = document.getElementById("next-step");
      const prevBtn = document.getElementById("prev-step");

      if (e.key === "Enter") {
        if (
          nextBtn &&
          !nextBtn.disabled &&
          !nextBtn.classList.contains("disabled-ob")
        ) {
          nextBtn.click();
        }
      } else if (e.key === "Escape") {
        if (prevBtn && prevBtn.style.visibility !== "hidden") {
          prevBtn.click();
        }
      }
    });

    document.querySelectorAll(".option-card-ob").forEach((card) => {
      card.addEventListener("click", () => {
        const step = card.closest(".step-ob");
        const cards = step.querySelectorAll(".option-card-ob");
        const nextButton = document.getElementById("next-step");

        cards.forEach((c) => c.classList.remove("selected-ob"));
        card.classList.add("selected-ob");

        if (card.dataset.action === "import-data") {
          nextButton.disabled = true;
          nextButton.classList.add("disabled-ob");
          document.getElementById("onboarding-import").click();
          return;
        }

        card.style.transform = "scale(1.05)";
        setTimeout(() => {
          card.style.transform = "scale(1.02)";
        }, 150);

        nextButton.disabled = false;
        nextButton.classList.remove("disabled-ob");

        if (card.dataset.theme) {
          onboarding.settings.theme = card.dataset.theme;
          document.body.setAttribute("data-theme", card.dataset.theme);
          if (typeof settings !== "undefined" && settings.updateColors)
            settings.updateColors();
          if (typeof updateLogoBasedOnTheme === "function")
            updateLogoBasedOnTheme();
        } else if (card.dataset.font) {
          onboarding.settings.fontFamily = card.dataset.font;
          document.documentElement.style.setProperty(
            "--font-family",
            card.dataset.font,
          );
        } else if (card.dataset.engine) {
          onboarding.settings.searchEngine = card.dataset.engine;
        }
      });
    });

    const nameInput = document.getElementById("user-name");
    const nextButton = document.getElementById("next-step");

    nameInput.addEventListener("input", (e) => {
      const name = e.target.value.trim();
      if (name) {
        onboarding.settings.userName = name;
        if (onboarding.currentStep === 4) {
          nextButton.disabled = false;
          nextButton.classList.remove("disabled-ob");
        }
      } else {
        if (onboarding.currentStep === 4) {
          nextButton.disabled = true;
          nextButton.classList.add("disabled-ob");
        }
      }
    });

    document.getElementById("prev-step").addEventListener("click", () => {
      if (onboarding.currentStep > 1)
        onboarding.navigateToStep(onboarding.currentStep - 1);
    });

    document.getElementById("next-step").addEventListener("click", () => {
      let canProceed = true;
      if (onboarding.currentStep === 2 && !onboarding.settings.theme)
        canProceed = false;
      else if (onboarding.currentStep === 3 && !onboarding.settings.fontFamily)
        canProceed = false;
      else if (onboarding.currentStep === 4) {
        const name = document.getElementById("user-name").value.trim();
        if (!name) {
          onboarding.showNotification("Please enter your name!", "error");
          document.getElementById("user-name").focus();
          canProceed = false;
        } else {
          onboarding.settings.userName = name;
        }
      } else if (
        onboarding.currentStep === 5 &&
        !onboarding.settings.searchEngine
      )
        canProceed = false;

      if (canProceed) {
        if (onboarding.currentStep < onboarding.totalSteps)
          onboarding.navigateToStep(onboarding.currentStep + 1);
        else {
          onboarding.isCompleting = true;
          localStorage.setItem("showWelcomeAfterImport", "true");
          onboarding.complete();
        }
      }
    });
  },

  navigateToStep: (step) => {
    const prevButton = document.getElementById("prev-step");
    const nextButton = document.getElementById("next-step");
    const currentStepEl = document.querySelector(
      `.step-ob[data-step="${onboarding.currentStep}"]`,
    );

    if (currentStepEl) currentStepEl.classList.remove("active-ob");

    setTimeout(() => {
      const targetStepEl = document.querySelector(
        `.step-ob[data-step="${step}"]`,
      );
      if (targetStepEl) targetStepEl.classList.add("active-ob");

      onboarding.currentStep = step;
      prevButton.style.visibility = step === 1 ? "hidden" : "visible";

      if (step === onboarding.totalSteps) {
        nextButton.innerHTML =
          'Get Started <svg width="24" height="24"><use href="icons.svg#sparkle"></use></svg>';
      } else {
        nextButton.innerHTML =
          'Next <svg width="24" height="24"><use href="icons.svg#next"></use></svg>';
      }

      if (step === 4) {
        setTimeout(() => {
          const input = document.getElementById("user-name");
          if (input) {
            input.focus();
            const len = input.value.length;
            input.setSelectionRange(len, len);
          }
        }, 550);
      }

      let isStepValid = false;
      if (step === 1) {
        const sel = targetStepEl.querySelector(".selected-ob");
        isStepValid = sel && sel.dataset.action === "start-fresh";
      } else if (step === 4) {
        isStepValid =
          document.getElementById("user-name").value.trim().length > 0;
      } else {
        isStepValid = targetStepEl.querySelector(".selected-ob") !== null;
      }

      nextButton.disabled = !isStepValid;
      if (!isStepValid) nextButton.classList.add("disabled-ob");
      else nextButton.classList.remove("disabled-ob");

      onboarding.updateProgressDots();
    }, 100);
  },

  initProgressDots: () => {
    const container = document.querySelector(".progress-dots-ob");
    container.innerHTML = "";
    for (let i = 0; i < onboarding.totalSteps; i++) {
      const dot = document.createElement("div");
      dot.className = "dot-ob" + (i === 0 ? " active-ob" : "");
      container.appendChild(dot);
    }
  },

  updateProgressDots: () => {
    const dots = document.querySelectorAll(".dot-ob");
    dots.forEach((dot, index) => {
      dot.classList.toggle("active-ob", index + 1 === onboarding.currentStep);
    });
  },

  complete: () => {
    const onboardingContainer = document.getElementById("onboarding-container");
    const mainContent = document.getElementById("main-content");

    if (!onboarding.settings.theme) onboarding.settings.theme = "light";
    if (!onboarding.settings.fontFamily)
      onboarding.settings.fontFamily = "Inter";
    if (!onboarding.settings.searchEngine)
      onboarding.settings.searchEngine = "google";
    if (!onboarding.settings.userName) onboarding.settings.userName = "User";

    document.body.setAttribute("data-theme", onboarding.settings.theme);
    document.documentElement.style.setProperty(
      "--font-family",
      onboarding.settings.fontFamily,
    );

    Object.entries(onboarding.settings).forEach(([key, value]) => {
      Storage.set(key, value);
    });

    if (!Storage.get("keybinds")) {
      Storage.set("keybinds", {
        settings: { keys: "Shift+S" },
        anonymous: { keys: "Shift+X" },
        theme: { keys: "Shift+T" },
        url: { keys: "Shift+Q", url: "" },
      });
    }

    Storage.set("onboardingComplete", true);
    Storage.set("showWhatsNew", true);
    localStorage.setItem("showWelcomeAfterImport", "true");
    window.location.reload();
  },
};

if (
  onboarding.isComplete() &&
  localStorage.getItem("showWelcomeAfterImport") === "true"
) {
  localStorage.removeItem("showWelcomeAfterImport");
  setTimeout(() => {
    if (typeof notifications !== "undefined") {
      notifications.show("Welcome to your new JSTAR Tab! 🎉", "success");
    }
  }, 500);
}
