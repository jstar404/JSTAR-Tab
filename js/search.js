const search = {
  engines: {
    google: {
      url: "https://www.google.com/search?q=",
      icon: "../images/search-engines/google.svg",
      name: "Google",
    },
    bing: {
      url: "https://www.bing.com/search?q=",
      icon: "../images/search-engines/bing.svg",
      name: "Bing",
    },
    duckduckgo: {
      url: "https://duckduckgo.com/?q=",
      icon: "../images/search-engines/duckduckgo.svg",
      name: "DuckDuckGo",
    },
    brave: {
      url: "https://search.brave.com/search?q=",
      icon: "../images/search-engines/brave.svg",
      name: "Brave",
    },
    perplexity: {
      url: "https://perplexity.ai/search?q=",
      icon: "../images/search-engines/perplexity-ai.svg",
      name: "Brave",
    },
    searxng: {
      url: "https://searx.be/search?q=",
      icon: "../images/search-engines/searxng.svg",
      name: "SearXNG",
    },
  },

  init: () => {
    const searchBar = document.getElementById("search-bar");
    const searchButton = document.getElementById("search-button");

    searchBar.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        search.perform();
      }
    });

    searchButton.addEventListener("click", search.perform);

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) &&
        window.getSelection().toString() === ""
      ) {
        e.preventDefault();
        searchBar.focus();
      }
    });

    const searchEngine = Storage.get("searchEngine") || "google";
    search.updateSearchEngineIcon(searchEngine);
  },

  updateSearchEngineIcon(engine) {
    const searchIcon = document.querySelector(
      "#search-container .search-icon img",
    );
    if (!searchIcon) return;
    searchIcon.src = this.engines[engine].icon;
  },

  perform: () => {
    const searchBar = document.getElementById("search-bar");
    const query = searchBar.value.trim();
    const engine = Storage.get("searchEngine") || "google";

    if (query) {
      const searchUrl = search.engines[engine].url + encodeURIComponent(query);
      window.location.href = searchUrl;
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  search.init();
});
