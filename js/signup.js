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

function evaluateStrength(password) {
  var hasLetters = /[a-zA-Z]/.test(password);
  var hasNumbers = /\d/.test(password);
  var hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (password.length >= 10 && hasLetters && hasNumbers && hasSpecial) {
    return { label: "Strong", width: "100%", color: "#22c55e" };
  }

  if (password.length >= 8 && hasLetters && hasNumbers) {
    return { label: "Fair", width: "66%", color: "#f97316" };
  }

  if (password.length > 0) {
    return { label: "Weak", width: "33%", color: "#ef4444" };
  }

  return { label: "", width: "0", color: "transparent" };
}

function setupPasswordStrength() {
  var passwordInput = byId("signup-password");
  var bar = byId("strength-bar");
  var label = byId("strength-label");
  if (!passwordInput || !bar || !label) return;

  passwordInput.addEventListener("input", function () {
    var strength = evaluateStrength(passwordInput.value || "");
    bar.style.width = strength.width;
    bar.style.background = strength.color;
    label.textContent = strength.label;
    label.style.color = strength.color;
  });
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
    }
  }

  if (!payload.password || payload.password.length < 8) {
    setFieldError("signup-password", "Password must be at least 8 characters.");
    ok = false;
  }

  if (payload.confirmPassword !== payload.password) {
    setFieldError("signup-confirm-password", "Passwords do not match.");
    ok = false;
  }

  if (!payload.bio || payload.bio.length < 30) {
    setFieldError("signup-bio", "Bio must be at least 30 characters.");
    ok = false;
  }

  var linkedin = payload.socials && payload.socials.linkedin ? String(payload.socials.linkedin).trim() : "";

  if (linkedin) {
    if (!Utils.validateUrl(linkedin)) {
      setFieldError("social-linkedin", "Please enter a valid LinkedIn URL starting with https://");
      ok = false;
    }
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
    Utils.showToast("Welcome to Adobisphere, " + payload.name + "!", "success", 1600);

    setTimeout(function () {
      var target = appPath("pages/user-profile.html");
      Router.navigate(target);
    }, 1500);
  }).catch(function (error) {
    setLoading(false);

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
