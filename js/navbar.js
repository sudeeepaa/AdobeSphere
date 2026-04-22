"use strict";

var Utils = window.Utils;
var Auth = window.Auth;
var Storage = window.Storage;

function getCurrentPage() {
  var path = window.location.pathname || "";
  var file = path.split("/").pop();
  return file || "index.html";
}

function normalizeHref(href) {
  if (!href) return "";
  var clean = href.split("?")[0].split("#")[0];
  var file = clean.split("/").pop();
  return file || "index.html";
}

function setupScrollShadow() {
  function onScroll() {
    var nav = document.querySelector(".navbar");
    if (!nav) return;

    if (window.scrollY > 10) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function setupHamburger() {
  var button = document.querySelector(".navbar__hamburger");
  var drawer = document.querySelector(".navbar__mobile-drawer");
  if (!button || !drawer) return;

  function setOpenState(open) {
    button.classList.toggle("open", open);
    drawer.classList.toggle("open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  button.addEventListener("click", function () {
    var nextOpen = !drawer.classList.contains("open");
    setOpenState(nextOpen);
  });

  drawer.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setOpenState(false);
    });
  });
}

function setupActiveLinks() {
  var current = getCurrentPage();
  var links = document.querySelectorAll(".navbar__links a");

  links.forEach(function (link) {
    link.classList.remove("active");
    link.removeAttribute("aria-current");

    var href = normalizeHref(link.getAttribute("href"));
    if (href === current || (current === "" && href === "index.html")) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
}

function setupSearch() {
  var searchBtn = document.querySelector(".navbar__search-btn");
  if (!searchBtn) return;

  searchBtn.addEventListener("click", function () {
    window.location.href = "/pages/explore.html";
  });
}

function setupDropdown() {
  var userArea = document.querySelector(".navbar__user");
  if (!userArea) return;

  var avatar = userArea.querySelector(".navbar__avatar");
  var dropdown = userArea.querySelector(".navbar__dropdown");
  var signOut = userArea.querySelector("[data-signout]");

  if (!avatar || !dropdown) return;

  function setOpen(open) {
    dropdown.classList.toggle("open", open);
    avatar.setAttribute("aria-expanded", open ? "true" : "false");
  }

  avatar.addEventListener("click", function (event) {
    event.stopPropagation();
    setOpen(!dropdown.classList.contains("open"));
  });

  avatar.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(!dropdown.classList.contains("open"));
    }
  });

  if (signOut) {
    signOut.addEventListener("click", function (event) {
      event.preventDefault();
      if (window.Auth && typeof window.Auth.logout === "function") {
        window.Auth.logout();
      }
    });
  }

  document.addEventListener("click", function (event) {
    var area = document.querySelector(".navbar__user");
    if (!area) return;

    if (!area.contains(event.target)) {
      var dropdownEl = area.querySelector(".navbar__dropdown");
      var avatarEl = area.querySelector(".navbar__avatar");
      if (dropdownEl) dropdownEl.classList.remove("open");
      if (avatarEl) avatarEl.setAttribute("aria-expanded", "false");
    }
  });
}

function setupMobileAuthLinks() {
  if (!Storage || typeof Storage.isLoggedIn !== "function") return;
  var isLoggedIn = Storage.isLoggedIn();
  var mobileProfile = document.querySelector(
    ".navbar__mobile-drawer a[href*='user-profile']"
  );
  var mobileSignOut = document.querySelector(
    ".navbar__mobile-drawer [data-mobile-signout]"
  );
  var mobileSignIn = document.querySelector(
    ".navbar__mobile-drawer a[href*='login']"
  );
  var mobileSignUp = document.querySelector(
    ".navbar__mobile-drawer a[href*='signup']"
  );
  if (mobileProfile) mobileProfile.style.display = isLoggedIn ? "" : "none";
  if (mobileSignOut) mobileSignOut.style.display = isLoggedIn ? "" : "none";
  if (mobileSignIn) mobileSignIn.style.display = isLoggedIn ? "none" : "";
  if (mobileSignUp) mobileSignUp.style.display = isLoggedIn ? "none" : "";
}

function setupMobileSignOut() {
  var mobileSignOut = document.querySelector(
    ".navbar__mobile-drawer [data-mobile-signout]"
  );
  if (!mobileSignOut) return;

  mobileSignOut.addEventListener("click", function (event) {
    event.preventDefault();
    if (window.Auth && typeof window.Auth.logout === "function") {
      window.Auth.logout();
    }
  });
}

function init() {
  if (!document.querySelector(".navbar")) return;

  setupScrollShadow();
  setupHamburger();
  setupActiveLinks();
  setupSearch();
  setupDropdown();
  setupMobileSignOut();

  if (Auth && typeof Auth.updateNavbar === "function") {
    Auth.updateNavbar();
  }

  setupMobileAuthLinks();
}

window.Navbar = window.Navbar || {};
window.Navbar.init = init;
window.Navbar.refreshMobileAuthLinks = setupMobileAuthLinks;

Utils.onReady(init);
