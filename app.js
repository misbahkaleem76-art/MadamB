/* Shared storefront logic: cart, wishlist, validation, persistence, toasts */
(function () {
    var KEYS = {
        cart: "madams_cart",
        wishlist: "madams_wishlist",
        session: "madams_session",
        prefs: "madams_preferences"
    };

    function read(key, fallback) {
        try {
            var value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    var state = {
        cart: read(KEYS.cart, []),
        wishlist: read(KEYS.wishlist, []),
        session: read(KEYS.session, { visits: 0, lastName: "", lastSeen: "" }),
        prefs: read(KEYS.prefs, {})
    };

    function money(n) {
        return "PKR " + Number(n || 0).toLocaleString();
    }

    function shippingFor(cart) {
        var qty = cart.reduce(function (acc, i) { return acc + i.qty; }, 0);
        var subtotal = cart.reduce(function (acc, i) { return acc + i.price * i.qty; }, 0);
        if (!qty) return 0;
        if (subtotal >= 5000) return 0;
        return qty <= 2 ? 250 : qty * 120;
    }

    function subtotalFor(item) {
        return item.price * item.qty;
    }

    function totals() {
        var subtotal = state.cart.reduce(function (acc, i) { return acc + subtotalFor(i); }, 0);
        var shipping = shippingFor(state.cart);
        return { subtotal: subtotal, shipping: shipping, total: subtotal + shipping };
    }

    function saveAll() {
        write(KEYS.cart, state.cart);
        write(KEYS.wishlist, state.wishlist);
        write(KEYS.session, state.session);
        write(KEYS.prefs, state.prefs);
    }

    function slug(s) {
        return String(s || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }

    function productFromCard(card) {
        var nameEl = card.querySelector(".product-name");
        var brandEl = card.querySelector(".product-brand");
        var priceEl = card.querySelector(".product-price");
        var imgEl = card.querySelector("img");
        var name = nameEl ? nameEl.textContent.trim() : "Product";
        var brand = brandEl ? brandEl.textContent.trim() : "Madam's Boutique";
        var priceText = priceEl ? priceEl.textContent : "0";
        var priceNum = Number((priceText.match(/[\d,]+/) || ["0"])[0].replace(/,/g, ""));
        var id = slug(brand + "-" + name);
        return {
            id: id,
            name: name,
            brand: brand,
            price: priceNum,
            image: imgEl ? imgEl.src : "",
            qty: 1
        };
    }

    function createToastContainer() {
        if (document.getElementById("toastContainer")) return;
        var wrap = document.createElement("div");
        wrap.id = "toastContainer";
        wrap.className = "toast-container-custom";
        document.body.appendChild(wrap);
    }

    function toast(msg, kind) {
        createToastContainer();
        var el = document.createElement("div");
        el.className = "toast-custom" + (kind ? " " + kind : "");
        el.textContent = msg;
        document.getElementById("toastContainer").appendChild(el);
        setTimeout(function () { el.classList.add("show"); }, 20);
        setTimeout(function () {
            el.classList.remove("show");
            setTimeout(function () { el.remove(); }, 300);
        }, 2200);
    }

    function setBadges() {
        var cartCount = state.cart.reduce(function (acc, i) { return acc + i.qty; }, 0);
        var wishCount = state.wishlist.length;
        var cartBadge = document.getElementById("cartCount") || document.getElementById("cartBadge");
        if (cartBadge) cartBadge.textContent = String(cartCount);
        var wishBadge = document.getElementById("wishlistCount");
        if (wishBadge) wishBadge.textContent = String(wishCount);
    }

    function ensurePanels() {
        if (!document.getElementById("cartPanel")) {
            var panelHtml = '' +
                '<div class="shop-panel" id="cartPanel">' +
                    '<div class="shop-panel-head"><h5>Cart</h5><button type="button" class="panel-close" data-close-panel="cartPanel">&times;</button></div>' +
                    '<div class="shop-panel-body" id="cartItems"></div>' +
                    '<div class="shop-panel-foot">' +
                        '<div class="bill-line"><span>Subtotal</span><strong id="billSubtotal">PKR 0</strong></div>' +
                        '<div class="bill-line"><span>Shipping</span><strong id="billShipping">PKR 0</strong></div>' +
                        '<div class="bill-line total"><span>Total</span><strong id="billTotal">PKR 0</strong></div>' +
                        '<button class="btn btn-primary-custom w-100 mt-2" id="placeOrderBtn" type="button">Place Order</button>' +
                    '</div>' +
                '</div>';
            document.body.insertAdjacentHTML("beforeend", panelHtml);
        }
        if (!document.getElementById("wishlistPanel")) {
            var wishHtml = '' +
                '<div class="shop-panel" id="wishlistPanel">' +
                    '<div class="shop-panel-head"><h5>Wishlist</h5><button type="button" class="panel-close" data-close-panel="wishlistPanel">&times;</button></div>' +
                    '<div class="shop-panel-body" id="wishlistItems"></div>' +
                '</div>';
            document.body.insertAdjacentHTML("beforeend", wishHtml);
        }
        if (!document.getElementById("panelBackdrop")) {
            document.body.insertAdjacentHTML("beforeend", '<div class="panel-backdrop" id="panelBackdrop"></div>');
        }
    }

    function renderCart() {
        var cartWrap = document.getElementById("cartItems");
        if (!cartWrap) return;
        if (!state.cart.length) {
            cartWrap.innerHTML = '<p class="empty-note">Your cart is empty.</p>';
        } else {
            cartWrap.innerHTML = state.cart.map(function (item) {
                return '' +
                    '<div class="shop-item">' +
                        '<div><strong>' + item.name + '</strong><div class="small text-muted">' + item.brand + '</div><div class="small">Qty: ' + item.qty + '</div></div>' +
                        '<div class="text-end"><div>' + money(subtotalFor(item)) + '</div><button class="remove-item" data-remove-cart="' + item.id + '">Remove</button></div>' +
                    '</div>';
            }).join("");
        }
        var t = totals();
        var sub = document.getElementById("billSubtotal");
        var ship = document.getElementById("billShipping");
        var total = document.getElementById("billTotal");
        if (sub) sub.textContent = money(t.subtotal);
        if (ship) ship.textContent = money(t.shipping);
        if (total) total.textContent = money(t.total);
    }

    function renderWishlist() {
        var wishWrap = document.getElementById("wishlistItems");
        if (!wishWrap) return;
        if (!state.wishlist.length) {
            wishWrap.innerHTML = '<p class="empty-note">No liked items yet.</p>';
            return;
        }
        wishWrap.innerHTML = state.wishlist.map(function (item) {
            return '' +
                '<div class="shop-item">' +
                    '<div><strong>' + item.name + '</strong><div class="small text-muted">' + item.brand + '</div></div>' +
                    '<div class="text-end"><button class="remove-item" data-remove-wish="' + item.id + '">Remove</button></div>' +
                '</div>';
        }).join("");
    }

    function refreshUI() {
        setBadges();
        renderCart();
        renderWishlist();
        syncHeartStates();
    }

    function refreshCartUI() {
        setBadges();
        renderCart();
    }

    function refreshWishlistUI() {
        setBadges();
        renderWishlist();
        syncHeartStates();
    }

    function openPanel(id) {
        ensurePanels();
        var panel = document.getElementById(id);
        var back = document.getElementById("panelBackdrop");
        if (!panel || !back) return;
        panel.classList.add("open");
        back.classList.add("show");
    }

    function closePanels() {
        document.querySelectorAll(".shop-panel").forEach(function (p) { p.classList.remove("open"); });
        var back = document.getElementById("panelBackdrop");
        if (back) back.classList.remove("show");
    }

    function addCart(product) {
        var existing = state.cart.find(function (i) { return i.id === product.id; });
        if (existing) existing.qty += 1;
        else state.cart.push(product);
        saveAll();
        refreshCartUI();
        toast("Added to cart!", "ok");
    }

    function removeCart(id) {
        state.cart = state.cart.filter(function (i) { return i.id !== id; });
        saveAll();
        refreshCartUI();
        toast("Removed from cart", "warn");
    }

    function toggleWish(product) {
        var idx = state.wishlist.findIndex(function (i) { return i.id === product.id; });
        if (idx >= 0) {
            state.wishlist.splice(idx, 1);
        } else {
            state.wishlist.push(product);
            toast("Added to wishlist!", "ok");
        }
        saveAll();
        refreshWishlistUI();
    }

    function cardHeartButton(card) {
        var btn = card.querySelector(".btn-wishlist");
        var actions = card.querySelector(".product-actions");
        if (!btn) {
            if (!actions) {
                var wrap = card.querySelector(".product-img-wrap");
                if (!wrap) return null;
                wrap.insertAdjacentHTML("beforeend", '<div class="product-actions"></div>');
                actions = wrap.querySelector(".product-actions");
            }
            actions.insertAdjacentHTML("afterbegin", '<button class="btn-wishlist" aria-label="Add to wishlist"><i class="far fa-heart"></i></button>');
            btn = actions.querySelector(".btn-wishlist");
        }
        return btn;
    }

    function syncHeartStates() {
        var likedSet = {};
        state.wishlist.forEach(function (i) { likedSet[i.id] = true; });
        document.querySelectorAll(".product-card").forEach(function (card) {
            var pid = card.dataset.productId;
            if (!pid) {
                pid = productFromCard(card).id;
                card.dataset.productId = pid;
            }
            var liked = !!likedSet[pid];
            var btn = cardHeartButton(card);
            if (!btn) return;
            btn.classList.toggle("wishlisted", liked);
            var icon = btn.querySelector("i");
            if (icon) {
                icon.classList.toggle("fas", liked);
                icon.classList.toggle("far", !liked);
            }
        });
    }

    function bindProductActions(scope) {
        (scope || document).querySelectorAll(".product-card").forEach(function (card) {
            if (card.dataset.boundStore === "1") return;
            card.dataset.boundStore = "1";
            var product = productFromCard(card);
            card.dataset.productId = product.id;
            var addBtn = card.querySelector(".btn-add-cart");
            if (addBtn) {
                if (addBtn.getAttribute("onclick")) addBtn.removeAttribute("onclick");
                if (addBtn.tagName.toLowerCase() === "a" && /view details/i.test(addBtn.textContent)) {
                    addBtn.textContent = "Add to Cart";
                }
                addBtn.addEventListener("click", function (e) {
                    e.preventDefault();
                    addCart(productFromCard(card));
                    openPanel("cartPanel");
                });
            }
            var wishBtn = cardHeartButton(card);
            if (wishBtn) {
                if (wishBtn.getAttribute("onclick")) wishBtn.removeAttribute("onclick");
                wishBtn.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWish(productFromCard(card));
                });
            }
        });
    }

    function savePrefsFromControls() {
        var filters = document.querySelectorAll(".filter-sidebar .form-check-input");
        if (filters.length) {
            state.prefs.filters = {};
            filters.forEach(function (f) { state.prefs.filters[f.id] = f.checked; });
        }
        var sort = document.getElementById("sortSelect");
        if (sort) state.prefs.sort = sort.value;
        var searchInput = document.getElementById("searchInput");
        if (searchInput) state.prefs.search = searchInput.value || "";
        saveAll();
    }

    function applyPrefs() {
        if (state.prefs.filters) {
            Object.keys(state.prefs.filters).forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.checked = !!state.prefs.filters[id];
            });
        }
        var sort = document.getElementById("sortSelect");
        if (sort && state.prefs.sort) sort.value = state.prefs.sort;
        var searchInput = document.getElementById("searchInput");
        if (searchInput && state.prefs.search) searchInput.value = state.prefs.search;
    }

    function showError(input, message) {
        var id = input.id || input.name || Math.random().toString(36).slice(2);
        input.dataset.validationId = id;
        var el = document.getElementById("err-" + id);
        if (!el) {
            el = document.createElement("div");
            el.id = "err-" + id;
            el.className = "field-error";
            input.insertAdjacentElement("afterend", el);
        }
        el.textContent = message;
        input.classList.add("input-invalid");
    }

    function clearError(input) {
        var id = input.dataset.validationId || input.id || input.name;
        var el = id ? document.getElementById("err-" + id) : null;
        if (el) el.textContent = "";
        input.classList.remove("input-invalid");
    }

    function validateInput(input) {
        var v = (input.value || "").trim();
        var key = (input.id + " " + input.name + " " + input.type + " " + input.placeholder).toLowerCase();
        var required = input.required;

        if (!v && required) return "This field is required.";
        if (!v) return "";

        if (/email/.test(key)) return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter a valid email.";
        if (/phone|tel|mobile/.test(key)) return /^\+?[0-9][0-9\-\s]{8,15}$/.test(v) ? "" : "Enter a valid phone number.";
        if (/name/.test(key)) return /^[a-zA-Z\s.'-]{2,60}$/.test(v) ? "" : "Name should contain letters only.";
        if (/address/.test(key)) return /^[a-zA-Z0-9\s,.'#\-\/]{6,120}$/.test(v) ? "" : "Enter a valid address.";
        if (input.tagName.toLowerCase() === "textarea") return /^.{10,500}$/.test(v) ? "" : "Message must be at least 10 characters.";
        return /^.{2,120}$/.test(v) ? "" : "Please enter a valid value.";
    }

    function attachValidation() {
        var forms = document.querySelectorAll("form");
        forms.forEach(function (form) {
            var fields = form.querySelectorAll("input, textarea, select");
            fields.forEach(function (input) {
                input.addEventListener("input", function () {
                    var msg = validateInput(input);
                    if (msg) showError(input, msg);
                    else clearError(input);
                });
            });
            form.addEventListener("submit", function (e) {
                var invalid = [];
                fields.forEach(function (input) {
                    var msg = validateInput(input);
                    if (msg) {
                        invalid.push(input);
                        showError(input, msg);
                    } else {
                        clearError(input);
                    }
                });
                if (invalid.length) {
                    e.preventDefault();
                    toast("Form validation errors", "error");
                    invalid[0].focus();
                    return;
                }
                var nameInput = form.querySelector('input[id*="name" i], input[name*="name" i]');
                if (nameInput && nameInput.value.trim()) {
                    state.session.lastName = nameInput.value.trim();
                    saveAll();
                }
            });
        });

        var newsletter = document.getElementById("newsletterEmail");
        if (newsletter) {
            newsletter.addEventListener("input", function () {
                var msg = validateInput(newsletter);
                if (msg) showError(newsletter, msg);
                else clearError(newsletter);
            });
        }
    }

    function bootSessionGreeting() {
        state.session.visits += 1;
        state.session.lastSeen = new Date().toISOString();
        saveAll();
        if (state.session.visits > 1 && state.session.lastName) {
            toast("Welcome back, " + state.session.lastName + "!", "ok");
        }
    }

    function bindGlobal() {
        ensurePanels();
        refreshUI();
        applyPrefs();

        var cartIcon = document.getElementById("cartIcon");
        var wishlistIcon = document.getElementById("wishlistIcon");
        if (cartIcon) {
            cartIcon.addEventListener("click", function (e) {
                e.preventDefault();
                openPanel("cartPanel");
            });
        }
        if (wishlistIcon) {
            wishlistIcon.addEventListener("click", function (e) {
                e.preventDefault();
                openPanel("wishlistPanel");
            });
        }

        document.addEventListener("click", function (e) {
            var closeBtn = e.target.closest("[data-close-panel]");
            if (closeBtn) closePanels();
            var removeCartBtn = e.target.closest("[data-remove-cart]");
            if (removeCartBtn) removeCart(removeCartBtn.getAttribute("data-remove-cart"));
            var removeWishBtn = e.target.closest("[data-remove-wish]");
            if (removeWishBtn) {
                state.wishlist = state.wishlist.filter(function (i) { return i.id !== removeWishBtn.getAttribute("data-remove-wish"); });
                saveAll();
                refreshWishlistUI();
            }
            if (e.target.id === "panelBackdrop") closePanels();
        });

        var placeOrderBtn = document.getElementById("placeOrderBtn");
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener("click", function () {
                if (!state.cart.length) {
                    toast("Your cart is empty.", "error");
                    return;
                }
                state.cart = [];
                saveAll();
                refreshUI();
                toast("Order placed successfully!", "ok");
                closePanels();
            });
        }

        document.querySelectorAll(".filter-sidebar .form-check-input, #sortSelect, #searchInput").forEach(function (el) {
            el.addEventListener("change", savePrefsFromControls);
            el.addEventListener("input", savePrefsFromControls);
        });
    }

    // Keep compatibility with existing inline handlers in pages.
    window.addToCart = function () {
        var card = document.activeElement ? document.activeElement.closest(".product-card") : null;
        if (card) addCart(productFromCard(card));
        else toast("Added to cart!", "ok");
    };
    window.toggleWishlist = function (btn) {
        var card = btn ? btn.closest(".product-card") : null;
        if (!card) return;
        toggleWish(productFromCard(card));
    };

    var observerTimer = null;
    var observer = new MutationObserver(function (mutations) {
        var hasProductChange = mutations.some(function (m) {
            if (!m.addedNodes || !m.addedNodes.length) return false;
            return Array.prototype.some.call(m.addedNodes, function (node) {
                if (!node || node.nodeType !== 1) return false;
                if (node.classList && node.classList.contains("product-card")) return true;
                return !!(node.querySelector && node.querySelector(".product-card"));
            });
        });
        if (!hasProductChange) return;
        if (observerTimer) clearTimeout(observerTimer);
        observerTimer = setTimeout(function () {
            bindProductActions(document);
            syncHeartStates();
        }, 80);
    });

    document.addEventListener("DOMContentLoaded", function () {
        bootSessionGreeting();
        bindGlobal();
        bindProductActions(document);
        attachValidation();
        observer.observe(document.body, { childList: true, subtree: true });
    });
})();
