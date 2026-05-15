let currentBgImage = null;

document.addEventListener("DOMContentLoaded", () => {
  const MAX_IMAGE_SIZE_MB = 25;
  const MAX_USER_BACKGROUNDS = 10;
  const backgroundUpload = document.getElementById("background-upload");
  const backgroundPreviewGrid = document.getElementById(
    "background-preview-grid",
  );
  const resetBackground = document.getElementById("default-background");

  resetBackground.style.order = "-1";
  backgroundPreviewGrid.prepend(resetBackground);

  const compressImage = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxWidth = 2560;
        const maxHeight = 1440;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
    });
  };

  window.loadBackgrounds = () => {
    try {
      const backgrounds = JSON.parse(Storage.get("backgrounds") || "[]");
      backgrounds.forEach((bg) => {
        if (
          typeof bg === "string" &&
          (bg.startsWith("data:image/") || bg.startsWith("images/backgrounds/"))
        ) {
          addBackgroundPreview(bg, false);
        }
      });
    } catch (e) {
      Storage.set("backgrounds", "[]");
    }
  };

  backgroundUpload.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      notifications.show(
        `File too large (Max ${MAX_IMAGE_SIZE_MB}MB)`,
        "error",
      );
      return;
    }
    const currentBgs = JSON.parse(Storage.get("backgrounds") || "[]");
    if (currentBgs.length >= MAX_USER_BACKGROUNDS) {
      notifications.show("Max background limit reached", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const compressed = await compressImage(e.target.result);
      addBackgroundPreview(compressed, false);
      currentBgs.push(compressed);
      Storage.set("backgrounds", JSON.stringify(currentBgs));
      setCustomBackground(compressed);
      notifications.show("Background uploaded!", "success");
    };
    reader.readAsDataURL(file);
  });

  resetBackground.addEventListener("click", () => {
    document.body.style.backgroundImage = "";
    Storage.remove("customBackground");
    document
      .querySelectorAll(".background-preview")
      .forEach((p) => p.classList.remove("selected"));
    updateGreetingTextColor();
    notifications.show("Background reset", "success");
  });

  function addBackgroundPreview(imageUrl, isPredefined) {
    const preview = document.createElement("div");
    preview.className =
      "background-preview" + (isPredefined ? " predefined" : " custom");
    preview.style.backgroundImage = `url(${imageUrl})`;
    preview.dataset.url = imageUrl;
    if (Storage.get("customBackground") === imageUrl)
      preview.classList.add("selected");
    preview.addEventListener("click", () => setCustomBackground(imageUrl));
    if (!isPredefined) {
      const removeIcon = document.createElement("span");
      removeIcon.className = "remove-icon";
      removeIcon.innerHTML = '<i class="fas fa-times"></i>';
      removeIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        if (preview.classList.contains("selected")) {
          document.body.style.backgroundImage = "";
          Storage.remove("customBackground");
        }
        const bgs = JSON.parse(Storage.get("backgrounds") || "[]");
        Storage.set(
          "backgrounds",
          JSON.stringify(bgs.filter((bg) => bg !== imageUrl)),
        );
        preview.remove();
        updateGreetingTextColor();
      });
      preview.appendChild(removeIcon);
    }
    backgroundPreviewGrid.appendChild(preview);
  }

  function setCustomBackground(imageUrl) {
    document.body.style.backgroundImage = `url(${imageUrl})`;
    Storage.set("customBackground", imageUrl);
    document.querySelectorAll(".background-preview").forEach((p) => {
      p.classList.toggle("selected", p.dataset.url === imageUrl);
    });
    updateGreetingTextColor();
  }

  const predefinedImages = [
    "images/backgrounds/cherry.png",
    "images/backgrounds/mommies.png",
    "images/backgrounds/peachs-castle.png",
    "images/backgrounds/windows-xp.jpg",
  ];
  predefinedImages.forEach((img) => addBackgroundPreview(img, true));
  const saved = Storage.get("customBackground");
  if (saved) document.body.style.backgroundImage = `url(${saved})`;
  loadBackgrounds();
});

function updateGreetingTextColor() {
  const greeting = document.getElementById("greeting");
  if (!greeting) return;

  const mode = Storage.get("greetingColorMode") || "default";
  const customColor = Storage.get("customGreetingColor") || "#FFFFFF";
  const theme = document.body.getAttribute("data-theme");

  if (mode === "custom") {
    greeting.style.color = customColor;
    return;
  }

  if (mode === "default") {
    greeting.style.color = theme === "dark" ? "#ffffff" : "#1a1a1a";
    return;
  }

  const bg = document.body.style.backgroundImage;
  if (!bg || bg === "none") {
    greeting.style.color = theme === "dark" ? "#ffffff" : "#1a1a1a";
    return;
  }

  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const rect = greeting.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const imgRatio = img.width / img.height;
    const winRatio = winW / winH;
    let renderW,
      renderH,
      offsetX = 0,
      offsetY = 0;

    if (imgRatio > winRatio) {
      renderH = winH;
      renderW = winH * imgRatio;
      offsetX = (renderW - winW) / 2;
    } else {
      renderW = winW;
      renderH = winW / imgRatio;
      offsetY = (renderH - winH) / 2;
    }

    const x = (rect.left + offsetX) * (img.width / renderW);
    const y = (rect.top + offsetY) * (img.height / renderH);
    const w = rect.width * (img.width / renderW);
    const h = rect.height * (img.height / renderH);

    canvas.width = 40;
    canvas.height = 40;
    ctx.drawImage(img, x, y, w, h, 0, 0, 40, 40);

    const data = ctx.getImageData(0, 0, 40, 40).data;
    let r = 0,
      g = 0,
      b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const pixels = data.length / 4;
    const lum =
      0.299 * (r / pixels) + 0.587 * (g / pixels) + 0.114 * (b / pixels);
    greeting.style.color = lum > 160 ? "#000000" : "#ffffff";
  };
  img.src = bg.replace(/url\(['"]?(.*?)['"]?\)/, "$1");
}

window.updateGreetingTextColor = updateGreetingTextColor;
