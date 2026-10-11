class Slider {
  constructor(el, { autoplay = true, interval = 4000 } = {}) {
    this.el = el;
    this.track = el.querySelector(".slider-track");
    this.slides = [...this.track.children];
    this.count = this.slides.length;
    this.autoplay = autoplay;
    this.interval = interval;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.moving = false;

    if (this.count < 2) return;

    this.status = document.querySelector(".slider-status");

    // Clones at index 0 and count + 1 make the loop seamless,
    // so real slides live at indexes 1..count.
    this.track.prepend(this.clone(this.slides.at(-1)));
    this.track.append(this.clone(this.slides[0]));

    this.addControls();
    this.bindEvents();
    this.jump(1);
    this.play();
  }

  clone(slide) {
    const copy = slide.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    return copy;
  }

  addControls() {
    const arrow = (side, label, path) => `
      <button class="arrow arrow-${side}" aria-label="${label}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>
      </button>`;

    const dots = this.slides
      .map((_, i) => `<button class="dot" aria-label="Go to slide ${i + 1}"></button>`)
      .join("");

    this.el.insertAdjacentHTML(
      "beforeend",
      arrow("prev", "Previous slide", "M15 19l-7-7 7-7") +
        arrow("next", "Next slide", "M9 5l7 7-7 7") +
        `<div class="dots" role="group" aria-label="Choose a slide">${dots}</div>`
    );

    this.dots = [...this.el.querySelectorAll(".dot")];
  }

  bindEvents() {
    const on = (events, handler, target = this.el) =>
      events.forEach(event => target.addEventListener(event, handler));

    // Arrows and dots
    on(["click"], ({ target }) => {
      const button = target.closest("button");
      if (!button) return;

      const dot = this.dots.indexOf(button);
      const step = button.classList.contains("arrow-next") ? 1 : -1;
      this.moveTo(dot >= 0 ? dot + 1 : this.index + step);
    });

    // Keyboard
    const keys = { ArrowLeft: -1, ArrowRight: 1 };
    on(["keydown"], event => {
      if (!(event.key in keys)) return;
      event.preventDefault();
      this.moveTo(this.index + keys[event.key]);
    });

    // Swipe (touch, pen, and mouse)
    let startX = 0;
    on(["pointerdown"], event => (startX = event.clientX));
    on(["pointerup"], event => {
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 50) this.moveTo(this.index + (dx < 0 ? 1 : -1));
    });

    // Pause autoplay while the slider is hovered or focused
    on(["mouseenter", "focusin"], () => this.stop());
    on(["mouseleave", "focusout"], () => this.play());
    on(["visibilitychange"], () => (document.hidden ? this.stop() : this.play()), document);

    // After each slide animation, jump from a clone back to its real twin
    on(["transitionend"], event => event.target === this.track && this.settle(), this.track);
  }

  moveTo(index) {
    if (this.moving || index === this.index) return;

    this.moving = true;
    this.index = index;
    this.render();

    // With reduced motion there is no transition, so no transitionend either
    if (this.reduced) this.settle();
  }

  settle() {
    this.moving = false;

    if (this.index === 0) this.jump(this.count);
    else if (this.index > this.count) this.jump(1);
  }

  // Move instantly, with no animation
  jump(index) {
    this.index = index;
    this.track.style.transition = "none";
    this.render();
    void this.track.offsetWidth; // force a reflow so the jump isn't animated
    this.track.style.transition = "";
  }

  render() {
    const current = (this.index - 1 + this.count) % this.count;

    this.track.style.setProperty("--i", this.index);
    this.dots.forEach((dot, i) => dot.setAttribute("aria-current", i === current));
    this.status.textContent = `Place ${current + 1} of ${this.count}`;
  }

  play() {
    this.stop();
    if (!this.autoplay) return;

    this.timer = setInterval(() => this.moveTo(this.index + 1), this.interval);
    this.status.setAttribute("aria-live", "off"); // don't announce every auto-advance
  }

  stop() {
    clearInterval(this.timer);
    this.status.setAttribute("aria-live", "polite");
  }
}

new Slider(document.querySelector(".slider"));

// Quick fact: show one fact at a time and cycle on click
const facts = [...document.querySelectorAll(".facts li")];
let fact = 0;

document.querySelector(".next-fact").addEventListener("click", () => {
  facts[fact].hidden = true;
  fact = (fact + 1) % facts.length;
  facts[fact].hidden = false;
});
