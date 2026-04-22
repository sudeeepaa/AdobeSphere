"use strict";

var Utils = window.Utils;
var Storage = window.Storage;
var Auth = window.Auth;
var byId = Utils.byId;

function setLoading(isLoading) {
  var overlay = byId("login-loading");
  if (!overlay) return;
  overlay.style.display = isLoading ? "flex" : "none";
  overlay.setAttribute("aria-hidden", isLoading ? "false" : "true");
}

function showError(message) {
  var box = byId("login-error");
  if (!box) return;
  box.textContent = message;
  box.style.display = "block";
}

function clearError() {
  var box = byId("login-error");
  if (!box) return;
  box.textContent = "";
  box.style.display = "none";
}

function setFieldError(input, hasError) {
  if (!input) return;
  input.classList.toggle("error", !!hasError);
}

function validate(email, password) {
  var emailInput = byId("login-email");
  var passwordInput = byId("login-password");

  var valid = true;
  setFieldError(emailInput, false);
  setFieldError(passwordInput, false);

  if (!email || !Utils.validateEmail(email)) {
    valid = false;
    setFieldError(emailInput, true);
  }

  if (!password || password.length < 8) {
    valid = false;
    setFieldError(passwordInput, true);
  }

  if (!valid) {
    showError("Please check your credentials and try again.");
  }

  return valid;
}

function setPasswordVisibility(isVisible) {
  var input = byId("login-password");
  var icon = document.querySelector("#toggle-password .eye-icon");
  var btn = byId("toggle-password");
  if (!input || !icon || !btn) return;

  input.type = isVisible ? "text" : "password";
  icon.innerHTML = isVisible
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a21.77 21.77 0 0 1 5.06-6.94"></path><path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-3.16 4.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'
    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  btn.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
  btn.setAttribute("data-visible", isVisible ? "true" : "false");
}

function submitLogin() {
  clearError();

  var emailInput = byId("login-email");
  var passwordInput = byId("login-password");

  var email = emailInput ? emailInput.value.trim() : "";
  var password = passwordInput ? passwordInput.value : "";

  if (!validate(email, password)) {
    return;
  }

  setLoading(true);

  Auth.login(email, password).then(function () {
    Utils.showToast("Signed in successfully.", "success", 1400);

    setTimeout(function () {
      window.location.href = Auth.getRedirectAfterLogin();
    }, 350);
  }).catch(function (error) {
    if (error && error.message === "INVALID_CREDENTIALS") {
      showError("Invalid email or password. Please try again.");
      Utils.showToast("Invalid email or password.", "error", 2400);
    } else {
      showError("Something went wrong. Please try again.");
      Utils.showToast("Sign in failed. Please try again.", "error", 2400);
    }
    setLoading(false);
  });
}

function init() {
  if (Storage.isLoggedIn()) {
    window.location.href = Auth.getRedirectAfterLogin();
    return;
  }

  var toggleBtn = byId("toggle-password");
  var forgotLink = byId("forgot-link");
  var submitBtn = byId("login-submit");
  var passwordInput = byId("login-password");

  setPasswordVisibility(false);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var visible = toggleBtn.getAttribute("data-visible") === "true";
      setPasswordVisibility(!visible);
    });
  }

  if (forgotLink) {
    forgotLink.addEventListener("click", function (event) {
      event.preventDefault();
      alert("Password reset is not available in this version. Please contact support or create a new account.");
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", function () {
      submitLogin();
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        submitLogin();
      }
    });
  }
}

Utils.onReady(init);
