/**
 * US Major Cities by State — for bulk territory expansion in onboarding.
 * Each entry: [city, latitude, longitude]
 * Includes cities with approx population > 50K and well-known suburbs.
 */

type CityEntry = [string, number, number]; // [city, lat, lng]

export const US_STATES: { name: string; abbr: string }[] = [
  { name: "Alabama", abbr: "AL" }, { name: "Alaska", abbr: "AK" }, { name: "Arizona", abbr: "AZ" },
  { name: "Arkansas", abbr: "AR" }, { name: "California", abbr: "CA" }, { name: "Colorado", abbr: "CO" },
  { name: "Connecticut", abbr: "CT" }, { name: "Delaware", abbr: "DE" }, { name: "Florida", abbr: "FL" },
  { name: "Georgia", abbr: "GA" }, { name: "Hawaii", abbr: "HI" }, { name: "Idaho", abbr: "ID" },
  { name: "Illinois", abbr: "IL" }, { name: "Indiana", abbr: "IN" }, { name: "Iowa", abbr: "IA" },
  { name: "Kansas", abbr: "KS" }, { name: "Kentucky", abbr: "KY" }, { name: "Louisiana", abbr: "LA" },
  { name: "Maine", abbr: "ME" }, { name: "Maryland", abbr: "MD" }, { name: "Massachusetts", abbr: "MA" },
  { name: "Michigan", abbr: "MI" }, { name: "Minnesota", abbr: "MN" }, { name: "Mississippi", abbr: "MS" },
  { name: "Missouri", abbr: "MO" }, { name: "Montana", abbr: "MT" }, { name: "Nebraska", abbr: "NE" },
  { name: "Nevada", abbr: "NV" }, { name: "New Hampshire", abbr: "NH" }, { name: "New Jersey", abbr: "NJ" },
  { name: "New Mexico", abbr: "NM" }, { name: "New York", abbr: "NY" }, { name: "North Carolina", abbr: "NC" },
  { name: "North Dakota", abbr: "ND" }, { name: "Ohio", abbr: "OH" }, { name: "Oklahoma", abbr: "OK" },
  { name: "Oregon", abbr: "OR" }, { name: "Pennsylvania", abbr: "PA" }, { name: "Rhode Island", abbr: "RI" },
  { name: "South Carolina", abbr: "SC" }, { name: "South Dakota", abbr: "SD" }, { name: "Tennessee", abbr: "TN" },
  { name: "Texas", abbr: "TX" }, { name: "Utah", abbr: "UT" }, { name: "Vermont", abbr: "VT" },
  { name: "Virginia", abbr: "VA" }, { name: "Washington", abbr: "WA" }, { name: "West Virginia", abbr: "WV" },
  { name: "Wisconsin", abbr: "WI" }, { name: "Wyoming", abbr: "WY" },
];

const CITIES_BY_STATE: Record<string, CityEntry[]> = {
  AL: [
    ["Birmingham", 33.52, -86.80], ["Montgomery", 32.37, -86.30], ["Huntsville", 34.73, -86.59],
    ["Mobile", 30.69, -88.04], ["Tuscaloosa", 33.21, -87.57], ["Hoover", 33.38, -86.81],
    ["Dothan", 31.22, -85.39], ["Auburn", 32.61, -85.48], ["Decatur", 34.61, -86.98],
  ],
  AK: [
    ["Anchorage", 61.22, -149.90], ["Fairbanks", 64.84, -147.72], ["Juneau", 58.30, -134.42],
    ["Wasilla", 61.58, -149.44], ["Sitka", 57.05, -135.33],
  ],
  AZ: [
    ["Phoenix", 33.45, -112.07], ["Tucson", 32.22, -110.97], ["Mesa", 33.42, -111.83],
    ["Chandler", 33.30, -111.84], ["Scottsdale", 33.49, -111.93], ["Glendale", 33.54, -112.19],
    ["Gilbert", 33.35, -111.79], ["Tempe", 33.43, -111.94], ["Peoria", 33.58, -112.24],
    ["Surprise", 33.63, -112.37], ["Flagstaff", 35.20, -111.65],
  ],
  AR: [
    ["Little Rock", 34.75, -92.29], ["Fort Smith", 35.39, -94.40], ["Fayetteville", 36.06, -94.16],
    ["Springdale", 36.19, -94.13], ["Jonesboro", 35.84, -90.70], ["Rogers", 36.33, -94.12],
    ["Conway", 35.09, -92.44], ["Bentonville", 36.37, -94.21],
  ],
  CA: [
    ["Los Angeles", 34.05, -118.24], ["San Diego", 32.72, -117.16], ["San Jose", 37.34, -121.89],
    ["San Francisco", 37.77, -122.42], ["Fresno", 36.74, -119.77], ["Sacramento", 38.58, -121.49],
    ["Long Beach", 33.77, -118.19], ["Oakland", 37.80, -122.27], ["Bakersfield", 35.37, -119.02],
    ["Anaheim", 33.84, -117.91], ["Santa Ana", 33.75, -117.87], ["Riverside", 33.95, -117.40],
    ["Irvine", 33.68, -117.83], ["Stockton", 37.96, -121.29], ["Chula Vista", 32.64, -117.08],
    ["Santa Clarita", 34.39, -118.54], ["San Bernardino", 34.11, -117.29], ["Modesto", 37.64, -120.99],
    ["Pasadena", 34.15, -118.14], ["Huntington Beach", 33.66, -117.99],
  ],
  CO: [
    ["Denver", 39.74, -104.99], ["Colorado Springs", 38.83, -104.82], ["Aurora", 39.73, -104.83],
    ["Fort Collins", 40.59, -105.08], ["Lakewood", 39.70, -105.08], ["Thornton", 39.87, -104.97],
    ["Arvada", 39.80, -105.09], ["Boulder", 40.01, -105.27], ["Westminster", 39.84, -105.04],
    ["Pueblo", 38.25, -104.61], ["Greeley", 40.42, -104.71],
  ],
  CT: [
    ["Bridgeport", 41.18, -73.19], ["New Haven", 41.31, -72.92], ["Stamford", 41.05, -73.54],
    ["Hartford", 41.76, -72.68], ["Waterbury", 41.56, -73.04], ["Norwalk", 41.12, -73.41],
    ["Danbury", 41.40, -73.45], ["New Britain", 41.67, -72.78],
  ],
  DE: [
    ["Wilmington", 39.74, -75.55], ["Dover", 39.16, -75.52], ["Newark", 39.68, -75.75],
    ["Middletown", 39.45, -75.72], ["Bear", 39.63, -75.66],
  ],
  FL: [
    ["Jacksonville", 30.33, -81.66], ["Miami", 25.76, -80.19], ["Tampa", 27.95, -82.46],
    ["Orlando", 28.54, -81.38], ["St. Petersburg", 27.77, -82.64], ["Fort Lauderdale", 26.12, -80.14],
    ["Tallahassee", 30.44, -84.28], ["Cape Coral", 26.56, -81.95], ["Hialeah", 25.86, -80.28],
    ["Port St. Lucie", 27.27, -80.35], ["Pembroke Pines", 26.01, -80.22], ["Hollywood", 26.01, -80.15],
    ["Gainesville", 29.65, -82.32], ["Coral Springs", 26.27, -80.27], ["Clearwater", 27.97, -82.76],
    ["Palm Bay", 28.03, -80.59], ["Lakeland", 28.04, -81.95], ["Boca Raton", 26.36, -80.08],
    ["Naples", 26.14, -81.79], ["Sarasota", 27.34, -82.53],
  ],
  GA: [
    ["Atlanta", 33.75, -84.39], ["Augusta", 33.47, -81.97], ["Columbus", 32.46, -84.99],
    ["Macon", 32.84, -83.63], ["Savannah", 32.08, -81.09], ["Athens", 33.96, -83.38],
    ["Sandy Springs", 33.92, -84.38], ["Roswell", 34.02, -84.36], ["Johns Creek", 34.03, -84.20],
    ["Albany", 31.58, -84.16], ["Warner Robins", 32.62, -83.60], ["Alpharetta", 34.07, -84.29],
    ["Marietta", 33.95, -84.55], ["Kennesaw", 34.02, -84.62],
  ],
  HI: [
    ["Honolulu", 21.31, -157.86], ["Pearl City", 21.40, -157.97], ["Hilo", 19.72, -155.08],
    ["Kailua", 21.40, -157.74], ["Kapolei", 21.34, -158.06],
  ],
  ID: [
    ["Boise", 43.62, -116.21], ["Meridian", 43.61, -116.39], ["Nampa", 43.54, -116.56],
    ["Idaho Falls", 43.49, -112.03], ["Caldwell", 43.66, -116.69], ["Pocatello", 42.87, -112.45],
    ["Twin Falls", 42.56, -114.46], ["Coeur d'Alene", 47.68, -116.78],
  ],
  IL: [
    ["Chicago", 41.88, -87.63], ["Aurora", 41.76, -88.32], ["Joliet", 41.53, -88.08],
    ["Naperville", 41.79, -88.15], ["Rockford", 42.27, -89.09], ["Springfield", 39.78, -89.65],
    ["Elgin", 42.04, -88.28], ["Peoria", 40.69, -89.59], ["Champaign", 40.12, -88.24],
    ["Schaumburg", 42.03, -88.08], ["Evanston", 42.05, -87.69], ["Arlington Heights", 42.09, -87.98],
    ["Bloomington", 40.48, -88.99], ["Decatur", 39.84, -88.95],
  ],
  IN: [
    ["Indianapolis", 39.77, -86.16], ["Fort Wayne", 41.08, -85.14], ["Evansville", 37.97, -87.56],
    ["South Bend", 41.68, -86.25], ["Carmel", 39.98, -86.12], ["Fishers", 39.96, -86.01],
    ["Bloomington", 39.17, -86.53], ["Hammond", 41.58, -87.50], ["Gary", 41.59, -87.35],
    ["Lafayette", 40.42, -86.88], ["Muncie", 40.19, -85.39], ["Terre Haute", 39.47, -87.41],
  ],
  IA: [
    ["Des Moines", 41.59, -93.62], ["Cedar Rapids", 41.98, -91.67], ["Davenport", 41.52, -90.58],
    ["Sioux City", 42.50, -96.40], ["Iowa City", 41.66, -91.53], ["Waterloo", 42.49, -92.34],
    ["Ames", 42.03, -93.62], ["Council Bluffs", 41.26, -95.86],
  ],
  KS: [
    ["Wichita", 37.69, -97.34], ["Overland Park", 38.98, -94.67], ["Kansas City", 39.11, -94.63],
    ["Olathe", 38.88, -94.82], ["Topeka", 39.05, -95.68], ["Lawrence", 38.97, -95.24],
    ["Shawnee", 39.02, -94.72], ["Manhattan", 39.18, -96.57], ["Lenexa", 38.95, -94.73],
  ],
  KY: [
    ["Louisville", 38.25, -85.76], ["Lexington", 38.04, -84.50], ["Bowling Green", 36.99, -86.44],
    ["Owensboro", 37.77, -87.11], ["Covington", 39.08, -84.51], ["Richmond", 37.75, -84.29],
    ["Florence", 38.99, -84.63], ["Georgetown", 38.21, -84.56],
  ],
  LA: [
    ["New Orleans", 29.95, -90.07], ["Baton Rouge", 30.45, -91.19], ["Shreveport", 32.53, -93.75],
    ["Lafayette", 30.22, -92.02], ["Lake Charles", 30.21, -93.21], ["Kenner", 29.98, -90.24],
    ["Bossier City", 32.52, -93.73], ["Monroe", 32.51, -92.12], ["Alexandria", 31.31, -92.45],
  ],
  ME: [
    ["Portland", 43.66, -70.26], ["Lewiston", 44.10, -70.21], ["Bangor", 44.80, -68.77],
    ["South Portland", 43.64, -70.28], ["Auburn", 44.10, -70.23],
  ],
  MD: [
    ["Baltimore", 39.29, -76.61], ["Frederick", 39.41, -77.41], ["Rockville", 39.08, -77.15],
    ["Gaithersburg", 39.14, -77.20], ["Bowie", 38.94, -76.73], ["Hagerstown", 39.64, -77.72],
    ["Annapolis", 38.98, -76.49], ["College Park", 38.98, -76.94], ["Salisbury", 38.36, -75.60],
    ["Germantown", 39.17, -77.27],
  ],
  MA: [
    ["Boston", 42.36, -71.06], ["Worcester", 42.26, -71.80], ["Springfield", 42.10, -72.59],
    ["Cambridge", 42.37, -71.11], ["Lowell", 42.63, -71.32], ["Brockton", 42.08, -71.02],
    ["New Bedford", 41.64, -70.93], ["Quincy", 42.25, -71.00], ["Lynn", 42.47, -70.95],
    ["Fall River", 41.70, -71.16], ["Newton", 42.34, -71.21], ["Somerville", 42.39, -71.10],
  ],
  MI: [
    ["Detroit", 42.33, -83.05], ["Grand Rapids", 42.96, -85.66], ["Warren", 42.49, -83.03],
    ["Sterling Heights", 42.58, -83.03], ["Ann Arbor", 42.28, -83.74], ["Lansing", 42.73, -84.56],
    ["Flint", 43.01, -83.69], ["Dearborn", 42.32, -83.18], ["Livonia", 42.37, -83.35],
    ["Troy", 42.61, -83.15], ["Kalamazoo", 42.29, -85.59], ["Canton", 42.31, -83.48],
  ],
  MN: [
    ["Minneapolis", 44.98, -93.27], ["Saint Paul", 44.95, -93.09], ["Rochester", 44.02, -92.47],
    ["Bloomington", 44.84, -93.30], ["Brooklyn Park", 45.09, -93.36], ["Plymouth", 45.01, -93.46],
    ["Duluth", 46.79, -92.10], ["Woodbury", 44.92, -92.96], ["Maple Grove", 45.07, -93.46],
    ["St. Cloud", 45.56, -94.16], ["Eagan", 44.80, -93.17], ["Eden Prairie", 44.85, -93.47],
  ],
  MS: [
    ["Jackson", 32.30, -90.18], ["Gulfport", 30.37, -89.09], ["Southaven", 34.99, -90.01],
    ["Biloxi", 30.40, -88.88], ["Hattiesburg", 31.33, -89.29], ["Olive Branch", 34.96, -89.83],
    ["Tupelo", 34.26, -88.70], ["Meridian", 32.36, -88.70],
  ],
  MO: [
    ["Kansas City", 39.10, -94.58], ["St. Louis", 38.63, -90.20], ["Springfield", 37.22, -93.29],
    ["Columbia", 38.95, -92.33], ["Independence", 39.09, -94.41], ["Lee's Summit", 38.91, -94.38],
    ["O'Fallon", 38.81, -90.70], ["St. Joseph", 39.77, -94.85], ["St. Charles", 38.78, -90.48],
    ["Blue Springs", 39.02, -94.28], ["Joplin", 37.08, -94.51],
  ],
  MT: [
    ["Billings", 45.78, -108.50], ["Missoula", 46.87, -114.00], ["Great Falls", 47.51, -111.29],
    ["Bozeman", 45.68, -111.04], ["Helena", 46.60, -112.04], ["Butte", 46.00, -112.53],
    ["Kalispell", 48.19, -114.31],
  ],
  NE: [
    ["Omaha", 41.26, -95.93], ["Lincoln", 40.81, -96.70], ["Bellevue", 41.14, -95.89],
    ["Grand Island", 40.92, -98.34], ["Kearney", 40.70, -99.08], ["Fremont", 41.44, -96.50],
  ],
  NV: [
    ["Las Vegas", 36.17, -115.14], ["Henderson", 36.04, -114.98], ["Reno", 39.53, -119.81],
    ["North Las Vegas", 36.20, -115.12], ["Sparks", 39.53, -119.75], ["Carson City", 39.16, -119.77],
  ],
  NH: [
    ["Manchester", 42.99, -71.45], ["Nashua", 42.77, -71.47], ["Concord", 43.21, -71.54],
    ["Dover", 43.20, -70.87], ["Rochester", 43.30, -70.97],
  ],
  NJ: [
    ["Newark", 40.74, -74.17], ["Jersey City", 40.73, -74.08], ["Paterson", 40.92, -74.17],
    ["Elizabeth", 40.66, -74.21], ["Edison", 40.52, -74.41], ["Woodbridge", 40.56, -74.28],
    ["Trenton", 40.22, -74.76], ["Clifton", 40.86, -74.16], ["Cherry Hill", 39.93, -75.00],
    ["Princeton", 40.35, -74.66], ["Toms River", 39.95, -74.20], ["Hoboken", 40.74, -74.03],
    ["Hackensack", 40.89, -74.04], ["Morristown", 40.80, -74.48],
  ],
  NM: [
    ["Albuquerque", 35.08, -106.65], ["Las Cruces", 32.35, -106.76], ["Rio Rancho", 35.23, -106.66],
    ["Santa Fe", 35.69, -105.94], ["Roswell", 33.39, -104.52], ["Farmington", 36.73, -108.22],
  ],
  NY: [
    ["New York City", 40.71, -74.01], ["Buffalo", 42.89, -78.88], ["Rochester", 43.16, -77.61],
    ["Yonkers", 40.93, -73.90], ["Syracuse", 43.05, -76.15], ["Albany", 42.65, -73.75],
    ["New Rochelle", 40.91, -73.78], ["White Plains", 41.03, -73.77], ["Long Beach", 40.59, -73.66],
    ["Schenectady", 42.81, -73.94], ["Binghamton", 42.10, -75.91], ["Utica", 43.10, -75.23],
    ["Ithaca", 42.44, -76.50], ["Poughkeepsie", 41.70, -73.92],
  ],
  NC: [
    ["Charlotte", 35.23, -80.84], ["Raleigh", 35.77, -78.64], ["Greensboro", 36.07, -79.79],
    ["Durham", 35.99, -78.90], ["Winston-Salem", 36.10, -80.24], ["Fayetteville", 35.05, -78.88],
    ["Cary", 35.79, -78.78], ["Wilmington", 34.23, -77.94], ["High Point", 35.96, -80.01],
    ["Asheville", 35.60, -82.55], ["Concord", 35.41, -80.58], ["Huntersville", 35.41, -80.84],
    ["Gastonia", 35.26, -81.19], ["Chapel Hill", 35.91, -79.05],
  ],
  ND: [
    ["Fargo", 46.88, -96.79], ["Bismarck", 46.81, -100.78], ["Grand Forks", 47.93, -97.03],
    ["Minot", 48.23, -101.30], ["West Fargo", 46.87, -96.90],
  ],
  OH: [
    ["Columbus", 39.96, -83.00], ["Cleveland", 41.50, -81.69], ["Cincinnati", 39.10, -84.51],
    ["Toledo", 41.65, -83.54], ["Akron", 41.08, -81.52], ["Dayton", 39.76, -84.19],
    ["Canton", 40.80, -81.38], ["Dublin", 40.10, -83.11], ["Westerville", 40.13, -82.93],
    ["Youngstown", 41.10, -80.65], ["Mason", 39.36, -84.31], ["Mentor", 41.69, -81.34],
  ],
  OK: [
    ["Oklahoma City", 35.47, -97.52], ["Tulsa", 36.15, -95.99], ["Norman", 35.22, -97.44],
    ["Broken Arrow", 36.06, -95.79], ["Edmond", 35.65, -97.48], ["Moore", 35.34, -97.49],
    ["Lawton", 34.60, -98.39], ["Stillwater", 36.12, -97.06],
  ],
  OR: [
    ["Portland", 45.52, -122.68], ["Salem", 44.94, -123.04], ["Eugene", 44.05, -123.09],
    ["Gresham", 45.50, -122.43], ["Hillsboro", 45.52, -122.99], ["Beaverton", 45.49, -122.80],
    ["Bend", 44.06, -121.31], ["Medford", 42.33, -122.87], ["Corvallis", 44.56, -123.26],
  ],
  PA: [
    ["Philadelphia", 39.95, -75.17], ["Pittsburgh", 40.44, -80.00], ["Allentown", 40.60, -75.47],
    ["Erie", 42.13, -80.09], ["Reading", 40.34, -75.93], ["Scranton", 41.41, -75.66],
    ["Bethlehem", 40.63, -75.37], ["Lancaster", 40.04, -76.31], ["Harrisburg", 40.27, -76.88],
    ["King of Prussia", 40.09, -75.38], ["State College", 40.79, -77.86], ["York", 39.96, -76.73],
  ],
  RI: [
    ["Providence", 41.82, -71.41], ["Warwick", 41.70, -71.42], ["Cranston", 41.78, -71.44],
    ["Pawtucket", 41.88, -71.38], ["East Providence", 41.81, -71.37],
  ],
  SC: [
    ["Columbia", 34.00, -81.03], ["Charleston", 32.78, -79.93], ["North Charleston", 32.85, -79.97],
    ["Mount Pleasant", 32.79, -79.86], ["Greenville", 34.85, -82.40], ["Rock Hill", 34.93, -81.03],
    ["Summerville", 33.02, -80.18], ["Myrtle Beach", 33.69, -78.89], ["Spartanburg", 34.95, -81.93],
  ],
  SD: [
    ["Sioux Falls", 43.55, -96.73], ["Rapid City", 44.08, -103.23], ["Aberdeen", 45.46, -98.49],
    ["Brookings", 44.31, -96.80], ["Watertown", 44.90, -97.11],
  ],
  TN: [
    ["Nashville", 36.16, -86.78], ["Memphis", 35.15, -90.05], ["Knoxville", 35.96, -83.92],
    ["Chattanooga", 35.05, -85.31], ["Clarksville", 36.53, -87.36], ["Murfreesboro", 35.85, -86.39],
    ["Franklin", 35.93, -86.87], ["Jackson", 35.61, -88.81], ["Johnson City", 36.31, -82.35],
    ["Hendersonville", 36.30, -86.62], ["Brentwood", 36.03, -86.78],
  ],
  TX: [
    ["Houston", 29.76, -95.37], ["San Antonio", 29.42, -98.49], ["Dallas", 32.78, -96.80],
    ["Austin", 30.27, -97.74], ["Fort Worth", 32.76, -97.33], ["El Paso", 31.76, -106.49],
    ["Arlington", 32.74, -97.11], ["Plano", 33.02, -96.70], ["Laredo", 27.51, -99.51],
    ["Lubbock", 33.58, -101.85], ["Irving", 32.81, -96.95], ["Garland", 32.91, -96.64],
    ["Frisco", 33.15, -96.82], ["McKinney", 33.20, -96.62], ["Corpus Christi", 27.80, -97.40],
    ["Amarillo", 35.22, -101.83], ["Round Rock", 30.51, -97.68], ["Sugar Land", 29.62, -95.64],
    ["The Woodlands", 30.17, -95.50], ["College Station", 30.63, -96.33],
  ],
  UT: [
    ["Salt Lake City", 40.76, -111.89], ["West Valley City", 40.69, -112.00], ["Provo", 40.23, -111.66],
    ["West Jordan", 40.61, -111.94], ["Orem", 40.30, -111.69], ["Sandy", 40.57, -111.85],
    ["Ogden", 41.22, -111.97], ["St. George", 37.10, -113.58], ["Layton", 41.06, -111.97],
    ["Draper", 40.52, -111.86],
  ],
  VT: [
    ["Burlington", 44.48, -73.21], ["South Burlington", 44.47, -73.17], ["Rutland", 43.61, -72.97],
    ["Montpelier", 44.26, -72.58], ["Barre", 44.20, -72.50],
  ],
  VA: [
    ["Virginia Beach", 36.85, -75.98], ["Norfolk", 36.85, -76.29], ["Chesapeake", 36.77, -76.29],
    ["Richmond", 37.54, -77.44], ["Arlington", 38.88, -77.10], ["Newport News", 37.09, -76.47],
    ["Alexandria", 38.80, -77.05], ["Hampton", 37.03, -76.35], ["Roanoke", 37.27, -79.94],
    ["Lynchburg", 37.41, -79.14], ["Charlottesville", 38.03, -78.48], ["Fredericksburg", 38.30, -77.46],
    ["Fairfax", 38.85, -77.31], ["Manassas", 38.75, -77.47],
  ],
  WA: [
    ["Seattle", 47.61, -122.33], ["Spokane", 47.66, -117.43], ["Tacoma", 47.25, -122.44],
    ["Vancouver", 45.64, -122.66], ["Bellevue", 47.61, -122.20], ["Kent", 47.38, -122.24],
    ["Everett", 47.98, -122.20], ["Renton", 47.48, -122.22], ["Federal Way", 47.32, -122.31],
    ["Spokane Valley", 47.67, -117.24], ["Kirkland", 47.68, -122.21], ["Olympia", 47.04, -122.90],
    ["Bellingham", 48.76, -122.49], ["Redmond", 47.67, -122.12],
  ],
  WV: [
    ["Charleston", 38.35, -81.63], ["Huntington", 38.42, -82.45], ["Morgantown", 39.63, -79.96],
    ["Parkersburg", 39.27, -81.56], ["Wheeling", 40.06, -80.72],
  ],
  WI: [
    ["Milwaukee", 43.04, -87.91], ["Madison", 43.07, -89.40], ["Green Bay", 44.51, -88.02],
    ["Kenosha", 42.58, -87.82], ["Racine", 42.73, -87.78], ["Appleton", 44.26, -88.42],
    ["Waukesha", 43.01, -88.23], ["Oshkosh", 44.02, -88.54], ["Eau Claire", 44.81, -91.50],
    ["Janesville", 42.68, -89.02], ["La Crosse", 43.80, -91.24],
  ],
  WY: [
    ["Cheyenne", 41.14, -104.82], ["Casper", 42.87, -106.31], ["Laramie", 41.31, -105.59],
    ["Gillette", 44.29, -105.50], ["Rock Springs", 41.59, -109.22],
  ],
};

export interface CityData {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export function getCitiesForState(stateAbbr: string): CityData[] {
  const entries = CITIES_BY_STATE[stateAbbr] || [];
  return entries.map(([city, lat, lng]) => ({ city, state: stateAbbr, lat, lng }));
}

export function getTotalCityCount(): number {
  return Object.values(CITIES_BY_STATE).reduce((sum, cities) => sum + cities.length, 0);
}

export function getStateCityCount(stateAbbr: string): number {
  return (CITIES_BY_STATE[stateAbbr] || []).length;
}
