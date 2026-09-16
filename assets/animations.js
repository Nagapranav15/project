/**
 * JUMPER // CYBERWEAR — ANIMATION ENGINE
 * GSAP, ScrollTrigger, Lenis Smooth Scroll, Custom Neon Cursor & Cinematic Loader
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lenis Smooth Scroll cleanly with GSAP
  let lenis = null;
  if (typeof Lenis !== 'undefined') {
    try {
      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 2.0,
        infinite: false
      });

      // Synchronize Lenis with GSAP ticker
      if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      } else {
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }
      window.lenis = lenis;
    } catch (e) {
      console.warn('Lenis smooth scroll fallback to native', e);
    }
  }

  // 2. Cinematic Loading Sequence
  initCinematicLoader();

  // 3. Custom Neon Cursor & Trailing Glow
  initCustomCursor();

  // 4. 3D Card Tilt Effects
  init3DTilt();

  // 5. GSAP ScrollTrigger Animations
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    initScrollTriggers();
  }

  // 6. Sticky Header Scroll Monitor
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  });
});

/**
 * 1. Cinematic Loading Sequence
 */
function initCinematicLoader() {
  const loader = document.getElementById('cinematic-loader');
  if (!loader) return;

  const progressFill = loader.querySelector('.loader-progress-fill');
  const letters = loader.querySelectorAll('.loader-headline span');
  
  const dismissLoader = () => {
    if (loader.dataset.dismissed) return;
    loader.dataset.dismissed = 'true';
    gsap.to(loader, {
      opacity: 0,
      scale: 1.03,
      duration: 0.5,
      ease: 'power2.inOut',
      onComplete: () => {
        loader.classList.add('loaded');
        loader.style.display = 'none';
        loader.style.pointerEvents = 'none';
        animateHeroEntry();
      }
    });
  };

  // Click or keypress to skip intro immediately
  loader.addEventListener('click', dismissLoader);
  window.addEventListener('keydown', dismissLoader, { once: true });

  const tl = gsap.timeline({
    onComplete: dismissLoader
  });

  // Animate progress bar
  tl.to(progressFill, { width: '100%', duration: 1.8, ease: 'power2.inOut' });

  // Letters RGB entrance & glitch
  if (letters.length > 0) {
    tl.to(letters, {
      opacity: 1,
      y: 0,
      skewY: 0,
      duration: 0.5,
      stagger: 0.03,
      ease: 'back.out(2)'
    }, 0.5);
  }

  // Fallback safety timer
  setTimeout(dismissLoader, 3000);
}

/**
 * Hero Entry Animation
 */
function animateHeroEntry() {
  if (typeof gsap === 'undefined') return;

  gsap.from('.hero-tagline', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' });
  gsap.from('.hero-title', { y: 40, opacity: 0, duration: 1.0, delay: 0.2, ease: 'power3.out' });
  gsap.from('.hero-subtitle', { y: 30, opacity: 0, duration: 0.8, delay: 0.4, ease: 'power3.out' });
  gsap.from('.hero-buttons', { y: 30, opacity: 0, duration: 0.8, delay: 0.6, ease: 'power3.out' });
  gsap.from('.trust-badge-item', { y: 20, opacity: 0, stagger: 0.1, duration: 0.6, delay: 0.8, ease: 'back.out(1.5)' });
}

/**
 * 2. Custom Neon Magnetic Cursor
 */
function initCustomCursor() {
  const cursor = document.querySelector('.custom-cursor');
  const follower = document.querySelector('.custom-cursor-follower');
  if (!cursor || !follower) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let followerX = mouseX;
  let followerY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
  });

  function renderFollower() {
    followerX += (mouseX - followerX) * 0.15;
    followerY += (mouseY - followerY) * 0.15;
    follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(renderFollower);
  }
  requestAnimationFrame(renderFollower);

  // Magnetic hover effect on interactive elements
  const interactives = document.querySelectorAll('a, button, .interactive, .product-card, .collection-card, .bundle-chip');
  interactives.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

/**
 * 3. 3D Card Tilt Effects
 */
function init3DTilt() {
  const tiltCards = document.querySelectorAll('.product-card, .collection-card');

  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  });
}

/**
 * 4. GSAP ScrollTriggers (Pinned Horizontal Scroll & Chapter Reveals)
 */
function initScrollTriggers() {
  // Pinned Horizontal Fabric Story
  const fabricSection = document.querySelector('.fabric-story-section');
  const fabricTrack = document.querySelector('.fabric-horizontal-track');

  if (fabricSection && fabricTrack) {
    gsap.to(fabricTrack, {
      x: () => -(fabricTrack.scrollWidth - window.innerWidth + 120),
      ease: 'none',
      scrollTrigger: {
        trigger: fabricSection,
        start: 'top top',
        end: () => `+=${Math.max(fabricTrack.scrollWidth - window.innerWidth + 120, 800)}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });
  }

  // Refresh triggers on window load to ensure all asset dimensions are updated
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });
  setTimeout(() => ScrollTrigger.refresh(), 1000);

  // Floating Collection Cards Stagger Entrance
  gsap.from('.collection-card', {
    scrollTrigger: {
      trigger: '.collections-grid',
      start: 'top 80%'
    },
    y: 80,
    opacity: 0,
    duration: 0.9,
    stagger: 0.15,
    ease: 'power3.out'
  });

  // Product Grid Stagger Entrance
  gsap.from('.product-card', {
    scrollTrigger: {
      trigger: '.products-grid',
      start: 'top 85%'
    },
    y: 60,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: 'power3.out'
  });

  // Reviews Floating Cards Stagger
  gsap.from('.review-card', {
    scrollTrigger: {
      trigger: '.reviews-carousel-track',
      start: 'top 85%'
    },
    scale: 0.9,
    y: 40,
    opacity: 0,
    duration: 0.8,
    stagger: 0.12,
    ease: 'back.out(1.5)'
  });
}
