let cachedMapData;
let mapImageTag;
let cachedDots;
let cachedDotsTime;
let previousCachedDots;
let previousCachedDotsTime;
// Controls how fast you zoom in and out. Higher is faster.
const SCALE_FACTOR = 1.1;

const MONUMENT_NAMES = {"monument.harbor_display_name":"Harbor","monument.harbor_2_display_name":"Harbor","monument.airfield_display_name":"Airfield","monument.excavator":"Giant Excavator Pit","monument.junkyard_display_name":"Junkyard","monument.launchsite":"Launch Site","monument.military_tunnels_display_name":"Military Tunnel","monument.power_plant_display_name":"Power Plant","monument.train_yard_display_name":"Train Yard","monument.water_treatment_plant_display_name":"Water Treatment Plant","monument.lighthouse_display_name":"Lighthouse","monument.bandit_camp":"Bandit Camp","monument.outpost":"Outpost","monument.sewer_display_name":"Sewer Branch","monument.large_oil_rig":"Large Oil Rig","monument.oil_rig_small":"Oil Rig","monument.gas_station":"Oxum's Gas Station","monument.mining_quarry_sulfur_display_name":"Sulfur Quarry","monument.mining_quarry_stone_display_name":"Stone Quarry","monument.mining_quarry_hqm_display_name":"HQM Quarry","monument.satellite_dish_display_name":"Satellite Dish","monument.dome_monument_name":"The Dome","monument.supermarket":"Abandoned Supermarket","monument.mining_outpost_display_name":"Mining Outpost","monument.swamp_c":"Abandoned Cabins","monument.water_well_a_display_name":"Water Well","monument.water_well_b_display_name":"Water Well","monument.water_well_c_display_name":"Water Well","monument.water_well_d_display_name":"Water Well","monument.water_well_e_display_name":"Water Well","monument.large_fishing_village_display_name":"Large Fishing Village","monument.fishing_village_display_name":"Fishing Village","monument.stables_a":"Ranch","monument.stables_b":"Large Barn","monument.train_tunnel_display_name":"Train Tunnel","monument.underwater_lab":"Underwater Lab","monument.AbandonedMilitaryBase":"Abandoned Military Base","monument.arctic_base_a":"Arctic Research Base","monument.hapis_convoy_display_name":"Convoy","monument.hapis_listening_station":"Listening Station","monument.hapis_sitea_display_name":"Site A","monument.hapis_siteb_display_name":"Site B","monument.hapis_eastlighthouse_display_name":"Eastern Lighthouse","monument.hapis_westlighthouse_display_name":"Western Lighthouse","monument.hapis_abandboat_display_name":"Abandoned Boat","monument.hapis_collapsed_tunnel":"Collapsed Tunnel","monument.hapis_junkpile":"Junkyard","monument.mining_quarry_display_name":"Mining Quarry","monument.hapis_quarry":"Pumping Station","monument.hapis_loadingdock_display_name":"Loading Dock","monument.hapis_ventingshaft_display_name":"Venting Shaft","monument.hapis_tugboatbeached_display_name":"Beached Tugboat","monument.hapis_refinery_refresh":"Refinery","monument.Hapis_outpost_b3":"Outpost B3"}
const doNotRenderTheseMonuments = ['train_tunnel_display_name'];

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

    function DrawMonumentName(token, x, y) {
        if (doNotRenderTheseMonuments.includes(token)) {
            return;
        }
        const fontSize = Math.floor(Math.max(1, 0.009 * wh));
        mapContext.font = `bold ${fontSize}px Permanent Marker`;
        mapContext.fillStyle = 'rgba(0, 0, 0, 0.6)';
        mapContext.textAlign = 'center';
        if (!MONUMENT_NAMES["monument." + token]) return;
        mapContext.fillText(MONUMENT_NAMES["monument." + token], ox + wh * x / mapSize, oy - wh * y / mapSize);
    }

    function DrawMonumentNames(monuments) {
      for (const monument of monuments) {
        DrawMonumentName(monument.token, monument.x, monument.y);
      }
    }

    function DrawPlayers(players, borderColor, fillColor) {
        if (!players) return;
        for (const player of players) {
            const threshold = 0.001;
            if (Math.abs(player.x) <= threshold && Math.abs(player.y) <= threshold) {
                continue;
            }
            const x = ox + wh * player.x / mapSize;
            const y = oy - wh * player.y / mapSize;
            mapContext.fillStyle = fillColor;
            mapContext.strokeStyle = borderColor;
            mapContext.lineWidth = 0.0015 * wh;
            mapContext.beginPath();
            mapContext.arc(x, y, 0.003 * wh, 0, 2 * Math.PI);
            mapContext.stroke();
            mapContext.fill();
        }
    }

    function DrawPlayerNames(players) {
        if (!players) return;
        for (const player of players) {
            if (!player.name) {
                continue;
            }
            const threshold = 0.001;
            if (Math.abs(player.x) <= threshold && Math.abs(player.y) <= threshold) {
                continue;
            }
            const x = ox + wh * player.x / mapSize;
            const y = oy - wh * player.y / mapSize;
            const fontSize = Math.floor(Math.max(1, 0.006 * wh));
            mapContext.font = `${fontSize}px Permanent Marker`;
            mapContext.fillStyle = 'rgba(0, 0, 0, 0.6)';
            mapContext.textAlign = 'center';
            mapContext.fillText(player.name, x, y - 0.005 * wh);
        }
    }

    function DrawBase(x, y) {
        const r = Math.floor(Math.max(1, 0.004 * wh));
        mapContext.beginPath();
        mapContext.moveTo(x - r, y + r);
        mapContext.lineTo(x + r, y + r);
        mapContext.lineTo(x + r, y - r);
        mapContext.lineTo(x, y - r - r);
        mapContext.lineTo(x - r, y - r);
        mapContext.closePath();
        mapContext.stroke();
    }

    function DrawBases(bases, borderColor) {
        if (!bases) {
            return;
        }
        mapContext.strokeStyle = borderColor;
        mapContext.lineWidth = 0.0015 * wh;
        for (const base of bases) {
            const x = ox + wh * base.x / mapSize;
            const y = oy - wh * base.y / mapSize;
            DrawBase(x, y);
        }
    }

    DrawMonumentNames(map.monuments);
    if (cachedDots && cachedDots.bases) {
        DrawBases(cachedDots.bases.enemies, '#FFF000');
        DrawBases(cachedDots.bases.allies, '#00FFF0');
        DrawBases(cachedDots.bases.team, '#00FF00');
        DrawBases(cachedDots.bases.self, '#00FF00');
    }
    if (cachedDots && cachedDots.users) {
        DrawPlayerNames(cachedDots.users.enemies);
        DrawPlayerNames(cachedDots.users.allies);
        DrawPlayerNames(cachedDots.users.team);
        DrawPlayers(cachedDots.users.enemies, '#FFF000', 'rgba(255, 240, 0, 0.3)');
        DrawPlayers(cachedDots.users.allies, '#00FFF0', 'rgba(0, 255, 240, 0.3)');
        DrawPlayers(cachedDots.users.team, '#00FF00', 'rgba(182, 215, 168, 0.3)');
    }
}

function OnResize() {
    mapCanvas.width = window.innerWidth;
    mapCanvas.height = window.innerHeight;
    Draw();
}

window.addEventListener('resize', OnResize, false);

async function FetchDots() {
    const response = await fetch('https://rustcult.com/dots', {
      credentials: 'include',
    });
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

async function Main() {
    new FontFace('Permanent Marker', 'url(PermanentMarker.ttf)')
        .load().then(function(loaded_face) {
            document.fonts.add(loaded_face);
        }).catch(function(error) {});

    const response = await fetch('https://rustcult.com/mapdata', {
      credentials: 'include',
    });
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
