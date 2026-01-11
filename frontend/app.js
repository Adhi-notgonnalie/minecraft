const API_URL = 'http://localhost:5000/api/items';

// --- Sound Manager ---
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playTone(freq, type, duration) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playClick() { this.playTone(800, 'square', 0.05); }
    playSuccess() {
        // Level up sound arpeggio
        let now = this.ctx.currentTime;
        this.playToneAt(400, 'sine', 0.2, now);
        this.playToneAt(500, 'sine', 0.2, now + 0.1);
        this.playToneAt(600, 'sine', 0.4, now + 0.2);
    }
    playToneAt(freq, type, duration, time) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
    }
    playDelete() { this.playTone(100, 'sawtooth', 0.2); }
}

const sounds = new SoundManager();

// --- Main App Logic ---
document.addEventListener('DOMContentLoaded', () => {
    fetchItems();
    initGSAPBackground();
    setupEventListeners();
});

let allItems = []; // Store for filtering
let draggedItemIndex = null;

function setupEventListeners() {
    // Crafting Toggle
    const toggleBtn = document.getElementById('toggle-craft-btn');
    const craftingArea = document.getElementById('crafting-area');

    toggleBtn.addEventListener('click', () => {
        sounds.playClick();
        craftingArea.classList.toggle('hidden');
        if (!craftingArea.classList.contains('hidden')) {
            gsap.from(craftingArea, { height: 0, opacity: 0, duration: 0.5, ease: "power2.out" });
        }
    });

    // Form Submit
    document.getElementById('crafting-form').addEventListener('submit', handleCraft);

    // Search Filter
    document.getElementById('search-bar').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allItems.filter(item => item.name.toLowerCase().includes(term));
        renderInventory(filtered);
    });

    // Global Tooltip Logic
    const tooltip = document.getElementById('mc-tooltip');
    const tName = document.getElementById('tooltip-name');
    const tEnchant = document.getElementById('tooltip-enchant');
    const tDesc = document.getElementById('tooltip-desc');

    document.addEventListener('mousemove', (e) => {
        gsap.to(tooltip, { x: e.clientX + 15, y: e.clientY + 15, duration: 0.1 });
    });

    // Delegate hover events for tooltips
    document.body.addEventListener('mouseover', (e) => {
        const slot = e.target.closest('.inventory-slot');
        if (slot) {
            const data = JSON.parse(slot.dataset.item);

            tName.textContent = data.name;
            if (data.enchantment) {
                tEnchant.textContent = data.enchantment;
                tEnchant.style.display = 'block';
                tName.style.color = '#52e574'; // Greenish for enchanted items
            } else {
                tEnchant.style.display = 'none';
                tName.style.color = '#00d1e0'; // Diamond Blue
            }
            tDesc.textContent = data.description || '';

            tooltip.classList.remove('hidden');
            gsap.fromTo(tooltip, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.2 });
        } else {
            tooltip.classList.add('hidden');
        }
    });

    // 3D Tilt Effect
    document.body.addEventListener('mousemove', (e) => {
        const slot = e.target.closest('.inventory-slot');
        if (slot) {
            const rect = slot.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element.
            const y = e.clientY - rect.top;  // y position within the element.
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -20; // Max 20deg
            const rotateY = ((x - centerX) / centerX) * 20;

            const inner = slot.querySelector('.slot-inner');
            gsap.to(inner, { rotateX: rotateX, rotateY: rotateY, duration: 0.2 });
        }
    });

    // Reset tilt on leave
    document.body.addEventListener('mouseout', (e) => {
        const slot = e.target.closest('.inventory-slot');
        if (slot) {
            const inner = slot.querySelector('.slot-inner');
            gsap.to(inner, { rotateX: 0, rotateY: 0, duration: 0.5 });
        }
    });
}

// --- GSAP Background ---
function initGSAPBackground() {
    const container = document.getElementById('bg-animation');
    const icons = [
        'https://static.wikia.nocookie.net/minecraft_gamepedia/images/c/c5/Grass_Block_JE4.png',
        'https://static.wikia.nocookie.net/minecraft_gamepedia/images/a/a5/Diamond_Sword_JE2_BE2.png',
        'https://static.wikia.nocookie.net/minecraft_gamepedia/images/2/23/Apple_JE2_BE2.png',
        'https://static.wikia.nocookie.net/minecraft_gamepedia/images/6/6a/Oak_Log_JE5_BE3.png'
    ];

    for (let i = 0; i < 20; i++) {
        const el = document.createElement('img');
        el.src = icons[Math.floor(Math.random() * icons.length)];
        el.className = 'floating-item';
        container.appendChild(el);

        // Random starting position
        gsap.set(el, {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            scale: Math.random() * 0.5 + 0.5,
            rotation: Math.random() * 360
        });

        // Float Animation
        gsap.to(el, {
            y: "+=100",
            x: "+=50",
            rotation: "+=180",
            duration: Math.random() * 10 + 5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }
}

// --- API & Render ---
async function fetchItems() {
    try {
        const res = await fetch(API_URL);
        allItems = await res.json();
        renderInventory(allItems);
    } catch (err) {
        console.error('Error fetching items:', err);
    }
}

function renderInventory(items) {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';

    // Chest Size = Dynamic (Multiples of 9, min 27)
    const minSlots = 27;
    const rows = Math.ceil(Math.max(minSlots, items.length) / 9);
    const CHEST_SIZE = rows * 9;

    for (let i = 0; i < CHEST_SIZE; i++) {
        const item = items[i]; // May be undefined
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';

        if (item) {
            // Filled Slot
            slot.dataset.item = JSON.stringify(item);
            slot.classList.add('filled');
            slot.setAttribute('draggable', true);

            const imgSrc = item.imageUrl || 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/c/c5/Grass_Block_JE4.png';

            slot.innerHTML = `
                <div class="slot-inner">
                    <img src="${imgSrc}" class="item-icon">
                    <span class="item-count">${item.quantity}</span>
                </div>
                <div class="delete-btn" onclick="deleteItem('${item._id}', event)">x</div>
            `;
        } else {
            // Empty Slot
            slot.classList.add('empty');
        }

        grid.appendChild(slot);
    }

    setupDragAndDrop();

    // Staggered Entrance (filled only)
    gsap.from(".inventory-slot.filled", {
        y: 20,
        opacity: 0,
        duration: 0.4,
        stagger: 0.05,
        ease: "back.out(1.7)"
    });
}

function setupDragAndDrop() {
    const slots = document.querySelectorAll('.inventory-slot');

    slots.forEach((slot, index) => {
        slot.addEventListener('dragstart', (e) => {
            if (!slot.classList.contains('filled')) {
                e.preventDefault();
                return;
            }
            draggedItemIndex = index;
            e.target.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        });

        slot.addEventListener('dragend', (e) => {
            e.target.style.opacity = '1';
            slots.forEach(s => s.classList.remove('drag-over'));
        });

        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            return false;
        });

        slot.addEventListener('dragenter', (e) => {
            e.target.closest('.inventory-slot').classList.add('drag-over');
        });

        slot.addEventListener('dragleave', (e) => {
            e.target.closest('.inventory-slot').classList.remove('drag-over');
        });

        slot.addEventListener('drop', (e) => {
            e.stopPropagation();
            const dropSlot = e.target.closest('.inventory-slot');

            if (draggedItemIndex !== null && dropSlot) {
                const originSlot = slots[draggedItemIndex];
                if (originSlot !== dropSlot) {
                    // Visual Swap
                    const tempHTML = originSlot.innerHTML;
                    const tempData = originSlot.dataset.item;
                    const originFilled = originSlot.classList.contains('filled');

                    originSlot.innerHTML = dropSlot.innerHTML;
                    originSlot.dataset.item = dropSlot.dataset.item;
                    if (dropSlot.classList.contains('filled')) originSlot.classList.add('filled'); else originSlot.classList.remove('filled');
                    if (dropSlot.classList.contains('filled')) originSlot.setAttribute('draggable', true); else originSlot.removeAttribute('draggable');

                    dropSlot.innerHTML = tempHTML;
                    dropSlot.dataset.item = tempData;
                    if (originFilled) dropSlot.classList.add('filled'); else dropSlot.classList.remove('filled');
                    if (originFilled) dropSlot.setAttribute('draggable', true); else dropSlot.removeAttribute('draggable');

                    sounds.playClick();
                }
            }
            return false;
        });
    });
}

async function handleCraft(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const quantity = document.getElementById('quantity').value;
    const description = document.getElementById('description').value;
    const enchantment = document.getElementById('enchantment').value;

    const newItem = { name, quantity, description, enchantment: enchantment || null };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        });

        if (res.ok) {
            sounds.playSuccess();
            document.getElementById('crafting-form').reset();
            fetchItems();
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteItem(id, event) {
    event.stopPropagation(); // Stop tilt effect or other clicks
    if (!confirm('Burn this item?')) return;

    sounds.playDelete();
    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        fetchItems();
    } catch (err) {
        console.error(err);
    }
}
