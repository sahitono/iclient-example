// import L from "leaflet";
// import {
//   tiledMapLayer,
//   featureService,
//   GetFeaturesBySQLParameters,
// } from "@supermap/iclient-leaflet";

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

// console.log(crs);

const url =
  "http://128.199.133.7:8091/iserver/services/map-pama_mtbu/rest/maps/T2112_Ortho_Pit_MTBU_UTM48S";
let map;
let resultLayer;
let imageryLayer;

fetch(
  "http://128.199.133.7:8091/iserver/services/map-pama_mtbu/rest/maps/T2112_Ortho_Pit_MTBU_UTM48S/prjCoordSys/projection/extent.json"
)
  .then((res) => res.json())
  .then(async (data) => {
    console.log(data);
    const visableResolution = getStyleResolutions(data);

    // tile and coordinate will be in 32748
    const mapcrs = L.CRS.NonEarthCRS({
      bounds: L.bounds([data.left, data.bottom], [data.right, data.top]),
      resolutions: visableResolution,
      origin: L.point(data.left, data.top),
    });

    // proj4 already available global
    proj4.defs(
      "EPSG:32648",
      "+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs"
    );
    proj4.defs(
      "EPSG:32748",
      "+proj=utm +zone=48 +south +datum=WGS84 +units=m +no_defs "
    );

    // tile in 32748 but coordinate in 4326
    const crs = new L.Proj.CRS("EPSG:32748", {
      origin: [data.left, data.top],
      bounds: L.bounds([data.left, data.bottom], [data.right, data.top]),
    });
    console.log(crs);
    console.log(mapcrs);

    map = L.map("map", {
      crs: mapcrs,
      center: [9588787.54, 356637.68],
      maxZoom: 22,
      zoom: 5,
    });

    imageryLayer = L.supermap.tiledMapLayer(url);
    imageryLayer.addTo(map);

    const sqlParam = new SuperMap.GetFeaturesBySQLParameters({
      queryParameter: {
        name: "T2112_Desain_Pit_MTBUL@pama_mtbu",
        attributeFilter: "1=1",
      },
      datasetNames: ["pama_mtbu:T2112_Desain_Pit_MTBUL"],
    });

    const FEATURE_SERVICE = L.supermap.featureService(
      "http://128.199.133.7:8091/iserver/services/data-pama_mtbu/rest/data"
    );

    const getFeaturesBySQLPromise = () => {
      return new Promise((resolve, reject) => {
        FEATURE_SERVICE.getFeaturesBySQL(sqlParam, function ({ result, type }) {
          if (type !== "processCompleted") {
            reject("getFeaturesBySQLPromise error");
          } else {
            resolve(L.geoJSON(result.features));
          }
        });
      });
    };

    resultLayer = await getFeaturesBySQLPromise();
    resultLayer.addTo(map).bindPopup("Date_User");
    L.control.layers({ image: imageryLayer }, { mtbu: resultLayer }).addTo(map);

    showCoords();
  })
  .catch((err) => {
    console.log(err);
  });
