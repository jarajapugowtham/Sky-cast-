// ============================================================
// SKY CAST PRO - REAL WEATHER APP
// ============================================================

// 🔑 PUT YOUR NEW OPENWEATHER API KEY HERE
const API_KEY = "8b7efb7f802b048f87d56afdbcf89afc";

const WEATHER_API = "https://api.openweathermap.org/data/2.5";
const GEO_API = "https://api.openweathermap.org/geo/1.0";

let currentUnit = "metric";
let currentWeather = null;
let currentCity = null;

// ============================================================
// DOM HELPERS
// ============================================================

const $ = (id) => document.getElementById(id);

const searchInput = $("searchInput");
const searchBtn = $("searchBtn");
const locationBtn = $("locationBtn");
const refreshBtn = $("refreshBtn");
const unitBtn = $("unitBtn");

const loading = $("loading");
const errorBox = $("error");
const weatherApp = $("weatherApp");

// ============================================================
// START APP
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    setupEvents();

    // Automatically detect user's location
    detectLocation();
});

// ============================================================
// EVENTS
// ============================================================

function setupEvents() {
    if (searchBtn) {
        searchBtn.addEventListener("click", searchCity);
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                searchCity();
            }
        });
    }

    if (locationBtn) {
        locationBtn.addEventListener("click", detectLocation);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            if (currentCity) {
                getWeatherByCity(currentCity);
            } else {
                detectLocation();
            }
        });
    }

    if (unitBtn) {
        unitBtn.addEventListener("click", toggleUnit);
    }
}

// ============================================================
// SEARCH CITY
// ============================================================

async function searchCity() {
    const city = searchInput?.value.trim();

    if (!city) {
        showError("Please enter a city name.");
        return;
    }

    hideError();
    showLoading(true);

    try {
        const locations = await geocodeCity(city);

        if (!locations.length) {
            throw new Error("City not found. Try another city.");
        }

        const location = locations[0];

        currentCity = location.name;

        await getWeatherByCoordinates(
            location.lat,
            location.lon,
            location.name,
            location.country
        );

    } catch (error) {
        console.error(error);
        showError(error.message || "Unable to get weather.");
    } finally {
        showLoading(false);
    }
}

// ============================================================
// GEOCODING
// ============================================================

async function geocodeCity(city) {
    const url =
        `${GEO_API}/direct` +
        `?q=${encodeURIComponent(city)}` +
        `&limit=5` +
        `&appid=${API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Unable to search for this city.");
    }

    return await response.json();
}

// ============================================================
// LOCATION DETECTION
// ============================================================

function detectLocation() {
    hideError();

    if (!navigator.geolocation) {
        showError("Your browser does not support location detection.");
        return;
    }

    showLoading(true);

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                await getWeatherByCoordinates(
                    lat,
                    lon,
                    "Your Location",
                    ""
                );
            } catch (error) {
                console.error(error);
                showError("Unable to load your local weather.");
            } finally {
                showLoading(false);
            }
        },

        () => {
            showLoading(false);
            showError(
                "Location permission was denied. Search for your city instead."
            );
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

// ============================================================
// GET WEATHER BY COORDINATES
// ============================================================

async function getWeatherByCoordinates(
    lat,
    lon,
    fallbackName = "",
    country = ""
) {
    const currentUrl =
        `${WEATHER_API}/weather` +
        `?lat=${lat}` +
        `&lon=${lon}` +
        `&units=${currentUnit}` +
        `&appid=${API_KEY}`;

    const forecastUrl =
        `${WEATHER_API}/forecast` +
        `?lat=${lat}` +
        `&lon=${lon}` +
        `&units=${currentUnit}` +
        `&appid=${API_KEY}`;

    const [currentResponse, forecastResponse] = await Promise.all([
        fetch(currentUrl),
        fetch(forecastUrl)
    ]);

    if (!currentResponse.ok) {
        if (currentResponse.status === 401) {
            throw new Error(
                "Invalid API key. Check your OpenWeather API key."
            );
        }

        if (currentResponse.status === 429) {
            throw new Error(
                "Weather API limit reached. Please try again later."
            );
        }

        throw new Error("Unable to get current weather.");
    }

    if (!forecastResponse.ok) {
        throw new Error("Unable to get forecast data.");
    }

    const weather = await currentResponse.json();
    const forecast = await forecastResponse.json();

    currentWeather = weather;

    currentCity =
        weather.name ||
        fallbackName ||
        "Your Location";

    renderCurrentWeather(weather);
    renderForecast(forecast);

    // Optional extra information
    renderSunInfo(weather);
    renderWeatherDetails(weather);
    renderWeatherInsight(weather);

    showWeatherApp(true);
}

// ============================================================
// CURRENT WEATHER
// ============================================================

function renderCurrentWeather(data) {
    const weather = data.weather?.[0];

    const temperature = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);

    setText("cityName", data.name || currentCity);
    setText(
        "countryName",
        data.sys?.country
            ? data.sys.country
            : ""
    );

    setText(
        "temperature",
        `${temperature}°`
    );

    setText(
        "condition",
        capitalize(weather?.description || "Unknown")
    );

    setText(
        "feelsLike",
        `Feels like ${feelsLike}°`
    );

    setText(
        "humidity",
        `${data.main.humidity}%`
    );

    setText(
        "wind",
        `${Math.round(data.wind.speed)} ${currentUnit === "metric" ? "m/s" : "mph"}`
    );

    setText(
        "pressure",
        `${data.main.pressure} hPa`
    );

    setText(
        "visibility",
        data.visibility
            ? `${(data.visibility / 1000).toFixed(1)} km`
            : "N/A"
    );

    setText(
        "clouds",
        `${data.clouds?.all ?? 0}%`
    );

    setText(
        "humidityValue",
        `${data.main.humidity}%`
    );

    setText(
        "windValue",
        `${Math.round(data.wind.speed)} ${currentUnit === "metric" ? "m/s" : "mph"}`
    );

    updateWeatherIcon(
        weather?.main,
        weather?.icon
    );

    updateWeatherBackground(
        weather?.main,
        weather?.icon
    );
}

// ============================================================
// FORECAST
// ============================================================

function renderForecast(data) {
    const container =
        $("forecastContainer") ||
        $("forecast") ||
        $("dailyForecast");

    if (!container) return;

    container.innerHTML = "";

    const forecastDays = {};

    data.list.forEach((item) => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split("T")[0];

        if (!forecastDays[day]) {
            forecastDays[day] = [];
        }

        forecastDays[day].push(item);
    });

    const days = Object.values(forecastDays).slice(0, 5);

    days.forEach((items) => {
        const midday =
            items.find((item) =>
                item.dt_txt.includes("12:00:00")
            ) || items[Math.floor(items.length / 2)];

        const date = new Date(midday.dt * 1000);

        const weather = midday.weather[0];

        const card = document.createElement("div");

        card.className = "forecast-card";

        card.innerHTML = `
            <div class="forecast-day">
                ${formatDay(date)}
            </div>

            <div class="forecast-icon">
                ${getWeatherEmoji(weather.main, weather.icon)}
            </div>

            <div class="forecast-temp">
                ${Math.round(midday.main.temp)}°
            </div>

            <div class="forecast-condition">
                ${capitalize(weather.description)}
            </div>

            <div class="forecast-extra">
                💧 ${midday.main.humidity}%
            </div>
        `;

        container.appendChild(card);
    });
}

// ============================================================
// HOURLY FORECAST
// ============================================================

function renderHourlyForecast(data) {
    const container = $("hourlyContainer");

    if (!container) return;

    container.innerHTML = "";

    data.list.slice(0, 8).forEach((item) => {
        const date = new Date(item.dt * 1000);
        const weather = item.weather[0];

        const card = document.createElement("div");

        card.className = "hour-card";

        card.innerHTML = `
            <div class="hour-time">
                ${formatTime(date)}
            </div>

            <div class="hour-icon">
                ${getWeatherEmoji(weather.main, weather.icon)}
            </div>

            <div class="hour-temp">
                ${Math.round(item.main.temp)}°
            </div>

            <div class="hour-condition">
                ${capitalize(weather.main)}
            </div>
        `;

        container.appendChild(card);
    });
}

// ============================================================
// SUNRISE / SUNSET
// ============================================================

function renderSunInfo(data) {
    setText(
        "sunrise",
        formatTime(new Date(data.sys.sunrise * 1000))
    );

    setText(
        "sunset",
        formatTime(new Date(data.sys.sunset * 1000))
    );
}

// ============================================================
// WEATHER DETAILS
// ============================================================

function renderWeatherDetails(data) {
    setText(
        "tempMin",
        `${Math.round(data.main.temp_min)}°`
    );

    setText(
        "tempMax",
        `${Math.round(data.main.temp_max)}°`
    );

    setText(
        "dewPoint",
        calculateDewPoint(
            data.main.temp,
            data.main.humidity
        ) + "°"
    );

    setText(
        "windDirection",
        getWindDirection(data.wind.deg)
    );

    setText(
        "cloudValue",
        `${data.clouds?.all ?? 0}%`
    );
}

// ============================================================
// WEATHER INSIGHT
// ============================================================

function renderWeatherInsight(data) {
    const element = $("weatherInsight");

    if (!element) return;

    const temp = data.main.temp;
    const humidity = data.main.humidity;
    const wind = data.wind.speed;
    const condition = data.weather?.[0]?.main;

    let message = "Weather looks comfortable today.";

    if (
        condition === "Rain" ||
        condition === "Drizzle" ||
        condition === "Thunderstorm"
    ) {
        message =
            "🌧️ Rainy conditions are expected. Consider carrying an umbrella.";
    } else if (temp >= 35) {
        message =
            "🔥 It's very hot outside. Stay hydrated and avoid excessive heat.";
    } else if (temp <= 10) {
        message =
            "🥶 It's quite cold outside. Consider wearing warm clothing.";
    } else if (wind >= 10) {
        message =
            "💨 It's windy today. Keep an eye on changing conditions.";
    } else if (humidity >= 80) {
        message =
            "💧 Humidity is high today, so it may feel warmer than the temperature suggests.";
    } else if (condition === "Clear") {
        message =
            "☀️ Clear skies! It looks like a great day outside.";
    } else if (condition === "Clouds") {
        message =
            "⛅ Mostly cloudy conditions are expected.";
    }

    element.textContent = message;
}

// ============================================================
// WEATHER ICON
// ============================================================

function updateWeatherIcon(condition, iconCode) {
    const elements = [
        $("weatherIcon"),
        $("mainWeatherIcon"),
        $("weatherEmoji")
    ];

    elements.forEach((element) => {
        if (!element) return;

        element.textContent =
            getWeatherEmoji(condition, iconCode);
    });
}

function getWeatherEmoji(condition, iconCode = "") {
    const isNight = iconCode.endsWith("n");

    switch (condition) {
        case "Clear":
            return isNight ? "🌙" : "☀️";

        case "Clouds":
            if (iconCode.startsWith("02")) return "🌤️";
            if (iconCode.startsWith("03")) return "☁️";
            if (iconCode.startsWith("04")) return "☁️";
            return "⛅";

        case "Rain":
            return "🌧️";

        case "Drizzle":
            return "🌦️";

        case "Thunderstorm":
            return "⛈️";

        case "Snow":
            return "❄️";

        case "Mist":
        case "Fog":
        case "Haze":
        case "Smoke":
        case "Dust":
        case "Sand":
            return "🌫️";

        case "Tornado":
            return "🌪️";

        default:
            return "🌤️";
    }
}

// ============================================================
// DYNAMIC BACKGROUND
// ============================================================

function updateWeatherBackground(condition, iconCode) {
    document.body.classList.remove(
        "weather-clear",
        "weather-clouds",
        "weather-rain",
        "weather-storm",
        "weather-snow",
        "weather-mist",
        "weather-night"
    );

    if (iconCode?.endsWith("n")) {
        document.body.classList.add("weather-night");
    }

    switch (condition) {
        case "Clear":
            document.body.classList.add("weather-clear");
            break;

        case "Clouds":
            document.body.classList.add("weather-clouds");
            break;

        case "Rain":
        case "Drizzle":
            document.body.classList.add("weather-rain");
            break;

        case "Thunderstorm":
            document.body.classList.add("weather-storm");
            break;

        case "Snow":
            document.body.classList.add("weather-snow");
            break;

        case "Mist":
        case "Fog":
        case "Haze":
            document.body.classList.add("weather-mist");
            break;
    }
}

// ============================================================
// CELSIUS / FAHRENHEIT
// ============================================================

async function toggleUnit() {
    currentUnit =
        currentUnit === "metric"
            ? "imperial"
            : "metric";

    if (unitBtn) {
        unitBtn.textContent =
            currentUnit === "metric"
                ? "°C"
                : "°F";
    }

    if (currentWeather) {
        await getWeatherByCoordinates(
            currentWeather.coord.lat,
            currentWeather.coord.lon,
            currentWeather.name,
            currentWeather.sys.country
        );
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function setText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent = value;
    }
}

function capitalize(text) {
    if (!text) return "";

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDay(date) {
    return date.toLocaleDateString("en-IN", {
        weekday: "short"
    });
}

function formatTime(date) {
    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function getWindDirection(degrees = 0) {
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
        Math.round(degrees / 45) % 8
    ];
}

function calculateDewPoint(temp, humidity) {
    const a = 17.27;
    const b = 237.7;

    const gamma =
        (a * temp) /
        (b + temp) +
        Math.log(humidity / 100);

    return Math.round(
        (b * gamma) /
        (a - gamma)
    );
}

// ============================================================
// LOADING
// ============================================================

function showLoading(show) {
    if (loading) {
        loading.style.display =
            show ? "flex" : "none";
    }

    if (searchBtn) {
        searchBtn.disabled = show;
    }
}

// ============================================================
// ERROR
// ============================================================

function showError(message) {
    if (!errorBox) {
        alert(message);
        return;
    }

    errorBox.textContent = message;
    errorBox.style.display = "block";
}

function hideError() {
    if (errorBox) {
        errorBox.textContent = "";
        errorBox.style.display = "none";
    }
}

// ============================================================
// WEATHER APP VISIBILITY
// ============================================================

function showWeatherApp(show) {
    if (!weatherApp) return;

    weatherApp.style.display =
        show ? "block" : "";
}

// ============================================================
// OPTIONAL FAVORITES
// ============================================================

function saveFavorite(city) {
    if (!city) return;

    let favorites =
        JSON.parse(
            localStorage.getItem("skycastFavorites") || "[]"
        );

    if (!favorites.includes(city)) {
        favorites.push(city);

        localStorage.setItem(
            "skycastFavorites",
            JSON.stringify(favorites)
        );
    }
}

function getFavorites() {
    return JSON.parse(
        localStorage.getItem("skycastFavorites") || "[]"
    );
}

// ============================================================
// OPTIONAL FAVORITE BUTTON
// ============================================================

const favoriteBtn = $("favoriteBtn");

if (favoriteBtn) {
    favoriteBtn.addEventListener("click", () => {
        if (currentCity) {
            saveFavorite(currentCity);

            favoriteBtn.textContent = "★ Saved";
        }
    });
}

// ============================================================
// AUTO REFRESH EVERY 10 MINUTES
// ============================================================

setInterval(() => {
    if (currentWeather) {
        getWeatherByCoordinates(
            currentWeather.coord.lat,
            currentWeather.coord.lon,
            currentWeather.name,
            currentWeather.sys.country
        ).catch(console.error);
    }
}, 10 * 60 * 1000);
