/**
 * JUMPER // CYBERWEAR — MAIN THEME JS
 * AJAX Cart Engine, Wishlist, Quick View, Color Studio & Predictive Search
 */

class ThemeCart {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('jumper_cart_items') || '[]');
    this.drawer = document.querySelector('.cart-drawer');
    this.backdrop = document.querySelector('.cart-drawer-backdrop');
    this.itemsList = document.querySelector('.cart-items-list');
    this.subtotalEl = document.querySelector('.cart-subtotal-price');
    this.countBadges = document.querySelectorAll('.cart-counter');
    this.freeShippingBar = document.querySelector('.free-shipping-fill');
    this.freeShippingText = document.querySelector('.free-shipping-text');
    this.freeShippingThreshold = 75.00;

    this.init();
  }

  init() {
    this.bindEvents();
    this.render();

    // Default pre-loaded sample items if cart is empty
    if (this.items.length === 0) {
      this.addItem({
        id: 'cyber-trunk-01',
        title: 'NEO-TRUNK 01 // Cyber Lime',
        variant: 'Size: M / Neon Lime',
        price: 32.00,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80'
      }, false);
    }
  }

  bindEvents() {
    // Open cart drawer triggers
    document.querySelectorAll('[data-open-cart]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    });

    // Close cart triggers
    document.querySelectorAll('[data-close-cart]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
      });
    });

    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => this.close());
    }

    // Direct Add to Cart buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-quick-add]');
      if (btn) {
        e.preventDefault();
        const id = btn.getAttribute('data-product-id');
        const title = btn.getAttribute('data-product-title');
        const price = parseFloat(btn.getAttribute('data-product-price') || 32);
        const image = btn.getAttribute('data-product-image');
        const variant = btn.getAttribute('data-product-variant') || 'Size: M';

        this.addItem({ id, title, price, image, variant, quantity: 1 });
      }
    });
  }

  open() {
    this.drawer?.classList.add('active');
    this.backdrop?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.drawer?.classList.remove('active');
    this.backdrop?.classList.remove('active');
    document.body.style.overflow = '';
  }

  addItem(product, openDrawer = true) {
    const existing = this.items.find(i => i.id === product.id && i.variant === product.variant);
    if (existing) {
      existing.quantity += product.quantity || 1;
    } else {
      this.items.push({
        id: product.id,
        title: product.title,
        variant: product.variant || 'Standard',
        price: product.price,
        image: product.image,
        quantity: product.quantity || 1
      });
    }

    this.save();
    this.render();
    if (openDrawer) {
      this.open();
      this.showToast(`Added ${product.title} to Bag!`);
    }
  }

  updateQuantity(id, variant, delta) {
    const item = this.items.find(i => i.id === id && i.variant === variant);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.items = this.items.filter(i => !(i.id === id && i.variant === variant));
      }
    }
    this.save();
    this.render();
  }

  removeItem(id, variant) {
    this.items = this.items.filter(i => !(i.id === id && i.variant === variant));
    this.save();
    this.render();
  }

  save() {
    localStorage.setItem('jumper_cart_items', JSON.stringify(this.items));
  }

  render() {
    const totalCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Update Counter Badges
    this.countBadges.forEach(b => {
      b.textContent = totalCount;
      b.style.display = totalCount > 0 ? 'flex' : 'none';
    });

    // Update Subtotal
    if (this.subtotalEl) {
      this.subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    }

    // Update Free Shipping Bar
    if (this.freeShippingBar && this.freeShippingText) {
      const remaining = Math.max(0, this.freeShippingThreshold - subtotal);
      const percentage = Math.min(100, (subtotal / this.freeShippingThreshold) * 100);
      this.freeShippingBar.style.width = `${percentage}%`;

      if (remaining === 0) {
        this.freeShippingText.innerHTML = `🎉 You unlocked <strong>FREE EXPRESS SHIPPING</strong>!`;
      } else {
        this.freeShippingText.innerHTML = `Add <strong>$${remaining.toFixed(2)}</strong> more for <strong>FREE EXPRESS SHIPPING</strong>`;
      }
    }

    // Render Items List
    if (this.itemsList) {
      if (this.items.length === 0) {
        this.itemsList.innerHTML = `
          <div style="text-align:center; padding: 4rem 1rem; color: var(--text-muted);">
            <p style="font-size:1.1rem; margin-bottom:1.5rem;">Your cyber bag is currently empty.</p>
            <a href="#shop" class="btn btn-primary btn-pill" data-close-cart>Explore Drops</a>
          </div>
        `;
        return;
      }

      this.itemsList.innerHTML = this.items.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.image}" alt="${item.title}" class="cart-item-img">
          <div class="cart-item-details">
            <h4>${item.title}</h4>
            <p class="cart-item-variant">${item.variant}</p>
            <div class="cart-qty-ctrl">
              <button class="cart-qty-btn" onclick="window.themeCart.updateQuantity('${item.id}', '${item.variant}', -1)">-</button>
              <span class="cart-qty-num">${item.quantity}</span>
              <button class="cart-qty-btn" onclick="window.themeCart.updateQuantity('${item.id}', '${item.variant}', 1)">+</button>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-display); font-size:1.25rem; color:var(--white); margin-bottom:0.4rem;">
              $${(item.price * item.quantity).toFixed(2)}
            </div>
            <button onclick="window.themeCart.removeItem('${item.id}', '${item.variant}')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:0.75rem; text-transform:uppercase; font-weight:700;">Remove</button>
          </div>
        </div>
      `).join('');
    }
  }

  showToast(message) {
    let toast = document.getElementById('cyber-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cyber-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: var(--surface-glass-heavy);
        border: 1px solid var(--neon-lime);
        color: var(--white);
        padding: 0.85rem 1.75rem;
        border-radius: 999px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8), var(--glow-lime);
        z-index: 99999;
        font-family: var(--font-heading);
        font-weight: 700;
        font-size: 0.9rem;
        backdrop-filter: blur(16px);
        transition: transform 0.4s var(--ease-elastic);
        display: flex;
        align-items: center;
        gap: 0.6rem;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="color:var(--neon-lime);">●</span> ${message}`;
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 2800);
  }
}

/**
 * Quick View Modal Manager
 */
class QuickViewManager {
  constructor() {
    this.backdrop = document.querySelector('#quick-view-modal');
    this.dialog = this.backdrop?.querySelector('.modal-dialog');
    this.closeBtn = this.backdrop?.querySelector('.modal-close-btn');

    this.init();
  }

  init() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-quick-view]');
      if (btn) {
        e.preventDefault();
        const data = {
          title: btn.getAttribute('data-product-title') || 'NEO-TRUNK 01 // Cyber Edition',
          price: btn.getAttribute('data-product-price') || '32.00',
          image: btn.getAttribute('data-product-image') || 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80',
          desc: 'Engineered with quantum MicroModal fabric, zero ride-up ergonomic pouch, and 4-way hyper-stretch waistband for all-day cyber performance.'
        };
        this.open(data);
      }
    });

    this.closeBtn?.addEventListener('click', () => this.close());
    this.backdrop?.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
  }

  open(product) {
    if (!this.backdrop) return;
    
    // Fill data
    const titleEl = this.backdrop.querySelector('.qv-title');
    const priceEl = this.backdrop.querySelector('.qv-price');
    const imgEl = this.backdrop.querySelector('.qv-image');
    const descEl = this.backdrop.querySelector('.qv-desc');
    const addBtn = this.backdrop.querySelector('#qv-add-btn');

    if (titleEl) titleEl.textContent = product.title;
    if (priceEl) priceEl.textContent = `$${product.price}`;
    if (imgEl) imgEl.src = product.image;
    if (descEl) descEl.textContent = product.desc;

    if (addBtn) {
      addBtn.onclick = () => {
        window.themeCart?.addItem({
          id: `qv-${Date.now()}`,
          title: product.title,
          price: parseFloat(product.price),
          image: product.image,
          variant: 'Size: M / Stealth Neon'
        });
        this.close();
      };
    }

    this.backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.backdrop?.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Color Studio Lighting Shift Controller
 */
class ColorStudio {
  constructor() {
    this.swatches = document.querySelectorAll('.pdp-swatches-row .color-swatch-chip');
    this.pdpSection = document.querySelector('.pdp-section');
    this.aurora1 = document.querySelector('.aurora-orb-1');
    this.aurora2 = document.querySelector('.aurora-orb-2');
    this.heroScene = window.heroSceneInstance;

    this.init();
  }

  init() {
    this.swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        this.swatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');

        const colorHex = swatch.getAttribute('data-color');
        const colorName = swatch.getAttribute('data-name');
        const label = document.querySelector('.pdp-selected-color-name');
        if (label) label.textContent = colorName;

        this.updateLighting(colorHex, colorName);
      });
    });
  }

  updateLighting(colorHex, colorName) {
    if (this.aurora1) {
      this.aurora1.style.background = `radial-gradient(circle, ${colorHex} 0%, transparent 70%)`;
    }
    if (window.heroSceneInstance) {
      window.heroSceneInstance.setGarmentColor(colorHex, colorHex, colorName);
    }
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.themeCart = new ThemeCart();
  window.quickView = new QuickViewManager();
  window.colorStudio = new ColorStudio();
  window.bundleBuilder = new BundleBuilder();

  // Initialize 3D Hero Scene
  if (document.getElementById('hero-3d-canvas')) {
    window.heroSceneInstance = new Hero3DScene('hero-3d-canvas');
  }

  // Initialize Fabric Weave Visualizer Canvas
  if (document.getElementById('fabric-weave-canvas')) {
    new FabricVisualizer('fabric-weave-canvas');
  }

  // Sticky Purchase Bar on PDP
  const stickyBar = document.querySelector('.sticky-purchase-bar');
  if (stickyBar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 600) {
        stickyBar.classList.add('visible');
      } else {
        stickyBar.classList.remove('visible');
      }
    });
  }

  // Wishlist Toggle
  document.querySelectorAll('.product-card-wishlist').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.classList.toggle('active');
      const isLoved = btn.classList.contains('active');
      window.themeCart?.showToast(isLoved ? 'Added to Cyber Wishlist ❤️' : 'Removed from Wishlist');
    });
  });
});
