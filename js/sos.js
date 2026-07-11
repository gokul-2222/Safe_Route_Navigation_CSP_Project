// SafePath Emergency SOS Module

let audioCtx = null;
let oscillator = null;
let gainNode = null;
let sirenInterval = null;
let countdownInterval = null;
let isSirenMuted = false;

// Default Contacts (Indian Helplines & Personal Settings)
const DEFAULT_CONTACTS = [
    { name: "Mom", phone: "9876543210" },
    { name: "Local Security Office", phone: "6123456789" },
    { name: "National Emergency / ERSS", phone: "100" },
    { name: "Women Helpline", phone: "181" }
];

// Initialize Contacts in LocalStorage
export function initContacts() {
    const existing = localStorage.getItem('safepath_contacts');
    if (!existing || !existing.includes("Mom")) {
        localStorage.setItem('safepath_contacts', JSON.stringify(DEFAULT_CONTACTS));
    } else {
        try {
            const contacts = JSON.parse(existing);
            let modified = false;
            contacts.forEach(c => {
                if (c.name.toLowerCase() === "mom" && !/^[6-9]\d{9}$/.test(c.phone)) {
                    c.phone = "9876543210";
                    modified = true;
                }
                if (c.name.toLowerCase().includes("security") && !/^[6-9]\d{9}$/.test(c.phone)) {
                    c.phone = "6123456789";
                    modified = true;
                }
                if ((c.phone === "112" || c.phone === "+91100" || c.phone === "+91112" || c.phone === "100") && c.name.includes("ERSS")) {
                    c.phone = "100";
                    modified = true;
                }
                if ((c.phone === "1091" || c.phone === "+91181" || c.phone === "+911091" || c.phone === "181") && c.name.includes("Women")) {
                    c.phone = "181";
                    modified = true;
                }
            });
            if (modified) {
                localStorage.setItem('safepath_contacts', JSON.stringify(contacts));
            }
        } catch (e) {
            localStorage.setItem('safepath_contacts', JSON.stringify(DEFAULT_CONTACTS));
        }
    }
}

// Get Contacts
export function getContacts() {
    return JSON.parse(localStorage.getItem('safepath_contacts') || '[]');
}

// Add Contact
export function addContact(name, phone) {
    const contacts = getContacts();
    contacts.push({ name, phone });
    localStorage.setItem('safepath_contacts', JSON.stringify(contacts));
    return contacts;
}

// Remove Contact
export function removeContact(index) {
    const contacts = getContacts();
    contacts.splice(index, 1);
    localStorage.setItem('safepath_contacts', JSON.stringify(contacts));
    return contacts;
}

// Trigger Countdown Timer
export function startSOSCountdown(duration, onTick, onComplete) {
    let timeLeft = duration;
    onTick(timeLeft);

    // Subtle countdown beep sound
    playCountdownBeep(440, 0.1);

    countdownInterval = setInterval(() => {
        timeLeft--;
        onTick(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            onComplete();
        } else {
            playCountdownBeep(440, 0.1);
        }
    }, 1000);
}

// Cancel Countdown
export function cancelSOSCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

// Synthesize Emergency Siren (Dual Tone Wailing)
export function startEmergencySiren() {
    if (isSirenMuted) return;
    
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Resume context if suspended (browser security policy)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // Gain node for volume control
        gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1); // Smooth ramp up
        gainNode.connect(audioCtx.destination);

        // Main Siren oscillator
        oscillator = audioCtx.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(700, audioCtx.currentTime);
        oscillator.connect(gainNode);
        oscillator.start();

        // Frequency sweep interval (creates the wail effect)
        let toggle = false;
        sirenInterval = setInterval(() => {
            if (!oscillator || !audioCtx) return;
            const targetFreq = toggle ? 650 : 1050;
            oscillator.frequency.linearRampToValueAtTime(targetFreq, audioCtx.currentTime + 0.35);
            toggle = !toggle;
        }, 400);

    } catch (e) {
        console.error("Web Audio API not supported or blocked: ", e);
    }
}

// Stop Emergency Siren
export function stopEmergencySiren() {
    if (sirenInterval) {
        clearInterval(sirenInterval);
        sirenInterval = null;
    }

    if (oscillator) {
        try {
            oscillator.stop();
        } catch (e) {}
        oscillator.disconnect();
        oscillator = null;
    }

    if (gainNode) {
        gainNode.disconnect();
        gainNode = null;
    }
}

// Mute / Unmute Toggle
export function toggleSirenMute() {
    isSirenMuted = !isSirenMuted;
    if (isSirenMuted) {
        stopEmergencySiren();
    } else {
        startEmergencySiren();
    }
    return isSirenMuted;
}

// Log SOS alert in Local History
export function logSOSAlert(coords, address = "Benz Circle, Vijayawada") {
    const logs = JSON.parse(localStorage.getItem('safepath_sos_logs') || '[]');
    const newLog = {
        id: 'sos-' + Date.now(),
        timestamp: new Date().toISOString(),
        coords: coords ? [coords.lat, coords.lng] : [16.5062, 80.6480],
        address: address
    };
    logs.unshift(newLog);
    localStorage.setItem('safepath_sos_logs', JSON.stringify(logs.slice(0, 10))); // Keep last 10
    return newLog;
}

// Get SOS History Logs
export function getSOSLogs() {
    return JSON.parse(localStorage.getItem('safepath_sos_logs') || '[]');
}

// Helper: play a short beep sound
function playCountdownBeep(frequency, duration) {
    try {
        const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = tempCtx.createOscillator();
        const gain = tempCtx.createGain();
        
        osc.connect(gain);
        gain.connect(tempCtx.destination);
        
        osc.frequency.setValueAtTime(frequency, tempCtx.currentTime);
        gain.gain.setValueAtTime(0.15, tempCtx.currentTime);
        
        osc.start();
        osc.stop(tempCtx.currentTime + duration);
        
        // Autoclose audio context to save memory
        setTimeout(() => tempCtx.close(), duration * 1000 + 100);
    } catch(e) {}
}
