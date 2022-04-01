(function () {
    const { classList: htmlClass } = document.documentElement;
    const localTheme = localStorage.getItem("theme");
    const prefersDarkTheme = window.matchMedia(
        "(prefers-color-scheme: dark)"
    ).matches;
    const theme = localTheme || (prefersDarkTheme ? "dark" : "light");
    const themeButton = document.createElement("button");
    const themeStyle = document.createElement("style");
    const palette = {
        dark: "pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}.hljs{color:#abb2bf;background:#282c34}.hljs-comment,.hljs-quote{color:#5c6370;font-style:italic}.hljs-doctag,.hljs-formula,.hljs-keyword{color:#c678dd}.hljs-deletion,.hljs-name,.hljs-section,.hljs-selector-tag,.hljs-subst{color:#e06c75}.hljs-literal{color:#56b6c2}.hljs-addition,.hljs-attribute,.hljs-meta .hljs-string,.hljs-regexp,.hljs-string{color:#98c379}.hljs-attr,.hljs-number,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-pseudo,.hljs-template-variable,.hljs-type,.hljs-variable{color:#d19a66}.hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-symbol,.hljs-title{color:#61aeee}.hljs-built_in,.hljs-class .hljs-title,.hljs-title.class_{color:#e6c07b}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}.hljs-link{text-decoration:underline}",
        light: "pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}.hljs{color:#383a42;background:#fafafa}.hljs-comment,.hljs-quote{color:#a0a1a7;font-style:italic}.hljs-doctag,.hljs-formula,.hljs-keyword{color:#a626a4}.hljs-deletion,.hljs-name,.hljs-section,.hljs-selector-tag,.hljs-subst{color:#e45649}.hljs-literal{color:#0184bb}.hljs-addition,.hljs-attribute,.hljs-meta .hljs-string,.hljs-regexp,.hljs-string{color:#50a14f}.hljs-attr,.hljs-number,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-pseudo,.hljs-template-variable,.hljs-type,.hljs-variable{color:#986801}.hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-symbol,.hljs-title{color:#4078f2}.hljs-built_in,.hljs-class .hljs-title,.hljs-title.class_{color:#c18401}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}.hljs-link{text-decoration:underline}",
    };

    function initializeTheme() {
        const sunIcon = document.createElement("i");
        const moonIcon = document.createElement("i");

        sunIcon.classList.add("icon-sun");
        moonIcon.classList.add("icon-moon");

        htmlClass.add(theme);

        themeButton.classList.add("toggle-theme");
        themeButton.setAttribute("aria-label", "테마 전환");

        themeButton.addEventListener("click", () => {
            const nextTheme = htmlClass.contains("dark") ? "light" : "dark";

            htmlClass.remove("dark", "light");
            htmlClass.add(nextTheme);
            highlightTheme(nextTheme);
            localStorage.setItem("theme", nextTheme);
        });

        themeButton.append(sunIcon, moonIcon);
        document.querySelector(".global-navigation > ul").prepend(themeButton);
    }

    function highlightTheme(nextTheme) {
        themeStyle.innerText = palette[nextTheme];
    }

    function syncToc() {
        const { scrollY, innerHeight: windowHeight } = window;
        const currentPosition = scrollY;
        const tocElements = document.querySelectorAll(".toc a");
        const tocTargetHeadingIsInViewport = [...tocElements].map((x) => {
            const { offsetTop } = document.querySelector(
                decodeURIComponent(x.getAttribute("href"))
            );

            return (
                currentPosition <= offsetTop &&
                offsetTop <= currentPosition + windowHeight
            );
        });

        tocElements.forEach((elt, i) => {
            if (tocTargetHeadingIsInViewport[i]) {
                elt.classList.add("highlight");
                return;
            }

            elt.classList.remove("highlight");
        });
    }

    document.querySelector(".drawer-opener").addEventListener("click", () => {
        htmlClass.add("drawer-revealed");
        htmlClass.remove("toc-revealed");
    });

    document.querySelector(".toc-opener").addEventListener("click", () => {
        htmlClass.add("toc-revealed");
        htmlClass.remove("drawer-revealed");
    });

    document.querySelectorAll(".toc a").forEach((elt) => {
        elt.addEventListener("click", () => {
            htmlClass.remove("toc-revealed");
        });
    });

    document.querySelector(".closer").addEventListener("click", () => {
        htmlClass.remove("toc-revealed");
        htmlClass.remove("drawer-revealed");
    });

    window.addEventListener("load", () => {
        document.querySelectorAll("pre code").forEach((el) => {
            hljs.highlightElement(el);
        });

        highlightTheme(theme);
        document.head.append(themeStyle);
    });

    window.addEventListener("scroll", syncToc, { passive: true });

    initializeTheme();
})();
