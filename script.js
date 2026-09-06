/* =========================================================
   SKYCAST PRO
   Real OpenWeather Integration
   Complete Final script.js
   ========================================================= */

/* =========================================================
   API CONFIG
   ========================================================= */

const API_KEY = "8b7efb7f802b048f87d56afdbcf89afc";


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const state = {
  weather: null,
  forecast: null,
  air: null,
  city: "",

  unit:
    localStorage.getItem("skycast-unit") ||
    "metric",

  favorites: safeJSON(
    localStorage.getItem("skycast-favorites"),
    []
  ),

  recent: safeJSON(
    localStorage.getItem("skycast-recent"),
    []
  )
};


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (id) =>
  document.getElementById(id);

function safeJSON(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}


/* =========================================================
   ELEMENTS
   ========================================================= */

const els = {
  searchInput: $("searchInput"),
  searchBtn: $("searchBtn"),
  locationBtn: $("locationBtn"),

  weatherApp: $("weatherApp"),
  errorBox: $("errorBox"),
  loadingOverlay: $("loadingOverlay"),
  toast: $("toast")
};


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  setupEvents();

  renderFavorites();
  renderRecent();

  if (
    !API_KEY ||
    API_KEY ===
      "PASTE_YOUR_NEW_OPENWEATHER_API_KEY_HERE"
  ) {
    showError(
      "Please add your new OpenWeather API key in script.js."
    );
    return;
  }

  loadFromSavedLocation();
});


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

  /* SEARCH */

  els.searchBtn?.addEventListener(
    "click",
    searchCity
  );

  els.searchInput?.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchCity();
      }
    }
  );


  /* LOCATION */

  els.locationBtn?.addEventListener(
    "click",
    useMyLocation
  );


  /* REFRESH */

  $("refreshBtn")?.addEventListener(
    "click",
    refreshWeather
  );


  /* UNIT */

  $("unitBtn")?.addEventListener(
    "click",
    toggleUnit
  );


  /* THEME */

  $("themeBtn")?.addEventListener(
    "click",
    toggleTheme
  );


  /* FAVORITE */

  $("favoriteBtn")?.addEventListener(
    "click",
    toggleFavorite
  );


  /* CLEAR FAVORITES */

  $("clearFavorites")?.addEventListener(
    "click",
    () => {
      state.favorites = [];

      saveData();
      renderFavorites();

      showToast(
        "Favorites cleared ⭐"
      );
    }
  );


  /* CLEAR RECENT */

  $("clearRecent")?.addEventListener(
    "click",
    () => {
      state.recent = [];

      saveData();
      renderRecent();

      showToast(
        "Recent searches cleared 🕘"
      );
    }
  );


  /* NAVIGATION */

  document
    .querySelectorAll(".nav-link")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(".nav-link")
            .forEach((item) =>
              item.classList.remove(
                "active"
              )
            );

          button.classList.add(
            "active"
          );

          const target =
            button.dataset.target;

          if (target) {
            document
              .querySelector(target)
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
          }
        }
      );
    });
}


/* =========================================================
   REFRESH WEATHER
   ========================================================= */

function refreshWeather() {

  if (!state.weather) {
    showToast(
      "Search for a city first 🌤️"
    );
    return;
  }

  loadWeatherByCoordinates(
    state.weather.coord.lat,
    state.weather.coord.lon
  );
}


/* =========================================================
   SEARCH CITY
   ========================================================= */

async function searchCity() {

  const city =
    els.searchInput?.value.trim();

  if (!city) {
    showToast(
      "Enter a city name 🔎"
    );

    els.searchInput?.focus();

    return;
  }

  if (!isAPIReady()) {
    showError(
      "Please add your new OpenWeather API key."
    );

    return;
  }

  try {

    showLoading(
      `Finding ${city}...`
    );

    const geoUrl =
      "https://api.openweathermap.org/geo/1.0/direct" +
      `?q=${encodeURIComponent(city)}` +
      "&limit=5" +
      `&appid=${API_KEY}`;

    const response =
      await fetch(geoUrl);

    if (!response.ok) {

      if (response.status === 401) {
        throw new Error(
          "Invalid OpenWeather API key."
        );
      }

      throw new Error(
        "Unable to find location."
      );
    }

    const locations =
      await response.json();

    if (!locations.length) {
      throw new Error(
        "City not found. Try another city name."
      );
    }

    const location =
      locations[0];

    await loadWeatherByCoordinates(
      location.lat,
      location.lon
    );

  } catch (error) {

    hideLoading();

    showError(
      error.message ||
      "Something went wrong."
    );
  }
}


/* =========================================================
   API KEY CHECK
   ========================================================= */

function isAPIReady() {

  return (
    API_KEY &&
    API_KEY !==
      "PASTE_YOUR_NEW_OPENWEATHER_API_KEY_HERE"
  );
}


/* =========================================================
   GPS LOCATION
   ========================================================= */

function useMyLocation() {

  if (!navigator.geolocation) {

    showError(
      "Location is not supported by this browser."
    );

    return;
  }

  showLoading(
    "Detecting your location... 📍"
  );

  navigator.geolocation.getCurrentPosition(

    async (position) => {

      try {

        await loadWeatherByCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          true
        );

      } catch (error) {

        hideLoading();

        showError(
          error.message ||
          "Unable to get your location."
        );
      }
    },

    (error) => {

      hideLoading();

      let message =
        "Location permission was denied.";

      if (
        error.code ===
        error.TIMEOUT
      ) {
        message =
          "Location request timed out.";
      }

      showError(
        `${message} Search for your city instead.`
      );
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000
    }
  );
}


/* =========================================================
   LOAD WEATHER
   ========================================================= */

async function loadWeatherByCoordinates(
  lat,
  lon,
  fromGPS = false
) {

  try {

    showLoading(
      "Loading live weather... ☁️"
    );


    /* CURRENT WEATHER */

    const weatherUrl =
      "https://api.openweathermap.org/data/2.5/weather" +
      `?lat=${lat}` +
      `&lon=${lon}` +
      `&appid=${API_KEY}` +
      `&units=${state.unit}`;


    /* FORECAST */

    const forecastUrl =
      "https://api.openweathermap.org/data/2.5/forecast" +
      `?lat=${lat}` +
      `&lon=${lon}` +
      `&appid=${API_KEY}` +
      `&units=${state.unit}`;


    /* AIR QUALITY */

    const airUrl =
      "https://api.openweathermap.org/data/2.5/air_pollution" +
      `?lat=${lat}` +
      `&lon=${lon}` +
      `&appid=${API_KEY}`;


    const [
      weatherRes,
      forecastRes,
      airRes
    ] = await Promise.all([

      fetch(weatherUrl),

      fetch(forecastUrl),

      fetch(airUrl)
    ]);


    if (!weatherRes.ok) {

      if (
        weatherRes.status === 401
      ) {
        throw new Error(
          "Invalid OpenWeather API key."
        );
      }

      if (
        weatherRes.status === 429
      ) {
        throw new Error(
          "API request limit reached. Try again later."
        );
      }

      throw new Error(
        "Weather data unavailable."
      );
    }


    const weather =
      await weatherRes.json();

    const forecast =
      forecastRes.ok
        ? await forecastRes.json()
        : null;

    const air =
      airRes.ok
        ? await airRes.json()
        : null;


    /* SAVE STATE */

    state.weather =
      weather;

    state.forecast =
      forecast;

    state.air =
      air;

    state.city =
      weather.name;


    /* RECENT CITY */

    addRecentCity(
      weather.name
    );


    /* RENDER EVERYTHING */

    renderWeather();

    renderForecast();

    renderAirQuality();

    renderChart();

    renderSun();

    renderWind();

    updateFavoriteButton();


    /* UI */

    hideLoading();

    hideError();

    showToast(
      `Weather updated for ${weather.name} 🌤️`
    );


    /* SCROLL */

    els.weatherApp?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {

    hideLoading();

    showError(
      error.message ||
      "Unable to load weather data."
    );
  }
}


/* =========================================================
   MAIN WEATHER
   ========================================================= */

function renderWeather() {

  const w =
    state.weather;

  if (!w) return;


  setText(
    "cityName",
    `${w.name}, ${w.sys.country}`
  );


  setText(
    "updatedTime",
    `Updated ${formatTime(new Date())}`
  );


  setText(
    "temperature",
    Math.round(w.main.temp)
  );


  setText(
    "weatherCondition",
    capitalize(
      w.weather[0].description
    )
  );


  setText(
    "feelsLike",
    `Feels like ${Math.round(
      w.main.feels_like
    )}°`
  );


  setText(
    "highTemp",
    `${Math.round(
      w.main.temp_max
    )}°`
  );


  setText(
    "lowTemp",
    `${Math.round(
      w.main.temp_min
    )}°`
  );


  setText(
    "humidity",
    `${w.main.humidity}%`
  );


  setText(
    "pressure",
    `${w.main.pressure} hPa`
  );


  setText(
    "visibility",
    w.visibility
      ? `${(
          w.visibility / 1000
        ).toFixed(1)} km`
      : "--"
  );


  setText(
    "clouds",
    `${w.clouds.all}%`
  );


  setText(
    "windSpeed",
    formatWind(
      w.wind.speed
    )
  );


  setText(
    "windDirection",
    degreesToDirection(
      w.wind.deg || 0
    )
  );


  setText(
    "coordinates",
    `${w.coord.lat.toFixed(
      3
    )}, ${w.coord.lon.toFixed(3)}`
  );


  setText(
    "country",
    w.sys.country
  );


  setText(
    "timezone",
    formatTimezone(
      w.timezone
    )
  );


  setText(
    "weatherInsight",
    createInsight(w)
  );


  setText(
    "weatherIcon",
    weatherEmoji(
      w.weather[0].main,
      w.weather[0].icon
    )
  );


  document.body.dataset.weather =
    w.weather[0].main.toLowerCase();
}


/* =========================================================
   FORECAST
   ========================================================= */

function renderForecast() {

  const forecast =
    state.forecast;

  if (!forecast) return;


  /* HOURLY */

  const hourlyContainer =
    $("hourlyContainer");

  if (hourlyContainer) {

    hourlyContainer.innerHTML = "";


    forecast.list
      .slice(0, 10)
      .forEach(
        (item, index) => {

          const card =
            document.createElement(
              "div"
            );

          card.className =
            "hourly-card" +
            (index === 0
              ? " active"
              : "");


          card.innerHTML = `

            <div class="hour">
              ${
                index === 0
                  ? "Now"
                  : formatHour(
                      item.dt * 1000
                    )
              }
            </div>

            <div class="icon">
              ${weatherEmoji(
                item.weather[0].main,
                item.weather[0].icon
              )}
            </div>

            <strong>
              ${Math.round(
                item.main.temp
              )}°
            </strong>

            <small>
              ${item.main.humidity}% humidity
            </small>

          `;


          hourlyContainer.appendChild(
            card
          );
        }
      );
  }


  /* DAILY */

  const forecastContainer =
    $("forecastContainer");

  if (!forecastContainer)
    return;


  forecastContainer.innerHTML =
    "";


  const daily =
    groupDailyForecast(
      forecast.list
    );


  daily
    .slice(0, 5)
    .forEach((day) => {

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "forecast-row";


      row.innerHTML = `

        <div class="forecast-day">
          ${formatDay(day.date)}
        </div>

        <div class="forecast-condition">

          <span class="forecast-icon">
            ${weatherEmoji(
              day.weather.main,
              day.weather.icon
            )}
          </span>

          ${capitalize(
            day.weather.description
          )}

        </div>

        <div class="forecast-temp">
          ${Math.round(day.max)}°
          /
          ${Math.round(day.min)}°
        </div>

        <div class="forecast-extra">
          💧 ${day.humidity}%
        </div>

      `;


      forecastContainer.appendChild(
        row
      );
    });
}


/* =========================================================
   AIR QUALITY
   ========================================================= */

function renderAirQuality() {

  if (
    !state.air?.list?.length
  ) {
    return;
  }


  const data =
    state.air.list[0];


  const aqi =
    data.main.aqi;


  setText(
    "aqiNumber",
    aqi
  );


  setText(
    "aqiStatus",
    getAQIText(aqi)
  );


  const components =
    data.components || {};


  setText(
    "pm25",
    components.pm2_5 != null
      ? `${components.pm2_5.toFixed(
          1
        )} μg/m³`
      : "--"
  );


  setText(
    "pm10",
    components.pm10 != null
      ? `${components.pm10.toFixed(
          1
        )} μg/m³`
      : "--"
  );


  setText(
    "co",
    components.co != null
      ? `${Math.round(
          components.co
        )}`
      : "--"
  );


  setText(
    "no2",
    components.no2 != null
      ? `${Math.round(
          components.no2
        )}`
      : "--"
  );


  setText(
    "o3",
    components.o3 != null
      ? `${Math.round(
          components.o3
        )}`
      : "--"
  );


  setText(
    "so2",
    components.so2 != null
      ? `${Math.round(
          components.so2
        )}`
      : "--"
  );
}


function getAQIText(aqi) {

  const values = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very Poor"
  };

  return (
    values[aqi] ||
    "Unknown"
  );
}


/* =========================================================
   WIND
   ========================================================= */

function renderWind() {

  if (!state.weather)
    return;


  const deg =
    state.weather.wind.deg || 0;


  const arrow =
    $("windArrow");


  if (arrow) {

    arrow.style.transform =
      `rotate(${deg}deg)`;
  }
}


/* =========================================================
   TEMPERATURE CHART
   ========================================================= */

function renderChart() {

  const forecast =
    state.forecast;

  if (!forecast)
    return;


  const points =
    forecast.list
      .slice(0, 8)
      .map(
        (item) =>
          item.main.temp
      );


  const svg =
    $("temperatureChart");


  if (
    !svg ||
    !points.length
  ) {
    return;
  }


  const width = 800;

  const height = 260;


  const min =
    Math.min(...points) - 2;

  const max =
    Math.max(...points) + 2;


  const range =
    max - min || 1;


  const coordinates =
    points.map(
      (temp, index) => {

        const x =
          (index /
            Math.max(
              points.length - 1,
              1
            )) *
          width;


        const y =
          height -
          ((temp - min) /
            range) *
            (height - 40) -
          20;


        return {
          x,
          y,
          temp
        };
      }
    );


  const polyline =
    coordinates
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");


  const polygon =
    `0,${height} ${polyline} ${width},${height}`;


  svg.innerHTML = `

    <defs>

      <linearGradient
        id="chartGradient"
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >

        <stop
          offset="0%"
          stop-color="#00d4ff"
          stop-opacity=".3"
        />

        <stop
          offset="100%"
          stop-color="#00d4ff"
          stop-opacity="0"
        />

      </linearGradient>

    </defs>


    <polygon
      points="${polygon}"
      fill="url(#chartGradient)"
    />


    <polyline
      points="${polyline}"
      fill="none"
      stroke="#00d4ff"
      stroke-width="4"
      stroke-linecap="round"
      stroke-linejoin="round"
    />


    ${coordinates
      .map(
        (point) => `

          <circle
            cx="${point.x}"
            cy="${point.y}"
            r="5"
            fill="#00d4ff"
          />

          <text
            x="${point.x}"
            y="${point.y - 12}"
            fill="currentColor"
            font-size="12"
            text-anchor="middle"
          >
            ${Math.round(
              point.temp
            )}°
          </text>

        `
      )
      .join("")}

  `;
}


/* =========================================================
   SUNRISE / SUNSET
   ========================================================= */

function renderSun() {

  if (!state.weather)
    return;


  const sunrise =
    state.weather.sys.sunrise *
    1000;


  const sunset =
    state.weather.sys.sunset *
    1000;


  setText(
    "sunrise",
    formatTime(
      new Date(sunrise)
    )
  );


  setText(
    "sunset",
    formatTime(
      new Date(sunset)
    )
  );


  updateSunPosition(
    sunrise,
    sunset
  );
}


function updateSunPosition(
  sunrise,
  sunset
) {

  const sun =
    $("sunBall");


  if (!sun)
    return;


  const now =
    Date.now();


  let progress =
    (now - sunrise) /
    (sunset - sunrise);


  progress =
    Math.max(
      0,
      Math.min(
        1,
        progress
      )
    );


  const left =
    10 + progress * 80;


  const bottom =
    Math.sin(
      progress * Math.PI
    ) * 85;


  sun.style.left =
    `${left}%`;


  sun.style.bottom =
    `${bottom}px`;
}


/* =========================================================
   FAVORITES
   ========================================================= */

function toggleFavorite() {

  if (!state.weather) {

    showToast(
      "Search for a city first."
    );

    return;
  }


  const city =
    state.weather.name;


  const index =
    state.favorites.findIndex(
      (item) =>
        item.toLowerCase() ===
        city.toLowerCase()
    );


  if (index >= 0) {

    state.favorites.splice(
      index,
      1
    );

    showToast(
      `${city} removed from favorites`
    );

  } else {

    state.favorites.push(
      city
    );

    showToast(
      `${city} added to favorites ⭐`
    );
  }


  saveData();

  renderFavorites();

  updateFavoriteButton();
}


function updateFavoriteButton() {

  const button =
    $("favoriteBtn");


  if (
    !button ||
    !state.weather
  ) {
    return;
  }


  const exists =
    state.favorites.some(
      (city) =>
        city.toLowerCase() ===
        state.weather.name.toLowerCase()
    );


  button.textContent =
    exists ? "★" : "☆";


  button.setAttribute(
    "aria-label",
    exists
      ? "Remove from favorites"
      : "Add to favorites"
  );
}


/* =========================================================
   RECENT SEARCHES
   ========================================================= */

function addRecentCity(city) {

  state.recent =
    state.recent.filter(
      (item) =>
        item.toLowerCase() !==
        city.toLowerCase()
    );


  state.recent.unshift(
    city
  );


  state.recent =
    state.recent.slice(
      0,
      8
    );


  saveData();

  renderRecent();
}


function renderFavorites() {

  const container =
    $("favoritesContainer");


  if (!container)
    return;


  if (
    !state.favorites.length
  ) {

    container.innerHTML = `
      <span class="empty-message">
        No favorite cities yet.
      </span>
    `;

    return;
  }


  container.innerHTML =
    state.favorites
      .map(
        (city) => `

          <button
            class="city-chip"
            data-city="${escapeHTML(city)}"
          >
            ⭐ ${escapeHTML(city)}
          </button>

        `
      )
      .join("");


  container
    .querySelectorAll(
      ".city-chip"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () =>
          loadCityFromChip(
            button.dataset.city
          )
      );

    });
}


function renderRecent() {

  const container =
    $("recentContainer");


  if (!container)
    return;


  if (!state.recent.length) {

    container.innerHTML = `
      <span class="empty-message">
        Search a city to see it here.
      </span>
    `;

    return;
  }


  container.innerHTML =
    state.recent
      .map(
        (city) => `

          <button
            class="city-chip"
            data-city="${escapeHTML(city)}"
          >
            🕘 ${escapeHTML(city)}
          </button>

        `
      )
      .join("");


  container
    .querySelectorAll(
      ".city-chip"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () =>
          loadCityFromChip(
            button.dataset.city
          )
      );

    });
}


async function loadCityFromChip(city) {

  if (els.searchInput) {
    els.searchInput.value =
      city;
  }

  await searchCity();
}


/* =========================================================
   TEMPERATURE UNIT
   ========================================================= */

function toggleUnit() {

  state.unit =
    state.unit === "metric"
      ? "imperial"
      : "metric";


  localStorage.setItem(
    "skycast-unit",
    state.unit
  );


  updateUnitButton();


  if (state.weather) {

    loadWeatherByCoordinates(
      state.weather.coord.lat,
      state.weather.coord.lon
    );
  }


  showToast(
    state.unit === "metric"
      ? "Temperature: °C 🌡️"
      : "Temperature: °F 🌡️"
  );
}


function updateUnitButton() {

  const button =
    $("unitBtn");


  if (!button)
    return;


  button.textContent =
    state.unit === "metric"
      ? "°C"
      : "°F";
}


/* =========================================================
   THEME
   ========================================================= */

function toggleTheme() {

  document.body.classList.toggle(
    "light"
  );


  const isLight =
    document.body.classList.contains(
      "light"
    );


  localStorage.setItem(
    "skycast-theme",
    isLight
      ? "light"
      : "dark"
  );


  updateThemeButton();


  showToast(
    isLight
      ? "Light mode enabled ☀️"
      : "Dark mode enabled 🌙"
  );
}


function loadTheme() {

  const theme =
    localStorage.getItem(
      "skycast-theme"
    );


  if (theme === "light") {

    document.body.classList.add(
      "light"
    );
  }


  updateThemeButton();

  updateUnitButton();
}


function updateThemeButton() {

  const button =
    $("themeBtn");


  if (!button)
    return;


  const isLight =
    document.body.classList.contains(
      "light"
    );


  button.textContent =
    isLight
      ? "☀️"
      : "🌙";


  button.setAttribute(
    "aria-label",
    isLight
      ? "Switch to dark mode"
      : "Switch to light mode"
  );
}


/* =========================================================
   SAVED LOCATION
   ========================================================= */

function loadFromSavedLocation() {

  const last =
    state.recent[0];


  if (
    last &&
    els.searchInput
  ) {

    els.searchInput.value =
      last;

    searchCity();

  } else {

    useMyLocation();
  }
}


/* =========================================================
   WEATHER EMOJI
   ========================================================= */

function weatherEmoji(
  main,
  icon
) {

  const isNight =
    icon?.endsWith("n");


  switch (
    main?.toLowerCase()
  ) {

    case "clear":
      return isNight
        ? "🌙"
        : "☀️";

    case "clouds":
      return "☁️";

    case "rain":
      return "🌧️";

    case "drizzle":
      return "🌦️";

    case "thunderstorm":
      return "⛈️";

    case "snow":
      return "❄️";

    case "mist":
    case "fog":
    case "haze":
    case "smoke":
      return "🌫️";

    case "dust":
    case "sand":
      return "🌪️";

    default:
      return "🌤️";
  }
}


/* =========================================================
   WIND DIRECTION
   ========================================================= */

function degreesToDirection(
  deg
) {

  const directions = [
    "N",
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW"
  ];


  return directions[
    Math.round(deg / 45) % 8
  ];
}


/* =========================================================
   WIND SPEED
   ========================================================= */

function formatWind(speed) {

  if (
    state.unit ===
    "imperial"
  ) {

    return `${speed.toFixed(
      1
    )} mph`;
  }


  return `${speed.toFixed(
    1
  )} m/s`;
}


/* =========================================================
   TIME
   ========================================================= */

function formatTime(date) {

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function formatHour(
  timestamp
) {

  return new Date(
    timestamp
  ).toLocaleTimeString(
    [],
    {
      hour: "numeric"
    }
  );
}


function formatDay(date) {

  return new Date(
    date
  ).toLocaleDateString(
    [],
    {
      weekday: "short",
      month: "short",
      day: "numeric"
    }
  );
}


function formatTimezone(
  seconds
) {

  const hours =
    seconds / 3600;


  const sign =
    hours >= 0
      ? "+"
      : "-";


  return `UTC${sign}${Math.abs(
    hours
  )}`;
}


/* =========================================================
   TEXT HELPERS
   ========================================================= */

function capitalize(text) {

  if (!text)
    return "";


  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}


function setText(
  id,
  value
) {

  const element =
    $(id);


  if (element) {
    element.textContent =
      value;
  }
}


/* =========================================================
   HTML SECURITY
   ========================================================= */

function escapeHTML(
  value
) {

  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


/* =========================================================
   DAILY FORECAST GROUPING
   ========================================================= */

function groupDailyForecast(
  list
) {

  const groups = {};


  list.forEach(
    (item) => {

      const date =
        new Date(
          item.dt * 1000
        )
          .toISOString()
          .split("T")[0];


      if (!groups[date]) {
        groups[date] = [];
      }


      groups[date].push(
        item
      );
    }
  );


  return Object.entries(
    groups
  ).map(
    ([date, items]) => {

      const temps =
        items.map(
          (item) =>
            item.main.temp
        );


      const middle =
        items[
          Math.floor(
            items.length / 2
          )
        ];


      return {

        date,

        min:
          Math.min(...temps),

        max:
          Math.max(...temps),

        humidity:
          Math.round(
            items.reduce(
              (sum, item) =>
                sum +
                item.main.humidity,
              0
            ) /
              items.length
          ),

        weather:
          middle.weather[0]
      };
    }
  );
}


/* =========================================================
   WEATHER INSIGHT
   ========================================================= */

function createInsight(
  weather
) {

  const temp =
    weather.main.temp;


  const humidity =
    weather.main.humidity;


  const condition =
    weather.weather[0].main
      .toLowerCase();


  if (
    condition.includes(
      "rain"
    )
  ) {

    return "🌧️ Rain is expected. Carry an umbrella if you're heading outside.";
  }


  if (
    condition.includes(
      "snow"
    )
  ) {

    return "❄️ Snowy conditions are expected. Stay warm and travel carefully.";
  }


  if (temp >= 35) {

    return "🔥 It's quite hot today. Stay hydrated and avoid prolonged exposure to the heat.";
  }


  if (temp <= 10) {

    return "🧥 It's cold outside. A warm layer may be useful.";
  }


  if (humidity >= 80) {

    return "💧 Humidity is high, so it may feel warmer or more uncomfortable.";
  }


  if (
    condition.includes(
      "clear"
    )
  ) {

    return "☀️ Clear conditions right now. Looks like a good time to enjoy the outdoors.";
  }


  return "🌤️ Conditions look fairly comfortable right now.";
}


/* =========================================================
   LOADING UI
   ========================================================= */

function showLoading(
  message
) {

  const overlay =
    els.loadingOverlay;


  if (!overlay)
    return;


  overlay.classList.add(
    "show"
  );


  const text =
    overlay.querySelector(
      "p"
    );


  if (text) {
    text.textContent =
      message;
  }
}


function hideLoading() {

  els.loadingOverlay
    ?.classList.remove(
      "show"
    );
}


/* =========================================================
   ERROR UI
   ========================================================= */

function showError(
  message
) {

  if (!els.errorBox)
    return;


  els.errorBox.textContent =
    message;


  els.errorBox.classList.add(
    "show"
  );
}


function hideError() {

  els.errorBox
    ?.classList.remove(
      "show"
    );
}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer;


function showToast(
  message
) {

  if (!els.toast)
    return;


  clearTimeout(
    toastTimer
  );


  els.toast.textContent =
    message;


  els.toast.classList.add(
    "show"
  );


  toastTimer =
    setTimeout(
      () => {

        els.toast.classList.remove(
          "show"
        );

      },
      2500
    );
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function saveData() {

  localStorage.setItem(
    "skycast-favorites",
    JSON.stringify(
      state.favorites
    )
  );


  localStorage.setItem(
    "skycast-recent",
    JSON.stringify(
      state.recent
    )
  );
}


/* =========================================================
   END OF SKYCAST PRO
   ========================================================= */
