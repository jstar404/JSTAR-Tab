const IconService = {
  FALLBACK_ICON:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCI+PC9jaXJjbGU+PGxpbmUgeDE9IjIiIHkxPSIxMiIgeDI9IjIyIiB5Mj0iMTIiPjwvbGluZT48cGF0aCBkPSJNMTIgMmExNS4zIDE1LjMgMCAwIDEgNCAxMCAxNS4zIDE1LjMgMCAwIDEgLTQgMTBBMTUuMyAxNS4zIDAgMCAxIDggMTIgMTUuMyAxNS4zIDAgMCAxIDEyIDJaIj48L3BhdGg+PC9zdmc+",

  getHostname: (url) => {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return "";
    }
  },

  resolve: (shortcut) => {
    const hostname = IconService.getHostname(shortcut.url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  },

  handleError: (img, shortcut) => {
    if (img.dataset.handlingError === "true") return;
    img.dataset.handlingError = "true";
    img.onerror = null;
    img.src = IconService.FALLBACK_ICON;
    img.style.opacity = "0.6";
  },
};

const shortcuts = {
  MAX_SHORTCUTS: 14,

  validateAndFormatUrl: (url) => {
    if (!url) return false;
    let formatted = url.trim();
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = "https://" + formatted;
    }

    try {
      new URL(formatted);
      return formatted;
    } catch (e) {
      return false;
    }
  },

  add: (url, name, isPasswordProtected = false) => {
    const currentShortcuts = Storage.get("shortcuts") || [];
    const nameInput = document.getElementById("shortcut-name");
    const urlInput = document.getElementById("shortcut-url");

    if (currentShortcuts.length >= shortcuts.MAX_SHORTCUTS) {
      const errorElement = document.getElementById("shortcut-url-error");
      if (errorElement) {
        errorElement.textContent = `You have reached the maximum limit of ${shortcuts.MAX_SHORTCUTS} shortcuts.`;
        errorElement.classList.remove("hidden");
      }
      return false;
    }

    if (!name || name.trim() === "") {
      const nameErrorElement = document.getElementById("shortcut-name-error");
      if (nameErrorElement) {
        nameErrorElement.textContent = "Shortcut name is required.";
        nameErrorElement.classList.remove("hidden");
      }
      if (nameInput) nameInput.focus();
      return false;
    }

    const formattedUrl = shortcuts.validateAndFormatUrl(url);
    if (!formattedUrl) {
      const errorElement = document.getElementById("shortcut-url-error");
      if (errorElement) {
        errorElement.textContent = "Invalid URL format!";
        errorElement.classList.remove("hidden");
      }
      if (urlInput) urlInput.focus();
      return false;
    }

    const domain = shortcuts.extractDomain(formattedUrl);
    const isDomainProtected = shortcuts.isDomainPasswordProtected(domain);

    const newShortcutIndex = currentShortcuts.length;
    currentShortcuts.push({
      url: formattedUrl,
      name: name.trim(),
      isPasswordProtected: isPasswordProtected || isDomainProtected || false,
    });

    if (isPasswordProtected) {
      shortcuts.protectSameDomainShortcuts(domain, newShortcutIndex);
    }

    Storage.set("shortcuts", currentShortcuts);
    shortcuts.render();
    CacheUpdater.update();
    return true;
  },

  remove: (index) => {
    const currentShortcuts = Storage.get("shortcuts") || [];
    const shortcut = currentShortcuts[index];

    if (shortcut.isPasswordProtected) {
      shortcuts.verifyPasswordForAction(() => {
        currentShortcuts.splice(index, 1);
        Storage.set("shortcuts", currentShortcuts);
        shortcuts.render();
        notifications.show("Shortcut removed successfully!", "success");

        if (typeof shortcuts.createShortcutProtectionManager === "function") {
          shortcuts.createShortcutProtectionManager();
        }
      });
    } else {
      currentShortcuts.splice(index, 1);
      Storage.set("shortcuts", currentShortcuts);
      shortcuts.render();
      notifications.show("Shortcut removed successfully!", "success");

      if (typeof shortcuts.createShortcutProtectionManager === "function") {
        shortcuts.createShortcutProtectionManager();
      }
    }
  },

  showConfirmDialog: (title, message, onConfirm) => {
    const dialog = document.getElementById("confirmation-dialog");
    const titleEl = document.getElementById("confirmation-title");
    const messageEl = document.getElementById("confirmation-message");
    const confirmBtn = document.getElementById("confirm-action");
    const cancelBtn = document.getElementById("cancel-action");

    titleEl.textContent = title;
    messageEl.textContent = message;

    dialog.classList.remove("hidden");
    setTimeout(() => dialog.classList.add("active"), 10);

    const closeDialog = () => {
      dialog.classList.remove("active");
      setTimeout(() => dialog.classList.add("hidden"), 300);
    };

    const handleConfirm = () => {
      onConfirm();
      closeDialog();
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
    };

    const handleCancel = () => {
      closeDialog();
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
    };

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
  },

  showPasswordDialog: (shortcut, callback) => {
    const dialog = document.getElementById("password-dialog");
    const passwordInput = document.getElementById("shortcut-password");
    const submitBtn = document.getElementById("submit-password");
    const cancelBtn = document.getElementById("cancel-password");
    const closeBtn = document.getElementById("close-password-dialog");
    const errorMsg = document.getElementById("password-error");
    const contextMenu = document.getElementById("context-menu");

    if (contextMenu) {
      contextMenu.classList.add("hidden");
    }

    if (errorMsg) {
      errorMsg.classList.add("hidden");
    }

    if (passwordInput) {
      passwordInput.value = "";
    }

    if (dialog) {
      dialog.classList.remove("hidden");
      setTimeout(() => {
        dialog.classList.add("active");
        if (passwordInput) {
          passwordInput.focus();
        }
      }, 10);
    }

    const closeDialog = () => {
      dialog.classList.remove("active");
      setTimeout(() => {
        dialog.classList.add("hidden");
        if (passwordInput) passwordInput.value = "";
        if (errorMsg) errorMsg.classList.add("hidden");
      }, 300);
    };

    const handleSubmit = () => {
      const password = passwordInput.value;
      const masterPassword = Storage.get("masterPassword");

      if (!masterPassword) {
        errorMsg.textContent =
          "No master password set. Please set one in settings.";
        errorMsg.classList.remove("hidden");
        return;
      }

      if (password === masterPassword) {
        closeDialog();
        setTimeout(() => {
          callback();
        }, 300);
        submitBtn.removeEventListener("click", handleSubmit);
        cancelBtn.removeEventListener("click", handleCancel);
        closeBtn.removeEventListener("click", handleCancel);
        passwordInput.removeEventListener("keydown", handleKeydown);
      } else {
        errorMsg.textContent = "Incorrect password. Please try again.";
        errorMsg.classList.remove("hidden");
        passwordInput.value = "";
        passwordInput.focus();
      }
    };

    const handleCancel = () => {
      closeDialog();
      submitBtn.removeEventListener("click", handleSubmit);
      cancelBtn.removeEventListener("click", handleCancel);
      closeBtn.removeEventListener("click", handleCancel);
      passwordInput.removeEventListener("keydown", handleKeydown);
    };

    const handleKeydown = (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    };

    submitBtn.addEventListener("click", handleSubmit);
    cancelBtn.addEventListener("click", handleCancel);
    closeBtn.addEventListener("click", handleCancel);
    passwordInput.addEventListener("keydown", handleKeydown);
  },

  edit: (index, url, name, isPasswordProtected) => {
    const currentShortcuts = Storage.get("shortcuts") || [];
    const shortcut = currentShortcuts[index];
    if (!shortcut) return false;

    const originalUrl = shortcut.url;
    const originalDomain = shortcuts.extractDomain(originalUrl);
    const newDomain = shortcuts.extractDomain(url);

    const isDomainProtected = shortcuts.isDomainPasswordProtected(
      newDomain,
      index,
    );
    shortcut.url = url;
    shortcut.name = name;
    shortcut.isPasswordProtected = isPasswordProtected || isDomainProtected;

    if (isPasswordProtected && newDomain !== originalDomain) {
      shortcuts.protectSameDomainShortcuts(newDomain, index);
    }

    Storage.set("shortcuts", currentShortcuts);
    shortcuts.render();
    notifications.show("Shortcut updated successfully!", "success");

    if (typeof shortcuts.createShortcutProtectionManager === "function") {
      shortcuts.createShortcutProtectionManager();
    }

    return true;
  },

  showContextMenu: (e, index) => {
    e.preventDefault();
    const menu = document.getElementById("context-menu");
    const rect = e.target.getBoundingClientRect();

    menu.style.top = `${e.clientY}px`;
    menu.style.left = `${e.clientX}px`;
    menu.classList.remove("hidden");
    menu.dataset.shortcutIndex = index;

    const handleClickOutside = (event) => {
      if (!menu.contains(event.target)) {
        menu.classList.add("hidden");
        document.removeEventListener("click", handleClickOutside);
      }
    };

    setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);
  },

  render: () => {
    const grid = document.getElementById("shortcuts-grid");
    if (!grid) return;
    const currentShortcuts = Storage.get("shortcuts") || [];
    const isAnonymous = Storage.get("anonymousMode") || false;

    grid.innerHTML = "";

    currentShortcuts.forEach((shortcut, index) => {
      if (!shortcut || !shortcut.url) return;

      const element = document.createElement("div");
      element.className = `shortcut ${isAnonymous ? "blurred" : ""} ${shortcut.isPasswordProtected ? "password-protected" : ""}`;

      element.dataset.index = index;

      const icon = document.createElement("img");
      icon.dataset.handlingError = "false";

      icon.src = IconService.resolve(shortcut);

      icon.onerror = () => IconService.handleError(icon, shortcut);

      icon.alt = shortcut.name || "Shortcut";
      icon.draggable = false;

      const name = document.createElement("span");
      name.textContent = shortcut.name || "Unknown";

      element.appendChild(icon);
      element.appendChild(name);

      element.addEventListener("click", (e) => {
        if (
          !grid.classList.contains("grid-draggable") ||
          !e.target.closest(".shortcut").classList.contains("drag-active")
        ) {
          if (shortcut.isPasswordProtected) {
            e.preventDefault();
            e.stopPropagation();

            const openShortcut = () => {
              if (e.ctrlKey || e.which === 2 || e.button === 1) {
                window.open(shortcut.url, "_blank");
              } else {
                window.location.href = shortcut.url;
              }
            };

            shortcuts.showPasswordDialog(shortcut, openShortcut);
            return false;
          } else {
            if (e.ctrlKey || e.which === 2 || e.button === 1) {
              window.open(shortcut.url, "_blank");
            } else {
              window.location.href = shortcut.url;
            }
          }
        }
      });

      element.addEventListener("mousedown", (e) => {
        if (e.button === 1) {
          e.preventDefault();

          if (shortcut.isPasswordProtected) {
            const openShortcut = () => {
              window.open(shortcut.url, "_blank");
            };

            shortcuts.showPasswordDialog(shortcut, openShortcut);
          } else {
            window.open(shortcut.url, "_blank");
          }
        }
      });

      element.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const menu = document.getElementById("context-menu");

        menu.style.top = `${e.pageY}px`;
        menu.style.left = `${e.pageX}px`;
        menu.classList.remove("hidden");
        menu.dataset.shortcutIndex = index;

        const closeMenu = (event) => {
          if (!menu.contains(event.target)) {
            menu.classList.add("hidden");
            document.removeEventListener("click", closeMenu);
          }
        };

        setTimeout(() => {
          document.addEventListener("click", closeMenu);
        }, 0);
      });

      grid.appendChild(element);
    });
  },

  init: () => {
    if (Storage.get("hideLockIcon")) {
      document.body.classList.add("hide-lock-icons");
    }

    const masterPasswordInput = document.getElementById("master-password");
    if (masterPasswordInput) {
      const savedPassword = Storage.get("masterPassword");
      if (savedPassword) {
        masterPasswordInput.value = savedPassword;
      }
    }

    const addShortcutButton = document.getElementById("add-shortcut");
    const modal = document.getElementById("add-shortcut-modal");
    const closeBtn = modal.querySelector(".close-modal");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.classList.remove("active");
        setTimeout(() => {
          modal.classList.add("hidden");
          document.getElementById("shortcut-url").value = "";
          document.getElementById("shortcut-name").value = "";
        }, 300);
      });
    }

    if (addShortcutButton) {
      addShortcutButton.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentShortcuts = Storage.get("shortcuts") || [];

        if (currentShortcuts.length >= shortcuts.MAX_SHORTCUTS) {
          const errorElement = document.getElementById("shortcut-url-error");
          if (errorElement) {
            errorElement.textContent = `You have reached the maximum limit of ${shortcuts.MAX_SHORTCUTS} shortcuts.`;
            errorElement.classList.remove("hidden");
          }
          return;
        }

        const contextMenu = document.getElementById("context-menu");
        if (contextMenu) {
          contextMenu.classList.add("hidden");
        }

        shortcuts.showAddShortcutModal();
      });
    }

    const anonymousTogglePrivacy = document.getElementById(
      "toggle-anonymous-privacy",
    );
    if (anonymousTogglePrivacy) {
      anonymousTogglePrivacy.checked = Storage.get("anonymousMode") || false;

      anonymousTogglePrivacy.addEventListener("change", () => {
        const anonymousToggle = document.getElementById("toggle-anonymous");
        if (anonymousToggle) {
          anonymousToggle.checked = anonymousTogglePrivacy.checked;
          anonymousToggle.dispatchEvent(new Event("change"));
        } else {
          shortcuts.toggleAnonymousMode();
        }
      });
    }

    const shortcutsPasswordToggle = document.getElementById(
      "toggle-shortcuts-password",
    );
    if (shortcutsPasswordToggle) {
      const isEnabled = Storage.get("passwordProtectionEnabled") || false;
      shortcutsPasswordToggle.checked = isEnabled;
      const passwordSettings = document.getElementById(
        "password-protection-settings",
      );

      if (passwordSettings) {
        if (isEnabled) {
          passwordSettings.classList.remove("hidden");
        } else {
          passwordSettings.classList.add("hidden");
        }
      }

      shortcutsPasswordToggle.addEventListener("change", () => {
        const isEnabled = shortcutsPasswordToggle.checked;
        Storage.set("passwordProtectionEnabled", isEnabled);

        if (passwordSettings) {
          if (isEnabled) {
            passwordSettings.classList.remove("hidden");
            const masterPasswordInput =
              document.getElementById("master-password");
            if (masterPasswordInput) {
              setTimeout(() => {
                masterPasswordInput.focus();
              }, 10);
            }
          } else {
            passwordSettings.classList.add("hidden");
          }
        }

        shortcuts.updateAddShortcutModal();

        if (isEnabled) {
          const masterPassword = Storage.get("masterPassword");

          if (!masterPassword) {
            const masterPasswordInput =
              document.getElementById("master-password");
            if (masterPasswordInput) {
              masterPasswordInput.focus();
              notifications.show("Please set a master password!", "warning");
            }
          } else {
            notifications.show("Password protection enabled!", "success");
            shortcuts.createShortcutProtectionManager();
          }
        } else {
          const currentShortcuts = Storage.get("shortcuts") || [];
          currentShortcuts.forEach((shortcut) => {
            shortcut.isPasswordProtected = false;
          });
          Storage.set("shortcuts", currentShortcuts);
          shortcuts.render();

          notifications.show("Password protection disabled!", "info");
        }
      });
    }

    if (Storage.get("passwordProtectionEnabled")) {
      shortcuts.createShortcutProtectionManager();
    }

    const hideLockIconToggle = document.getElementById("toggle-hide-lock-icon");
    if (hideLockIconToggle) {
      const isHideLockIcon = Storage.get("hideLockIcon") || false;
      hideLockIconToggle.checked = isHideLockIcon;

      if (isHideLockIcon) {
        document.body.classList.add("hide-lock-icons");
      } else {
        document.body.classList.remove("hide-lock-icons");
      }

      hideLockIconToggle.addEventListener("change", () => {
        const isHideLockIcon = hideLockIconToggle.checked;
        Storage.set("hideLockIcon", isHideLockIcon);

        if (isHideLockIcon) {
          document.body.classList.add("hide-lock-icons");
        } else {
          document.body.classList.remove("hide-lock-icons");
        }
      });
    }

    const saveMasterPasswordBtn = document.getElementById(
      "save-master-password",
    );
    if (saveMasterPasswordBtn) {
      saveMasterPasswordBtn.addEventListener("click", () => {
        const masterPasswordInput = document.getElementById("master-password");
        if (masterPasswordInput) {
          const password = masterPasswordInput.value.trim();

          if (password) {
            Storage.set("masterPassword", password);

            notifications.show("Master password updated!", "success");

            const shortcutsPasswordToggle = document.getElementById(
              "toggle-shortcuts-password",
            );
            if (shortcutsPasswordToggle && !shortcutsPasswordToggle.checked) {
              shortcutsPasswordToggle.checked = true;
              Storage.set("passwordProtectionEnabled", true);
              const passwordSettings = document.getElementById(
                "password-protection-settings",
              );
              if (passwordSettings) {
                passwordSettings.classList.remove("hidden");
              }
              shortcuts.updateAddShortcutModal();

              shortcuts.createShortcutProtectionManager();
            } else {
              shortcuts.createShortcutProtectionManager();
            }
          } else {
            notifications.show("Please enter a valid password!", "error");
            masterPasswordInput.focus();
          }
        }
      });
    }

    shortcuts.updateAddShortcutModal();
    shortcuts.updateEditShortcutModal();

    const contextMenu = document.getElementById("context-menu");
    if (contextMenu) {
      contextMenu.addEventListener("click", (e) => {
        const action = e.target.closest(".context-menu-item")?.dataset.action;
        const index = parseInt(contextMenu.dataset.shortcutIndex);

        contextMenu.classList.add("hidden");

        if (action === "edit") {
          const currentShortcuts = Storage.get("shortcuts") || [];
          const shortcut = currentShortcuts[index];
          const modal = document.getElementById("edit-shortcut-modal");

          if (modal) {
            const urlInput = document.getElementById("edit-shortcut-url");
            const nameInput = document.getElementById("edit-shortcut-name");
            const nameErrorElement = document.getElementById(
              "edit-shortcut-name-error",
            );
            const urlErrorElement = document.getElementById(
              "edit-shortcut-url-error",
            );

            if (nameErrorElement) nameErrorElement.classList.add("hidden");
            if (urlErrorElement) urlErrorElement.classList.add("hidden");

            urlInput.value = shortcut.url;
            nameInput.value = shortcut.name;

            shortcuts.updateEditShortcutModal();

            const protectCheckbox = document.getElementById(
              "protect-edit-shortcut",
            );
            if (protectCheckbox) {
              protectCheckbox.checked = shortcut.isPasswordProtected || false;
            }

            modal.classList.remove("hidden");
            setTimeout(() => {
              modal.classList.add("active");
              if (nameInput) {
                nameInput.focus();
                const len = nameInput.value.length;
                nameInput.setSelectionRange(len, len);
              }
            }, 100);

            const saveButton = document.getElementById("save-edit-shortcut");
            const closeButton = document.getElementById("close-edit-shortcut");
            const cancelButton = document.getElementById(
              "cancel-edit-shortcut",
            );

            const closeModal = () => {
              modal.classList.remove("active");
              setTimeout(() => {
                modal.classList.add("hidden");
              }, 300);
            };

            const handleSave = () => {
              const newUrl = urlInput.value.trim();
              const newName = nameInput.value.trim();

              if (nameErrorElement) nameErrorElement.classList.add("hidden");
              if (urlErrorElement) urlErrorElement.classList.add("hidden");

              if (!newName && nameErrorElement) {
                nameErrorElement.textContent = "Shortcut name is required.";
                nameErrorElement.classList.remove("hidden");
                nameInput.focus();
                return;
              }

              if (!newUrl && urlErrorElement) {
                urlErrorElement.textContent = "Shortcut URL is required.";
                urlErrorElement.classList.remove("hidden");
                urlInput.focus();
                return;
              }

              const formattedUrl = shortcuts.validateAndFormatUrl(newUrl);
              if (!formattedUrl && urlErrorElement) {
                urlErrorElement.textContent = "Invalid URL format!";
                urlErrorElement.classList.remove("hidden");
                urlInput.focus();
                return;
              }

              const domain = shortcuts.extractDomain(formattedUrl);
              const isDomainProtected = shortcuts.isDomainPasswordProtected(
                domain,
                index,
              );

              const isPasswordProtectionEnabled =
                Storage.get("passwordProtectionEnabled") || false;
              const isPasswordProtected =
                isPasswordProtectionEnabled &&
                protectCheckbox &&
                protectCheckbox.checked;

              if (isDomainProtected && !isPasswordProtected) {
                if (urlErrorElement) {
                  urlErrorElement.textContent = `This domain (${domain}) already has password protected shortcuts. All shortcuts for this domain must be password protected.`;
                  urlErrorElement.classList.remove("hidden");
                  urlInput.focus();
                }

                if (protectCheckbox && isPasswordProtectionEnabled) {
                  protectCheckbox.checked = true;
                }
                return;
              }

              if (shortcut.isPasswordProtected && !isPasswordProtected) {
                closeModal();
                shortcuts.verifyPasswordForAction(() => {
                  const success = shortcuts.edit(
                    index,
                    formattedUrl,
                    newName,
                    isPasswordProtected,
                  );
                  if (success) {
                    shortcuts.createShortcutProtectionManager();
                  }
                });
              } else if (shortcut.isPasswordProtected) {
                closeModal();
                shortcuts.verifyPasswordForAction(() => {
                  const success = shortcuts.edit(
                    index,
                    formattedUrl,
                    newName,
                    isPasswordProtected,
                  );
                  if (success) {
                    shortcuts.createShortcutProtectionManager();
                  }
                });
              } else {
                const success = shortcuts.edit(
                  index,
                  formattedUrl,
                  newName,
                  isPasswordProtected,
                );
                if (success) {
                  closeModal();
                  shortcuts.createShortcutProtectionManager();
                }
              }
            };

            saveButton.onclick = handleSave;
            closeButton.onclick = closeModal;
            cancelButton.addEventListener("click", closeModal);
          }
        } else if (action === "delete") {
          const currentShortcuts = Storage.get("shortcuts") || [];
          const shortcut = currentShortcuts[index];

          shortcuts.showConfirmDialog(
            "Delete Shortcut",
            `Are you sure you want to delete "${shortcut.name}"?`,
            () => {
              shortcuts.remove(index);
              shortcuts.createShortcutProtectionManager();
            },
          );
        } else if (action === "open-new-tab") {
          const currentShortcuts = Storage.get("shortcuts") || [];
          const shortcut = currentShortcuts[index];

          if (shortcut && shortcut.url) {
            if (shortcut.isPasswordProtected) {
              shortcuts.showPasswordDialog(shortcut, () => {
                window.open(shortcut.url, "_blank");
              });
            } else {
              window.open(shortcut.url, "_blank");
            }
          }
        }

        contextMenu.classList.add("hidden");
      });
    }

    shortcuts.render();
  },

  showAddShortcutModal: () => {
    const modal = document.getElementById("add-shortcut-modal");
    if (modal) {
      const nameErrorElement = document.getElementById("shortcut-name-error");
      const urlErrorElement = document.getElementById("shortcut-url-error");
      if (nameErrorElement) nameErrorElement.classList.add("hidden");
      if (urlErrorElement) urlErrorElement.classList.add("hidden");

      const contextMenu = document.getElementById("context-menu");
      if (contextMenu) {
        contextMenu.classList.add("hidden");
      }

      modal.classList.remove("hidden");
      const nameInput = document.getElementById("shortcut-name");
      setTimeout(() => {
        modal.classList.add("active");
        if (nameInput) {
          nameInput.focus();
        }
      }, 100);

      const urlInput = document.getElementById("shortcut-url");

      const saveShortcutButton = document.getElementById("save-shortcut");
      if (saveShortcutButton) {
        saveShortcutButton.onclick = () => {
          const url = urlInput.value.trim();
          const name = nameInput.value.trim();

          if (nameErrorElement) nameErrorElement.classList.add("hidden");
          if (urlErrorElement) urlErrorElement.classList.add("hidden");

          if (!name && nameErrorElement) {
            nameErrorElement.textContent = "Shortcut name is required.";
            nameErrorElement.classList.remove("hidden");
            nameInput.focus();
            return;
          }

          if (!url && urlErrorElement) {
            urlErrorElement.textContent = "Shortcut URL is required.";
            urlErrorElement.classList.remove("hidden");
            urlInput.focus();
            return;
          }

          let formattedUrl;
          try {
            formattedUrl = shortcuts.validateAndFormatUrl(url);
            if (!formattedUrl && urlErrorElement) {
              urlErrorElement.textContent = "Invalid URL format!";
              urlErrorElement.classList.remove("hidden");
              urlInput.focus();
              return;
            }
          } catch (e) {
            if (urlErrorElement) {
              urlErrorElement.textContent = "Invalid URL format!";
              urlErrorElement.classList.remove("hidden");
            }
            return;
          }

          const domain = shortcuts.extractDomain(formattedUrl);
          const isDomainProtected = shortcuts.isDomainPasswordProtected(domain);

          const isPasswordProtectionEnabled =
            Storage.get("passwordProtectionEnabled") || false;
          const passwordProtectCheckbox = document.getElementById(
            "protect-shortcut-edit",
          );
          const isPasswordProtected =
            isPasswordProtectionEnabled &&
            passwordProtectCheckbox &&
            passwordProtectCheckbox.checked;

          if (isDomainProtected && !isPasswordProtected) {
            if (urlErrorElement) {
              urlErrorElement.textContent = `This domain (${domain}) already has password protected shortcuts. All shortcuts for this domain must be password protected.`;
              urlErrorElement.classList.remove("hidden");
              urlInput.focus();
            }

            if (passwordProtectCheckbox && isPasswordProtectionEnabled) {
              passwordProtectCheckbox.checked = true;
            }
            return;
          }

          shortcuts.add(url, name, isPasswordProtected);
          modal.classList.remove("active");
          setTimeout(() => {
            modal.classList.add("hidden");
            urlInput.value = "";
            nameInput.value = "";
            if (passwordProtectCheckbox)
              passwordProtectCheckbox.checked = false;
          }, 300);
        };
      }

      const cancelButton = document.getElementById("cancel-shortcut");
      if (cancelButton) {
        cancelButton.onclick = () => {
          modal.classList.remove("active");
          setTimeout(() => {
            modal.classList.add("hidden");
            if (nameErrorElement) nameErrorElement.classList.add("hidden");
            if (urlErrorElement) urlErrorElement.classList.add("hidden");
          }, 300);
        };
      }
    }
  },

  createShortcutProtectionManager: () => {
    const passwordSettings = document.getElementById(
      "password-protection-settings",
    );
    if (!passwordSettings) return;

    let protectionManager = document.getElementById(
      "shortcut-protection-manager",
    );
    if (!protectionManager) {
      protectionManager = document.createElement("div");
      protectionManager.id = "shortcut-protection-manager";
      protectionManager.className = "shortcut-protection-manager";

      const managerTitle = document.createElement("h4");
      managerTitle.textContent = "Protect Specific Shortcuts";

      const managerDescription = document.createElement("p");
      managerDescription.className = "setting-description";
      managerDescription.textContent =
        "Select which shortcuts to password protect:";

      protectionManager.appendChild(managerTitle);
      protectionManager.appendChild(managerDescription);

      passwordSettings.appendChild(protectionManager);
    } else {
      const children = Array.from(protectionManager.children);
      children.forEach((child, index) => {
        if (index > 1) protectionManager.removeChild(child);
      });
    }

    const currentShortcuts = Storage.get("shortcuts") || [];

    const selectedShortcutsContainer = document.createElement("div");
    selectedShortcutsContainer.className = "selected-shortcuts-container";

    const protectedShortcuts = currentShortcuts.filter(
      (shortcut) => shortcut.isPasswordProtected,
    );

    if (protectedShortcuts.length > 0) {
      protectedShortcuts.forEach((shortcut, index) => {
        const shortcutChip = document.createElement("div");
        shortcutChip.className = "shortcut-chip";
        shortcutChip.dataset.index = currentShortcuts.indexOf(shortcut);

        const shortcutIcon = document.createElement("img");
        shortcutIcon.dataset.attempt = "0";
        shortcutIcon.dataset.handlingError = "false";
        shortcutIcon.src = IconService.resolve(shortcut);

        shortcutIcon.onerror = () =>
          IconService.handleError(shortcutIcon, shortcut);

        shortcutIcon.alt = shortcut.name || "Shortcut";

        const shortcutName = document.createElement("span");
        shortcutName.textContent = shortcut.name || "Unknown";

        const removeButton = document.createElement("button");
        removeButton.className = "remove-chip-btn";
        removeButton.innerHTML = "&times;";
        removeButton.title = "Remove protection";

        shortcutChip.appendChild(shortcutIcon);
        shortcutChip.appendChild(shortcutName);
        shortcutChip.appendChild(removeButton);

        removeButton.addEventListener("click", (e) => {
          e.stopPropagation();
          shortcuts.verifyPasswordForAction(() => {
            currentShortcuts[shortcutChip.dataset.index].isPasswordProtected =
              false;
            Storage.set("shortcuts", currentShortcuts);

            shortcuts.render();
            shortcuts.createShortcutProtectionManager();

            notifications.show(
              `Removed protection from: ${shortcut.name}`,
              "info",
            );
          });
        });

        selectedShortcutsContainer.appendChild(shortcutChip);
      });
    } else if (currentShortcuts.length > 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-protection-state";
      emptyState.textContent = "No protected shortcuts yet.";
      selectedShortcutsContainer.appendChild(emptyState);
    }

    protectionManager.appendChild(selectedShortcutsContainer);

    const selectorContainer = document.createElement("div");
    selectorContainer.className = "shortcut-selector-container";

    const unprotectedShortcuts = currentShortcuts.filter(
      (shortcut) => !shortcut.isPasswordProtected,
    );

    if (unprotectedShortcuts.length > 0) {
      const dropdown = document.createElement("div");
      dropdown.className = "shortcut-dropdown";

      const selected = document.createElement("div");
      selected.className = "shortcut-dropdown-selected";
      selected.textContent = "Select a shortcut to protect...";

      const dropdownItems = document.createElement("div");
      dropdownItems.className = "shortcut-dropdown-items";
      dropdownItems.classList.add("hidden");

      unprotectedShortcuts.forEach((shortcut) => {
        const item = document.createElement("div");
        item.className = "shortcut-dropdown-item";
        item.dataset.index = currentShortcuts.indexOf(shortcut);

        const icon = document.createElement("img");
        icon.dataset.attempt = "0";
        icon.dataset.handlingError = "false";
        icon.src = IconService.resolve(shortcut);

        icon.onerror = () => IconService.handleError(icon, shortcut);

        icon.alt = shortcut.name || "Shortcut";
        icon.style.width = "16px";
        icon.style.height = "16px";

        const name = document.createElement("span");
        name.textContent = shortcut.name || "Unknown";

        item.appendChild(icon);
        item.appendChild(name);

        item.addEventListener("click", () => {
          currentShortcuts[item.dataset.index].isPasswordProtected = true;
          Storage.set("shortcuts", currentShortcuts);

          shortcuts.render();
          shortcuts.createShortcutProtectionManager();

          dropdownItems.classList.remove("active");
          selected.classList.remove("active");
          dropdownItems.classList.add("hidden");

          notifications.show(`Protected shortcut: ${shortcut.name}`, "success");
        });

        dropdownItems.appendChild(item);
      });

      selected.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownItems.classList.toggle("hidden");
        dropdownItems.classList.toggle("active");
        selected.classList.toggle("active");
      });

      document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target)) {
          dropdownItems.classList.add("hidden");
          dropdownItems.classList.remove("active");
          selected.classList.remove("active");
        }
      });

      dropdown.appendChild(selected);
      dropdown.appendChild(dropdownItems);
      selectorContainer.appendChild(dropdown);
    } else if (currentShortcuts.length === 0) {
      const noShortcutsMessage = document.createElement("p");
      noShortcutsMessage.className = "no-shortcuts-message";
      noShortcutsMessage.textContent =
        "Add shortcuts to protect them with a password.";
      selectorContainer.appendChild(noShortcutsMessage);
    } else {
      const allProtectedMessage = document.createElement("p");
      allProtectedMessage.className = "empty-protection-state";
      allProtectedMessage.textContent = "All shortcuts are password protected.";
      selectorContainer.appendChild(allProtectedMessage);
    }

    protectionManager.appendChild(selectorContainer);
  },

  verifyPasswordForAction: (actionCallback) => {
    const dialog = document.getElementById("password-dialog");
    const passwordInput = document.getElementById("shortcut-password");
    const submitBtn = document.getElementById("submit-password");
    const cancelBtn = document.getElementById("cancel-password");
    const closeBtn = document.getElementById("close-password-dialog");
    const errorMsg = document.getElementById("password-error");

    if (errorMsg) {
      errorMsg.classList.add("hidden");
    }

    if (passwordInput) {
      passwordInput.value = "";
    }

    dialog.classList.remove("hidden");
    setTimeout(() => {
      dialog.classList.add("active");
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 10);

    const closeDialog = () => {
      dialog.classList.remove("active");
      setTimeout(() => {
        dialog.classList.add("hidden");
        if (passwordInput) passwordInput.value = "";
        if (errorMsg) errorMsg.classList.add("hidden");
      }, 300);
    };

    const handleSubmit = () => {
      const password = passwordInput.value;
      const masterPassword = Storage.get("masterPassword");

      if (!masterPassword) {
        errorMsg.textContent =
          "No master password set. Please set one in settings.";
        errorMsg.classList.remove("hidden");
        return;
      }

      if (password === masterPassword) {
        closeDialog();
        setTimeout(() => {
          actionCallback();
        }, 300);
        submitBtn.removeEventListener("click", handleSubmit);
        cancelBtn.removeEventListener("click", handleCancel);
        closeBtn.removeEventListener("click", handleCancel);
        passwordInput.removeEventListener("keydown", handleKeydown);
      } else {
        errorMsg.textContent = "Incorrect password. Please try again.";
        errorMsg.classList.remove("hidden");
        passwordInput.value = "";
        passwordInput.focus();
      }
    };

    const handleCancel = () => {
      closeDialog();
      submitBtn.removeEventListener("click", handleSubmit);
      cancelBtn.removeEventListener("click", handleCancel);
      closeBtn.removeEventListener("click", handleCancel);
      passwordInput.removeEventListener("keydown", handleKeydown);
    };

    const handleKeydown = (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    };

    submitBtn.addEventListener("click", handleSubmit);
    cancelBtn.addEventListener("click", handleCancel);
    closeBtn.addEventListener("click", handleCancel);
    passwordInput.addEventListener("keydown", handleKeydown);
  },

  updateAddShortcutModal: () => {
    const modal = document.getElementById("add-shortcut-modal");
    if (!modal) return;

    const modalContent = modal.querySelector(".add-shortcut-modal-content");
    if (!modalContent) return;

    const existingCheckbox = document.getElementById(
      "protect-shortcut-container",
    );
    if (existingCheckbox) {
      existingCheckbox.remove();
    }

    const checkboxContainer = document.createElement("div");
    checkboxContainer.id = "protect-shortcut-container";
    checkboxContainer.className = "shortcut-protect-toggle";
    checkboxContainer.innerHTML = `
            <div class="toggle-label-container">
                <label class="shortcut-protect-toggle-label" for="protect-shortcut-edit">Password protect this shortcut</label>
            </div>
            <div class="toggle-switch-container">
                <span class="shortcut-protect-switch">
                    <input type="checkbox" id="protect-shortcut-edit">
                    <span class="shortcut-protect-slider"></span>
                </span>
            </div>
        `;

    const modalActions = modal.querySelector(".modal-actions");
    if (modalActions && modalActions.parentNode === modalContent) {
      modalContent.insertBefore(checkboxContainer, modalActions);
    } else {
      modalContent.appendChild(checkboxContainer);
    }

    const protectCheckbox = document.getElementById("protect-shortcut-edit");
    if (protectCheckbox) {
      protectCheckbox.checked = false;
    }
  },

  updateEditShortcutModal: () => {
    const modal = document.getElementById("edit-shortcut-modal");
    if (!modal) return;

    const modalContent = modal.querySelector(".edit-shortcut-modal-content");
    if (!modalContent) return;

    const existingCheckbox = document.getElementById(
      "protect-edit-shortcut-container",
    );
    if (existingCheckbox) {
      existingCheckbox.remove();
    }

    const checkboxContainer = document.createElement("div");
    checkboxContainer.id = "protect-edit-shortcut-container";
    checkboxContainer.className = "shortcut-protect-toggle";
    checkboxContainer.innerHTML = `
            <div class="toggle-label-container">
                <label class="shortcut-protect-toggle-label" for="protect-edit-shortcut">Password protect this shortcut</label>
            </div>
            <div class="toggle-switch-container">
                <span class="shortcut-protect-switch">
                    <input type="checkbox" id="protect-edit-shortcut">
                    <span class="shortcut-protect-slider"></span>
                </span>
            </div>
        `;

    const modalActions = modal.querySelector(".modal-actions");
    if (modalActions) {
      modalContent.insertBefore(checkboxContainer, modalActions);
    } else {
      modalContent.appendChild(checkboxContainer);
    }
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

  extractDomain: (url) => {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;

      const parts = hostname.split(".");
      if (parts.length > 2) {
        const lastTwo = parts.slice(-2).join(".");
        if (
          (lastTwo === "co." || lastTwo === "com." || lastTwo === "net.") &&
          parts.length > 3
        ) {
          return parts.slice(-3).join(".");
        }
        return parts.slice(-2).join(".");
      }
      return hostname;
    } catch (e) {
      return null;
    }
  },

  isRelatedToProtectedDomain: (domain, excludeIndex = -1) => {
    if (!domain) return false;

    const currentShortcuts = Storage.get("shortcuts") || [];
    return currentShortcuts.some((shortcut, index) => {
      if (index === excludeIndex) return false;

      if (!shortcut.isPasswordProtected) return false;

      const shortcutDomain = shortcuts.extractDomain(shortcut.url);
      if (!shortcutDomain) return false;

      return (
        domain === shortcutDomain ||
        domain.endsWith("." + shortcutDomain) ||
        shortcutDomain.endsWith("." + domain)
      );
    });
  },

  isDomainPasswordProtected: (domain, excludeIndex = -1) => {
    return shortcuts.isRelatedToProtectedDomain(domain, excludeIndex);
  },

  protectSameDomainShortcuts: (domain, excludeIndex = -1) => {
    if (!domain) return 0;

    const currentShortcuts = Storage.get("shortcuts") || [];
    let protectedCount = 0;

    currentShortcuts.forEach((shortcut, index) => {
      if (index === excludeIndex) return;
      if (shortcut.isPasswordProtected) return;

      const shortcutDomain = shortcuts.extractDomain(shortcut.url);
      if (!shortcutDomain) return;

      if (
        domain === shortcutDomain ||
        domain.endsWith("." + shortcutDomain) ||
        shortcutDomain.endsWith("." + domain)
      ) {
        shortcut.isPasswordProtected = true;
        protectedCount++;
      }
    });

    if (protectedCount > 0) {
      Storage.set("shortcuts", currentShortcuts);
      shortcuts.render();
      notifications.show(
        `Protected ${protectedCount} additional shortcut(s) with the same domain or subdomains`,
        "info",
      );
    }

    return protectedCount;
  },
};
