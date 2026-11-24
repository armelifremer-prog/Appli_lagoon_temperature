
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


function getUserPosition() {

    const gpsStatus = document.getElementById("gps-status");

    if (!navigator.geolocation) {
        gpsStatus.textContent = "GPS is not supported by this browser.";
        return;
    }

    gpsStatus.textContent = "Retrieving position...";

    navigator.geolocation.getCurrentPosition(

        function (position) {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            currentLatitude = latitude;
            currentLongitude = longitude;
            currentAccuracy = accuracy;

            document.getElementById("latitude").textContent =
                Math.abs(latitude).toFixed(6) + (latitude >= 0 ? "°N" : "°S");

            document.getElementById("longitude").textContent =
                Math.abs(longitude).toFixed(6) + (longitude >= 0 ? "°E" : "°W");

            document.getElementById("accuracy").textContent =
                Math.round(accuracy) + " m";

            gpsStatus.textContent =
                "Position successfully retrieved";
        },

        function (error) {

            if (error.code === 1) {
                gpsStatus.textContent =
                    "Location access denied. Please enable location permissions in your browser settings.";
            } 
            else if (error.code === 2) {
                gpsStatus.textContent =
                    "Position unavailable. Please check your GPS settings.";
            } 
            else if (error.code === 3) {
                gpsStatus.textContent =
                    "GPS timeout. Please reload the page and try again.";
            }

        },

        {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 60000
        }

    );
}

// Automatically retrieve GPS position when the page loads
getUserPosition();



const submitButton = document.getElementById("submit-button");

submitButton.addEventListener("click", function () {
    //Cas où le GPS n'a pas fonctionné
    if (currentLatitude === null || currentLongitude === null) {
    alert("GPS position unavailable. Please enable location access before submitting.");
    return;
    }
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

        if (result.status === "success") {
            showSuccessPopup();
        } else {
            alert("Something went wrong. Please try again.");
        }
    })
    .catch(error => {
        console.error("Error:", error);
    });



});


function showSuccessPopup() {

    const popup = document.getElementById("success-popup");
    const container = document.getElementById("confetti-container");

    popup.style.display = "flex";
    container.innerHTML = "";

    const colors = [
        "#267d75",
        "#54c6a5",
        "#f5c542",
        "#ff758f",
        "#65a6e8",
        "#b58ad9"
    ];

    for (let i = 0; i < 100; i++) {

        const confetti = document.createElement("div");

        confetti.className = "confetti";
        confetti.style.left = Math.random() * 100 + "%";
        confetti.style.backgroundColor =
            colors[Math.floor(Math.random() * colors.length)];

        confetti.style.animationDuration =
            (2 + Math.random() * 3) + "s";

        confetti.style.animationDelay =
            Math.random() * 1.5 + "s";

        confetti.style.transform =
            "rotate(" + Math.random() * 360 + "deg)";

        container.appendChild(confetti);
    }
    // Automatically close the popup after 5 seconds
    setTimeout(closeSuccessPopup, 5000);

}

function closeSuccessPopup() {

    // Hide the popup
    document.getElementById("success-popup").style.display = "none";

    // Clear the form fields
    document.getElementById("contributor").value = "";
    document.getElementById("datetime").value = "";
    document.getElementById("temperature").value = "";
}

document.getElementById("close-popup").addEventListener("click", closeSuccessPopup);
