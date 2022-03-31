(function () {
    const { classList: htmlClass } = document.documentElement;

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
})();
