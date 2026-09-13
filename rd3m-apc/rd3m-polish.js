<script>
(() => {
  "use strict";

  function setup() {
    const copy = document.querySelector(".story-copy");
    const counter = document.querySelector(".counter");
    if (!copy || !counter) {
      window.requestAnimationFrame(setup);
      return;
    }

    let frame = null;
    const observer = new MutationObserver(() => {
      if (frame) window.cancelAnimationFrame(frame);
      copy.classList.remove("copy-fade-in");
      frame = window.requestAnimationFrame(() => {
        // Force a reflow so the fade restarts on every scene change.
        void copy.offsetWidth;
        copy.classList.add("copy-fade-in");
      });
    });

    observer.observe(copy, {
      childList: true,
      subtree: true,
      characterData: true
    });

    copy.classList.add("copy-fade-in");
  }

  setup();
})();
</script>
