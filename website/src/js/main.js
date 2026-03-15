/* WBB — Progressive Enhancement JS */

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initDropdowns();
  initAccordion();
  initScrollReveal();
});

/* ── Mobile Navigation Toggle ── */
function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    menu.classList.toggle("is-open");
    document.body.classList.toggle("nav-open");
  });

  // Close menu when clicking a link
  menu.querySelectorAll("a:not(.dropdown-toggle)").forEach((link) => {
    link.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      menu.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    });
  });
}

/* ── Dropdown Menus ── */
function initDropdowns() {
  document.querySelectorAll(".dropdown").forEach((dropdown) => {
    const toggle = dropdown.querySelector(".dropdown-toggle");
    const menu = dropdown.querySelector(".dropdown-menu");
    if (!toggle || !menu) return;

    // Click toggle on mobile, hover on desktop
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      const isOpen = dropdown.classList.contains("is-open");

      // Close other dropdowns
      document.querySelectorAll(".dropdown.is-open").forEach((d) => {
        if (d !== dropdown) d.classList.remove("is-open");
      });

      dropdown.classList.toggle("is-open", !isOpen);
      toggle.setAttribute("aria-expanded", String(!isOpen));
    });

    // Keyboard support
    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle.click();
      }
      if (e.key === "Escape") {
        dropdown.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) {
      document.querySelectorAll(".dropdown.is-open").forEach((d) => {
        d.classList.remove("is-open");
        d.querySelector(".dropdown-toggle")?.setAttribute("aria-expanded", "false");
      });
    }
  });
}

/* ── FAQ Accordion ── */
function initAccordion() {
  document.querySelectorAll(".accordion-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const expanded = trigger.getAttribute("aria-expanded") === "true";
      const content = document.getElementById(trigger.getAttribute("aria-controls"));
      if (!content) return;

      // Optionally close siblings
      const accordion = trigger.closest(".accordion");
      if (accordion) {
        accordion.querySelectorAll(".accordion-trigger[aria-expanded='true']").forEach((other) => {
          if (other !== trigger) {
            other.setAttribute("aria-expanded", "false");
            const otherContent = document.getElementById(other.getAttribute("aria-controls"));
            if (otherContent) otherContent.hidden = true;
          }
        });
      }

      trigger.setAttribute("aria-expanded", String(!expanded));
      content.hidden = expanded;
    });
  });
}

/* ── Scroll Reveal ── */
function initScrollReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  els.forEach((el) => observer.observe(el));
}
