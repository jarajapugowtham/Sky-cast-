const state = {
city: "Visakhapatnam",
latitude: null,
longitude: null,
timezone: "auto",
weather: null,
favorites: JSON.parse(localStorage.getItem("skycastFavorites") || "[]"),
recent: JSON.parse(localStorage.getItem("skycastRecent") || "[]")
};

const $ = (id) => document.getElementById(id);

const weatherCodes = {
0: ["Clear sky", "☀️"],
1: ["Mainly clear", "🌤️"],
2: ["Partly cloudy", "⛅"],
3: ["Overcast", "☁️"],
45: ["Fog", "🌫️"],
48: ["Rime fog", "🌫️"],
51: ["Light drizzle", "🌦️"],
53: ["Drizzle", "🌦️"],
55: ["Heavy drizzle", "🌧️"],
56: ["Freezing drizzle", "🌧️"],
57: ["Heavy freezing drizzle", "🌧️"],
61: ["Light rain", "🌦️"],
63: ["Rain", "🌧️"],
65: ["Heavy rain", "🌧️"],
66: ["Freezing rain", "🌧️"],
67: ["Heavy freezing rain", "🌧️"],
71: ["Light snow", "🌨️"],
73: ["Snow", "❄️"],
75: ["Heavy snow", "❄️"],
77: ["Snow grains", "❄️"],
80: ["Rain showers", "🌦️"],
81: ["Rain showers", "🌧️"],
82: ["Heavy rain showers", "⛈️"],
85: ["Snow showers", "🌨️"],
86: ["Heavy snow showers", "❄️"],
95: ["Thunderstorm", "⛈️"],
96: ["Thunderstorm + hail", "⛈️"],
99: ["Severe thunderstorm", "⛈️"]
};

function weatherInfo(code) {
return weatherCodes[code] || ["Unknown", "🌡️"];
}

function showLoading(show) {
$("loading").classList.toggle("show", show);
}

function toast(message) {
const box = $("toast");
box.textContent = message;
box.classList.add("show");

clearTimeout(window.toastTimer);
window.toastTimer = setTimeout(() => {
box.classList.remove("show");
}, 2600);
}

async function geocodeCity(city) {
const url =
"https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json";

const response = await fetch(url);

if (!response.ok) {
throw new Error("Unable to search for this city.");
}

const data = await response.json();

if (!data.results || !data.results.length) {
throw new Error("Could not find "${city}".");
}

return data.results[0];
}

async function fetchWeather(latitude, longitude, timezone = "auto") {
const params = new URLSearchParams({
latitude,
longitude,
timezone,
forecast_days: "7",

current:
  "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m",

hourly:
  "temperature_2m,weather_code,precipitation_probability,precipitation,relative_humidity_2m,wind_speed_10m",

daily:
  "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index,precipitation_sum,precipitation_probability_max"

});

const response = await fetch(
"https://api.open-meteo.com/v1/forecast?${params}"
);

if (!response.ok) {
throw new Error("Weather service is unavailable.");
}

return response.json();
}

async function loadCity(city, saveRecent = true) {
try {
showLoading(true);

const location = await geocodeCity(city);
const weather = await fetchWeather(
  location.latitude,
  location.longitude,
  location.timezone || "auto"
);

state.city = location.name;
state.latitude = location.latitude;
state.longitude = location.longitude;
state.timezone = location.timezone || "auto";
state.weather = weather;

if (saveRecent) {
  addRecent(location.name);
}

renderAll(location);
toast(`Weather updated for ${location.name}`);

} catch (error) {
toast(error.message);
} finally {
showLoading(false);
}
}

function renderAll(location) {
renderCurrent(location);
renderDetails();
renderHourly();
renderDaily();
renderFavorites();
renderRecent();
renderTip();
}

function renderCurrent(location) {
const current = state.weather.current;
const [condition, icon] = weatherInfo(current.weather_code);

$("cityName").textContent =
"${location.name}${location.country_code ? ", " + location.country_code : ""}";

$("localTime").textContent =
formatDateTime(current.time, state.weather.timezone);

$("currentIcon").textContent = icon;
$("temperature").textContent = "${Math.round(current.temperature_2m)}°";
$("condition").textContent = condition;
$("feelsLike").textContent = "${Math.round(current.apparent_temperature)}°";

$("humidity").textContent = "${current.relative_humidity_2m}%";
$("wind").textContent = "${Math.round(current.wind_speed_10m)} km/h";
$("pressure").textContent = "${Math.round(current.pressure_msl)} hPa";

// Open-Meteo does not provide visibility in this request.
$("visibility").textContent = "N/A";

document.body.dataset.weather = condition.toLowerCase();
}

function renderDetails() {
const current = state.weather.current;
const daily = state.weather.daily;

$("sunrise").textContent = formatTime(daily.sunrise[0]);
$("sunset").textContent = formatTime(daily.sunset[0]);

$("precipitation").textContent =
"${Number(current.precipitation || 0).toFixed(1)} mm";

$("uv").textContent =
Number(daily.uv_index[0] || 0).toFixed(1);

$("windDirection").textContent =
"${Math.round(current.wind_direction_10m)}°";

$("cloud").textContent =
"${current.cloud_cover}%";

const sunrise = new Date(daily.sunrise[0]);
const sunset = new Date(daily.sunset[0]);
const now = new Date(current.time);

let progress = ((now - sunrise) / (sunset - sunrise)) * 100;
progress = Math.max(0, Math.min(100, progress));

document.querySelector(".sun-line span").style.width = "${progress}%";

$("sunMessage").textContent =
progress > 0 && progress < 100 ? "Daylight" : "Night";
}

function renderHourly() {
const hourly = state.weather.hourly;
const currentTime = state.weather.current.time;

let startIndex = hourly.time.findIndex(time => time >= currentTime);

if (startIndex < 0) startIndex = 0;

const items = hourly.time.slice(startIndex, startIndex + 8);

$("hourlyList").innerHTML = items.map((time, i) => {
const index = startIndex + i;
const [condition, icon] = weatherInfo(hourly.weather_code[index]);

return `
  <div class="hour-card ${i === 0 ? "active" : ""}">
    <p>${i === 0 ? "Now" : formatHour(time)}</p>
    <span class="icon">${icon}</span>
    <strong>${Math.round(hourly.temperature_2m[index])}°</strong>
    <p>${hourly.precipitation_probability[index] || 0}% rain</p>
  </div>
`;

}).join("");
}

function renderDaily() {
const daily = state.weather.daily;

$("dailyList").innerHTML = daily.time.map((date, index) => {
const [condition, icon] = weatherInfo(daily.weather_code[index]);

return `
  <div class="day-card">
    <div>${index === 0 ? "Today" : formatDay(date)}</div>
    <div class="day-icon">${icon}</div>
    <div>
      <strong>${condition}</strong>
      <div class="rain">
        💧 ${daily.precipitation_probability_max[index] || 0}% chance
      </div>
    </div>
    <div class="day-temp">
      <strong>
        ${Math.round(daily.temperature_2m_max[index])}°
        /
        ${Math.round(daily.temperature_2m_min[index])}°
      </strong>
    </div>
  </div>
`;

}).join("");
}

function renderFavorites() {
const container = $("favoritesList");

if (!state.favorites.length) {
container.innerHTML =
"<p class="empty-message">No favourite cities yet.</p>";
return;
}

container.innerHTML = state.favorites.map(city => "<div class="favorite-item"> <button onclick="loadCity('${escapeHtml(city)}')"> ❤️ ${escapeHtml(city)} </button> <button onclick="removeFavorite('${escapeHtml(city)}')" title="Remove favourite" >×</button> </div>").join("");
}

function renderRecent() {
const container = $("recentRow");

container.innerHTML = state.recent.slice(0, 5).map(city => "<button class="recent-chip" onclick="loadCity('${escapeHtml(city)}')"> ${escapeHtml(city)} </button>").join("");
}

function renderTip() {
const current = state.weather.current;
const [condition] = weatherInfo(current.weather_code);
const rain = Number(current.precipitation || 0);
const wind = Number(current.wind_speed_10m || 0);
const temp = Number(current.temperature_2m || 0);

let title = "Weather looks good";
let text = "A great time to plan your outdoor activities.";

if (rain > 0 || current.weather_code >= 51) {
title = "Rain is in the forecast 🌧️";
text = "Consider carrying an umbrella and planning around wet conditions.";
} else if (wind >= 30) {
title = "Windy conditions 💨";
text = "Outdoor activities may feel breezy today. Keep an eye on conditions.";
} else if (temp >= 35) {
title = "It's a hot one ☀️";
text = "Stay hydrated and take breaks from direct sunlight.";
} else if (temp <= 10) {
title = "Bundle up 🧥";
text = "Cool conditions are expected. A warm layer may be useful.";
} else if (condition.includes("Thunder")) {
title = "Stormy weather ⛈️";
text = "Keep an eye on the latest forecast before heading outside.";
}

$("weatherTip").textContent = title;
$("tipText").textContent = text;
}

function addRecent(city) {
state.recent = [
city,
...state.recent.filter(item =>
item.toLowerCase() !== city.toLowerCase()
)
].slice(0, 5);

localStorage.setItem(
"skycastRecent",
JSON.stringify(state.recent)
);
}

function addFavorite() {
if (!state.city) return;

const exists = state.favorites.some(
city => city.toLowerCase() === state.city.toLowerCase()
);

if (exists) {
toast("Already in favourites ❤️");
return;
}

state.favorites.push(state.city);

localStorage.setItem(
"skycastFavorites",
JSON.stringify(state.favorites)
);

renderFavorites();
toast("${state.city} added to favourites ❤️");
}

function removeFavorite(city) {
state.favorites = state.favorites.filter(
item => item.toLowerCase() !== city.toLowerCase()
);

localStorage.setItem(
"skycastFavorites",
JSON.stringify(state.favorites)
);

renderFavorites();
toast("Removed from favourites");
}

function useLocation() {
if (!navigator.geolocation) {
toast("Location is not supported by this browser.");
return;
}

showLoading(true);

navigator.geolocation.getCurrentPosition(
async position => {
try {
const { latitude, longitude } = position.coords;

    const weather = await fetchWeather(
      latitude,
      longitude,
      "auto"
    );

    const locationResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`
    );

    const locationData = await locationResponse.json();
    const location =
      locationData.results?.[0] || {
        name: "My Location",
        latitude,
        longitude,
        country_code: ""
      };

    state.city = location.name;
    state.latitude = latitude;
    state.longitude = longitude;
    state.timezone = weather.timezone;
    state.weather = weather;

    addRecent(location.name);
    renderAll(location);

    toast("Using your current location 📍");
  } catch {
    toast("Could not load weather for your location.");
  } finally {
    showLoading(false);
  }
},
() => {
  showLoading(false);
  toast("Location permission was not available.");
},
{
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000
}

);
}

function formatTime(value) {
if (!value) return "--:--";

return new Date(value).toLocaleTimeString([], {
hour: "2-digit",
minute: "2-digit"
});
}

function formatHour(value) {
return new Date(value).toLocaleTimeString([], {
hour: "numeric"
});
}

function formatDay(value) {
return new Date(value).toLocaleDateString([], {
weekday: "short"
});
}

function formatDateTime(value) {
return new Date(value).toLocaleString([], {
weekday: "long",
hour: "numeric",
minute: "2-digit"
});
}

function escapeHtml(value) {
return String(value)
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

$("searchForm").addEventListener("submit", event => {
event.preventDefault();

const city = $("cityInput").value.trim();

if (!city) {
toast("Enter a city name first.");
return;
}

loadCity(city);
$("cityInput").value = "";
});

$("locationBtn").addEventListener("click", useLocation);

$("refreshBtn").addEventListener("click", () => {
if (state.latitude && state.longitude) {
fetchWeather(
state.latitude,
state.longitude,
state.timezone
)
.then(weather => {
state.weather = weather;

    const location = {
      name: state.city,
      latitude: state.latitude,
      longitude: state.longitude
    };

    renderAll(location);
    toast("Weather refreshed 🔄");
  })
  .catch(() => toast("Unable to refresh weather."));

}
});

$("themeBtn").addEventListener("click", () => {
document.body.classList.toggle("light");

const light = document.body.classList.contains("light");

localStorage.setItem(
"skycastTheme",
light ? "light" : "dark"
);

$("themeBtn").textContent = light ? "☀️" : "🌙";
});

document.addEventListener("dblclick", event => {
if (event.target.closest(".current-card")) {
addFavorite();
}
});

const savedTheme = localStorage.getItem("skycastTheme");

if (savedTheme === "light") {
document.body.classList.add("light");
$("themeBtn").textContent = "☀️";
}

loadCity(state.city, false);
