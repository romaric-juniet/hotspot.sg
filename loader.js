const fetch = require("node-fetch");
const fs = require("fs");

// https://www.flickr.com/services/api/flickr.photos.search.htm
// https://www.flickr.com/services/api/explore/flickr.photos.search
async function loadPhotos(page = 0, minTakenDate, maxTakenDate) {
  const params = Object.entries({
    api_key: "407902b4e99781ae7d33552db35a119c",
    bbox: "103.63123,1.180947,104.040871,1.458106",
    extras: "date_taken,geo,url_s,views",
    min_taken_date: minTakenDate,
    max_taken_date: maxTakenDate,
    per_page: "500",
    sort: "interestingness-desc"
  })
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const flickrPhotos = await fetch(
    `https://api.flickr.com/services/rest/?method=flickr.photos.search&${params}&format=json&nojsoncallback=1`
  ).then(data => data.json());
  return {
    photos: flickrPhotos.photos.photo,
    pages: flickrPhotos.photos.pages
  };
}

async function getAllPhotosBetween(minTakenDate, maxTakenDate) {
  const { photos, pages } = await loadPhotos(0, minTakenDate, maxTakenDate);
  const pagesToLoad = Math.min(pages, 10);
  const promises = [];

  for (let i = 1; i < pagesToLoad; i++) {
    promises.push(
      loadPhotos(i, minTakenDate, maxTakenDate).then(x => x.photos)
    );
  }
  return photos.concat(...(await Promise.all(promises)));
}

async function saveGeoJson(allPhotos, filename) {
  var geojsonFeatures = allPhotos.map(photo => ({
    type: "Feature",
    properties: {
      views: photo.views,
      url_s: photo.url_s,
      date_taken: photo.date_taken,
      description: photo.description
    },
    geometry: {
      type: "Point",
      coordinates: [photo.longitude, photo.latitude]
    }
  }));

  const geojson = JSON.stringify({
    type: "FeatureCollection",
    features: geojsonFeatures
  });
  fs.writeFileSync("data/" + filename + ".geojson", geojson);
}

async function generateFor(year, year2) {
  const minTakenDate = new Date(year, 0, 1).getTime() / 1000;
  const maxTakenDate = new Date(year2 || year, 11, 31).getTime() / 1000;

  const allPhotos = await getAllPhotosBetween(minTakenDate, maxTakenDate);

  console.log(`year ${year} ${allPhotos.length} photos`);

  saveGeoJson(allPhotos, year);
}

(async function() {
  generateFor(1950, 1959);
  generateFor(1960, 1969);
  generateFor(1970, 1979);
  generateFor(1980, 1989);
  generateFor(1990, 1999);
  for (let year = 2000; year < 2020; year++) {
    generateFor(year);
  }
})();
