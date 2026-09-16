/**
 * JUMPER // CYBERWEAR — INTERACTIVE BUNDLE BUILDER
 * 4-Step interactive custom bundle builder with live gift box & savings calculation
 */

class BundleBuilder {
  constructor() {
    this.container = document.querySelector('.bundle-builder-section');
    if (!this.container) return;

    // State
    this.category = 'Trunks';
    this.packSize = 3;
    this.discount = 0.30; // 30% off
    this.selectedColors = ['#D6FF28', '#9A5CFF', '#3BE7FF'];
    this.basePricePerUnit = 28.00;
    this.size = 'M';

    this.initDOM();
    this.bindEvents();
    this.render();
  }

  initDOM() {
    this.categoryChips = this.container.querySelectorAll('[data-bundle-cat]');
    this.packChips = this.container.querySelectorAll('[data-bundle-pack]');
    this.sizeChips = this.container.querySelectorAll('[data-bundle-size]');
    this.colorSwatches = this.container.querySelectorAll('[data-bundle-color]');
    
    this.priceCurrentEl = this.container.querySelector('.bundle-price-current');
    this.priceOriginalEl = this.container.querySelector('.bundle-price-original');
    this.savingsBadgeEl = this.container.querySelector('.bundle-savings-badge');
    this.slotsContainer = this.container.querySelector('.bundle-item-slots');
    this.addToCartBtn = this.container.querySelector('#bundle-add-to-cart');
  }

  bindEvents() {
    // Category click
    this.categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.categoryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.category = chip.getAttribute('data-bundle-cat');
        this.animateBoxBounce();
        this.render();
      });
    });

    // Pack Size click
    this.packChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.packChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.packSize = parseInt(chip.getAttribute('data-bundle-pack'), 10);
        this.discount = parseFloat(chip.getAttribute('data-discount'));
        
        // Adjust colors array to match pack size
        const defaultPalette = ['#D6FF28', '#9A5CFF', '#3BE7FF', '#F5F7FA', '#0E1325', '#FF3B69', '#2BD9FE'];
        this.selectedColors = [];
        for (let i = 0; i < this.packSize; i++) {
          this.selectedColors.push(defaultPalette[i % defaultPalette.length]);
        }
        
        this.triggerPackSelectAnimation();
        this.render();
      });
    });

    // Size selection
    this.sizeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.sizeChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.size = chip.getAttribute('data-bundle-size');
      });
    });

    // Color Swatches click
    this.colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const color = swatch.getAttribute('data-bundle-color');
        // Rotate into the last empty or cycle
        if (this.selectedColors.length >= this.packSize) {
          this.selectedColors.shift();
        }
        this.selectedColors.push(color);
        this.animateSlotFill();
        this.render();
      });
    });

    // Add to Cart
    if (this.addToCartBtn) {
      this.addToCartBtn.addEventListener('click', () => {
        this.handleAddToCart();
      });
    }
  }

  render() {
    const rawTotal = this.basePricePerUnit * this.packSize;
    const discountedTotal = rawTotal * (1 - this.discount);
    const savingsAmount = rawTotal - discountedTotal;
    const savingsPercent = Math.round(this.discount * 100);

    if (this.priceCurrentEl) {
      this.priceCurrentEl.textContent = `$${discountedTotal.toFixed(2)}`;
    }
    if (this.priceOriginalEl) {
      this.priceOriginalEl.textContent = `$${rawTotal.toFixed(2)}`;
    }
    if (this.savingsBadgeEl) {
      this.savingsBadgeEl.textContent = `${this.packSize}-Pack • Save ${savingsPercent}% ($${savingsAmount.toFixed(2)})`;
    }

    // Render Slots in Box
    if (this.slotsContainer) {
      this.slotsContainer.innerHTML = '';
      for (let i = 0; i < this.packSize; i++) {
        const slot = document.createElement('div');
        slot.className = 'bundle-slot filled';
        const color = this.selectedColors[i] || '#D6FF28';
        slot.style.backgroundColor = color + '33';
        slot.style.borderColor = color;
        slot.innerHTML = `<span style="display:inline-block; width:14px; height:14px; border-radius:50%; background-color:${color}; box-shadow:0 0 10px ${color}"></span>`;
        this.slotsContainer.appendChild(slot);
      }
    }
  }

  animateBoxBounce() {
    const box = this.container.querySelector('.bundle-3d-box');
    if (box && typeof gsap !== 'undefined') {
      gsap.fromTo(box, { scale: 0.92, rotateY: -15 }, { scale: 1, rotateY: 6, duration: 0.6, ease: 'back.out(2)' });
    }
  }

  animateSlotFill() {
    const box = this.container.querySelector('.bundle-3d-box');
    if (box && typeof gsap !== 'undefined') {
      gsap.fromTo(box, { y: -8 }, { y: 0, duration: 0.3, ease: 'power2.out' });
    }
  }

  triggerPackSelectAnimation() {
    this.animateBoxBounce();
    // Confetti burst on selecting high tier
    if (this.packSize >= 5 && typeof confetti !== 'undefined') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#D6FF28', '#9A5CFF', '#3BE7FF']
      });
    }
  }

  handleAddToCart() {
    const rawTotal = this.basePricePerUnit * this.packSize;
    const discountedTotal = (rawTotal * (1 - this.discount)).toFixed(2);

    const bundleItem = {
      id: `bundle-${Date.now()}`,
      title: `${this.packSize}-Pack Custom Cyber ${this.category}`,
      variant: `Size: ${this.size} / Colors: ${this.selectedColors.length} Selected`,
      price: parseFloat(discountedTotal),
      originalPrice: rawTotal,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80',
      isBundle: true
    };

    if (window.themeCart) {
      window.themeCart.addItem(bundleItem);
    }

    // Celebration Confetti
    if (typeof confetti !== 'undefined') {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D6FF28', '#9A5CFF', '#3BE7FF', '#FFFFFF']
      });
    }
  }
}

window.BundleBuilder = BundleBuilder;
