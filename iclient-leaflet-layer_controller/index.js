function getStyleResolutions(bounds) {
  var styleResolutions = [];
  var temp = Math.abs(bounds.left - bounds.right) / 256;
  for (var i = 0; i < 22; i++) {
    if (i == 0) {
      styleResolutions[i] = temp;
      continue;
    }
    temp = temp / 2;
    styleResolutions[i] = temp;
  }
  return styleResolutions;
}

const originResult = {
  bounds: {
    top: 9200392.666734546,
    left: 137906.1029836983,
    bottom: 9016472.666734546,
    leftBottom: { x: 137906.1029836983, y: 9016472.666734546 },
    right: 908196.1029836982,
    rightTop: { x: 908196.1029836982, y: 9200392.666734546 },
  },
};

function showCoords() {
  var mapdiv = document.getElementById("map");
  var coordsText = document.getElementById("coordsText");
  mapdiv.onmousemove = function (e) {
    e = e || window.event;
    var point = map.mouseEventToLatLng(e);
    coordsText.value =
      parseFloat(point.lat).toFixed(4) + "," + parseFloat(point.lng).toFixed(4);
  };
}

const FEATURE_SERVICE = L.supermap.featureService(
  "http://128.199.133.7:8091/iserver/services/data-pama_mtbu/rest/data"
);

const getFeaturesBySQLPromise = (sqlParam) => {
  return new Promise((resolve, reject) => {
    FEATURE_SERVICE.getFeaturesBySQL(
      sqlParam,
      function ({ result, error, type }) {
        if (type !== "processCompleted") {
          reject(error);
        } else {
          resolve(result.features);
        }
      }
    );
  });
};

const url =
  "http://128.199.133.7:8091/iserver/services/map-pama_mtbu/rest/maps/T2112_Ortho_Pit_MTBU_UTM48S";
let map;
let resultLayer;
let imageryLayer;

const layerManager = {};
function toggleLayer(layerName) {
  layerManager[layerName].active = !layerManager[layerName].active;
  if (layerManager[layerName].active) {
    layerManager[layerName].layer.addTo(map);
  } else {
    map.removeLayer(layerManager[layerName].layer);
  }
}

function zoomToLayer(layerName) {
  map.fitBounds(layerManager[layerName].layer.getBounds());
}

function addLayer(layerName, layer) {
  const layerItem = document.createElement("li");
  layerItem.classList = ["list-group-item"];
  layerItem.id = layerName;

  const checkboxes = document.createElement("input");
  checkboxes.classList = ["form-check-input"];
  checkboxes.type = "checkbox";
  checkboxes.checked = true;
  layerItem.appendChild(checkboxes);

  const buttonLayer = document.createElement("button");
  buttonLayer.style = "padding: 0rem 0rem";
  buttonLayer.classList = ["btn btn-link"];
  buttonLayer.innerText = layerName;
  layerItem.appendChild(buttonLayer);

  layerManager[layerName] = {
    active: true,
    layer,
  };
  checkboxes.addEventListener("click", () => {
    toggleLayer(layerName);
  });
  buttonLayer.addEventListener("click", () => {
    zoomToLayer(layerName);
  });
  layer.addTo(map);
  document.getElementById("layer-list").appendChild(layerItem);
}

async function start() {
  try {
    const res = await fetch(
      "http://128.199.133.7:8091/iserver/services/map-pama_mtbu/rest/maps/T2112_Ortho_Pit_MTBU_UTM48S/prjCoordSys/projection/extent.json"
    );
    const data = await res.json();

    const visableResolution = getStyleResolutions(data);
    const mapcrs = L.CRS.NonEarthCRS({
      bounds: L.bounds([data.left, data.bottom], [data.right, data.top]),
      resolutions: visableResolution,
      origin: L.point(data.left, data.top),
    });

    map = L.map("map", {
      crs: mapcrs,
      center: [9588787.54, 356637.68],
      maxZoom: 22,
      zoom: 5,
    });

    // resultLayer.addTo(map).bindPopup("Date_User");

    imageryLayer = L.supermap.tiledMapLayer(url);
    imageryLayer.addTo(map);

    const desainPitFeatures = await getFeaturesBySQLPromise(
      new SuperMap.GetFeaturesBySQLParameters({
        queryParameter: {
          name: "T2112_Desain_Pit_MTBUL@pama_mtbu",
          attributeFilter: "1=1",
        },
        datasetNames: ["pama_mtbu:T2112_Desain_Pit_MTBUL"],
      })
    );

    const desainPitLayer = L.geoJSON(desainPitFeatures);
    addLayer("T2112_Desain_Pit_MTBUL", desainPitLayer);

    const desainPitTFeatures = await getFeaturesBySQLPromise(
      new SuperMap.GetFeaturesBySQLParameters({
        queryParameter: {
          name: "T2112_Desain_Pit_MTBUT@pama_mtbu",
          attributeFilter: "1=1",
        },
        datasetNames: ["pama_mtbu:T2112_Desain_Pit_MTBUT"],
      })
    );

    const desainPitTLayer = L.geoJSON(desainPitTFeatures);
    addLayer("T2112_Desain_Pit_MTBUT", desainPitTLayer);

    showCoords();
  } catch (error) {
    console.error(error);
  }
}

start();
