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

// const FEATURE_SERVICE = L.supermap.featureService(
//   "http://119.8.117.190:8090/iserver/services/data-ecomag_loader/rest/data"
// );

const getFeaturesBySQLPromise = (url, sqlParam) => {
  return new Promise((resolve, reject) => {
    L.supermap
      .featureService(url)
      .getFeaturesBySQL(sqlParam, function ({ result, error, type }) {
        // console.log(type)
        if (type !== "processCompleted") {
          reject(error);
        } else {
          resolve(result.features);
        }
      });
  });
};

let realtimeLayer;
let turfBoundaries = {};
async function getRealtimeData() {
  const sqlParam = new SuperMap.GetFeaturesBySQLParameters({
    queryParameter: {
      name: "loader_utm@streaming",
      groupBy: "loader_id",
    },
    hasGeometry: false,
    maxFeatures: 999999,
    toIndex: 999999,
    datasetNames: ["streaming:loader_utm"],
  });

  const features = await getFeaturesBySQLPromise(
    "http://103.193.14.22:8090/iserver/services/data-streaming_data/rest/data",
    sqlParam
  );

  const realtimeFeatures = {
    features: [],
    type: "FeatureCollection",
  };
  for (const feature of features.features) {
    const realtimeFeature = await getFeaturesBySQLPromise(
      "http://103.193.14.22:8090/iserver/services/data-streaming_data/rest/data",
      new SuperMap.GetFeaturesBySQLParameters({
        queryParameter: {
          name: "loader_utm@streaming",
          attributeFilter: `loader_id = '${feature.properties.LOADER_ID}'`,
          orderBy: "SmID DESC",
        },
        maxFeatures: 1,
        toIndex: 999999,
        datasetNames: ["streaming:loader_utm"],
      })
    );

    if (
      !Object.prototype.hasOwnProperty.call(
        turfBoundaries,
        feature.properties.LOADER_ID
      )
    ) {
      const boundaryFeature = await getFeaturesBySQLPromise(
        "http://103.193.14.22:8090/iserver/services/data-streaming_data/rest/data",
        new SuperMap.GetFeaturesBySQLParameters({
          queryParameter: {
            name: "boundary@streaming",
            attributeFilter: `Loader = '${feature.properties.LOADER_ID}'`,
            orderBy: "SmID DESC",
          },
          maxFeatures: 1,
          toIndex: 999999,
          datasetNames: ["streaming:boundary"],
        })
      );
      turfBoundaries[feature.properties.LOADER_ID] = turf.polygon(
        boundaryFeature.features[0].geometry.coordinates[0]
      );
      L.geoJSON(boundaryFeature, {
        style: {
          color: "#ff7800",
          weight: 5,
          opacity: 0.65,
        },
      }).addTo(map);
    }

    realtimeFeature.features[0].properties["isInBoundary"] =
      turf.booleanPointInPolygon(
        turf.point(realtimeFeature.features[0].geometry.coordinates),
        turfBoundaries[feature.properties.LOADER_ID]
      );

    realtimeFeatures.features.push(realtimeFeature.features[0]);
  }

  if (realtimeLayer != null) {
    map.removeLayer(realtimeLayer);
  }

  realtimeLayer = L.geoJSON(realtimeFeatures, {
    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng, {
        radius: 7,
        fillColor: feature.properties.isInBoundary ? "#27ae60" : "#e74c3c",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 1,
      });
    },
  });

  realtimeLayer.addTo(map);
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

    imageryLayer = L.supermap.tiledMapLayer(url);
    imageryLayer.addTo(map);
    getRealtimeData();
    setInterval(getRealtimeData, 1000 * 60);
    showCoords();
  } catch (e) {
    console.error(e);
  }
}

start();
