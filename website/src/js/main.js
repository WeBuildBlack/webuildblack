/* WBB — Progressive Enhancement JS */

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initDropdowns();
  initAccordion();
  initScrollReveal();
});

/* ── Mobile Navigation Toggle ── */
function initMobileNav() {
  const toggle = document.querySelector(".nav__mobile-toggle");
  const menu = document.querySelector(".nav__menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    menu.classList.toggle("is-open");
    document.body.classList.toggle("nav-open");
    toggle.textContent = expanded ? "Menu" : "Close";
  });

  // Close menu when clicking a non-dropdown link
  menu.querySelectorAll("a:not(.nav__dropdown-btn)").forEach((link) => {
    link.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      menu.classList.remove("is-open");
      document.body.classList.remove("nav-open");
      toggle.textContent = "Menu";
    });
  });
}

/* ── Dropdown Menus ── */
function initDropdowns() {
  document.querySelectorAll(".nav__dropdown").forEach((dropdown) => {
    const btn = dropdown.querySelector(".nav__dropdown-btn");
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const isOpen = dropdown.classList.contains("is-open");

      // Close other dropdowns
      document.querySelectorAll(".nav__dropdown.is-open").forEach((d) => {
        if (d !== dropdown) {
          d.classList.remove("is-open");
          d.querySelector(".nav__dropdown-btn")?.setAttribute("aria-expanded", "false");
        }
      });

      dropdown.classList.toggle("is-open", !isOpen);
      btn.setAttribute("aria-expanded", String(!isOpen));
    });

    // Keyboard support
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        btn.click();
      }
      if (e.key === "Escape") {
        dropdown.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav__dropdown")) {
      document.querySelectorAll(".nav__dropdown.is-open").forEach((d) => {
        d.classList.remove("is-open");
        d.querySelector(".nav__dropdown-btn")?.setAttribute("aria-expanded", "false");
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

      // Close siblings
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
