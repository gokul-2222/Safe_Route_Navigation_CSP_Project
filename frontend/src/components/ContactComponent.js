export const ContactComponent = {
  render(contacts, onDeleteContactClick) {
    const settingsContactsList = document.getElementById("settings-contacts-list");
    const compactContactsList = document.getElementById("sos-contacts-list-preview");

    if (settingsContactsList) {
      settingsContactsList.innerHTML = "";
      if (contacts.length === 0) {
          settingsContactsList.innerHTML = `<div class="empty-state">No emergency contacts saved.</div>`;
      } else {
          contacts.forEach((contact, idx) => {
              const card = document.createElement("div");
              card.className = "contact-card";
              card.innerHTML = `
                  <div class="contact-details">
                      <span class="contact-name">${contact.name}</span>
                      <span class="contact-phone">${contact.phone}</span>
                  </div>
                  <button class="btn-remove-contact" data-index="${idx}" title="Delete Contact">
                      <i class="fa-solid fa-trash-can"></i>
                  </button>
              `;
              
              card.querySelector(".btn-remove-contact").addEventListener("click", () => {
                  if (onDeleteContactClick) {
                    onDeleteContactClick(idx);
                  }
              });

              settingsContactsList.appendChild(card);
          });
      }
    }

    if (compactContactsList) {
      compactContactsList.innerHTML = "";
      if (contacts.length === 0) {
          compactContactsList.innerHTML = `<span class="empty-state">No contacts configured. Go to Settings.</span>`;
      } else {
          contacts.forEach(c => {
              const span = document.createElement("span");
              span.className = "compact-contact-badge";
              span.innerHTML = `<i class="fa-solid fa-user-shield"></i> ${c.name}`;
              compactContactsList.appendChild(span);
          });
      }
    }
  }
};
