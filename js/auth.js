"use strict";

var Utils = window.Utils;
var Router = window.Router;

var DEFAULT_AVATAR = "/assets/images/profiles/default-user.jpg";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateEmail(email) {
  var value = String(email || "").trim();
  return Utils.validateEmail(value);
}

function validateAdobeEmail(email) {
  var value = String(email || "").trim();
  return validateEmail(value) && /@adobe\.com$/i.test(value);
}

function validatePassword(password) {
  var value = String(password || "");
  return value.length >= 8;
}

async function hashPassword(password) {
  var data = new TextEncoder().encode(password);
  var hashBuffer = await crypto.subtle.digest("SHA-256", data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}

async function checkPassword(plain, stored) {
  var hashed = await hashPassword(plain);
  return hashed === stored;
}

var api = {
  hashPassword: function (plainText) {
    return hashPassword(String(plainText || ""));
  },

  verifyPassword: function (plainText, hash) {
    if (!hash) return Promise.resolve(false);
    return checkPassword(String(plainText || ""), String(hash));
  },

  register: function (formData) {
    var Storage = window.Storage;
    var email = normalizeEmail((formData && formData.email) || "");

    if (!validateAdobeEmail(email)) {
      return Promise.reject(new Error("INVALID_EMAIL"));
    }

    if (!validatePassword((formData && formData.password) || "")) {
      return Promise.reject(new Error("WEAK_PASSWORD"));
    }

    var existingUser = (typeof Storage.getUserByEmail === "function")
      ? Storage.getUserByEmail(email)
      : Storage.getUser();

    if (existingUser && normalizeEmail(existingUser.email) === email) {
      return Promise.reject(new Error("EMAIL_EXISTS"));
    }

    var self = this;
    return self.hashPassword((formData && formData.password) || "").then(function (passwordHash) {
      var userObj = {
        name: String((formData && formData.name) || "").trim(),
        designation: String((formData && formData.designation) || "").trim(),
        email: email,
        passwordHash: passwordHash,
        bio: String((formData && formData.bio) || "").trim(),
        socials: (formData && formData.socials) || {},
        avatarSrc: (formData && formData.avatarSrc) || "",
        savedBlogs: [],
        savedEvents: [],
        registeredEvents: [],
        myBlogs: [],
        createdAt: new Date().toISOString()
      };

      if (typeof Storage.upsertUser === "function") {
        Storage.upsertUser(userObj);
      }
      Storage.setUser(userObj);
      Storage.setSession(userObj.email);
      if (typeof Storage.markActiveUserCounted === "function") {
        Storage.markActiveUserCounted();
      }

      return {
        success: true,
        user: userObj
      };
    });
  },

  login: function (email, password) {
    var Storage = window.Storage;
    var normalizedEmail = normalizeEmail(email);

    var user = (typeof Storage.getUserByEmail === "function")
      ? Storage.getUserByEmail(normalizedEmail)
      : Storage.getUser();

    if (!user || normalizeEmail(user.email) !== normalizedEmail) {
      return Promise.reject(new Error("INVALID_CREDENTIALS"));
    }

    var self = this;
    return self.verifyPassword(password, user.passwordHash).then(function (isValid) {
      if (!isValid) {
        return Promise.reject(new Error("INVALID_CREDENTIALS"));
      }

      Storage.setUser(user);
      Storage.setSession(user.email);
      if (typeof Storage.markActiveUserCounted === "function") {
        Storage.markActiveUserCounted();
      }

      return {
        success: true,
        user: user
      };
    });
  },

  logout: function () {
    var Storage = window.Storage;
    Storage.clearSession();
    Router.navigate("index.html");
  },

  guardPage: function (redirectName) {
    var Storage = window.Storage;
    if (Storage.isLoggedIn()) return;

    Router.navigate(Router.buildRedirectLogin(redirectName || "index", ""));
  },

  updateNavbar: function () {
    var Storage = window.Storage;
    var isLoggedIn = Storage.isLoggedIn();
    var user = Storage.getUser();

    var fallbackAvatar = Utils.normalizeAssetSrc(DEFAULT_AVATAR);

    var authContainer = document.querySelector("[data-auth-buttons], .navbar__auth");
    var userContainer = document.querySelector("[data-user-menu], .navbar__user");

    var signInButton = document.querySelector("[data-signin], .js-signin, .btn-signin");
    var signUpButton = document.querySelector("[data-signup], .js-signup, .btn-signup");

    var avatarImage = document.querySelector("[data-user-avatar], .navbar__avatar");

    if (isLoggedIn && user) {
      if (authContainer) authContainer.style.display = "none";
      if (signInButton) signInButton.style.display = "none";
      if (signUpButton) signUpButton.style.display = "none";
      if (userContainer) userContainer.style.display = "";

      if (avatarImage) {
        var desired = user.avatarSrc && String(user.avatarSrc).trim() ? user.avatarSrc : fallbackAvatar;
        avatarImage.src = Utils.normalizeAssetSrc(desired, fallbackAvatar);
        avatarImage.alt = (user.name || "User") + " avatar";
      }
    } else {
      if (authContainer) authContainer.style.display = "inline-flex";
      if (signInButton) signInButton.style.display = "";
      if (signUpButton) signUpButton.style.display = "";
      if (userContainer) userContainer.style.display = "none";

      if (avatarImage) {
        avatarImage.src = fallbackAvatar;
        avatarImage.alt = "User avatar";
      }
    }

    if (window.Navbar && typeof window.Navbar.refreshMobileAuthLinks === "function") {
      window.Navbar.refreshMobileAuthLinks();
    }
  },

  getRedirectAfterLogin: function () {
    var redirect = Router.getParam("redirect");
    var id = Router.getParam("id");

    var target = "index.html";

    switch (redirect) {
      case "event":
        target = id ? "pages/event.html?id=" + encodeURIComponent(id) : "pages/explore.html?tab=events";
        break;
      case "blog":
        target = id ? "pages/blog.html?id=" + encodeURIComponent(id) : "pages/explore.html?tab=blogs";
        break;
      case "blog-editor":
        target = "pages/blog-editor.html";
        break;
      case "user-profile":
        target = "pages/user-profile.html";
        break;
      case "contact":
        target = "/pages/contact.html";
        break;
      default:
        target = "index.html";
    }

    return Utils.appPath(target);
  }
};

window.Auth = api;
