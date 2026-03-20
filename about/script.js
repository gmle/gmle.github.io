/**
 * 爱心世界 - Love World
 * 一个视觉效果震撼的爱心主题交互式网页
 */

// ============================================
// 全局配置和状态
// ============================================
const config = {
    animMode: 'pulse',
    heartSize: 150,
    animSpeed: 1,
    particleCount: 200,
    primaryColor: '#ff1744',
    soundEnabled: true,
    musicEnabled: false,
    clickCount: 0
};

const state = {
    mouseX: 0,
    mouseY: 0,
    isMouseDown: false,
    scrollY: 0,
    hearts: [],
    particles: [],
    floatingHearts: [],
    lastTime: 0,
    fps: 60,
    frameCount: 0,
    lastFpsTime: 0
};

// ============================================
// Canvas 初始化
// ============================================
const bgCanvas = document.getElementById('bgCanvas');
const heartCanvas = document.getElementById('heartCanvas');
const particleCanvas = document.getElementById('particleCanvas');

const bgCtx = bgCanvas.getContext('2d');
const heartCtx = heartCanvas.getContext('2d');
const particleCtx = particleCanvas.getContext('2d');

function resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    [bgCanvas, heartCanvas, particleCanvas].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
    });
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============================================
// 工具函数
// ============================================
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 23, b: 68 };
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function interpolateColor(color1, color2, factor) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    
    return rgbToHex(
        c1.r + (c2.r - c1.r) * factor,
        c1.g + (c2.g - c1.g) * factor,
        c1.b + (c2.b - c1.b) * factor
    );
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// ============================================
// 爱心形状函数
// ============================================
function getHeartPoint(t, size) {
    // 爱心参数方程
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    
    return {
        x: x * size / 16,
        y: y * size / 16
    };
}

function isPointInHeart(x, y, centerX, centerY, size) {
    const dx = x - centerX;
    const dy = y - centerY;
    
    // 简化的爱心形状检测
    const a = dx / (size * 0.8);
    const b = dy / (size * 0.8);
    
    return (a * a + b * b - 1) ** 3 - a * a * b * b * b <= 0;
}

// ============================================
// 粒子类
// ============================================
class Particle {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = randomRange(2, 6);
        this.speedX = randomRange(-2, 2);
        this.speedY = randomRange(-2, 2);
        this.life = 1;
        this.decay = randomRange(0.005, 0.02);
        
        const color = hexToRgb(config.primaryColor);
        this.color = `rgba(${color.r}, ${color.g}, ${color.b},`;
        
        // 根据类型设置特殊属性
        if (type === 'heart') {
            this.targetX = x;
            this.targetY = y;
            this.angle = randomRange(0, Math.PI * 2);
            this.orbitRadius = randomRange(50, 150);
            this.orbitSpeed = randomRange(0.01, 0.03);
        }
    }
    
    update() {
        switch (this.type) {
            case 'heart':
                this.angle += this.orbitSpeed * config.animSpeed;
                this.x += (this.targetX - this.x) * 0.05;
                this.y += (this.targetY - this.y) * 0.05;
                break;
                
            case 'explode':
                this.x += this.speedX * config.animSpeed;
                this.y += this.speedY * config.animSpeed;
                this.speedY += 0.1; // 重力
                break;
                
            case 'float':
                this.y -= this.speedY * config.animSpeed;
                this.x += Math.sin(this.y * 0.01) * 0.5;
                break;
                
            default:
                this.x += this.speedX * config.animSpeed;
                this.y += this.speedY * config.animSpeed;
        }
        
        this.life -= this.decay * config.animSpeed;
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color + this.life + ')';
        ctx.fill();
        
        // 发光效果
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color + this.life + ')';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ============================================
// 爱心类
// ============================================
class Heart {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.baseSize = size;
        this.rotation = 0;
        this.pulsePhase = 0;
        this.color = config.primaryColor;
        this.opacity = 1;
        this.scale = 1;
        this.particles = [];
        this.wavePhase = 0;
        this.spiralAngle = 0;
        
        this.initParticles();
    }
    
    initParticles() {
        this.particles = [];
        const count = config.particleCount;
        
        for (let i = 0; i < count; i++) {
            const t = (i / count) * Math.PI * 2;
            const point = getHeartPoint(t, this.size);
            
            const particle = new Particle(
                this.x + point.x,
                this.y + point.y,
                'heart'
            );
            particle.targetX = this.x + point.x;
            particle.targetY = this.y + point.y;
            particle.angle = t;
            this.particles.push(particle);
        }
    }
    
    update(deltaTime) {
        this.pulsePhase += deltaTime * 0.003 * config.animSpeed;
        this.wavePhase += deltaTime * 0.002 * config.animSpeed;
        this.spiralAngle += deltaTime * 0.001 * config.animSpeed;
        
        // 根据动画模式更新
        switch (config.animMode) {
            case 'pulse':
                this.scale = 1 + Math.sin(this.pulsePhase) * 0.15;
                break;
                
            case 'wave':
                this.scale = 1;
                break;
                
            case 'spiral':
                this.rotation = this.spiralAngle;
                this.scale = 1;
                break;
                
            case 'explode':
                if (Math.random() < 0.02) {
                    this.explode();
                }
                break;
                
            case 'rainbow':
                const hue = (Date.now() * 0.1 * config.animSpeed) % 360;
                this.color = `hsl(${hue}, 80%, 60%)`;
                this.scale = 1 + Math.sin(this.pulsePhase) * 0.1;
                break;
        }
        
        // 更新粒子
        this.particles.forEach((particle, i) => {
            const t = particle.angle;
            let point;
            
            switch (config.animMode) {
                case 'wave':
                    const waveOffset = Math.sin(this.wavePhase + t * 3) * 20;
                    point = getHeartPoint(t, this.size * this.scale + waveOffset);
                    break;
                    
                case 'particle':
                    const orbitX = Math.cos(particle.angle + this.spiralAngle) * 30;
                    const orbitY = Math.sin(particle.angle + this.spiralAngle) * 30;
                    point = getHeartPoint(t, this.size * this.scale);
                    particle.x = this.x + point.x + orbitX;
                    particle.y = this.y + point.y + orbitY;
                    return;
                    
                default:
                    point = getHeartPoint(t, this.size * this.scale);
            }
            
            particle.targetX = this.x + point.x;
            particle.targetY = this.y + point.y;
            particle.update();
        });
        
        // 鼠标交互
        const dist = distance(state.mouseX, state.mouseY, this.x, this.y);
        if (dist < this.size * 1.5) {
            this.onHover();
        }
    }
    
    draw(ctx) {
        ctx.save();
        
        if (config.animMode === 'spiral') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.translate(-this.x, -this.y);
        }
        
        // 绘制粒子爱心
        if (config.animMode === 'particle') {
            this.particles.forEach(particle => {
                particle.draw(ctx);
            });
        } else {
            // 绘制实心爱心
            this.drawSolidHeart(ctx);
        }
        
        ctx.restore();
    }
    
    drawSolidHeart(ctx) {
        const color = config.animMode === 'rainbow' 
            ? this.color 
            : config.primaryColor;
            
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.globalAlpha = this.opacity;
        
        // 绘制爱心路径
        for (let t = 0; t <= Math.PI * 2; t += 0.01) {
            const point = getHeartPoint(t, this.size * this.scale);
            if (t === 0) {
                ctx.moveTo(this.x + point.x, this.y + point.y);
            } else {
                ctx.lineTo(this.x + point.x, this.y + point.y);
            }
        }
        
        ctx.closePath();
        ctx.fill();
        
        // 发光效果
        ctx.shadowBlur = 30;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        
        // 内部高光
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        const highlightSize = this.size * this.scale * 0.3;
        ctx.arc(this.x - highlightSize * 0.5, this.y - highlightSize * 0.5, highlightSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    onHover() {
        // 悬停效果
        if (config.animMode !== 'explode') {
            this.scale = 1.1;
        }
    }
    
    explode() {
        // 爆炸效果
        for (let i = 0; i < 20; i++) {
            const particle = new Particle(this.x, this.y, 'explode');
            particle.speedX = randomRange(-10, 10);
            particle.speedY = randomRange(-10, 10);
            state.particles.push(particle);
        }
    }
    
    onClick() {
        this.explode();
        
        // 创建涟漪效果
        createRipple(this.x, this.y);
    }
}

// ============================================
// 涟漪效果
// ============================================
class Ripple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 200;
        this.opacity = 1;
        this.speed = 5;
    }
    
    update() {
        this.radius += this.speed * config.animSpeed;
        this.opacity = 1 - (this.radius / this.maxRadius);
        return this.opacity > 0;
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = config.primaryColor;
        ctx.globalAlpha = this.opacity * 0.5;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

let ripples = [];

function createRipple(x, y) {
    ripples.push(new Ripple(x, y));
}

// ============================================
// 背景粒子系统
// ============================================
class BackgroundParticle {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = randomRange(0, window.innerWidth);
        this.y = randomRange(0, window.innerHeight);
        this.size = randomRange(1, 3);
        this.speedX = randomRange(-0.5, 0.5);
        this.speedY = randomRange(-0.5, 0.5);
        this.opacity = randomRange(0.1, 0.5);
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.x < 0 || this.x > window.innerWidth ||
            this.y < 0 || this.y > window.innerHeight) {
            this.reset();
        }
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
    }
}

const bgParticles = Array.from({ length: 100 }, () => new BackgroundParticle());

// ============================================
// 浮动爱心
// ============================================
class FloatingHeart {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = randomRange(0, window.innerWidth);
        this.y = window.innerHeight + 50;
        this.size = randomRange(10, 30);
        this.speed = randomRange(1, 3);
        this.opacity = randomRange(0.3, 0.8);
        this.swayPhase = randomRange(0, Math.PI * 2);
    }
    
    update() {
        this.y -= this.speed * config.animSpeed;
        this.swayPhase += 0.02 * config.animSpeed;
        this.x += Math.sin(this.swayPhase) * 0.5;
        
        if (this.y < -50) {
            this.reset();
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        
        ctx.beginPath();
        ctx.fillStyle = config.primaryColor;
        
        // 绘制小爱心
        for (let t = 0; t <= Math.PI * 2; t += 0.1) {
            const point = getHeartPoint(t, this.size);
            if (t === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

const floatingHearts = Array.from({ length: 15 }, () => new FloatingHeart());

// ============================================
// 音效系统
// ============================================
class SoundSystem {
    constructor() {
        this.audioContext = null;
        this.initialized = false;
    }
    
    init() {
        if (!this.initialized) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        }
    }
    
    playTone(frequency, duration, type = 'sine') {
        if (!config.soundEnabled || !this.initialized) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    playClick() {
        this.playTone(800, 0.1);
    }
    
    playHover() {
        this.playTone(400, 0.05);
    }
    
    playExplosion() {
        if (!config.soundEnabled || !this.initialized) return;
        
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.playTone(200 + i * 100, 0.2, 'sawtooth');
            }, i * 50);
        }
    }
}

const soundSystem = new SoundSystem();

// ============================================
// 主渲染循环
// ============================================
function render(currentTime) {
    const deltaTime = currentTime - state.lastTime;
    state.lastTime = currentTime;
    
    // 计算FPS
    state.frameCount++;
    if (currentTime - state.lastFpsTime >= 1000) {
        state.fps = state.frameCount;
        state.frameCount = 0;
        state.lastFpsTime = currentTime;
        document.getElementById('fps').textContent = state.fps;
    }
    
    // 清空画布
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    heartCtx.clearRect(0, 0, heartCanvas.width, heartCanvas.height);
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    
    // 绘制背景粒子
    bgParticles.forEach(particle => {
        particle.update();
        particle.draw(bgCtx);
    });
    
    // 绘制浮动爱心
    floatingHearts.forEach(heart => {
        heart.update();
        heart.draw(bgCtx);
    });
    
    // 更新和绘制主爱心
    state.hearts.forEach(heart => {
        heart.update(deltaTime);
        heart.draw(heartCtx);
    });
    
    // 更新和绘制特效粒子
    state.particles = state.particles.filter(particle => {
        particle.update();
        particle.draw(particleCtx);
        return particle.life > 0;
    });
    
    // 更新和绘制涟漪
    ripples = ripples.filter(ripple => {
        const alive = ripple.update();
        if (alive) ripple.draw(particleCtx);
        return alive;
    });
    
    // 更新统计
    document.getElementById('heartCount').textContent = state.hearts.length;
    
    requestAnimationFrame(render);
}

// ============================================
// 事件处理
// ============================================
function initEvents() {
    // 鼠标移动
    window.addEventListener('mousemove', (e) => {
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;
    });
    
    // 鼠标点击
    window.addEventListener('click', (e) => {
        config.clickCount++;
        document.getElementById('clickCount').textContent = config.clickCount;
        
        soundSystem.init();
        soundSystem.playClick();
        
        // 在点击位置创建爱心
        if (state.hearts.length < 5) {
            const heart = new Heart(e.clientX, e.clientY, config.heartSize * 0.5);
            state.hearts.push(heart);
            
            setTimeout(() => {
                const index = state.hearts.indexOf(heart);
                if (index > -1) {
                    state.hearts.splice(index, 1);
                }
            }, 3000);
        }
        
        // 创建点击粒子效果
        for (let i = 0; i < 10; i++) {
            const particle = new Particle(e.clientX, e.clientY, 'float');
            particle.speedY = randomRange(2, 5);
            state.particles.push(particle);
        }
        
        createRipple(e.clientX, e.clientY);
    });
    
    // 滚动事件
    window.addEventListener('scroll', () => {
        state.scrollY = window.scrollY;
        
        // 视差效果
        document.querySelectorAll('.parallax-layer').forEach(layer => {
            const speed = parseFloat(layer.dataset.speed) || 0.5;
            const yPos = -(state.scrollY * speed);
            layer.style.transform = `translateY(${yPos}px)`;
        });
        
        // 内容卡片可见性
        document.querySelectorAll('.content-card').forEach(card => {
            const rect = card.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.8) {
                card.classList.add('visible');
            }
        });
    });
    
    // 控制面板事件
    document.getElementById('togglePanel').addEventListener('click', () => {
        document.getElementById('controlPanel').classList.toggle('collapsed');
    });
    
    document.getElementById('animMode').addEventListener('change', (e) => {
        config.animMode = e.target.value;
        state.hearts.forEach(heart => heart.initParticles());
    });
    
    document.getElementById('heartSize').addEventListener('input', (e) => {
        config.heartSize = parseInt(e.target.value);
        document.getElementById('sizeValue').textContent = config.heartSize;
        state.hearts.forEach(heart => {
            heart.size = config.heartSize;
            heart.initParticles();
        });
    });
    
    document.getElementById('animSpeed').addEventListener('input', (e) => {
        config.animSpeed = parseFloat(e.target.value);
        document.getElementById('speedValue').textContent = config.animSpeed.toFixed(1) + 'x';
    });
    
    document.getElementById('particleCount').addEventListener('input', (e) => {
        config.particleCount = parseInt(e.target.value);
        document.getElementById('particleValue').textContent = config.particleCount;
        state.hearts.forEach(heart => heart.initParticles());
    });
    
    // 颜色选择
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            config.primaryColor = btn.dataset.color;
        });
    });
    
    // 音效开关
    document.getElementById('soundToggle').addEventListener('change', (e) => {
        config.soundEnabled = e.target.checked;
        if (config.soundEnabled) {
            soundSystem.init();
        }
    });
    
    // 背景音乐开关
    document.getElementById('musicToggle').addEventListener('change', (e) => {
        config.musicEnabled = e.target.checked;
        // 这里可以添加背景音乐逻辑
    });
}

// ============================================
// 初始化
// ============================================
function init() {
    // 创建主爱心
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const mainHeart = new Heart(centerX, centerY, config.heartSize);
    state.hearts.push(mainHeart);
    
    // 初始化事件
    initEvents();
    
    // 开始渲染循环
    requestAnimationFrame(render);
    
    console.log('❤️ 爱心世界已加载完成！');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
