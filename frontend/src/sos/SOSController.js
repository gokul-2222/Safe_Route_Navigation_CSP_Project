import { SOSState } from '../state/State.js';
import { DEFAULT_CONTACTS } from '../config/constants.js';

export const SOSController = {
  initContacts() {
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
  },

  getContacts() {
    return JSON.parse(localStorage.getItem('safepath_contacts') || '[]');
  },

  addContact(name, phone) {
    const contacts = this.getContacts();
    contacts.push({ name, phone });
    localStorage.setItem('safepath_contacts', JSON.stringify(contacts));
    return contacts;
  },

  removeContact(index) {
    const contacts = this.getContacts();
    contacts.splice(index, 1);
    localStorage.setItem('safepath_contacts', JSON.stringify(contacts));
    return contacts;
  },

  startCountdown(duration, onTick, onComplete) {
    let timeLeft = duration;
    onTick(timeLeft);
    this.playCountdownBeep(440, 0.1);

    SOSState.countdownInterval = setInterval(() => {
        timeLeft--;
        onTick(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(SOSState.countdownInterval);
            onComplete();
        } else {
            this.playCountdownBeep(440, 0.1);
        }
    }, 1000);
  },

  cancelCountdown() {
    if (SOSState.countdownInterval) {
        clearInterval(SOSState.countdownInterval);
        SOSState.countdownInterval = null;
    }
  },

  startEmergencySiren() {
    if (SOSState.isSirenMuted) return;
    
    try {
        if (!SOSState.audioCtx) {
            SOSState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (SOSState.audioCtx.state === 'suspended') {
            SOSState.audioCtx.resume();
        }

        SOSState.gainNode = SOSState.audioCtx.createGain();
        SOSState.gainNode.gain.setValueAtTime(0, SOSState.audioCtx.currentTime);
        SOSState.gainNode.gain.linearRampToValueAtTime(0.5, SOSState.audioCtx.currentTime + 0.1);
        SOSState.gainNode.connect(SOSState.audioCtx.destination);

        SOSState.oscillator = SOSState.audioCtx.createOscillator();
        SOSState.oscillator.type = 'sawtooth';
        SOSState.oscillator.frequency.setValueAtTime(700, SOSState.audioCtx.currentTime);
        SOSState.oscillator.connect(SOSState.gainNode);
        SOSState.oscillator.start();

        let toggle = false;
        SOSState.sirenInterval = setInterval(() => {
            if (!SOSState.oscillator || !SOSState.audioCtx) return;
            const targetFreq = toggle ? 650 : 1050;
            SOSState.oscillator.frequency.linearRampToValueAtTime(targetFreq, SOSState.audioCtx.currentTime + 0.35);
            toggle = !toggle;
        }, 400);

    } catch (e) {
        console.error("Web Audio API warning: ", e);
    }
  },

  stopEmergencySiren() {
    if (SOSState.sirenInterval) {
        clearInterval(SOSState.sirenInterval);
        SOSState.sirenInterval = null;
    }
    if (SOSState.oscillator) {
        try {
            SOSState.oscillator.stop();
        } catch (e) {}
        SOSState.oscillator.disconnect();
        SOSState.oscillator = null;
    }
    if (SOSState.gainNode) {
        SOSState.gainNode.disconnect();
        SOSState.gainNode = null;
    }
  },

  toggleSirenMute() {
    SOSState.isSirenMuted = !SOSState.isSirenMuted;
    if (SOSState.isSirenMuted) {
        this.stopEmergencySiren();
    } else {
        this.startEmergencySiren();
    }
    return SOSState.isSirenMuted;
  },

  logSOSAlert(coords, address = "Benz Circle, Vijayawada") {
    const logs = JSON.parse(localStorage.getItem('safepath_sos_logs') || '[]');
    const newLog = {
        id: 'sos-' + Date.now(),
        timestamp: new Date().toISOString(),
        coords: coords ? [coords[0], coords[1]] : [16.5062, 80.6480],
        address: address
    };
    logs.unshift(newLog);
    localStorage.setItem('safepath_sos_logs', JSON.stringify(logs.slice(0, 10)));
    return newLog;
  },

  getSOSLogs() {
    return JSON.parse(localStorage.getItem('safepath_sos_logs') || '[]');
  },

  playCountdownBeep(frequency, duration) {
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
        
        setTimeout(() => tempCtx.close(), duration * 1000 + 100);
    } catch(e) {}
  }
};
export { SOSState };
