let cachedMapData;
let mapImageTag;
let cachedDots;
let cachedDotsTime;
let previousCachedDots;
let previousCachedDotsTime;
// Controls how fast you zoom in and out. Higher is faster.
let cameraOffset = {x: 0, y: 0};
let cameraZoom = 1
let MAX_ZOOM = 5
let MIN_ZOOM = 0.1
let SCROLL_SENSITIVITY = -0.004

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

function HandlePanAndZoom() {

    mapCanvas.width = window.innerWidth;
    mapCanvas.height = window.innerHeight;
    document.body.style.backgroundColor = cachedMapData.map.background;

    mapContext.translate( window.innerWidth / 2, window.innerHeight / 2 );
    mapContext.scale(cameraZoom, cameraZoom);
    mapContext.translate( -window.innerWidth / 2 + cameraOffset.x, -window.innerHeight / 2 + cameraOffset.y );

    // Hide the map info if zoomed in too far.
    // If cameraZoom is within 0.2 of 1, then draw the map info.
    // Otherwise, hide it.

    if (cameraZoom > 1.2) {
        document.getElementById("mapInfo").style.display = "none";
    } else {
        document.getElementById("mapInfo").style.display = "block";
    }
}

function Draw() {
    if (!cachedMapData) {
        console.log('No cached map data. Bailing.');
        return;
    }

    HandlePanAndZoom();

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
    const baseSize = 0.004 * wh;
    const playerRadius = 0.003 * wh;
    const monumentNameFontSize = Math.floor(Math.max(1, 0.009 * wh));
    const monumentNameFont = `bold ${monumentNameFontSize}px Permanent Marker`;
    const playerNameFontSize = Math.floor(Math.max(1, 0.006 * wh));
    const playerNameFont = `${playerNameFontSize}px Permanent Marker`;
    const playerNameTextDisplacement = 0.005 * wh;
    mapContext.lineWidth = 0.002 * wh;

    function DrawMonumentName(token, x, y) {
        if (doNotRenderTheseMonuments.includes(token)) {
            return;
        }
        mapContext.font = monumentNameFont;
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

    function IsCloseToOrigin(player) {
      const threshold = 0.001;
      return Math.abs(player.x) <= threshold && Math.abs(player.y) <= threshold;
    }

    function DrawPlayers(players, borderColor, fillColor) {
        if (!players) return;
        for (const player of players) {
            if (IsCloseToOrigin(player)) {
                continue;
            }
            const x = ox + wh * player.x / mapSize;
            const y = oy - wh * player.y / mapSize;
            mapContext.fillStyle = fillColor;
            mapContext.strokeStyle = borderColor;
            mapContext.beginPath();
            mapContext.arc(x, y, playerRadius, 0, 2 * Math.PI);
            mapContext.stroke();
            mapContext.fill();
        }
    }

    function DrawPlayerNames(players) {
        if (!players) return;
        for (const player of players) {
            if (!player.name || IsCloseToOrigin(player)) {
                continue;
            }
            const x = ox + wh * player.x / mapSize;
            const y = oy - wh * player.y / mapSize;
            mapContext.font = playerNameFont;
            mapContext.fillStyle = 'rgba(0, 0, 0, 0.6)';
            mapContext.textAlign = 'center';
            mapContext.fillText(player.name, x, y - playerNameTextDisplacement);
        }
    }

    function DrawBase(x, y) {
        const s = baseSize;
        mapContext.beginPath();
        mapContext.moveTo(x - s, y + 1.5 * s);
        mapContext.lineTo(x + s, y + 1.5 * s);
        mapContext.lineTo(x + s, y);
        mapContext.lineTo(x, y - s);
        mapContext.lineTo(x - s, y);
        mapContext.closePath();
        mapContext.stroke();
    }

    function DrawBases(bases, borderColor) {
        if (!bases) {
            return;
        }
        mapContext.strokeStyle = borderColor;
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

async function setupTransforms() {
    function getEventLocation(e) {
        if (e.touches && e.touches.length == 1) {
            return { x:e.touches[0].clientX, y: e.touches[0].clientY }
        } else if (e.clientX && e.clientY) {
            return { x: e.clientX, y: e.clientY }
        }
    }

    let isDragging = false
    let dragStart = { x: 0, y: 0 }

    function onPointerDown(e) {
        isDragging = true
        dragStart.x = getEventLocation(e).x/cameraZoom - cameraOffset.x
        dragStart.y = getEventLocation(e).y/cameraZoom - cameraOffset.y
    }

    function onPointerUp(e) {
        isDragging = false
        initialPinchDistance = null
        lastZoom = cameraZoom
    }

    function onPointerMove(e) {
        if (isDragging) {
            cameraOffset.x = getEventLocation(e).x/cameraZoom - dragStart.x
            cameraOffset.y = getEventLocation(e).y/cameraZoom - dragStart.y
        }
    }

    function handleTouch(e, singleTouchHandler) {
        if ( e.touches.length == 1 ) {
            singleTouchHandler(e)
        } else if (e.type == "touchmove" && e.touches.length == 2) {
            isDragging = false
            handlePinch(e)
        }
    }

    let initialPinchDistance = null
    let lastZoom = cameraZoom

    function handlePinch(e) {
        e.preventDefault()

        let touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        let touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }

        // This is distance squared, but no need for an expensive sqrt as it's only used in ratio
        let currentDistance = (touch1.x - touch2.x)**2 + (touch1.y - touch2.y)**2

        if (initialPinchDistance == null) {
            initialPinchDistance = currentDistance
        } else {
            adjustZoom( null, currentDistance/initialPinchDistance )
        }
    }

    function adjustZoom(zoomAmount, zoomFactor) {
        if (!isDragging) {
            if (zoomAmount) {
                cameraZoom += zoomAmount
            } else if (zoomFactor) {
                console.log(zoomFactor)
                cameraZoom = zoomFactor*lastZoom
            }

            cameraZoom = Math.min( cameraZoom, MAX_ZOOM )
            cameraZoom = Math.max( cameraZoom, MIN_ZOOM )
        }
    }

    mapCanvas.addEventListener('mousedown', onPointerDown)
    mapCanvas.addEventListener('touchstart', (e) => handleTouch(e, onPointerDown))
    mapCanvas.addEventListener('mouseup', onPointerUp)
    mapCanvas.addEventListener('touchend',  (e) => handleTouch(e, onPointerUp))
    mapCanvas.addEventListener('mousemove', onPointerMove)
    mapCanvas.addEventListener('touchmove', (e) => handleTouch(e, onPointerMove))
    mapCanvas.addEventListener( 'wheel', (e) => adjustZoom(e.deltaY*SCROLL_SENSITIVITY))
}

async function setServerInfo(mapData) {
    let serverInfo = document.getElementById('serverinfotag');
    // Set the font of the text to the font we loaded
    serverInfo.innerHTML = mapData.info.name;
    let pop = document.getElementById("serverpop")
    let data = mapData.info.players + " / " + mapData.info.maxPlayers;
    if (mapData.info.queuedPlayers === 0) {
        pop.innerHTML = data;
    } else {
        pop.innerHTML = data + " (" + mapData.info.queuedPlayers + " queued)";
    }

}

async function removeLoadingScreen() {
    let loadingScreen = document.getElementById('loader');
    loadingScreen.classList.add('fade-in');
    // 1.5 seconds after the animation is done, remove the element from the DOM
    setTimeout(function() {
        loadingScreen.style.display = 'none';
        loadingScreen.remove();
    }, 1450);
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
    await setServerInfo(mapData);
    await PeriodicUpdateForDotsData();
    await DoFrame();
    await setupTransforms();
    await removeLoadingScreen();
}

Main();
