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
      fields: ["SmID as ID", "loader_id", "MAX(gps_time) as time"],
    },
    hasGeometry: false,
    maxFeatures: 999999,
    toIndex: 999999,
    datasetNames: ["streaming:loader_utm"],
  });

  const features = await getFeaturesBySQLPromise(
    "http://103.193.14.22:8090/iserver/services/data-streaming_data-2/rest/data",
    sqlParam
  );

  const realtimeFeatures = {
    features: [],
    type: "FeatureCollection",
  };
  for (const feature of features.features) {
    const realtimeFeature = await getFeaturesBySQLPromise(
      "http://103.193.14.22:8090/iserver/services/data-streaming_data-2/rest/data",
      new SuperMap.GetFeaturesBySQLParameters({
        queryParameter: {
          name: "loader_utm@streaming",
          attributeFilter: `SmID = '${feature.properties.ID}'`,
        },
        maxFeatures: 1,
        toIndex: 999999,
        datasetNames: ["streaming:loader_utm"],
      })
    );

    if (
      !Object.prototype.hasOwnProperty.call(
        turfBoundaries,
        feature.properties.loader_id
      )
    ) {
      const boundaryFeature = await getFeaturesBySQLPromise(
        "http://103.193.14.22:8090/iserver/services/data-streaming_data-2/rest/data",
        new SuperMap.GetFeaturesBySQLParameters({
          queryParameter: {
            name: "boundary@streaming",
            attributeFilter: `Loader = '${feature.properties.loader_id}'`,
          },
          maxFeatures: 1,
          toIndex: 999999,
          datasetNames: ["streaming:boundary"],
        })
      );
      turfBoundaries[feature.properties.loader_id] = turf.polygon(
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
        turfBoundaries[feature.properties.loader_id]
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

const zip = (arr, ...args) =>
  arr.map((value, idx) => [value, ...args.map((arr) => arr[idx])]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateRealtime() {
  const features = await getFeaturesBySQLPromise(
    "http://103.193.14.22:8090/iserver/services/data-streaming_data-2/rest/data",
    new SuperMap.GetFeaturesBySQLParameters({
      queryParameter: {
        name: "loader_utm@streaming",
        groupBy: "loader_id",
        fields: ["loader_id"],
      },
      hasGeometry: false,
      maxFeatures: 999999,
      toIndex: 999999,
      datasetNames: ["streaming:loader_utm"],
    })
  );
  // console.log(features);

  const features1 = await getFeaturesBySQLPromise(
    "http://103.193.14.22:8090/iserver/services/data-streaming_data-2/rest/data",
    new SuperMap.GetFeaturesBySQLParameters({
      queryParameter: {
        name: "loader_utm@streaming",
        attributeFilter: `loader_id = '${features.features[0].properties.loader_id}'`,
      },
      hasGeometry: true,
      maxFeatures: 999999,
      toIndex: 999999,
      datasetNames: ["streaming:loader_utm"],
    })
  );

  const features2 = await getFeaturesBySQLPromise(
    "http://103.193.14.22:8090/iserver/services/data-streaming_data-2/rest/data",
    new SuperMap.GetFeaturesBySQLParameters({
      queryParameter: {
        name: "loader_utm@streaming",
        attributeFilter: `loader_id = '${features.features[1].properties.loader_id}'`,
      },
      hasGeometry: true,
      maxFeatures: 999999,
      toIndex: 999999,
      datasetNames: ["streaming:loader_utm"],
    })
  );
  // console.log(features1);
  // console.log(features2);
  const boundaryFeature1 = await getFeaturesBySQLPromise(
    "http://103.193.14.22:8090/iserver/services/data-streaming_data-2/rest/data",
    new SuperMap.GetFeaturesBySQLParameters({
      queryParameter: {
        name: "boundary@streaming",
        attributeFilter: `Loader = '${features.features[0].properties.loader_id}'`,
      },
      maxFeatures: 1,
      toIndex: 999999,
      datasetNames: ["streaming:boundary"],
    })
  );
  const boundaryFeature2 = await getFeaturesBySQLPromise(
    "http://103.193.14.22:8090/iserver/services/data-streaming_data-2/rest/data",
    new SuperMap.GetFeaturesBySQLParameters({
      queryParameter: {
        name: "boundary@streaming",
        attributeFilter: `Loader = '${features.features[1].properties.loader_id}'`,
      },
      maxFeatures: 1,
      toIndex: 999999,
      datasetNames: ["streaming:boundary"],
    })
  );

  const turfBoundaries1 = turf.polygon(
    boundaryFeature1.features[0].geometry.coordinates[0]
  );
  const turfBoundaries2 = turf.polygon(
    boundaryFeature2.features[0].geometry.coordinates[0]
  );
  L.geoJSON(boundaryFeature1, {
    style: {
      color: "#ff7800",
      weight: 5,
      opacity: 0.65,
    },
  }).addTo(map);
  L.geoJSON(boundaryFeature2, {
    style: {
      color: "#ff7800",
      weight: 5,
      opacity: 0.65,
    },
  }).addTo(map);

  let realtimeLayer1;
  let realtimeLayer2;
  for (const [f1, f2] of zip(features1.features, features2.features)) {
    console.log(f1);
    console.log(f2);
    if (realtimeLayer1 != null) {
      map.removeLayer(realtimeLayer1);
      map.removeLayer(realtimeLayer2);
    }
    const f1isInBoundary = turf.booleanPointInPolygon(
      turf.point(f1.geometry.coordinates),
      turfBoundaries1
    );
    const f2isInBoundary = turf.booleanPointInPolygon(
      turf.point(f2.geometry.coordinates),
      turfBoundaries2
    );

    realtimeLayer1 = L.geoJSON(f1, {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 7,
          fillColor: f1isInBoundary ? "#27ae60" : "#e74c3c",
          color: "#000",
          weight: 1,
          opacity: 1,
          fillOpacity: 1,
        });
      },
    });
    realtimeLayer2 = L.geoJSON(f2, {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 7,
          fillColor: f2isInBoundary ? "#27ae60" : "#e74c3c",
          color: "#000",
          weight: 1,
          opacity: 1,
          fillOpacity: 1,
        });
      },
    });
    realtimeLayer1.addTo(map);
    realtimeLayer2.addTo(map);
    await sleep(1000);
  }
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
      center: [9588987.54, 356637.68],
      maxZoom: 22,
      zoom: 12,
    });

    imageryLayer = L.supermap.tiledMapLayer(url);
    imageryLayer.addTo(map);
    // getRealtimeData();
    simulateRealtime();
    // setInterval(getRealtimeData, 1000 * 60);
    showCoords();
  } catch (e) {
    console.error(e);
  }
}

start();
