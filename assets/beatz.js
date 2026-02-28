/* ============================================================
   BEATZ — Luxury Jewelry & Fashion Shopify Theme
   Main JavaScript
   ============================================================ */

(function () {
  'use strict';

  const Beatz = window.Beatz || {};

  /* -----------------------------------------------------------
     Utility helpers
  ----------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function formatMoney(cents) {
    const format = Beatz.money_format || '${{amount}}';
    const amount = (cents / 100).toFixed(2);
    return format
      .replace('{{amount}}', amount)
      .replace('{{amount_no_decimals}}', Math.round(cents / 100))
      .replace('{{amount_with_comma_separator}}', amount.replace('.', ','));
  }

  function debounce(fn, delay = 250) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /* -----------------------------------------------------------
     Scroll-reveal animations (IntersectionObserver)
  ----------------------------------------------------------- */
  function initScrollReveal() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    $$('[data-animate], [data-stagger]').forEach((el) => observer.observe(el));
  }

  /* -----------------------------------------------------------
     Header — sticky + scroll class
  ----------------------------------------------------------- */
  function initHeader() {
    const header = $('.header');
    if (!header) return;

    let lastScroll = 0;

    window.addEventListener(
      'scroll',
      debounce(() => {
        const scrollY = window.scrollY;
        header.classList.toggle('header--scrolled', scrollY > 60);
        lastScroll = scrollY;
      }, 10)
    );
  }

  /* -----------------------------------------------------------
     Mobile menu
  ----------------------------------------------------------- */
  function initMobileMenu() {
    const menu = $('.mobile-menu');
    if (!menu) return;

    const openBtn = $('.header__menu-btn');
    const closeBtn = $('.mobile-menu__close');
    const overlay = $('.mobile-menu__overlay');

    function open() {
      menu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    if (openBtn) openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);
  }

  /* -----------------------------------------------------------
     Search overlay
  ----------------------------------------------------------- */
  function initSearch() {
    const overlay = $('.search-overlay');
    if (!overlay) return;

    const openBtns = $$('[data-search-open]');
    const closeBtn = $('.search-overlay__close');
    const input = $('.search-overlay__input');

    function open() {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => input && input.focus(), 300);
    }

    function close() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    openBtns.forEach((btn) => btn.addEventListener('click', open));
    if (closeBtn) closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });
  }

  /* -----------------------------------------------------------
     Cart drawer
  ----------------------------------------------------------- */
  function initCartDrawer() {
    const drawer = $('.cart-drawer');
    if (!drawer) return;

    const openBtns = $$('[data-cart-open]');
    const closeBtn = $('.cart-drawer__close');
    const overlay = $('.cart-drawer__overlay');

    function open() {
      drawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      drawer.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    openBtns.forEach((btn) => btn.addEventListener('click', open));
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });

    // AJAX add-to-cart
    document.addEventListener('submit', async (e) => {
      const form = e.target.closest('form[action*="/cart/add"]');
      if (!form) return;
      e.preventDefault();

      const submitBtn = form.querySelector('[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.textContent = 'Adding...';
        submitBtn.disabled = true;
      }

      try {
        const formData = new FormData(form);
        const res = await fetch(Beatz.routes.cart_add_url + '.js', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Add to cart failed');

        await refreshCartDrawer();
        open();
      } catch (err) {
        console.error(err);
      } finally {
        if (submitBtn) {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      }
    });
  }

  async function refreshCartDrawer() {
    try {
      const res = await fetch('/?section_id=cart-drawer-content');
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newContent = doc.querySelector('.cart-drawer__content');
      const oldContent = document.querySelector('.cart-drawer__content');
      if (newContent && oldContent) {
        oldContent.innerHTML = newContent.innerHTML;
      }
      updateCartCount();
    } catch (err) {
      console.error('Failed to refresh cart:', err);
    }
  }

  async function updateCartCount() {
    try {
      const res = await fetch(Beatz.routes.cart_url + '.js');
      const cart = await res.json();
      $$('.header__cart-count').forEach((el) => {
        el.textContent = cart.item_count;
        el.style.display = cart.item_count > 0 ? 'flex' : 'none';
      });
    } catch (err) {
      console.error(err);
    }
  }

  /* -----------------------------------------------------------
     Product page — gallery, variants, accordion
  ----------------------------------------------------------- */
  function initProductPage() {
    // Thumbnail gallery
    const thumbs = $$('.product-gallery__thumb');
    const mainImage = $('.product-gallery__main img');

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        thumbs.forEach((t) => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
        if (mainImage) {
          mainImage.src = thumb.dataset.src || thumb.querySelector('img')?.src;
          mainImage.srcset = thumb.dataset.srcset || '';
        }
      });
    });

    // Variant selectors
    $$('.product-option__value').forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.product-option__values');
        group.querySelectorAll('.product-option__value').forEach((b) =>
          b.classList.remove('is-selected')
        );
        btn.classList.add('is-selected');
      });
    });

    $$('.product-option__swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.product-option__values');
        group.querySelectorAll('.product-option__swatch').forEach((b) =>
          b.classList.remove('is-selected')
        );
        btn.classList.add('is-selected');
      });
    });

    // Accordion
    $$('.product-accordion__trigger').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.product-accordion__item');
        const isOpen = item.classList.contains('is-open');

        // Close others in same accordion
        item
          .closest('.product-accordion')
          .querySelectorAll('.product-accordion__item')
          .forEach((i) => i.classList.remove('is-open'));

        if (!isOpen) item.classList.add('is-open');
      });
    });

    // Quantity buttons
    $$('.product-form__quantity').forEach((group) => {
      const input = group.querySelector('input');
      const minusBtn = group.querySelector('[data-qty-minus]');
      const plusBtn = group.querySelector('[data-qty-plus]');

      if (minusBtn)
        minusBtn.addEventListener('click', () => {
          const v = parseInt(input.value) || 1;
          input.value = Math.max(1, v - 1);
        });

      if (plusBtn)
        plusBtn.addEventListener('click', () => {
          const v = parseInt(input.value) || 1;
          input.value = v + 1;
        });
    });
  }

  /* -----------------------------------------------------------
     Testimonials slider
  ----------------------------------------------------------- */
  function initTestimonials() {
    const slider = $('.testimonials__slider');
    if (!slider) return;

    const prevBtn = $('.testimonials__nav-btn--prev');
    const nextBtn = $('.testimonials__nav-btn--next');
    const slides = $$('.testimonials__slide', slider);

    let current = 0;

    function goTo(index) {
      current = Math.max(0, Math.min(index, slides.length - 1));
      const slide = slides[current];
      if (!slide) return;

      const containerWidth = slider.parentElement.offsetWidth;
      const slideWidth = slide.offsetWidth + 32; // gap
      const offset = slideWidth * current - (containerWidth - slide.offsetWidth) / 2;

      slider.style.transform = `translateX(-${Math.max(0, offset)}px)`;
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

    // Touch support
    let touchStartX = 0;
    slider.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    });
    slider.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        goTo(diff > 0 ? current + 1 : current - 1);
      }
    });
  }

  /* -----------------------------------------------------------
     Marquee — pause on hover
  ----------------------------------------------------------- */
  function initMarquee() {
    $$('.marquee-text__track, .announcement-bar__track').forEach((track) => {
      track.addEventListener('mouseenter', () => {
        track.style.animationPlayState = 'paused';
      });
      track.addEventListener('mouseleave', () => {
        track.style.animationPlayState = 'running';
      });
    });
  }

  /* -----------------------------------------------------------
     Custom cursor (desktop only)
  ----------------------------------------------------------- */
  function initCustomCursor() {
    if (!window.matchMedia('(hover: hover)').matches) return;

    const cursor = document.createElement('div');
    cursor.classList.add('custom-cursor');
    document.body.appendChild(cursor);

    let mouseX = 0;
    let mouseY = 0;
    let curX = 0;
    let curY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function render() {
      curX += (mouseX - curX) * 0.15;
      curY += (mouseY - curY) * 0.15;
      cursor.style.left = curX - 10 + 'px';
      cursor.style.top = curY - 10 + 'px';
      requestAnimationFrame(render);
    }
    render();

    // Hover effect on interactive elements
    const hoverTargets = 'a, button, [role="button"], input, select, textarea, .product-card';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverTargets)) {
        cursor.classList.add('custom-cursor--hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverTargets)) {
        cursor.classList.remove('custom-cursor--hover');
      }
    });
  }

  /* -----------------------------------------------------------
     Parallax scroll effect
  ----------------------------------------------------------- */
  function initParallax() {
    const parallaxEls = $$('.parallax');
    if (!parallaxEls.length) return;

    function update() {
      const scrollY = window.scrollY;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallaxSpeed) || 0.3;
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + scrollY - window.innerHeight / 2) * speed;
        el.style.transform = `translateY(${offset}px)`;
      });
      requestAnimationFrame(update);
    }
    update();
  }

  /* -----------------------------------------------------------
     Image lazy loading (native + fallback)
  ----------------------------------------------------------- */
  function initLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
          observer.unobserve(img);
        }
      });
    });

    $$('img[loading="lazy"]').forEach((img) => observer.observe(img));
  }

  /* -----------------------------------------------------------
     Collection page — filters toggle (mobile)
  ----------------------------------------------------------- */
  function initCollectionFilters() {
    const toggle = $('.collection-toolbar__filters-toggle');
    const sidebar = $('.collection-filters');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('is-open');
    });
  }

  /* -----------------------------------------------------------
     Quantity selectors in cart drawer
  ----------------------------------------------------------- */
  function initCartQuantity() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.cart-drawer__quantity button');
      if (!btn) return;

      const wrapper = btn.closest('.cart-drawer__quantity');
      const span = wrapper.querySelector('span');
      const line = parseInt(wrapper.dataset.line);
      let qty = parseInt(span.textContent) || 1;

      if (btn.dataset.action === 'minus') qty = Math.max(0, qty - 1);
      if (btn.dataset.action === 'plus') qty += 1;

      span.textContent = qty;

      try {
        await fetch(Beatz.routes.cart_change_url + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line, quantity: qty }),
        });
        await refreshCartDrawer();
      } catch (err) {
        console.error(err);
      }
    });
  }

  /* -----------------------------------------------------------
     Newsletter form — basic success/error handling
  ----------------------------------------------------------- */
  function initNewsletter() {
    $$('.newsletter__form').forEach((form) => {
      form.addEventListener('submit', (e) => {
        // Let Shopify handle the form natively, but add visual feedback
        const btn = form.querySelector('.newsletter__submit');
        if (btn) btn.textContent = 'Subscribing...';
      });
    });
  }

  /* -----------------------------------------------------------
     Init all modules on DOM ready
  ----------------------------------------------------------- */
  function init() {
    initScrollReveal();
    initHeader();
    initMobileMenu();
    initSearch();
    initCartDrawer();
    initCartQuantity();
    initProductPage();
    initTestimonials();
    initMarquee();
    initCustomCursor();
    initParallax();
    initLazyLoading();
    initCollectionFilters();
    initNewsletter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
