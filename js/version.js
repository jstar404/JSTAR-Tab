const versionUrl = "https://tinyurl.com/jstartab";
const manifestVersion = browserAPI.runtime.getManifest().version;

function compareVersions(version1, version2) {
  const v1 = version1.split(".").map(Number);
  const v2 = version2.split(".").map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const diff = (v1[i] || 0) - (v2[i] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

async function checkForUpdate() {
  try {
    const response = await fetch(versionUrl, { cache: "no-store" });
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
      const devEntry = latestData.find((entry) => entry.development === true);

      if (stableEntry) {
        await handleVersionComparison(stableEntry.version, false, false);
      } else {
        updateIconNoData();
      }
      if (devEntry) {
        await handleVersionComparison(devEntry.version, false, true);
      }
    } else {
      await handleVersionComparison(
        latestData.version,
        false,
        latestData.development,
      );
    }
  } catch (error) {
    const cachedResponse = await caches.match(versionUrl);
    if (cachedResponse) {
      const rawCached = await cachedResponse.text();
      let cachedData;
      try {
        cachedData = JSON.parse(rawCached);
      } catch (e) {
        const matches = rawCached.match(/\{[^\}]*\}/g);
        if (matches && matches.length > 0) {
          cachedData = matches
            .map((item) => {
              try {
                return JSON.parse(item);
              } catch (err) {
                return null;
              }
            })
            .filter((item) => item !== null);
        } else {
          updateIconNoData();
          return;
        }
      }

      if (Array.isArray(cachedData)) {
        cachedData.sort((a, b) => compareVersions(b.version, a.version));
        const stableEntry = cachedData.find((e) => e.development === false);
        const devEntry = cachedData.find((e) => e.development === true);
        if (stableEntry) {
          await handleVersionComparison(stableEntry.version, true, false);
        } else {
          updateIconNoData();
        }
        if (devEntry)
          await handleVersionComparison(devEntry.version, true, true);
      } else {
        await handleVersionComparison(
          cachedData.version,
          true,
          cachedData.development,
        );
      }
    } else {
      updateIconNoData();
    }
  }
}

async function handleVersionComparison(
  latestVersion,
  isCached = false,
  isDevelopment = false,
) {
  latestVersion = latestVersion.trim();
  const comparison = compareVersions(latestVersion, manifestVersion);

  if (!isDevelopment) {
    updateVersionIcon(comparison, latestVersion);
  }

  const devModeEnabled = (await Storage.get("developerMode")) === true;
  const updateAlertsPref = await Storage.get("updateAlerts");
  const updateAlertsEnabled =
    updateAlertsPref !== false && updateAlertsPref !== "false";

  const alertMessage =
    `New version ${latestVersion} available! ` +
    `<a href="https://github.com/jstar404/JSTAR-Tab/releases/${latestVersion}" ` +
    `target="_blank" style="color: #2196F3;">Update now</a>`;

  if (isDevelopment && !devModeEnabled) {
    return;
  }

  if (isDevelopment && devModeEnabled) {
    if (comparison > 0) {
      notifications.show(`DEV NOTIF: ${alertMessage}`, "info");
    }
    return;
  }

  if (comparison > 0 && updateAlertsEnabled) {
    if (isCached) {
      notifications.show(
        `${alertMessage} (Showing cached version)`,
        "info",
        8000,
      );
    } else {
      notifications.show(alertMessage, "info");
    }
  }
}

function updateIconNoData() {
  updateVersionIcon(null, "");
}

function updateVersionIcon(versionComparison, latestVersion) {
  const versionIcon = document.getElementById("version-icon");
  if (!versionIcon) return;

  versionIcon.className = "version-icon fas";
  versionIcon.style.color = "";
  versionIcon.removeAttribute("title");

  if (typeof latestVersion !== "string") {
    latestVersion = "";
  } else {
    latestVersion = latestVersion.trim();
  }

  if (versionComparison === 0) {
    versionIcon.classList.add("fa-check-circle");
    versionIcon.style.color = "#4caf50";
    versionIcon.title = "You’re up to date! Enjoy the latest features.";
  } else if (versionComparison > 0) {
    versionIcon.classList.add("fa-exclamation-circle");
    versionIcon.style.color = "#ff9800";
    versionIcon.title = `A newer version (${latestVersion}) is available! Don’t miss out on the new goodies.`;
  } else if (versionComparison < 0) {
    versionIcon.classList.add("fa-question-circle");
    versionIcon.style.color = "#2196f3";
    versionIcon.title =
      "Whoa! You’re ahead of the curve. Are you from the future?";
  } else {
    versionIcon.classList.add("fa-times-circle");
    versionIcon.style.color = "#f44336";
    versionIcon.title =
      "Unable to check the version. Is the internet sleeping?";
  }
}

function showUpdateNotification(latestVersion) {
  const message = `Version ${latestVersion} is available! <a href="https://github.com/jstar404/JSTAR-Tab/releases/${latestVersion}" target="_blank">Update now</a>!`;
  notifications.show(message, "info");
}

checkForUpdate();

document.addEventListener("DOMContentLoaded", () => {
  const version = browserAPI.runtime.getManifest().version;
  const versionElement = document.getElementById("extension-version");
  if (versionElement) {
    versionElement.innerHTML = `JSTAR Tab v<a href="https://github.com/jstar404/JSTAR-Tab/releases/${version}" target="_blank" style="color: inherit;">${version}</a> <span id="version-icon" class="version-icon"></span>`;
  }
});
