var Utils = window.Utils;
var Navbar = window.Navbar;
var Auth = window.Auth;

function loadPartials() {
var navbarRoot = document.getElementById("navbar-root");
var footerRoot = document.getElementById("footer-root");

var navFetch = navbarRoot
  ? fetch(Utils.appPath("partials/navbar.html")).then(function(r) { return r.text(); }).then(function(html) { navbarRoot.innerHTML = html; })
  : Promise.resolve();

var footerFetch = footerRoot
  ? fetch(Utils.appPath("partials/footer.html")).then(function(r) { return r.text(); }).then(function(html) { footerRoot.innerHTML = html; })
  : Promise.resolve();

Promise.all([navFetch, footerFetch]).then(function() {
  if (window.Navbar && window.Navbar.init) Navbar.init();
  if (window.Auth && window.Auth.updateNavbar) Auth.updateNavbar();
}).catch(function(err) {
  console.error("Could not load navbar or footer:", err);
});
}

document.addEventListener("DOMContentLoaded", loadPartials);
