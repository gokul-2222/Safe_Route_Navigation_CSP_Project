export const ToastComponent = {
  show(message, duration = 3000) {
    const toastBanner = document.getElementById("toast-banner");
    const toastMessage = document.getElementById("toast-message");
    if (!toastBanner || !toastMessage) return;

    toastMessage.innerText = message;
    toastBanner.classList.add("show");
    
    setTimeout(() => {
        toastBanner.classList.remove("show");
    }, duration);
  }
};
