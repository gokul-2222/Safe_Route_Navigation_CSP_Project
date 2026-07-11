export const HistoryComponent = {
  render(logs) {
    const logContainer = document.getElementById("sos-history-log");
    if (!logContainer) return;
    
    logContainer.innerHTML = "";
    if (logs.length === 0) {
        logContainer.innerHTML = `<div class="empty-state">No recent SOS triggers. Stay safe!</div>`;
    } else {
        logs.forEach(log => {
            const date = new Date(log.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " | " + date.toLocaleDateString();
            
            const div = document.createElement("div");
            div.className = "history-item";
            div.innerHTML = `
                <div>
                    <strong>SOS Signal Sent</strong><br>
                    <span style="font-size: 0.75rem; opacity: 0.8;">Location: ${log.address}</span>
                </div>
                <span class="history-time">${timeStr}</span>
            `;
            logContainer.appendChild(div);
        });
    }
  }
};
