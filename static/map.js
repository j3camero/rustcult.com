let cachedMapData;
let mapImageTag;
let cachedDots;
let cachedDotsTime;
let previousCachedDots;
let previousCachedDotsTime;
// Controls how fast you zoom in and out. Higher is faster.
const SCALE_FACTOR = 1.1;

const fullScreenButton = document.getElementById('fullscreenbutton');
const fullScreenImg = document.getElementById('fullscreenimg');
const mapCanvas = document.getElementById('mapcanvas');
const mapContext = mapCanvas.getContext('2d');

function hover(element) {
    element.setAttribute('src', '/Hamburger-Icon-Green-Transparent.png');
}

function unhover(element) {
    element.setAttribute('src', '/Hamburger-Icon-White-Transparent.png');
}

let prevFullscreenToggleTime = new Date().getTime();

function ToggleFullScreen(event) {
    event.preventDefault();
    const currentTime = new Date().getTime();
    if (currentTime - prevFullscreenToggleTime < 500) {
    return false;
    }
    prevFullscreenToggleTime = currentTime;
    const isFullScreen = (screen.availHeight || screen.height-30) <= window.innerHeight;
    if (isFullScreen) {
    fullScreenImg.src = 'fullscreen-on.png';
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
    }
    } else {
    fullScreenImg.src = 'fullscreen-off.png';
    const doc = document.documentElement;
    if (doc.requestFullscreen) {
        doc.requestFullscreen();
    } else if (doc.webkitRequestFullscreen) { /* Safari */
        doc.webkitRequestFullscreen();
    } else if (doc.msRequestFullscreen) { /* IE11 */
        doc.msRequestFullscreen();
    }
    }
    return false;
}

fullScreenButton.addEventListener('click', ToggleFullScreen, false);
fullScreenButton.addEventListener('touchstart', ToggleFullScreen, false);
fullScreenButton.addEventListener('touchend', ToggleFullScreen, false);
fullScreenButton.addEventListener('touchcancel', ToggleFullScreen, false);

function Sleep(ms) {
    return new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve();
    }, ms);
    });
}

function Draw() {
    if (!cachedMapData) {
    console.log('No cached map data. Bailing.');
    return;
    }
    const map = cachedMapData.map;
    const info = cachedMapData.info;
    mapContext.fillStyle = map.background;
    mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    const w = mapCanvas.width;
    const h = mapCanvas.height;
    const wh = Math.min(w, h);
    const mw = map.width;
    const mh = map.height;
    const om = map.oceanMargin;
    mapContext.drawImage(
    mapImageTag,
    om, om, mw - 2 * om, mh - 2 * om,
    (w - wh) / 2, (h - wh) / 2, wh, wh);
    // Center location.
    const cx = w / 2;
    const cy = h / 2;
    // Bottom-left corner of map image. The "origin" for the Rust+ map coords.
    const ox = cx - wh / 2;
    const oy = cy + wh / 2;
    const mapSize = parseInt(info.mapSize || 4250);

    function DrawDots(dots, oldDots, alpha, borderColor, fillColor) {
    if (!dots) {
        return;
    }
    const beforeAndAfter = {};
    for (const dot of dots) {
        beforeAndAfter[dot.steamId || dot.token] = { after: dot };
    }
    if (oldDots) {
        for (const dot of oldDots) {
        beforeAndAfter[dot.steamId].before = dot;
        }
    }
    mapContext.fillStyle = fillColor;
    mapContext.strokeStyle = borderColor;
    mapContext.lineWidth = 2;
    const r = alpha;
    for (const steamId in beforeAndAfter) {
        const dot = beforeAndAfter[steamId].after;
        const oldDot = beforeAndAfter[steamId].before;
        const threshold = 0.001;
        if (Math.abs(dot.x) <= threshold && Math.abs(dot.y) <= threshold) {
        continue;
        }
        const x = oldDot ? r * dot.x + (1 - r) * oldDot.x : dot.x;
        const y = oldDot ? r * dot.y + (1 - r) * oldDot.y : dot.y;
        const px = ox + wh * x / mapSize;
        const py = oy - wh * y / mapSize;
        mapContext.beginPath();
        mapContext.arc(px, py, 3, 0, 2 * Math.PI);
        mapContext.stroke();
        mapContext.fill();
    }
    }

    function DrawSquare(x, y) {
    const d = 6;
    const r = d / 2;
    mapContext.beginPath();
    mapContext.rect(x - r, y - r, d, d);
    mapContext.stroke();
    }

    function DrawTriangle(x, y) {
    const s = 6;
    mapContext.beginPath();
    mapContext.moveTo(x - 0.5 * s, y + 0.289 * s);
    mapContext.lineTo(x + 0.5 * s, y + 0.289 * s);
    mapContext.lineTo(x, y - 0.577 * s);
    mapContext.lineTo(x - 0.5 * s, y + 0.289 * s);
    mapContext.stroke();
    }

    function DrawBases(bases, borderColor, fillColor) {
    if (!bases) {
        return;
    }
    mapContext.fillStyle = fillColor;
    mapContext.strokeStyle = borderColor;
    mapContext.lineWidth = 2;
    for (const base of bases) {
        const px = ox + wh * base.x / mapSize;
        const py = oy - wh * base.y / mapSize;
        if (base.mainBase) {
        DrawSquare(px, py);
        } else {
        DrawTriangle(px, py);
        }
    }
    }

    DrawDots(map.monuments, null, 1, '#db4437', 'rgba(234, 153, 153, 0.5)');
    if (cachedDots && cachedDots.bases) {
    DrawBases(cachedDots.bases.enemies, '#FFF000', 'rgba(255, 240, 0, 0.8)');
    DrawBases(cachedDots.bases.allies, '#00FFF0', 'rgba(0, 255, 240, 0.8)');
    DrawBases(cachedDots.bases.team, '#00FF00', 'rgba(182, 215, 168, 0.8)');
    DrawBases(cachedDots.bases.self, '#00FF00', 'rgba(182, 215, 168, 0.8)');
    }
    if (cachedDots && cachedDots.users) {
    const currentTime = new Date().getTime();
    const timeFraction = (currentTime - 1000 - previousCachedDotsTime) / (cachedDotsTime - previousCachedDotsTime);
    const alpha = Math.max(0, Math.min(1, timeFraction));
    const prev = (previousCachedDots || {}).users || {};
    DrawDots(cachedDots.users.enemies, prev.enemies, alpha, '#FFF000', 'rgba(255, 240, 0, 0.8)');
    DrawDots(cachedDots.users.allies, prev.allies, alpha, '#00FFF0', 'rgba(0, 255, 240, 0.8)');
    DrawDots(cachedDots.users.team, prev.team, alpha, '#00FF00', 'rgba(182, 215, 168, 0.8)');
    }
}

function OnResize() {
    mapCanvas.width = window.innerWidth;
    mapCanvas.height = window.innerHeight;
    Draw();
}

window.addEventListener('resize', OnResize, false);

async function FetchDots() {
    const response = await fetch('/dots');
    cachedDots = await response.json();
    previousCachedDots = cachedDots;
    previousCachedDotsTime = cachedDotsTime;
    cachedDotsTime = new Date().getTime();
}

async function PeriodicUpdateForDotsData() {
    await FetchDots();
    setTimeout(PeriodicUpdateForDotsData, 1000);
}

async function DoFrame() {
    Draw();
    setTimeout(DoFrame, 10);
}

async function trackTransforms(ctx){
    const svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
    let SVGMatrix = svg.createSVGMatrix();
    ctx.getTransform = function(){ return SVGMatrix; };

    const savedTransforms = [];
    const save = ctx.save;
    ctx.save = function(){
        savedTransforms.push(SVGMatrix.translate(0,0));
        return save.call(ctx);
    };

    const restore = ctx.restore;
    ctx.restore = function(){
        SVGMatrix = savedTransforms.pop();
        return restore.call(ctx);
    };

    const scale = ctx.scale;
    ctx.scale = function(sx,sy){
        SVGMatrix = SVGMatrix.scaleNonUniform(sx,sy);
        return scale.call(ctx,sx,sy);
    };

    const rotate = ctx.rotate;
    ctx.rotate = function(radians){
        SVGMatrix = SVGMatrix.rotate(radians*180/Math.PI);
        return rotate.call(ctx,radians);
    };

    const translate = ctx.translate;
    ctx.translate = function(dx,dy){
        SVGMatrix = SVGMatrix.translate(dx,dy);
        return translate.call(ctx,dx,dy);
    };

    const transform = ctx.transform;
    ctx.transform = function(a,b,c,d,e,f){
        const m2 = svg.createSVGMatrix();
        m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
        SVGMatrix = SVGMatrix.multiply(m2);
        return transform.call(ctx,a,b,c,d,e,f);
    };

    const setTransform = ctx.setTransform;
    ctx.setTransform = function(a,b,c,d,e,f){
        SVGMatrix.a = a;
        SVGMatrix.b = b;
        SVGMatrix.c = c;
        SVGMatrix.d = d;
        SVGMatrix.e = e;
        SVGMatrix.f = f;
        return setTransform.call(ctx,a,b,c,d,e,f);
    };

    const pt = svg.createSVGPoint();
    ctx.transformedPoint = function(x,y){
        pt.x=x; pt.y=y;
        return pt.matrixTransform(SVGMatrix.inverse());
    }
}

function redrawWithTransform(){

    // Clear the entire canvas
    const topLeft = mapContext.transformedPoint(0,0);
    const bottomRight = mapContext.transformedPoint(mapCanvas.width,mapCanvas.height);
    mapContext.fillStyle = cachedMapData.map.background;
    mapContext.fillRect(topLeft.x,topLeft.y,bottomRight.x-topLeft.x,bottomRight.y-topLeft.y);

    mapContext.save();
    mapContext.setTransform(1,0,0,1,0,0);
    mapContext.fillRect(0,0,mapCanvas.width,mapCanvas.height);
    mapContext.restore();

    mapContext.drawImage(mapCanvas,0,0);
    Draw();
}

async function setupTransforms (ctx) {
    await trackTransforms(ctx);

    let lastX = mapCanvas.width / 2, lastY = mapCanvas.height / 2;
    let dragStart, dragged;

    mapCanvas.addEventListener('mousedown', function (evt) {
        document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
        lastX = evt.offsetX || (evt.pageX - mapCanvas.offsetLeft);
        lastY = evt.offsetY || (evt.pageY - mapCanvas.offsetTop);
        dragStart = mapContext.transformedPoint(lastX, lastY);
        dragged = false;
    }, false);

    mapCanvas.addEventListener('mousemove', function (evt) {
        lastX = evt.offsetX || (evt.pageX - mapCanvas.offsetLeft);
        lastY = evt.offsetY || (evt.pageY - mapCanvas.offsetTop);
        dragged = true;
        if (dragStart) {
            const pt = mapContext.transformedPoint(lastX, lastY);
            mapContext.translate(pt.x - dragStart.x, pt.y - dragStart.y);
            redrawWithTransform();
        }
    }, false);

    mapCanvas.addEventListener('mouseup', function (evt) {
        dragStart = null;
        if (!dragged) zoom(evt.shiftKey ? -1 : 1);
    }, false);

    const zoom = function (clicks) {
        const pt = mapContext.transformedPoint(lastX, lastY);
        mapContext.translate(pt.x, pt.y);
        const factor = Math.pow(SCALE_FACTOR, clicks);
        mapContext.scale(factor, factor);
        mapContext.translate(-pt.x, -pt.y);
        redrawWithTransform();
    }

    const handleScroll = function (evt) {
        const delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
        if (delta) zoom(delta);
        return evt.preventDefault() && false;
    };

    mapCanvas.addEventListener('DOMMouseScroll', handleScroll, false);
    mapCanvas.addEventListener('mousewheel', handleScroll, false);
}
await setupTransforms(mapContext);

async function Main() {
    const response = await fetch('/mapdata');
    const mapData = await response.json();
    cachedMapData = mapData;
    await Sleep(100);
    mapImageTag = document.createElement('img');
    mapImageTag.src = 'data:image/png;base64, ' + mapData.map.jpgImage;
    await Sleep(100);
    OnResize();
    await PeriodicUpdateForDotsData();
    await DoFrame();
    await setupTransforms(mapContext);
}

Main();
