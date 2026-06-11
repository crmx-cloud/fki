/**
 * Simplified US state boundaries for Leaflet GeoJSON overlay.
 * Uses a CDN URL to load full state boundaries at runtime.
 */
export const US_STATES_GEOJSON_URL = 
  "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";

/** State name → abbreviation lookup */
export const STATE_ABBREVS: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
  "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
  "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
  "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
  "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
  "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
  "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC",
  "Puerto Rico": "PR",
};

/** All 50 state names (sorted) */
export const ALL_US_STATES = Object.keys(STATE_ABBREVS).filter(
  s => !["District of Columbia", "Puerto Rico"].includes(s)
).sort();

/** Major cities per state for auto-pinning */
export const MAJOR_CITIES: Record<string, { city: string; lat: number; lng: number }[]> = {
  "Alabama": [
    { city: "Birmingham", lat: 33.5186, lng: -86.8104 },
    { city: "Montgomery", lat: 32.3668, lng: -86.3000 },
    { city: "Huntsville", lat: 34.7304, lng: -86.5861 },
    { city: "Mobile", lat: 30.6954, lng: -88.0399 },
  ],
  "Alaska": [
    { city: "Anchorage", lat: 61.2181, lng: -149.9003 },
    { city: "Fairbanks", lat: 64.8378, lng: -147.7164 },
    { city: "Juneau", lat: 58.3005, lng: -134.4197 },
  ],
  "Arizona": [
    { city: "Phoenix", lat: 33.4484, lng: -112.0740 },
    { city: "Tucson", lat: 32.2226, lng: -110.9747 },
    { city: "Mesa", lat: 33.4152, lng: -111.8315 },
    { city: "Scottsdale", lat: 33.4942, lng: -111.9261 },
    { city: "Chandler", lat: 33.3062, lng: -111.8413 },
  ],
  "Arkansas": [
    { city: "Little Rock", lat: 34.7465, lng: -92.2896 },
    { city: "Fort Smith", lat: 35.3859, lng: -94.3985 },
    { city: "Fayetteville", lat: 36.0822, lng: -94.1719 },
  ],
  "California": [
    { city: "Los Angeles", lat: 34.0522, lng: -118.2437 },
    { city: "San Francisco", lat: 37.7749, lng: -122.4194 },
    { city: "San Diego", lat: 32.7157, lng: -117.1611 },
    { city: "San Jose", lat: 37.3382, lng: -121.8863 },
    { city: "Sacramento", lat: 38.5816, lng: -121.4944 },
    { city: "Fresno", lat: 36.7378, lng: -119.7871 },
    { city: "Oakland", lat: 37.8044, lng: -122.2712 },
    { city: "Irvine", lat: 33.6846, lng: -117.8265 },
  ],
  "Colorado": [
    { city: "Denver", lat: 39.7392, lng: -104.9903 },
    { city: "Colorado Springs", lat: 38.8339, lng: -104.8214 },
    { city: "Aurora", lat: 39.7294, lng: -104.8319 },
    { city: "Fort Collins", lat: 40.5853, lng: -105.0844 },
    { city: "Boulder", lat: 40.0150, lng: -105.2705 },
  ],
  "Connecticut": [
    { city: "Hartford", lat: 41.7658, lng: -72.6734 },
    { city: "New Haven", lat: 41.3083, lng: -72.9279 },
    { city: "Stamford", lat: 41.0534, lng: -73.5387 },
    { city: "Bridgeport", lat: 41.1865, lng: -73.1952 },
  ],
  "Delaware": [
    { city: "Wilmington", lat: 39.7391, lng: -75.5398 },
    { city: "Dover", lat: 39.1582, lng: -75.5244 },
    { city: "Newark", lat: 39.6837, lng: -75.7497 },
  ],
  "Florida": [
    { city: "Miami", lat: 25.7617, lng: -80.1918 },
    { city: "Orlando", lat: 28.5383, lng: -81.3792 },
    { city: "Tampa", lat: 27.9506, lng: -82.4572 },
    { city: "Jacksonville", lat: 30.3322, lng: -81.6557 },
    { city: "Fort Lauderdale", lat: 26.1224, lng: -80.1373 },
    { city: "St. Petersburg", lat: 27.7676, lng: -82.6403 },
    { city: "Naples", lat: 26.1420, lng: -81.7948 },
    { city: "Sarasota", lat: 27.3364, lng: -82.5307 },
  ],
  "Georgia": [
    { city: "Atlanta", lat: 33.7490, lng: -84.3880 },
    { city: "Savannah", lat: 32.0809, lng: -81.0912 },
    { city: "Augusta", lat: 33.4735, lng: -81.9748 },
    { city: "Columbus", lat: 32.4610, lng: -84.9877 },
    { city: "Macon", lat: 32.8407, lng: -83.6324 },
  ],
  "Hawaii": [
    { city: "Honolulu", lat: 21.3069, lng: -157.8583 },
    { city: "Hilo", lat: 19.7297, lng: -155.0900 },
  ],
  "Idaho": [
    { city: "Boise", lat: 43.6150, lng: -116.2023 },
    { city: "Meridian", lat: 43.6121, lng: -116.3915 },
    { city: "Idaho Falls", lat: 43.4917, lng: -112.0341 },
  ],
  "Illinois": [
    { city: "Chicago", lat: 41.8781, lng: -87.6298 },
    { city: "Springfield", lat: 39.7817, lng: -89.6501 },
    { city: "Naperville", lat: 41.7508, lng: -88.1535 },
    { city: "Rockford", lat: 42.2711, lng: -89.0940 },
    { city: "Peoria", lat: 40.6936, lng: -89.5890 },
  ],
  "Indiana": [
    { city: "Indianapolis", lat: 39.7684, lng: -86.1581 },
    { city: "Fort Wayne", lat: 41.0793, lng: -85.1394 },
    { city: "Evansville", lat: 37.9716, lng: -87.5711 },
    { city: "South Bend", lat: 41.6764, lng: -86.2520 },
  ],
  "Iowa": [
    { city: "Des Moines", lat: 41.5868, lng: -93.6250 },
    { city: "Cedar Rapids", lat: 41.9779, lng: -91.6656 },
    { city: "Davenport", lat: 41.5236, lng: -90.5776 },
  ],
  "Kansas": [
    { city: "Wichita", lat: 37.6872, lng: -97.3301 },
    { city: "Overland Park", lat: 38.9822, lng: -94.6708 },
    { city: "Kansas City", lat: 39.1155, lng: -94.6268 },
    { city: "Topeka", lat: 39.0473, lng: -95.6752 },
  ],
  "Kentucky": [
    { city: "Louisville", lat: 38.2527, lng: -85.7585 },
    { city: "Lexington", lat: 38.0406, lng: -84.5037 },
    { city: "Bowling Green", lat: 36.9685, lng: -86.4808 },
  ],
  "Louisiana": [
    { city: "New Orleans", lat: 29.9511, lng: -90.0715 },
    { city: "Baton Rouge", lat: 30.4515, lng: -91.1871 },
    { city: "Shreveport", lat: 32.5252, lng: -93.7502 },
  ],
  "Maine": [
    { city: "Portland", lat: 43.6591, lng: -70.2568 },
    { city: "Bangor", lat: 44.8016, lng: -68.7712 },
  ],
  "Maryland": [
    { city: "Baltimore", lat: 39.2904, lng: -76.6122 },
    { city: "Annapolis", lat: 38.9784, lng: -76.4922 },
    { city: "Rockville", lat: 39.0840, lng: -77.1528 },
    { city: "Frederick", lat: 39.4143, lng: -77.4105 },
  ],
  "Massachusetts": [
    { city: "Boston", lat: 42.3601, lng: -71.0589 },
    { city: "Worcester", lat: 42.2626, lng: -71.8023 },
    { city: "Springfield", lat: 42.1015, lng: -72.5898 },
    { city: "Cambridge", lat: 42.3736, lng: -71.1097 },
  ],
  "Michigan": [
    { city: "Detroit", lat: 42.3314, lng: -83.0458 },
    { city: "Grand Rapids", lat: 42.9634, lng: -85.6681 },
    { city: "Ann Arbor", lat: 42.2808, lng: -83.7430 },
    { city: "Lansing", lat: 42.7325, lng: -84.5555 },
  ],
  "Minnesota": [
    { city: "Minneapolis", lat: 44.9778, lng: -93.2650 },
    { city: "St. Paul", lat: 44.9537, lng: -93.0900 },
    { city: "Rochester", lat: 44.0121, lng: -92.4802 },
    { city: "Duluth", lat: 46.7867, lng: -92.1005 },
  ],
  "Mississippi": [
    { city: "Jackson", lat: 32.2988, lng: -90.1848 },
    { city: "Gulfport", lat: 30.3674, lng: -89.0928 },
    { city: "Hattiesburg", lat: 31.3271, lng: -89.2903 },
  ],
  "Missouri": [
    { city: "Kansas City", lat: 39.0997, lng: -94.5786 },
    { city: "St. Louis", lat: 38.6270, lng: -90.1994 },
    { city: "Springfield", lat: 37.2090, lng: -93.2923 },
    { city: "Columbia", lat: 38.9517, lng: -92.3341 },
  ],
  "Montana": [
    { city: "Billings", lat: 45.7833, lng: -108.5007 },
    { city: "Missoula", lat: 46.8721, lng: -114.0131 },
    { city: "Great Falls", lat: 47.5053, lng: -111.3008 },
  ],
  "Nebraska": [
    { city: "Omaha", lat: 41.2565, lng: -95.9345 },
    { city: "Lincoln", lat: 40.8136, lng: -96.7026 },
  ],
  "Nevada": [
    { city: "Las Vegas", lat: 36.1699, lng: -115.1398 },
    { city: "Reno", lat: 39.5296, lng: -119.8138 },
    { city: "Henderson", lat: 36.0395, lng: -114.9817 },
  ],
  "New Hampshire": [
    { city: "Manchester", lat: 42.9956, lng: -71.4548 },
    { city: "Nashua", lat: 42.7654, lng: -71.4676 },
    { city: "Concord", lat: 43.2081, lng: -71.5376 },
  ],
  "New Jersey": [
    { city: "Newark", lat: 40.7357, lng: -74.1724 },
    { city: "Jersey City", lat: 40.7178, lng: -74.0431 },
    { city: "Trenton", lat: 40.2171, lng: -74.7429 },
    { city: "Edison", lat: 40.5187, lng: -74.4121 },
    { city: "Cherry Hill", lat: 39.9348, lng: -75.0307 },
    { city: "Princeton", lat: 40.3573, lng: -74.6672 },
  ],
  "New Mexico": [
    { city: "Albuquerque", lat: 35.0844, lng: -106.6504 },
    { city: "Santa Fe", lat: 35.6870, lng: -105.9378 },
    { city: "Las Cruces", lat: 32.3199, lng: -106.7637 },
  ],
  "New York": [
    { city: "New York City", lat: 40.7128, lng: -74.0060 },
    { city: "Buffalo", lat: 42.8864, lng: -78.8784 },
    { city: "Albany", lat: 42.6526, lng: -73.7562 },
    { city: "Rochester", lat: 43.1566, lng: -77.6088 },
    { city: "Syracuse", lat: 43.0481, lng: -76.1474 },
    { city: "Yonkers", lat: 40.9312, lng: -73.8987 },
  ],
  "North Carolina": [
    { city: "Charlotte", lat: 35.2271, lng: -80.8431 },
    { city: "Raleigh", lat: 35.7796, lng: -78.6382 },
    { city: "Durham", lat: 35.9940, lng: -78.8986 },
    { city: "Greensboro", lat: 36.0726, lng: -79.7920 },
    { city: "Asheville", lat: 35.5951, lng: -82.5515 },
    { city: "Wilmington", lat: 34.2257, lng: -77.9447 },
  ],
  "North Dakota": [
    { city: "Fargo", lat: 46.8772, lng: -96.7898 },
    { city: "Bismarck", lat: 46.8083, lng: -100.7837 },
  ],
  "Ohio": [
    { city: "Columbus", lat: 39.9612, lng: -82.9988 },
    { city: "Cleveland", lat: 41.4993, lng: -81.6944 },
    { city: "Cincinnati", lat: 39.1031, lng: -84.5120 },
    { city: "Dayton", lat: 39.7589, lng: -84.1916 },
    { city: "Akron", lat: 41.0814, lng: -81.5190 },
    { city: "Toledo", lat: 41.6528, lng: -83.5379 },
  ],
  "Oklahoma": [
    { city: "Oklahoma City", lat: 35.4676, lng: -97.5164 },
    { city: "Tulsa", lat: 36.1540, lng: -95.9928 },
    { city: "Norman", lat: 35.2226, lng: -97.4395 },
  ],
  "Oregon": [
    { city: "Portland", lat: 45.5152, lng: -122.6784 },
    { city: "Salem", lat: 44.9429, lng: -123.0351 },
    { city: "Eugene", lat: 44.0521, lng: -123.0868 },
    { city: "Bend", lat: 44.0582, lng: -121.3153 },
  ],
  "Pennsylvania": [
    { city: "Philadelphia", lat: 39.9526, lng: -75.1652 },
    { city: "Pittsburgh", lat: 40.4406, lng: -79.9959 },
    { city: "Allentown", lat: 40.6084, lng: -75.4902 },
    { city: "Harrisburg", lat: 40.2732, lng: -76.8867 },
    { city: "Lancaster", lat: 40.0379, lng: -76.3055 },
  ],
  "Rhode Island": [
    { city: "Providence", lat: 41.8240, lng: -71.4128 },
    { city: "Warwick", lat: 41.7001, lng: -71.4162 },
  ],
  "South Carolina": [
    { city: "Charleston", lat: 32.7765, lng: -79.9311 },
    { city: "Columbia", lat: 34.0007, lng: -81.0348 },
    { city: "Greenville", lat: 34.8526, lng: -82.3940 },
    { city: "Myrtle Beach", lat: 33.6891, lng: -78.8867 },
  ],
  "South Dakota": [
    { city: "Sioux Falls", lat: 43.5460, lng: -96.7313 },
    { city: "Rapid City", lat: 44.0805, lng: -103.2310 },
  ],
  "Tennessee": [
    { city: "Nashville", lat: 36.1627, lng: -86.7816 },
    { city: "Memphis", lat: 35.1495, lng: -90.0490 },
    { city: "Knoxville", lat: 35.9606, lng: -83.9207 },
    { city: "Chattanooga", lat: 35.0456, lng: -85.3097 },
  ],
  "Texas": [
    { city: "Houston", lat: 29.7604, lng: -95.3698 },
    { city: "Dallas", lat: 32.7767, lng: -96.7970 },
    { city: "Austin", lat: 30.2672, lng: -97.7431 },
    { city: "San Antonio", lat: 29.4241, lng: -98.4936 },
    { city: "Fort Worth", lat: 32.7555, lng: -97.3308 },
    { city: "El Paso", lat: 31.7619, lng: -106.4850 },
    { city: "Plano", lat: 33.0198, lng: -96.6989 },
    { city: "McAllen", lat: 26.2034, lng: -98.2300 },
  ],
  "Utah": [
    { city: "Salt Lake City", lat: 40.7608, lng: -111.8910 },
    { city: "Provo", lat: 40.2338, lng: -111.6585 },
    { city: "Ogden", lat: 41.2230, lng: -111.9738 },
    { city: "St. George", lat: 37.0965, lng: -113.5684 },
  ],
  "Vermont": [
    { city: "Burlington", lat: 44.4759, lng: -73.2121 },
    { city: "Montpelier", lat: 44.2601, lng: -72.5754 },
  ],
  "Virginia": [
    { city: "Virginia Beach", lat: 36.8529, lng: -75.9780 },
    { city: "Richmond", lat: 37.5407, lng: -77.4360 },
    { city: "Norfolk", lat: 36.8508, lng: -76.2859 },
    { city: "Arlington", lat: 38.8799, lng: -77.1068 },
    { city: "Roanoke", lat: 37.2710, lng: -79.9414 },
  ],
  "Washington": [
    { city: "Seattle", lat: 47.6062, lng: -122.3321 },
    { city: "Spokane", lat: 47.6588, lng: -117.4260 },
    { city: "Tacoma", lat: 47.2529, lng: -122.4443 },
    { city: "Bellevue", lat: 47.6101, lng: -122.2015 },
  ],
  "West Virginia": [
    { city: "Charleston", lat: 38.3498, lng: -81.6326 },
    { city: "Huntington", lat: 38.4192, lng: -82.4452 },
    { city: "Morgantown", lat: 39.6295, lng: -79.9559 },
  ],
  "Wisconsin": [
    { city: "Milwaukee", lat: 43.0389, lng: -87.9065 },
    { city: "Madison", lat: 43.0731, lng: -89.4012 },
    { city: "Green Bay", lat: 44.5133, lng: -88.0133 },
  ],
  "Wyoming": [
    { city: "Cheyenne", lat: 41.1400, lng: -104.8202 },
    { city: "Casper", lat: 42.8666, lng: -106.3131 },
  ],
};
