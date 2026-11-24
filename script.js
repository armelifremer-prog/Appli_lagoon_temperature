
let currentLatitude = null;
let currentLongitude = null;
let currentAccuracy = null;



function updateDateTime() {

    const now = new Date();

    // Convert current time to UTC
    const utcDateTime = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );

    document.getElementById("datetime").value =
        utcDateTime.toISOString().slice(0, 16);
}

// Set date and time when the page loads
updateDateTime();

const gpsButton = document.getElementById("gps-button");

gpsButton.addEventListener("click", function () {

    const gpsStatus = document.getElementById("gps-status");

    if (!navigator.geolocation) {
        gpsStatus.textContent = "GPS is not supported by this browser.";
        return;
    }

    gpsStatus.textContent = "Retrieving position...";

    navigator.geolocation.getCurrentPosition(

        function (position) {

            const latitude = position.coords.latitude;      //On récup la position via GPS
            const longitude = position.coords.longitude; 
            const accuracy = position.coords.accuracy;

            currentLatitude = latitude;      //On assigne la position à des variables
            currentLongitude = longitude;
            currentAccuracy = accuracy;

            document.getElementById("latitude").textContent =
                Math.abs(latitude).toFixed(6) + (latitude >= 0 ? "°N" : "°S");

            document.getElementById("longitude").textContent =
                Math.abs(longitude).toFixed(6) + (longitude >= 0 ? "°E" : "°W");

            document.getElementById("accuracy").textContent =
                Math.round(accuracy) + " m";
        },

        function (error) {

            gpsStatus.textContent =
                "Unable to retrieve position: " + error.message;

        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }

    );

});


const submitButton = document.getElementById("submit-button");

submitButton.addEventListener("click", function () {

    //On convertit en valeurs
    const datetimeLocal = document.getElementById("datetime").value;
    const temperature = document.getElementById("temperature").value;
    //On change le format pour du UTC
    const datetimeUTC = new Date(datetimeLocal).toISOString();
    //On stocke le contributeur
    const contributor = document.getElementById("contributor").value;

    
    //On stocke les données dans une variable
    const observation = {
        datetime: datetimeUTC,
        temperature: Number(temperature),
        latitude: currentLatitude,
        longitude: currentLongitude,
        accuracy: currentAccuracy,
        contributor: contributor
    };

    console.log(observation);

    //Cette partie envoie les données au google sheet
    fetch("https://script.google.com/macros/s/AKfycbxT65SJgFMkoGRkNsNfUZMS81UiS8C0_IecclpwXaiHW_JQY2tJ2-e--fi3W60RSIF18Q/exec", {
    method: "POST",
    body: JSON.stringify(observation)
    })
    .then(response => response.json())
    .then(result => {
        console.log("Server response:", result);
    })
    .catch(error => {
        console.error("Error:", error);
    });



});