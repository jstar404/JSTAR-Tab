class NotificationSystem {
  constructor() {
    this.container = document.getElementById("notification-container");
    this.notifications = new Map();
    this.allPaused = false;
  }

  show(message, type = "info", duration = 5000) {
    for (let [id, notif] of this.notifications) {
      if (
        notif.element.querySelector(".notification-content").innerHTML ===
          message &&
        notif.element.classList.contains(`notification-${type}`)
      ) {
        return id;
      }
    }

    const id = Date.now().toString();
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;

    const icon = this.createIcon(type);
    const content = this.createContent(message);
    const closeBtn = this.createCloseButton(id);
    const progress = this.createProgressBar(type);

    notification.appendChild(icon);
    notification.appendChild(content);
    notification.appendChild(closeBtn);
    notification.appendChild(progress);

    this.container.appendChild(notification);

    let timeoutId = setTimeout(() => this.remove(id), duration);

    this.notifications.set(id, {
      element: notification,
      duration,
      timeoutId,
      startTime: Date.now(),
      elapsed: 0,
      paused: false,
    });

    this.updateProgress(id);

    notification.addEventListener("mouseenter", () => {
      this.pauseAll();
    });

    notification.addEventListener("mouseleave", () => {
      this.resumeAll();
    });

    return id;
  }

  remove(id) {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.element.style.animation =
        "slideOutRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
      setTimeout(() => {
        notification.element.remove();
        this.notifications.delete(id);
      }, 300);
    }
  }

  pauseAll() {
    this.allPaused = true;
    for (let [id, notification] of this.notifications) {
      if (!notification.paused) {
        notification.paused = true;
        notification.elapsed = Date.now() - notification.startTime;
        clearTimeout(notification.timeoutId);
      }
    }
  }

  resumeAll() {
    this.allPaused = false;
    for (let [id, notification] of this.notifications) {
      if (notification.paused) {
        notification.paused = false;
        notification.startTime = Date.now() - notification.elapsed;
        const remainingTime = notification.duration - notification.elapsed;
        notification.timeoutId = setTimeout(
          () => this.remove(id),
          remainingTime,
        );
      }
    }
  }

  updateProgress(id) {
    const notification = this.notifications.get(id);
    if (notification) {
      const progress = notification.element.querySelector(
        ".notification-progress",
      );

      const update = () => {
        if (this.allPaused || notification.paused) {
          requestAnimationFrame(update);
          return;
        }

        const elapsed = Date.now() - notification.startTime;
        const percent = 100 - (elapsed / notification.duration) * 100;

        if (percent > 0) {
          progress.style.width = `${percent}%`;
          requestAnimationFrame(update);
        } else {
          this.remove(id);
        }
      };

      requestAnimationFrame(update);
    }
  }

  createIcon(type) {
    const icon = document.createElement("i");
    switch (type) {
      case "success":
        icon.className = "fas fa-check-circle";
        icon.style.color = "var(--success-color, #4caf50)";
        break;
      case "error":
        icon.className = "fas fa-times-circle";
        icon.style.color = "var(--error-color, #f44336)";
        break;
      case "warning":
        icon.className = "fas fa-exclamation-triangle";
        icon.style.color = "var(--warning-color, #ff9800)";
        break;
      case "info":
      default:
        icon.className = "fas fa-info-circle";
        icon.style.color = "var(--info-color, #2196f3)";
        break;
    }
    return icon;
  }

  createContent(message) {
    const content = document.createElement("div");
    content.className = "notification-content";
    content.innerHTML = message;
    return content;
  }

  createCloseButton(id) {
    const closeBtn = document.createElement("button");
    closeBtn.className = "notification-close";
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = () => this.remove(id);
    return closeBtn;
  }

  createProgressBar(type) {
    const progress = document.createElement("div");
    progress.className = "notification-progress";
    switch (type) {
      case "success":
        progress.style.background = "var(--success-color, #4caf50)";
        break;
      case "error":
        progress.style.background = "var(--error-color, #f44336)";
        break;
      case "warning":
        progress.style.background = "var(--warning-color, #ff9800)";
        break;
      case "info":
      default:
        progress.style.background = "var(--info-color, #2196f3)";
        break;
    }
    return progress;
  }
}

const notifications = new NotificationSystem();
