<script>
(() => {
  "use strict";

  function setup() {
    const copy = document.querySelector(".story-copy");
    const sceneCopy = [
      document.querySelector(".story-step"),
      document.querySelector(".story-copy h1"),
      document.querySelector(".story-text")
    ];
    if (!copy || sceneCopy.some((node) => !node)) {
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

    sceneCopy.forEach((node) => {
      observer.observe(node, {
        childList: true,
        subtree: true,
        characterData: true
      });
    });

    copy.classList.add("copy-fade-in");
  }

  setup();
})();
</script>
