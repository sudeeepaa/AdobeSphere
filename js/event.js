"use strict";

var Utils = window.Utils;
var Storage = window.Storage;
var Router = window.Router;
var byId = Utils.byId;

var currentEvent = null;
var allEvents = [];

function formatShortDate(dateString) {
  return Utils.formatShortDate(dateString) || "Date TBD";
}

function formatDateTimeFull(eventObj) {
  var dateLabel = Utils.formatDate(eventObj.date) || eventObj.date || "Date TBD";
  var time = eventObj.time || "Time TBD";
  return dateLabel + " at " + time;
}

function isPastEvent(dateString) {
  if (!dateString) return false;

  var parts = String(dateString).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;

  var year = parts[0];
  var month = parts[1];
  var day = parts[2];
  var eventDate = new Date(year, month - 1, day);

  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return eventDate < today;
}

function renderNotFound() {
  var main = document.querySelector("main") || document.body;
  var exploreHref = Utils.appPath("pages/explore.html?tab=events");

  main.innerHTML = ""
    + '<section class="not-found">'
    + "  <h1>Event Not Found</h1>"
    + "  <p>The event you are looking for does not exist.</p>"
    + '  <p><a class="btn btn-primary" href="' + Utils.escapeHtml(exploreHref) + '">Back to Explore</a></p>'
    + "</section>";
}

function renderAgenda(items) {
  var wrap = byId("agenda-timeline");
  if (!wrap) return;

  if (!Array.isArray(items) || !items.length) {
    wrap.innerHTML = '<p class="text-muted">Agenda details will be announced soon.</p>';
    return;
  }

  wrap.innerHTML = items.map(function (item) {
    return ""
      + '<div class="agenda-item reveal">'
      + '  <div class="agenda-time">' + Utils.escapeHtml(item.time) + "</div>"
      + '  <div class="agenda-content">'
      + "    <h3>" + Utils.escapeHtml(item.activity || item.title || "Session") + "</h3>"
      + "    <p>" + Utils.escapeHtml(item.description || "") + "</p>"
      + "  </div>"
      + "</div>";
  }).join("");
}

function renderPersonCards(items, containerId) {
  var wrap = byId(containerId);
  if (!wrap) return;

  if (!Array.isArray(items) || !items.length) {
    wrap.innerHTML = '<p class="text-muted">No information available.</p>';
    return;
  }

  wrap.innerHTML = ""
    + '<div class="person-grid">'
    + items.map(function (person) {
      var name = (person && person.name) || "Speaker";
      var avatarRaw = (person && person.avatar) || "assets/images/profiles/default-user.jpg";
      var avatar = Utils.normalizeAssetSrc(String(avatarRaw).replace(/\\/g, "/"), "assets/images/profiles/default-user.jpg");
      var designation = (person && person.designation) || (person && person.role) || "";
      var bio = (person && person.bio) || "";

      return ""
        + '<div class="person-card reveal">'
        + '  <img class="person-avatar" src="' + Utils.escapeHtml(avatar) + '" alt="' + Utils.escapeHtml(name) + '">'
        + '  <div class="person-card__body">'
        + '    <div class="person-name">' + Utils.escapeHtml(name) + "</div>"
        + '    <div class="person-designation">' + Utils.escapeHtml(designation) + "</div>"
        + '    <div class="person-bio">' + Utils.escapeHtml(bio) + "</div>"
        + "  </div>"
        + "</div>";
    }).join("")
    + "</div>";
}

function renderHosts(items) {
  renderPersonCards(items, "hosts-list");
}

function renderRelatedEvents() {
  var wrap = byId("related-events-grid");
  if (!wrap || !currentEvent) return;

  var related = allEvents
    .filter(function (item) {
      return item.id !== currentEvent.id && item.category === currentEvent.category;
    })
    .slice(0, 3);

  if (!related.length) {
    wrap.innerHTML = '<p class="text-muted">No related events found.</p>';
    return;
  }

  wrap.innerHTML = related
    .map(function (item) { return Utils.buildEventCard(item); })
    .join("");
}

function setSaveButtonState(saved) {
  var btn = byId("save-event-btn");
  if (!btn) return;

  var label = btn.querySelector(".save-label");

  btn.classList.toggle("saved", saved);

  if (label) {
    label.textContent = saved ? "Saved" : "Save Event";
  }
}

function setRegisterButtonState(registered) {
  var btn = byId("register-btn");
  if (!btn) return;

  btn.classList.toggle("registered", registered);
  btn.textContent = registered
    ? "Cancel Registration"
    : "Register for this Event";
}

function openModal() {
  var modal = byId("registration-modal");
  if (!modal) return;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  var modal = byId("registration-modal");
  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");

  byId("reg-error").textContent = "";
  byId("reg-success").textContent = "";
}

function setupModalHandlers(eventId) {
  var modal = byId("registration-modal");
  if (!modal) return;

  var companionRadios = modal.querySelectorAll('input[name="reg-companion"]');
  var companionFields = byId("companion-fields");
  if (companionFields && companionRadios && companionRadios.length) {
    Array.prototype.forEach.call(companionRadios, function (radio) {
      radio.addEventListener("change", function () {
        if (radio.value === "yes" && radio.checked) {
          companionFields.style.display = "block";
        } else if (radio.value === "no" && radio.checked) {
          companionFields.style.display = "none";
        }
      });
    });
  }

  var closeBtn = modal.querySelector(".modal-close");
  var form = byId("registration-form");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (Storage.isEventRegistered(eventId)) {
        byId("reg-error").textContent =
          "You are already registered for this event.";
        return;
      }

      var foodPref = byId("reg-food") ? byId("reg-food").value : "";
      var bringsCompanion = modal.querySelector('input[name="reg-companion"]:checked');
      var companionChoice = bringsCompanion ? bringsCompanion.value : "no";

      var companions = [];
      if (companionChoice === "yes") {
        var c1name = byId("comp1-name") ? byId("comp1-name").value.trim() : "";
        if (c1name) {
          companions.push({
            name: c1name,
            email: byId("comp1-email") ? byId("comp1-email").value.trim() : "",
            age: byId("comp1-age") ? byId("comp1-age").value : "",
            designation: byId("comp1-designation") ? byId("comp1-designation").value.trim() : ""
          });
        }
        var c2name = byId("comp2-name") ? byId("comp2-name").value.trim() : "";
        if (c2name) {
          companions.push({
            name: c2name,
            email: byId("comp2-email") ? byId("comp2-email").value.trim() : "",
            age: byId("comp2-age") ? byId("comp2-age").value : "",
            designation: byId("comp2-designation") ? byId("comp2-designation").value.trim() : ""
          });
        }
      }

      Storage.registerEvent(eventId);
      if (Storage.saveRegistrationDetails) {
        Storage.saveRegistrationDetails(eventId, {
          foodPreference: foodPref,
          companion: companionChoice,
          companions: companions,
          registeredAt: new Date().toISOString()
        });
      }

      setRegisterButtonState(true);
      closeModal();
      Utils.showToast("Registration confirmed.", "success");
    });
  }
}

function setupActionButtons(eventId, eventObj) {
  var saveBtn = byId("save-event-btn");
  var registerBtn = byId("register-btn");

  if (!saveBtn || !registerBtn) return;

  var isPast = isPastEvent(eventObj && eventObj.date);

  if (Storage.isLoggedIn()) {
    setSaveButtonState(Storage.isEventSaved(eventId));

    if (!isPast) {
      setRegisterButtonState(Storage.isEventRegistered(eventId));
    }
  }

  if (isPast) {
    registerBtn.disabled = true;
    registerBtn.classList.add("is-closed");
    registerBtn.textContent = "Event Ended";
  }

  saveBtn.addEventListener("click", function () {
    if (!Storage.isLoggedIn()) {
      Router.navigate(Router.buildRedirectLogin("event", eventId));
      return;
    }

    var isSaved = Storage.isEventSaved(eventId);

    if (isSaved) {
      Storage.unsaveEvent(eventId);
      setSaveButtonState(false);
      Utils.showToast("Event removed from saved items.", "info");
    } else {
      Storage.saveEvent(eventId);
      setSaveButtonState(true);
      Utils.showToast("Event saved to your profile.", "success");
    }
  });

  if (!isPast) {
    registerBtn.addEventListener("click", function () {
      if (!Storage.isLoggedIn()) {
        Router.navigate(Router.buildRedirectLogin("event", eventId));
        return;
      }

      if (Storage.isEventRegistered(eventId)) {
        var cancelModal = byId("cancel-registration-modal");
        if (cancelModal) {
          cancelModal.classList.add("open");
          cancelModal.setAttribute("aria-hidden", "false");

          byId("cancel-reg-confirm-btn").onclick = function () {
            Storage.unregisterEvent(eventId);
            if (Storage.deleteRegistrationDetails) Storage.deleteRegistrationDetails(eventId);
            setRegisterButtonState(false);
            cancelModal.classList.remove("open");
            cancelModal.setAttribute("aria-hidden", "true");
            Utils.showToast("Registration cancelled.", "info");
          };

          byId("cancel-reg-dismiss-btn").onclick = function () {
            cancelModal.classList.remove("open");
            cancelModal.setAttribute("aria-hidden", "true");
          };

          cancelModal.onclick = function (e) {
            if (e.target === cancelModal) {
              cancelModal.classList.remove("open");
              cancelModal.setAttribute("aria-hidden", "true");
            }
          };
        }
        return;
      }

      openModal();
    });
  }
}

function renderEvent(eventObj) {
  var heroThumb = eventObj.thumbnail
    ? String(eventObj.thumbnail).replace(/\\/g, "/")
    : "";

  var heroFallback = "assets/images/events/event-runtime-hero-fallback.jpg";
  heroFallback = Utils.normalizeAssetSrc(heroFallback);

  byId("event-hero-img").src =
    Utils.normalizeAssetSrc(heroThumb, heroFallback) || heroFallback;

  byId("event-title").textContent =
    eventObj.title || "Untitled Event";

  byId("event-category-badge").textContent =
    eventObj.category || "Event";

  var categoryLabel = byId("event-category-label");
  if (categoryLabel) {
    categoryLabel.textContent = eventObj.category || "Event";
  }

  byId("event-date-display").textContent =
    formatShortDate(eventObj.date);

  byId("event-location-display").textContent = [
    eventObj.location && eventObj.location.city,
    eventObj.location && eventObj.location.state,
    eventObj.location && eventObj.location.country
  ]
    .filter(Boolean)
    .join(", ");

  byId("event-datetime-full").textContent =
    formatDateTimeFull(eventObj);

  byId("event-venue").textContent =
    eventObj.venue || "Venue TBD";

  byId("event-full-description").textContent =
    eventObj.fullDescription ||
    "Description will be added soon.";

  renderAgenda(eventObj.agenda || []);
  renderPersonCards(eventObj.presenters || [], "presenters-list");
  renderPersonCards(eventObj.guestSpeakers || [], "speakers-list");
  renderHosts(eventObj.hosts || []);

  var closingQuoteSection = byId("event-closing-quote");
  var closingQuoteText = byId("closing-quote-text");
  var closingQuote = eventObj.closingQuote;

  if (closingQuoteSection && closingQuoteText && closingQuote) {
    closingQuoteText.textContent = closingQuote;
    closingQuoteSection.hidden = false;
    closingQuoteSection.setAttribute("aria-hidden", "false");
  } else if (closingQuoteSection) {
    closingQuoteSection.hidden = true;
    closingQuoteSection.setAttribute("aria-hidden", "true");
  }

  renderRelatedEvents();
}

function init() {
  var eventId = Router.getParam("id");

  if (!eventId) {
    Router.navigate("pages/explore.html");
    return;
  }

  Utils.fetchJson("data/campaigns.json")
    .then(function (campaigns) {
      allEvents = Array.isArray(campaigns) ? campaigns : [];

      currentEvent =
        allEvents.find(function (item) { return item.id === eventId; }) || null;

      if (!currentEvent) {
        renderNotFound();
        return;
      }

      renderEvent(currentEvent);
      setupActionButtons(eventId, currentEvent);
      setupModalHandlers(eventId);
      Utils.initRevealObserver();
    })
    .catch(function (err) {
      console.error("Failed to load event:", err);
      renderNotFound();
    });
}

Utils.onReady(init);
