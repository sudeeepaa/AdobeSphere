"use strict";

var Utils = window.Utils;
var Storage = window.Storage;
var byId = Utils.byId;

function getErrorEl(fieldId) {
  return document.querySelector('.form-error[data-error-for="' + fieldId + '"]');
}

function setFieldError(fieldId, message) {
  var field = byId(fieldId);
  var errorEl = getErrorEl(fieldId);

  if (errorEl) {
    errorEl.textContent = message || "";
  }

  if (field) {
    field.classList.toggle("error", !!message);
  }
}

function clearAllErrors() {
  ["contact-name", "contact-email", "contact-subject", "contact-category", "contact-message"].forEach(function (id) {
    setFieldError(id, "");
  });
}


function setupCharCounter() {
  var textarea = byId("contact-message");
  var counter = byId("msg-char-count");
  if (!textarea || !counter) return;

  function update() {
    var length = textarea.value.length;
    counter.textContent = length + " / 500 characters";
    counter.classList.toggle("over-limit", length > 500);
  }

  textarea.addEventListener("input", update);
  update();
}

function validateForm() {
  clearAllErrors();

  var name = byId("contact-name").value.trim();
  var email = byId("contact-email").value.trim();
  var subject = byId("contact-subject").value.trim();
  var category = byId("contact-category").value.trim();
  var message = byId("contact-message").value.trim();

  var ok = true;

  if (!name) {
    setFieldError("contact-name", "Please enter your name.");
    ok = false;
  }

  if (!email) {
    setFieldError("contact-email", "Please enter your email.");
    ok = false;
  } else if (!Utils.validateEmail(email)) {
    setFieldError("contact-email", "Please enter a valid email address.");
    ok = false;
  }

  if (!subject) {
    setFieldError("contact-subject", "Please enter a subject.");
    ok = false;
  }

  if (!category) {
    setFieldError("contact-category", "Please select a category.");
    ok = false;
  }

  if (!message || message.length < 20) {
    setFieldError("contact-message", "Message must be at least 20 characters.");
    ok = false;
  }

  return {
    ok: ok,
    values: {
      name: name,
      email: email,
      subject: subject,
      category: category,
      message: message
    }
  };
}

function clearForm() {
  byId("contact-name").value = "";
  byId("contact-email").value = "";
  byId("contact-subject").value = "";
  byId("contact-category").value = "";
  byId("contact-message").value = "";

  var counter = byId("msg-char-count");
  if (counter) {
    counter.textContent = "0 / 500 characters";
    counter.classList.remove("over-limit");
  }
}

function handleSubmit() {
  var result = validateForm();
  if (!result.ok) {
    Utils.showToast("Please fix the highlighted fields.", "error", 2400);
    return;
  }

  var submission = {
    id: Date.now(),
    name: result.values.name,
    email: result.values.email,
    subject: result.values.subject,
    category: result.values.category,
    message: result.values.message,
    submittedAt: new Date().toISOString()
  };

  Storage.addContactSubmission(submission);

  Utils.showToast("Message sent successfully.", "success", 2200);

  clearForm();
  clearAllErrors();

  var formWrap = document.querySelector(".contact-form-wrap");
  if (formWrap && typeof formWrap.scrollIntoView === "function") {
    formWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function init() {
  var accordion = document.getElementById("faq-accordion");
  if (accordion) {
    accordion.addEventListener("click", function(event) {
      var btn = event.target.closest(".faq-question");
      if (!btn) return;
      var item = btn.closest(".faq-item");
      var wasOpen = item.classList.contains("open");
      accordion.querySelectorAll(".faq-item").forEach(function(el) {
        el.classList.remove("open");
        el.querySelector(".faq-question").setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  }

  setupCharCounter();

  var submitBtn = byId("contact-submit");
  if (submitBtn) {
    submitBtn.addEventListener("click", handleSubmit);
  }
}

Utils.onReady(init);
