const apiKey = "79244e6a47f5f8b9df1e663798429cf2";
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");

async function getWeather(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.cod === 200) {
        document.getElementById("cityName").textContent = data.name;
        document.getElementById("temp").textContent = Math.round(data.main.temp) + "°C";
        document.getElementById("description").textContent = data.weather[0].description;
        document.getElementById("humidity").textContent = data.main.humidity + "%";
        document.getElementById("wind").textContent = data.wind.speed + " km/h";
        document.getElementById("weatherIcon").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    } else {
        alert("City not found!");
    }
}

searchBtn.addEventListener("click", () => {
    const city = cityInput.value;
    if (city) getWeather(city);
});

cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchBtn.click();
});

getWeather("Hyderabad");
