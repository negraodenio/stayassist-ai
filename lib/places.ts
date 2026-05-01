
export interface PlaceResult {
  name: string;
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  displayName: { text: string };
  primaryTypeDisplayName?: { text: string };
  googleMapsUri: string;
}

/**
 * Searches for nearby places using Google Places API (New)
 * @param location - String like "lat,lng"
 * @param type - Type of place (restaurant, cafe, etc)
 * @param radius - Radius in meters
 */
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  type: string = "restaurant",
  radius: number = 1500
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.error("[PLACES] Error: GOOGLE_PLACES_API_KEY is not set.");
    return [];
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryTypeDisplayName",
      },
      body: JSON.stringify({
        includedTypes: [type],
        maxResultCount: 5,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[PLACES] API Error:", error);
      return [];
    }

    const data = await response.json();
    return data.places || [];
  } catch (error) {
    console.error("[PLACES] Fetch Error:", error);
    return [];
  }
}
