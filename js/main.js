function loadGeoJSON(url) {
    return $.ajax({
      url: url,
      dataType: "json",
      error: function (xhr, status, error) {
        console.error(`Chyba pri načítaní ${url}:`, error);
      },
    });
  }
  
  const map = L.map("map", {}).setView([48.15, 17.2], 12);
  map.addControl(new L.Control.Fullscreen());
  
  const streetMap = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  }).addTo(map);

  // Premenné na dynamickú prácu
  let routeLayer = null;
  let startMarker = null;
  let endMarker = null;
  
  let currentPosition = null; // Aktuálna poloha používateľa
  let riverGeoJSON = null;
  let pointsGeoJSON = null;
  
  $("#river-select").select2({
    theme: "bootstrap-5",
    allowClear: false,
    width: "resolve",
    minimumResultsForSearch: Infinity,
  });
  
  let riverRequest = 0;
  let riverOverview = null;

  // Keď vyberieme rieku
  $("#river-select").on("change", function () {
    const selectedRiver = $(this).val();
    if (!selectedRiver) return;
    const request = ++riverRequest;
    removeExistingLayers();
    if (riverOverview) map.removeLayer(riverOverview);
    $("#river-status").text("Načítavam rieku…");
  
    // Skrytie a resetovanie selectov pre štart a cieľ
    $("#start-end-selects").hide();
    $("#start-select").empty();
    $("#end-select").empty();
    $("#distance-info").text("Vyberte body pre štart a cieľ.");
  
    // Načítanie GeoJSON súborov pre vybranú rieku
    $.when(
      loadGeoJSON(`/geojson/${selectedRiver}/river.geojson`),
      loadGeoJSON(`/geojson/${selectedRiver}/points.geojson`)
    ).done(function (riverData, pointsData) {
      if (request !== riverRequest) return;
      riverGeoJSON = riverData[0];
      pointsGeoJSON = pointsData[0];
  
      riverOverview = L.geoJSON(riverGeoJSON, { style: { color: "#246ba6", weight: 3, opacity: 0.45 } }).addTo(map);
      map.fitBounds(riverOverview.getBounds(), { padding: [30, 30] });
      $("#river-status").text("Rieka je pripravená. Vyberte štart a cieľ.");

      // Pridanie aktuálnej polohy
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function (position) {
            currentPosition = turf.helpers.point([
              position.coords.longitude,
              position.coords.latitude,
            ]);
          },
          function (error) {
            console.error("Nepodarilo sa získať aktuálnu polohu:", error.message);
          }
        );
      }
  
      // Inicializácia selectov
      initializeSelectBox($("#start-select"), true);
      initializeSelectBox($("#end-select"), false);
      // vycistenie mapy
      removeExistingLayers();
      // Zobrazenie selectov pre štart a cieľ
      $("#start-end-selects").show();
      $("#start-select, #end-select").off("change.route").on("change.route", function () {
        calculateAndRenderRoute();
      });
    }).fail(function () {
      if (request !== riverRequest) return;
      $("#river-status").text("Rieku sa nepodarilo načítať. Skúste ju vybrať znova.");
    });
  });
  
  // Inicializácia selectboxu
  function initializeSelectBox(select, includeCurrent) {
    const placeholder = select.attr("id") === "start-select" ? "Štart" : "Cieľ";
  
    select
      .empty()
      .append(`<option value="" disabled selected>${placeholder}</option>`);
  
    if (includeCurrent) {
      select.append(
        `<option value="current" data-icon="fa-solid fa-location-dot">Aktuálna poloha</option>`
      );
    }
  
    pointsGeoJSON.features.forEach((feature, index) => {
      const types = feature.properties.type || []; // Typy ako pole
      select.append(
        `<option value="${index}" data-types='${JSON.stringify(types)}'>
             ${feature.properties.name}
           </option>`
      );
    });
  
    // Inicializácia Select2 s vlastným formátovaním
    select.select2({
      placeholder: placeholder,
      theme: "bootstrap-5",
      allowClear: true,
      width: "resolve",
      templateResult: formatOption, // Vlastné formátovanie
      templateSelection: formatOption, // Formátovanie pre vybranú možnosť
    });
  }
  
  // Funkcia na určenie ikony
  function determineIcons(types) {
    const iconMapping = {
      kemp: "fa fa-campground",
      bufet: "fa fa-utensils",
      prístavisko: "fa fa-anchor",
      pamiatka: "fa fa-landmark",
      sútok: "fa fa-code-fork",
      most: "fa-solid fa-bridge",
      ine: "fa-regular fa-flag",
    };
  
    // Ak typy nie sú definované, použijeme predvolenú ikonu
    if (!types || types.length === 0) {
      return `<i class="fa-solid fa-location-dot" style="margin-right: 5px; color: #666"></i>`;
    }
    // Prejdeme všetky typy a vrátime ikony ako HTML
    return types
      .map(type => {
        const icon = iconMapping[type] || "fa-solid fa-location-dot";
        return `<i class="${icon}" style="margin-right: 5px; color: #666"></i>`;
      })
      .join(""); // Spojíme všetky ikony do jedného HTML reťazca
  }
  
  // Funkcia na formátovanie položiek
  function formatOption(option) {
    if (!option.id) return option.text; // Placeholder
  
    const types = $(option.element).data("types"); // Získanie typov z data-types atribútu
    const icons = determineIcons(types || []); // Získanie ikon pre typy
    return $(`<span>${icons} ${option.text}</span>`);
  }
  
  // Výpočet a vykreslenie trasy
  function calculateAndRenderRoute() {
    removeExistingLayers();
    const startValue = $("#start-select").val();
    const endValue = $("#end-select").val();
    // Kontrola, či sú vybrané obe miesta
    if (!startValue || !endValue) {
      $("#distance-info").text("Vyberte obe miesta pre vykreslenie trasy.");
      removeExistingLayers();
      return;
    }
  
    // Keď sú miesta rovnaké
    if (startValue === endValue) {
      $("#distance-info").text(
        "Štart a cieľ sú rovnaké. Trasa nebude vykreslená."
      );
      removeExistingLayers();
      return;
    }
  
    let startPoint, endPoint;
  
    // Nastavenie bodu pre štart
    if (startValue === "current") {
      if (currentPosition) {
        startPoint = currentPosition;
    
        if (startMarker) map.removeLayer(startMarker);
    
        let startPopupContent = `<strong>Štart: Vaša poloha</strong>`;
    
        startMarker = L.marker([
          currentPosition.geometry.coordinates[1], // latitude
          currentPosition.geometry.coordinates[0], // longitude
        ])
          .addTo(map)
          .bindPopup(startPopupContent);
      } else {
        $("#distance-info").text(
          "Vaša aktuálna poloha ešte nie je dostupná. Skúste znova."
        );
        return;
      }
    } else {
      const startFeature = pointsGeoJSON.features[startValue];
      startPoint = turf.point(startFeature.geometry.coordinates);
    
      if (startMarker) map.removeLayer(startMarker);
    
      let startPopupContent = `<strong>Štart: ${startFeature.properties.name}</strong>`;
      if (startFeature.properties.img) {
        startPopupContent += `<br><img src="${startFeature.properties.img}" 
        alt="${startFeature.properties.name}" 
        style="width: 100%; margin-top: 5px; cursor: pointer;" 
        class="popup-image"
        data-img="${startFeature.properties.img}">`;
      }
    
      startMarker = L.marker([
        startFeature.geometry.coordinates[1], // latitude
        startFeature.geometry.coordinates[0], // longitude
      ])
        .addTo(map)
        .bindPopup(startPopupContent);
    }
    
  
  // Nastavenie bodu pre cieľ
  const endFeature = pointsGeoJSON.features[endValue];
  endPoint = turf.point(endFeature.geometry.coordinates);

  if (endMarker) map.removeLayer(endMarker);

  // Vytvorenie obsahu popupu s podmienkou na obrázok
  let endPopupContent = `<strong>Cieľ: ${endFeature.properties.name}</strong>`;

  if (endFeature.properties.img) {
    endPopupContent += `<br><img src="${endFeature.properties.img}" 
    alt="${endFeature.properties.name}" 
    data="${endFeature.properties.description}"
    style="width: 100%; margin-top: 5px; cursor: pointer;" 
    class="popup-image"
    data-img="${endFeature.properties.img}">`;
  }

  endMarker = L.marker([
    endFeature.geometry.coordinates[1], // latitude
    endFeature.geometry.coordinates[0], // longitude
  ])
    .addTo(map)
    .bindPopup(endPopupContent);

  if (startPoint && endPoint) {
    const bounds = L.latLngBounds(
      [
        startPoint.geometry.coordinates[1], // latitude štartu
        startPoint.geometry.coordinates[0], // longitude štartu
      ],
      [
        endPoint.geometry.coordinates[1], // latitude cieľa
        endPoint.geometry.coordinates[0], // longitude cieľa
      ]
    );
    map.fitBounds(bounds, { padding: [50, 50] }); // Pridanie okraja okolo bodov
  }

  
    // Výpočet trasy
    const riverLine = turf.lineString(
      riverGeoJSON.features[0].geometry.coordinates
    );

    const nearestStartPoint = turf.nearestPointOnLine(riverLine, startPoint);
    const nearestEndPoint = turf.nearestPointOnLine(riverLine, endPoint);
  
    const route = turf.lineSlice(
      nearestStartPoint.geometry.coordinates,
      nearestEndPoint.geometry.coordinates,
      riverLine
    );
  
    const distance = turf.length(route, { units: "kilometers" });
  
    // Vykreslenie trasy a vzdialenosti
    routeLayer = L.geoJSON(route, { style: { color: "#dc2626", weight: 5 } }).addTo(
      map
    );
    $("#distance-info").html(
      `Vzdialenosť medzi miestami je <strong>${distance.toFixed(2)} km.</strong>`
    );
  }
  
  // Odstránenie existujúcich vrstiev
  function removeExistingLayers() {
    if (routeLayer) map.removeLayer(routeLayer);
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
  }

  $(document).on("click", ".popup-image", function () {
    const imgSrc = $(this).data("img");
    const title = $(this).attr("alt");
    const description = $(this).attr("data");
    console.log(title);
    $("#modalTitle").text(title);
    $("#modalImage").attr("src", imgSrc);
    $("#modalText").text(description);
    const modal = new bootstrap.Modal(document.getElementById("photoModal"));
    modal.show();
  });

  $("#refresh-btn").on("click", function () {
  // Ak je vybraná aktuálna poloha ako štart, pokús sa získať novú polohu
  const startValue = $("#start-select").val();
  if (startValue === "current" && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        currentPosition = turf.helpers.point([
          position.coords.longitude,
          position.coords.latitude,
        ]);
        calculateAndRenderRoute(); // prepocitaj s novou pozíciou
      },
      function (error) {
        console.error("Nepodarilo sa získať aktuálnu polohu:", error.message);
        // aj tak spustíme prepocet (pouzije sa posledna známa poloha)
        calculateAndRenderRoute();
      }
    );
  } else {
    // Inak jednoducho prepočítaj trasu
    calculateAndRenderRoute();
  }
});
