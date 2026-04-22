"use strict";

var api = {
  getParam: function (key) {
    var params = new URLSearchParams(window.location.search);
    return params.get(key);
  },

  navigate: function(url) {
    if (!url) return;
    window.location.href = Utils.appPath(url);
  },

  buildRedirectLogin: function (redirectValue, idValue) {
    var params = new URLSearchParams();

    if (redirectValue != null && String(redirectValue).length > 0) {
      params.set("redirect", String(redirectValue));
    }

    if (idValue != null && String(idValue).length > 0) {
      params.set("id", String(idValue));
    }

    var query = params.toString();

    return query ? "pages/login.html?" + query : "pages/login.html";
  },

  getCurrentPage: function () {
    var path = window.location.pathname || "";
    var parts = path.split("/");
    var file = parts[parts.length - 1];
    return file || "index.html";
  },

  setParam: function (key, value) {
    var url = new URL(window.location.href);
    if (value == null || value === "") {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
    window.history.replaceState({}, "", url.toString());
  }
};

window.Router = api;
