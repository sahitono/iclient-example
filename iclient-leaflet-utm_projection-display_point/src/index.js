import L from "leaflet";
import {
  tiledMapLayer,
  featureService,
  GetFeaturesBySQLParameters,
} from "@supermap/iclient-leaflet";

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
// L.control.mousePosition().addTo(map);
fetch(
  "http://128.199.133.7:8091/iserver/services/map-pama_mtbu/rest/maps/T2112_Ortho_Pit_MTBU_UTM48S/prjCoordSys/projection/extent.json"
)
  .then((res) => res.json())
  .then((data) => {
    const visableResolution = getStyleResolutions(data);

    // tile and coordinate will be in 32748
    mapcrs = L.CRS.NonEarthCRS({
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

    map = L.map("map", {
      crs: mapcrs,
      center: [9588787.54, 356637.68],
      // center: [-3.72, 103.71],
      maxZoom: 22,
      zoom: 5,
      preferCanvas: true,
    });

    // featureService(
    //   "http://119.8.117.190:8090/iserver/services/data-ecomag_point-2/rest/data"
    // ).getFeaturesBySQL(
    //   new GetFeaturesBySQLParameters({
    //     queryParameter: {
    //       name: "MTBU_Loader_UTM@mtbu_point",
    //       attributeFilter: "1=1",
    //     },
    //     datasetNames: ["mtbu_point:MTBU_Loader_UTM"],
    //   }),
    //   function (serviceResult) {
    //     // console.log(serviceResult);
    //     resultLayer = L.geoJSON(serviceResult.result.features, {
    //       pointToLayer: function (feature, latlng) {
    //         return L.circleMarker(latlng, {
    //           radius: 3,
    //           fillColor: "#ff7800",
    //           color: "#000",
    //           weight: 1,
    //           opacity: 1,
    //           fillOpacity: 0.8,
    //         });
    //       },
    //     })
    //       .addTo(map)
    //       .bindPopup("MTBU_Loader_UTM");
    //   }
    // );

    // featureService(
    //   "http://119.8.117.190:8090/iserver/services/data-ecomag_point-2/rest/data"
    // ).getFeaturesBySQL(
    //   new GetFeaturesBySQLParameters({
    //     queryParameter: {
    //       name: "MTBU_Surface_UTM_2D@mtbu_point",
    //       attributeFilter: "1=1",
    //     },
    //     datasetNames: ["mtbu_point:MTBU_Surface_UTM_2D"],
    //     toIndex: 9999999,
    //     maxFeatures: 9999999,
    //   }),
    //   function (serviceResult) {
    //     console.log(serviceResult);
    //     resultLayer = L.geoJSON(serviceResult.result.features, {
    //       pointToLayer: function (feature, latlng) {
    //         return L.circleMarker(latlng, {
    //           radius: 3,
    //           fillColor: "#bf616a",
    //           color: "#000",
    //           weight: 1,
    //           opacity: 1,
    //           fillOpacity: 0.8,
    //         });
    //       },
    //     })
    //       .addTo(map)
    //       .bindPopup("MTBU_Surface_UTM_2D");
    //   }
    // );

    featureService(
      "http://119.8.117.190:8090/iserver/services/data-2021_11/rest/data"
    ).getFeaturesBySQL(
      new SuperMap.GetFeaturesBySQLParameters({
        queryParameter: {
          name: "T2112_Desain_Pit_MTBUL@2021_11",
          attributeFilter: "1=1",
        },
        toIndex: 9999999,
        maxFeatures: 9999999,
        datasetNames: ["2021_11:T2112_Desain_Pit_MTBUL"],
      }),
      function (serviceResult) {
        console.log(serviceResult.result.features);
        pit11 = L.geoJSON(serviceResult.result.features, {
          style: function (feature) {
            console.log(feature.properties.ColorIndex);
            if (feature.properties.COLORINDEX === "1") {
              return {
                opacity: 1,
                color: "#FF0000",
                weight: 2,
              };
            } else if (feature.properties.COLORINDEX === "4") {
              return {
                opacity: 1,
                color: "#86E929",
                weight: 2,
              };
            }
            // switch (feature.properties.ColorIndex) {
            //   case "1":
            //     return {
            //       opacity: 1,
            //       color: "#FF0000",
            //       weight: 2,
            //     };

            //   case "3":
            //     return {
            //       opacity: 1,
            //       color: "#FFC349",
            //       weight: 2,
            //     };
            //   case "4":
            //     return {
            //       opacity: 1,
            //       color: "#86E929",
            //       weight: 2,
            //     };
            //   case "5":
            //     return {
            //       opacity: 1,
            //       color: "#00A0E9",
            //       weight: 2,
            //     };
            //   case "7":
            //     return {
            //       opacity: 1,
            //       color: "#E36C09",
            //       weight: 2,
            //     };
            //   case "30":
            //     return {
            //       opacity: 1,
            //       color: "#D33249",
            //       weight: 2,
            //     };
            // }
          },
        })
          .addTo(map)
          .bindPopup("Informasi: bulan 11");
      }
    );

    tiledMapLayer(url).addTo(map);
    showCoords();
  })
  .catch((err) => {
    console.log(err);
  });
