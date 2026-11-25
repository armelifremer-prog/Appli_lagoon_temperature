
// ======================================
// BASE DE DONNÉES LOCALE (IndexedDB)
// ======================================

const DB_NAME = "LagoonSurveyDB";
const DB_VERSION = 1;
const STORE_NAME = "observations";

// Ouverture de la base de données
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

// Enregistrement d'une observation
async function saveObservation(observation) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");

        transaction.objectStore(STORE_NAME).put(observation);

        transaction.oncomplete = function () {
            db.close();
            resolve();
        };

        transaction.onerror = function () {
            db.close();
            reject(transaction.error);
        };

        transaction.onabort = function () {
            db.close();
            reject(transaction.error);
        };
    });
}

// Récupération des observations en attente
async function getPendingObservations() {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).getAll();

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };

        transaction.oncomplete = function () {
            db.close();
        };

        transaction.onerror = function () {
            db.close();
            reject(transaction.error);
        };
    });
}

// Suppression d'une observation après synchronisation réussie
async function deleteObservation(id) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");

        transaction.objectStore(STORE_NAME).delete(id);

        transaction.oncomplete = function () {
            db.close();
            resolve();
        };

        transaction.onerror = function () {
            db.close();
            reject(transaction.error);
        };

        transaction.onabort = function () {
            db.close();
            reject(transaction.error);
        };
    });
}


// Mise à jour de l'indicateur de synchronisation
async function updateSyncStatus() {

    const statusElement = document.getElementById("sync-status");

    if (!statusElement) return;

    try {
        const observations = await getPendingObservations();
        const count = observations.length;

        if (count === 0) {
            statusElement.textContent = "All observations synchronized ✓";
            statusElement.style.color = "green";

        } else {
            statusElement.textContent =
                count + (count === 1
                    ? " observation waiting for synchronization"
                    : " observations waiting for synchronization");

            statusElement.style.color = "#b7791f";
        }

    } catch (error) {
        console.error("Unable to check synchronization status:", error);
        statusElement.textContent = "Unable to check synchronization status.";
        statusElement.style.color = "red";
    }
}


// ======================================
// SYNCHRONISATION AVEC GOOGLE SHEETS
// ======================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxT65SJgFMkoGRkNsNfUZMS81UiS8C0_IecclpwXaiHW_JQY2tJ2-e--fi3W60RSIF18Q/exec";

let syncInProgress = false;

// Envoi d'une observation individuelle
async function sendObservation(observation) {

    if (!navigator.onLine) {
        console.log("Offline: observation kept locally.");
        return false;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(observation)
        });

        const result = await response.json();

        if (result.status === "success") {

            // Suppression locale après confirmation du serveur
            await deleteObservation(observation.id);

            console.log("Observation synchronized:", observation.id);
            return true;
        }

        console.error("Server error:", result);
        return false;

    } catch (error) {
        console.error("Synchronization failed:", error);
        return false;
    }
}


// Envoi de toutes les observations en attente
async function syncObservations() {

    // Ne pas tenter de synchronisation si le navigateur est hors ligne
    if (!navigator.onLine) {
        console.log("Device is offline. Synchronization postponed.");
        await updateSyncStatus();
        return;
    }

    if (syncInProgress) return;

    syncInProgress = true;

    try {
        const observations = await getPendingObservations();

        console.log("Pending observations:", observations.length);

        for (const observation of observations) {

            const success = await sendObservation(observation);

            // Si une mesure échoue, on arrête les tentatives
            if (!success) {
                break;
            }
        }

        const remaining = await getPendingObservations();

        console.log("Remaining observations:", remaining.length);
        await updateSyncStatus();

    } catch (error) {
        console.error("Synchronization error:", error);

    } finally {
        syncInProgress = false;
    }
}


// Synchronisation au chargement de l'application
window.addEventListener("load", syncObservations);
window.addEventListener("load", updateSyncStatus);

// Nouvelle tentative lorsque la connexion revient
window.addEventListener("online", syncObservations);






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
            maximumAge: 0
        }

    );
}

// Automatically retrieve GPS position when the page loads
getUserPosition();









const submitButton = document.getElementById("submit-button");

submitButton.addEventListener("click", async function () {

    // Vérification du GPS
    if (currentLatitude === null || currentLongitude === null) {
        alert("GPS position unavailable. Please enable location access before submitting.");
        return;
    }

    // Récupération des valeurs
    const datetimeLocal = document.getElementById("datetime").value;
    const temperature = document.getElementById("temperature").value;
    const contributor = document.getElementById("contributor").value;

    // Conversion de la date en UTC
    const datetimeUTC = new Date(datetimeLocal).toISOString();

    // Création de l'observation avec un identifiant unique
    const observation = {
        id: crypto.randomUUID(),
        datetime: datetimeUTC,
        temperature: Number(temperature),
        latitude: currentLatitude,
        longitude: currentLongitude,
        accuracy: currentAccuracy,
        contributor: contributor
    };

    console.log("New observation:", observation);

    try {
        // 1. Sauvegarde locale avant tout envoi
        await saveObservation(observation);

        console.log("Observation saved locally.");
        await updateSyncStatus();

        // 2. Confirmation à l'utilisateur
        showSuccessPopup();

        // 3. Tentative de synchronisation
        syncObservations();

    } catch (error) {
        console.error("Local storage error:", error);
        alert("Unable to save the observation on this device.");
    }

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

const closeButton = document.getElementById("close-popup");

if (closeButton) {
    closeButton.addEventListener("click", closeSuccessPopup);
}