// ============================================================
// LOCATION SERVICE
// Smart Emergency Response
// ============================================================

function toNumber(value) {
    const number = Number(value);

    return Number.isFinite(number) ? number : null;
}


// ============================================================
// VALIDATE COORDINATES
// ============================================================

function validateCoordinates(latitude, longitude) {
    const lat = toNumber(latitude);
    const lng = toNumber(longitude);

    if (lat === null || lng === null) {
        return false;
    }

    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}


// ============================================================
// CALCULATE DISTANCE
// Haversine Formula
// ============================================================

function calculateDistance(
    latitude1,
    longitude1,
    latitude2,
    longitude2
) {
    if (
        !validateCoordinates(latitude1, longitude1) ||
        !validateCoordinates(latitude2, longitude2)
    ) {
        return null;
    }

    const lat1 = Number(latitude1);
    const lon1 = Number(longitude1);
    const lat2 = Number(latitude2);
    const lon2 = Number(longitude2);

    const earthRadiusKm = 6371;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    return earthRadiusKm * c;
}


// ============================================================
// SORT ITEMS BY DISTANCE
// ============================================================

function sortByDistance(items, latitude, longitude) {
    if (!Array.isArray(items)) {
        return [];
    }

    if (!validateCoordinates(latitude, longitude)) {
        return [...items];
    }

    return items
        .map((item) => {
            const itemLatitude =
                item.latitude ??
                item.lat ??
                item.location?.latitude ??
                item.location?.lat;

            const itemLongitude =
                item.longitude ??
                item.lng ??
                item.lon ??
                item.location?.longitude ??
                item.location?.lng ??
                item.location?.lon;

            const distanceKm = calculateDistance(
                latitude,
                longitude,
                itemLatitude,
                itemLongitude
            );

            return {
                ...item,
                distanceKm
            };
        })
        .sort((a, b) => {
            if (a.distanceKm === null) {
                return 1;
            }

            if (b.distanceKm === null) {
                return -1;
            }

            return a.distanceKm - b.distanceKm;
        });
}


// ============================================================
// FIND NEAREST ITEM
// ============================================================

function findNearest(items, latitude, longitude) {
    const sortedItems = sortByDistance(
        items,
        latitude,
        longitude
    );

    if (sortedItems.length === 0) {
        return null;
    }

    const nearest = sortedItems.find(
        (item) => item.distanceKm !== null
    );

    return nearest || null;
}


// ============================================================
// FILTER ITEMS WITHIN RADIUS
// ============================================================

function filterWithinRadius(
    items,
    latitude,
    longitude,
    radiusKm
) {
    if (!Array.isArray(items)) {
        return [];
    }

    const radius = toNumber(radiusKm);

    if (
        radius === null ||
        radius < 0 ||
        !validateCoordinates(latitude, longitude)
    ) {
        return [];
    }

    return sortByDistance(
        items,
        latitude,
        longitude
    ).filter(
        (item) =>
            item.distanceKm !== null &&
            item.distanceKm <= radius
    );
}


// ============================================================
// FORMAT DISTANCE
// ============================================================

function formatDistance(distanceKm) {
    const distance = toNumber(distanceKm);

    if (distance === null || distance < 0) {
        return null;
    }

    if (distance < 1) {
        return `${Math.round(distance * 1000)} m`;
    }

    return `${distance.toFixed(2)} km`;
}


// ============================================================
// CREATE LOCATION OBJECT
// ============================================================

function createLocation(
    latitude,
    longitude,
    accuracy = null
) {
    if (!validateCoordinates(latitude, longitude)) {
        return null;
    }

    const location = {
        latitude: Number(latitude),
        longitude: Number(longitude)
    };

    const numericAccuracy = toNumber(accuracy);

    if (
        numericAccuracy !== null &&
        numericAccuracy >= 0
    ) {
        location.accuracy = numericAccuracy;
    }

    return location;
}


// ============================================================
// CHECK LOCATION OBJECT
// ============================================================

function isValidLocation(location) {
    if (!location || typeof location !== "object") {
        return false;
    }

    const latitude =
        location.latitude ??
        location.lat;

    const longitude =
        location.longitude ??
        location.lng ??
        location.lon;

    return validateCoordinates(
        latitude,
        longitude
    );
}


// ============================================================
// GET DISTANCE BETWEEN TWO LOCATION OBJECTS
// ============================================================

function distanceBetweenLocations(
    location1,
    location2
) {
    if (
        !isValidLocation(location1) ||
        !isValidLocation(location2)
    ) {
        return null;
    }

    const latitude1 =
        location1.latitude ??
        location1.lat;

    const longitude1 =
        location1.longitude ??
        location1.lng ??
        location1.lon;

    const latitude2 =
        location2.latitude ??
        location2.lat;

    const longitude2 =
        location2.longitude ??
        location2.lng ??
        location2.lon;

    return calculateDistance(
        latitude1,
        longitude1,
        latitude2,
        longitude2
    );
}


// ============================================================
// ADD DISTANCE TO ITEMS
// ============================================================

function addDistanceToItems(
    items,
    latitude,
    longitude
) {
    return sortByDistance(
        items,
        latitude,
        longitude
    );
}


// ============================================================
// GET LOCATION SUMMARY
// ============================================================

function getLocationSummary(
    latitude,
    longitude,
    accuracy = null
) {
    const location = createLocation(
        latitude,
        longitude,
        accuracy
    );

    if (!location) {
        return {
            valid: false,
            location: null
        };
    }

    return {
        valid: true,
        location
    };
}


// ============================================================
// MODULE EXPORTS
// ============================================================

module.exports = {
    toNumber,
    validateCoordinates,
    calculateDistance,
    sortByDistance,
    findNearest,
    filterWithinRadius,
    formatDistance,
    createLocation,
    isValidLocation,
    distanceBetweenLocations,
    addDistanceToItems,
    getLocationSummary
};