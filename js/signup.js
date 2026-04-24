"use strict";

var Utils = window.Utils;
var Storage = window.Storage;
var Auth = window.Auth;
var Router = window.Router;
var byId = Utils.byId;
var appPath = Utils.appPath;

var DEFAULT_AVATAR = "assets/images/profiles/default-user.jpg";

function getDefaultAvatarSrc() {
  return Utils.normalizeAssetSrc(DEFAULT_AVATAR, DEFAULT_AVATAR);
}

function setLoading(isLoading) {
  var overlay = byId("signup-loading");
  if (!overlay) return;
  overlay.style.display = isLoading ? "flex" : "none";
  overlay.setAttribute("aria-hidden", isLoading ? "false" : "true");
}

function showTopError(message, allowHtml) {
  var box = byId("signup-error");
  if (!box) return;
  if (allowHtml) {
    box.innerHTML = message;
  } else {
    box.textContent = message;
  }
  box.style.display = "block";
}

function clearTopError() {
  var box = byId("signup-error");
  if (!box) return;
  box.innerHTML = "";
  box.style.display = "none";
}

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
  [
    "signup-name",
    "signup-designation",
    "signup-email",
    "signup-password",
    "signup-confirm-password",
    "signup-bio",
    "social-linkedin"
  ].forEach(function (fieldId) {
    var field = byId(fieldId);
    var errorEl = getErrorEl(fieldId);
    if (errorEl) errorEl.textContent = "";
    if (field) field.classList.remove("error");
  });
}

function setupAvatarPreview() {
  var input = byId("signup-avatar");
  var preview = byId("avatar-preview");
  if (!input || !preview) return;

  input.addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    var allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.indexOf(file.type) === -1) {
      showTopError("Please upload a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    var reader = new FileReader();
    reader.onload = function (loadEvent) {
      var src = loadEvent.target && loadEvent.target.result ? String(loadEvent.target.result) : "";
      if (!src) return;
      preview.src = src;
    };
    reader.readAsDataURL(file);
  });
}

function getPasswordChecks(password) {
  var value = String(password || "");
  return {
    lengthValue: value.length,
    hasMinLength: value.length >= 8,
    hasUppercase: /[A-Z]/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSpecial: /[^a-zA-Z0-9]/.test(value)
  };
}

function evaluateStrength(password) {
  var checks = getPasswordChecks(password);
  var metCount = [
    checks.hasMinLength,
    checks.hasUppercase,
    checks.hasLowercase,
    checks.hasNumber,
    checks.hasSpecial
  ].filter(Boolean).length;

  if (checks.lengthValue === 0) {
    return { label: "", width: "0", color: "transparent", checks: checks };
  }

  if (metCount === 5 && checks.lengthValue >= 10) {
    return { label: "Strong", width: "100%", color: "#22c55e", checks: checks };
  }

  if (checks.hasMinLength && metCount >= 3) {
    return { label: "Fair", width: "66%", color: "#f97316", checks: checks };
  }

  return { label: "Weak", width: "33%", color: "#ef4444", checks: checks };
}

function getStrengthGuidanceText() {
  return "To make your password stronger, use a minimum of 8 characters, including 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.";
}

function setupPasswordStrength() {
  var passwordInput = byId("signup-password");
  var bar = byId("strength-bar");
  var label = byId("strength-label");
  var suggestion = byId("password-suggestion");
  if (!passwordInput || !bar || !label || !suggestion) return;

  function updateFeedback() {
    var strength = evaluateStrength(passwordInput.value || "");
    bar.style.width = strength.width;
    bar.style.background = strength.color;
    label.textContent = strength.label;
    label.style.color = strength.color;

    if (!strength.checks.lengthValue) {
      suggestion.textContent = "Tip: use a mix of letters, numbers, and symbols for a stronger password.";
      suggestion.style.color = "var(--text-secondary)";
      return;
    }

    if (strength.label === "Weak" || strength.label === "Fair") {
      suggestion.textContent = getStrengthGuidanceText();
      suggestion.style.color = strength.color;
      return;
    }

    suggestion.textContent = "Great password. You meet all recommended conditions.";
    suggestion.style.color = "#15803d";
  }

  passwordInput.addEventListener("input", updateFeedback);
  updateFeedback();
}

function togglePassword(targetId, button) {
  var input = byId(targetId);
  var iconHost = button ? button.querySelector(".eye-icon") : null;
  if (!input || !iconHost || !button) return;

  var shouldShow = input.type === "password";
  input.type = shouldShow ? "text" : "password";

  iconHost.innerHTML = shouldShow
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a21.77 21.77 0 0 1 5.06-6.94"></path><path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-3.16 4.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'
    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>';

  button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
}

function setupPasswordToggles() {
  document.querySelectorAll(".toggle-password").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var targetId = btn.getAttribute("data-target");
      if (!targetId) return;
      togglePassword(targetId, btn);
    });
  });
}

function setupBioCounter() {
  var bio = byId("signup-bio");
  var counter = byId("bio-char-count");
  if (!bio || !counter) return;

  function update() {
    counter.textContent = bio.value.length + " / 500 characters";
  }

  bio.addEventListener("input", update);
  update();
}

function isAdobeEmployeeEmail(email) {
  return /@adobe\.com$/i.test(String(email || "").trim());
}

function showEmployeeOnlyModal() {
  var modal = byId("employee-only-modal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function hideEmployeeOnlyModal() {
  var modal = byId("employee-only-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function setupEmployeeOnlyModal() {
  var modal = byId("employee-only-modal");
  var okButton = byId("employee-only-ok");
  if (!modal || !okButton) return;

  okButton.addEventListener("click", hideEmployeeOnlyModal);
  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      hideEmployeeOnlyModal();
    }
  });
}

function collectForm() {
  var name = byId("signup-name").value.trim();
  var designation = byId("signup-designation").value.trim();
  var email = byId("signup-email").value.trim();
  var password = byId("signup-password").value;
  var confirmPassword = byId("signup-confirm-password").value;
  var bio = byId("signup-bio").value.trim();

  var socials = {
    linkedin: byId("social-linkedin").value.trim()
  };

  var preview = byId("avatar-preview");
  var avatarSrc = "";
  var defaultAvatarSrc = getDefaultAvatarSrc();
  if (preview && preview.src && preview.src.indexOf(defaultAvatarSrc) === -1) {
    avatarSrc = preview.src;
  }

  return {
    name: name,
    designation: designation,
    email: email,
    password: password,
    confirmPassword: confirmPassword,
    bio: bio,
    socials: socials,
    avatarSrc: avatarSrc
  };
}

function validateForm(payload) {
  var ok = true;
  var passwordStrength = evaluateStrength(payload.password || "");

  if (!payload.name) {
    setFieldError("signup-name", "Please enter your full name.");
    ok = false;
  }

  if (!payload.designation) {
    setFieldError("signup-designation", "Please enter your role or designation.");
    ok = false;
  }

  if (!payload.email) {
    setFieldError("signup-email", "Please enter your email address.");
    ok = false;
  } else {
    if (!Utils.validateEmail(payload.email)) {
      setFieldError("signup-email", "Please enter a valid email address.");
      ok = false;
    } else if (!isAdobeEmployeeEmail(payload.email)) {
      setFieldError("signup-email", "Only @adobe.com email addresses are allowed.");
      showTopError("This application is only for Adobe-registered employees.");
      showEmployeeOnlyModal();
      ok = false;
    }
  }

  if (!payload.password) {
    setFieldError("signup-password", "Password is required.");
    ok = false;
  } else if (passwordStrength.label === "Weak") {
    setFieldError("signup-password", "Weak password is not allowed. Please use a fair or strong password.");
    showTopError(getStrengthGuidanceText());
    ok = false;
  }

  if (payload.confirmPassword !== payload.password) {
    setFieldError("signup-confirm-password", "Passwords do not match.");
    ok = false;
  }

  var linkedin = payload.socials && payload.socials.linkedin ? String(payload.socials.linkedin).trim() : "";

  if (!linkedin) {
    setFieldError("social-linkedin", "LinkedIn profile is required.");
    ok = false;
  } else if (!Utils.validateUrl(linkedin)) {
    setFieldError("social-linkedin", "Please enter a valid LinkedIn URL starting with https://");
    ok = false;
  } else if (!/^https:\/\/(www\.)?linkedin\.com\//i.test(linkedin)) {
    setFieldError("social-linkedin", "Please provide a valid linkedin.com profile URL.");
    ok = false;
  }

  var existingUser = (Storage && typeof Storage.getUserByEmail === "function")
    ? Storage.getUserByEmail(payload.email)
    : Storage.getUser();

  if (existingUser && String(existingUser.email || "").toLowerCase() === payload.email.toLowerCase()) {
    setFieldError("signup-email", "Email already in use.");
    showTopError("An account with this email already exists. <a href='" + appPath("pages/login.html") + "'>Sign in instead →</a>", true);
    ok = false;
  }

  return ok;
}

function handleSubmit() {
  clearTopError();
  clearAllErrors();

  var payload = collectForm();
  if (!validateForm(payload)) {
    var errBox = byId("signup-error");
    if (!errBox || errBox.style.display === "none") {
      showTopError("Please correct the highlighted fields and try again.");
    }
    Utils.showToast("Please fix the highlighted fields.", "error", 2200);
    return;
  }

  setLoading(true);

  Auth.register({
    name: payload.name,
    designation: payload.designation,
    email: payload.email,
    password: payload.password,
    bio: payload.bio,
    socials: payload.socials,
    avatarSrc: payload.avatarSrc
  }).then(function () {
    setLoading(false);
    Utils.showToast("Welcome to Adobesphere, " + payload.name + "!", "success", 1600);

    setTimeout(function () {
      var target = appPath("pages/user-profile.html");
      Router.navigate(target);
    }, 1500);
  }).catch(function (error) {
    setLoading(false);

    if (error && error.message === "INVALID_EMAIL") {
      setFieldError("signup-email", "Only @adobe.com email addresses are allowed.");
      showTopError("This application is only for Adobe-registered employees.");
      showEmployeeOnlyModal();
      return;
    }

    if (error && error.message === "EMAIL_EXISTS") {
      setFieldError("signup-email", "Email already in use.");
      showTopError("An account with this email already exists. <a href='" + appPath("pages/login.html") + "'>Sign in instead →</a>", true);
      return;
    }

    showTopError("Something went wrong. Please try again.");
  });
}

function init() {
  if (Storage.isLoggedIn()) {
    window.location.href = appPath("pages/user-profile.html");
    return;
  }

  setupAvatarPreview();
  setupEmployeeOnlyModal();
  setupPasswordStrength();
  setupPasswordToggles();
  setupBioCounter();

  var submitBtn = byId("signup-submit");
  if (submitBtn) {
    submitBtn.addEventListener("click", function () {
      handleSubmit();
    });
  }
}

Utils.onReady(init);
