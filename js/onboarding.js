const onboarding = {
  currentStep: 1,
  totalSteps: 5,
  settings: {},
  lastNotification: 0,
  isCompleting: false,
  notificationShown: false,

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

  start: () => {
    const onboardingContainer = document.getElementById("onboarding-container");
    const mainContent = document.getElementById("main-content");
    const fileInput = document.getElementById("onboarding-import");

    document.getElementById("notification-container").style.zIndex = "20000";

    if (!onboarding.isComplete()) {
      document.body.style.overflow = "hidden";
      onboardingContainer.classList.remove("hidden");

      onboarding.initProgressDots();
      onboarding.setupEventListeners();

      const theme = Storage.get("theme") || "light";
      document.body.setAttribute("data-theme", theme);

      document.querySelectorAll(".step-ob").forEach((step) => {
        if (step.dataset.step !== "1") {
          step.classList.remove("active-ob");
        }
      });

      const firstStep = document.querySelector('.step-ob[data-step="1"]');
      firstStep.classList.add("active-ob");

      document.getElementById("prev-step").style.visibility = "hidden";

      const nextButton = document.getElementById("next-step");
      nextButton.innerHTML =
        'Next <svg width="24" height="24"><use href="icons.svg#next"></use></svg>';

      if (onboarding.currentStep > 1) {
        nextButton.disabled = true;
        nextButton.classList.add("disabled-ob");
      }

      mainContent.classList.add("hidden");
    } else {
      mainContent.classList.remove("hidden");
    }

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

          Object.entries(data.settings).forEach(([key, value]) => {
            Storage.set(key, value);
          });

          if (encodedMasterPassword) {
            console.log("Onboarding: Processing master password");
            try {
              const decodedPassword = atob(encodedMasterPassword);
              Storage.set("masterPassword", decodedPassword);
            } catch (e) {
              console.error(
                "Onboarding: First password decode attempt failed:",
                e,
              );

              try {
                const decodedPassword = atob(
                  decodeURIComponent(encodedMasterPassword),
                );
                Storage.set("masterPassword", decodedPassword);
              } catch (e2) {
                console.error(
                  "Onboarding: Second password decode attempt failed:",
                  e2,
                );

                try {
                  Storage.set("masterPassword", "");
                } catch (e3) {
                  console.error("Onboarding: Failed to set password:", e3);
                }
              }
            }
          }

          Storage.set("shortcuts", data.shortcuts);

          if (data.keybinds) {
            Storage.set("keybinds", data.keybinds);
          }

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
        }
      }
    });
  },

  setupEventListeners: () => {
    document.querySelectorAll(".option-card-ob").forEach((card) => {
      card.addEventListener("click", () => {
        const step = card.closest(".step-ob");
        const stepNumber = parseInt(step.dataset.step);
        const cards = step.querySelectorAll(".option-card-ob");
        const nextButton = document.getElementById("next-step");

        if (card.dataset.action === "import-data") {
          if (!card.classList.contains("selected-ob")) {
            document.getElementById("onboarding-import").click();
          }
          cards.forEach((c) => c.classList.remove("selected-ob"));
          card.classList.add("selected-ob");
          return;
        }

        cards.forEach((c) => c.classList.remove("selected-ob"));
        card.classList.add("selected-ob");

        card.style.transform = "scale(1.05)";
        setTimeout(() => {
          card.style.transform = "scale(1.02)";
        }, 150);

        nextButton.disabled = false;
        nextButton.classList.remove("disabled-ob");

        if (card.dataset.theme) {
          onboarding.settings.theme = card.dataset.theme;
          document.body.setAttribute("data-theme", card.dataset.theme);

          if (typeof settings !== "undefined" && settings.updateColors) {
            settings.updateColors();
          }

          if (typeof updateLogoBasedOnTheme === "function") {
            updateLogoBasedOnTheme();
          }
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
      if (onboarding.currentStep > 1) {
        onboarding.navigateToStep(onboarding.currentStep - 1);
      }
    });

    document.getElementById("next-step").addEventListener("click", () => {
      let canProceed = true;

      if (onboarding.currentStep === 2 && !onboarding.settings.theme) {
        onboarding.showNotification("Please select a theme!", "error");
        canProceed = false;
      } else if (
        onboarding.currentStep === 3 &&
        !onboarding.settings.fontFamily
      ) {
        onboarding.showNotification("Please select a font!", "error");
        canProceed = false;
      } else if (onboarding.currentStep === 4) {
        const name = document.getElementById("user-name").value.trim();

        if (!name) {
          onboarding.showNotification("Please enter your name!", "error");
          canProceed = false;
        } else {
          onboarding.settings.userName = name;
        }
      } else if (
        onboarding.currentStep === 5 &&
        !onboarding.settings.searchEngine
      ) {
        onboarding.showNotification("Please select a search engine!", "error");
        canProceed = false;
      }

      if (canProceed) {
        if (onboarding.currentStep < onboarding.totalSteps) {
          onboarding.navigateToStep(onboarding.currentStep + 1);
        } else {
          onboarding.isCompleting = true;
          localStorage.setItem("showWelcomeAfterImport", "true");
          onboarding.complete();
        }
      }
    });

    document.querySelectorAll(".step-ob").forEach((step) => {
      if (step.dataset.step !== "1" && step.dataset.step !== "4") {
        const firstOption = step.querySelector(".option-card-ob");
        if (firstOption) {
          setTimeout(() => {
            firstOption.click();
          }, 100);
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
    if (currentStepEl) {
      currentStepEl.classList.remove("active-ob");
    }

    setTimeout(() => {
      const targetStepEl = document.querySelector(
        `.step-ob[data-step="${step}"]`,
      );
      if (targetStepEl) {
        targetStepEl.classList.add("active-ob");
      }

      onboarding.currentStep = step;

      prevButton.style.visibility = step === 1 ? "hidden" : "visible";

      if (step === onboarding.totalSteps) {
        nextButton.innerHTML =
          'Get Started <svg width="24" height="24"><use href="icons.svg#sparkle"></use></svg>';
      } else {
        nextButton.innerHTML =
          'Next <svg width="24" height="24"><use href="icons.svg#next"></use></svg>';
      }

      if (
        (step === 2 && !onboarding.settings.theme) ||
        (step === 3 && !onboarding.settings.fontFamily) ||
        (step === 5 && !onboarding.settings.searchEngine)
      ) {
        nextButton.disabled = true;
        nextButton.classList.add("disabled-ob");
      } else if (step === 4) {
        const name = document.getElementById("user-name").value.trim();
        if (!name) {
          nextButton.disabled = true;
          nextButton.classList.add("disabled-ob");
        } else {
          nextButton.disabled = false;
          nextButton.classList.remove("disabled-ob");
        }
      } else if (step === 1) {
        nextButton.disabled = false;
        nextButton.classList.remove("disabled-ob");
      }

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

    setTimeout(() => {
      window.location.reload();
    }, 500);

    setTimeout(() => {
      onboardingContainer.classList.add("hidden");
      mainContent.classList.remove("hidden");
      document.body.style.overflow = "";

      search.init();
      shortcuts.init();
      settings.init();
      updateGreeting();

      setTimeout(() => {
        if (!onboarding.notificationShown) {
          onboarding.notificationShown = true;
          onboarding.showNotification(
            "Welcome to your new JSTAR Tab! 🎉",
            "success",
          );
        }
      }, 100);
    }, 500);
  },
};

document.addEventListener("DOMContentLoaded", () => {
  onboarding.start();

  if (
    onboarding.isComplete() &&
    localStorage.getItem("showWelcomeAfterImport") === "true"
  ) {
    localStorage.removeItem("showWelcomeAfterImport");
    setTimeout(() => {
      notifications.show("Welcome to your new JSTAR Tab! 🎉", "success");
    }, 500);
  }
});
