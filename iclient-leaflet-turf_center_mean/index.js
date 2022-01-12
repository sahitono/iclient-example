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

let map;
let resultLayer;
let imageryLayer;

const url =
  "http://128.199.133.7:8091/iserver/services/map-pama_mtbu/rest/maps/T2112_Ortho_Pit_MTBU_UTM48S";

const FEATURE_SERVICE = L.supermap.featureService(
  "http://119.8.117.190:8090/iserver/services/data-ecomag_loader/rest/data"
);

const getFeaturesBySQLPromise = (sqlParam) => {
  return new Promise((resolve, reject) => {
    FEATURE_SERVICE.getFeaturesBySQL(
      sqlParam,
      function ({ result, error, type }) {
        // console.log(type)
        if (type !== "processCompleted") {
          reject(error);
        } else {
          resolve(result.features);
        }
      }
    );
  });
};

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

    imageryLayer = L.supermap.tiledMapLayer(url);
    const sqlParam = new SuperMap.GetFeaturesBySQLParameters({
      queryParameter: {
        name: "T2112_Loader_MTBU_2D@mtbu_loader",
        attributeFilter: "DAY = 1",
      },
      datasetNames: ["mtbu_loader:T2112_Loader_MTBU_2D"],
    });
    const features = await getFeaturesBySQLPromise(sqlParam);
    resultLayer = L.geoJSON(features, {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 7,
          fillColor: "#eceff4",
          color: "#000",
          weight: 1,
          opacity: 1,
          fillOpacity: 1,
        });
      },
    });

    const meanCenter = L.geoJSON(turf.centerMean(features), {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 7,
          fillColor: "#bf616a",
          color: "#000",
          weight: 1,
          opacity: 1,
          fillOpacity: 1,
        });
      },
    });

    resultLayer.addTo(map).bindPopup("Date_User");
    imageryLayer.addTo(map);
    meanCenter.addTo(map);
    // L.control.layers({ image: imageryLayer }, { mtbu: resultLayer }).addTo(map);
    showCoords();
  } catch (e) {
    console.error(e);
  }
}

start();
